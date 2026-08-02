import express from 'express';
import { getDhanSecurityId } from './data/dhanSecurityMap.js';

export function createExpressApp() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  const apiRouter = express.Router();

  // API Route: Healthcheck
  apiRouter.get('/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API Route: Fetch Intraday 15-min Candle Data from Dhan API
  apiRouter.post('/dhan/intraday-15m', async (req, res) => {
    try {
      const { clientId, accessToken, securityId, symbol, date } = req.body;

      // Validate inputs
      if (!clientId || !accessToken) {
        return res.status(400).json({
          error: 'Missing Dhan credentials. Please provide Client ID and Access Token in Dhan Settings.'
        });
      }

      if (!securityId && !symbol) {
        return res.status(400).json({
          error: 'Missing securityId or stock symbol.'
        });
      }

      // Resolve Security ID
      let secId = securityId;
      if (!secId || secId === '1333' || secId === 'undefined') {
        if (symbol) {
          secId = getDhanSecurityId(symbol);
        }
      }

      if (!secId) {
        return res.status(400).json({
          error: `Could not find Dhan Security ID for symbol "${symbol}". Please check symbol or manually specify securityId.`
        });
      }

      const targetDate = date || new Date().toISOString().split('T')[0];

      // Helper function to query Dhan Intraday Chart API for a specific YYYY-MM-DD date in Spot Equity segment
      async function fetchDhanCandles(queryDate: string) {
        const payloadDateOnly = {
          securityId: String(secId),
          exchangeSegment: 'NSE_EQ',
          instrument: 'EQUITY',
          instrumentType: 'EQUITY',
          fromDate: queryDate,
          toDate: queryDate,
          interval: '15'
        };

        for (let retry = 0; retry < 2; retry++) {
          try {
            const response = await fetch('https://api.dhan.co/v2/charts/intraday', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'client-id': clientId,
                'access-token': accessToken,
              },
              body: JSON.stringify(payloadDateOnly),
              signal: AbortSignal.timeout(6000)
            });

            const data = await response.json();

            // If rate limited (429), wait and retry
            if (response.status === 429) {
              await new Promise((r) => setTimeout(r, 300 * (retry + 1)));
              continue;
            }

            if (response.ok && data?.open && Array.isArray(data.open) && data.open.length > 0) {
              return { ok: true, status: response.status, data };
            }

            // Attempt with HH:MM:SS format if no open array
            const payloadWithTime = {
              ...payloadDateOnly,
              fromDate: `${queryDate} 09:15:00`,
              toDate: `${queryDate} 15:30:00`
            };

            const response2 = await fetch('https://api.dhan.co/v2/charts/intraday', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'client-id': clientId,
                'access-token': accessToken,
              },
              body: JSON.stringify(payloadWithTime),
              signal: AbortSignal.timeout(6000)
            });

            const data2 = await response2.json();
            if (response2.ok && data2?.open && Array.isArray(data2.open) && data2.open.length > 0) {
              return { ok: true, status: response2.status, data: data2 };
            }

            return { ok: response.ok, status: response.status, data };
          } catch (e: any) {
            if (retry === 0) {
              await new Promise((r) => setTimeout(r, 200));
            } else {
              return { ok: false, status: 500, data: { error: String(e?.message || e) } };
            }
          }
        }

        return { ok: false, status: 500, data: { error: 'Dhan API request failed' } };
      }

      // First attempt with targetDate
      let result = await fetchDhanCandles(targetDate);

      // Handle Authentication / Token Errors immediately
      if (result.status === 401 || result.status === 403 || (result.data && (result.data.remarks?.includes('token') || result.data.remarks?.includes('client')))) {
        return res.status(401).json({
          error: result.data.remarks || result.data.message || 'Invalid Dhan Client ID or Access Token. Please update credentials in Dhan Settings.',
          dhanResponse: result.data
        });
      }

      let foundDate = targetDate;
      let openCandles = result.data?.open;

      // If no candle data found on targetDate, automatically attempt previous trading days (up to 2 days back)
      if (!openCandles || !Array.isArray(openCandles) || openCandles.length === 0) {
        const dt = new Date(targetDate);

        for (let attempt = 1; attempt <= 2; attempt++) {
          dt.setDate(dt.getDate() - 1);
          // Skip weekends automatically
          if (dt.getDay() === 0) dt.setDate(dt.getDate() - 2); // Sunday -> Friday
          else if (dt.getDay() === 6) dt.setDate(dt.getDate() - 1); // Saturday -> Friday

          const prevDateStr = dt.toISOString().split('T')[0];
          const prevResult = await fetchDhanCandles(prevDateStr);

          if (prevResult.data?.open && Array.isArray(prevResult.data.open) && prevResult.data.open.length > 0) {
            result = prevResult;
            openCandles = prevResult.data.open;
            foundDate = prevDateStr;
            break;
          }
        }
      }

      if (openCandles && Array.isArray(openCandles) && openCandles.length > 0) {
        const data = result.data;
        const timestamps = data.start_time || data.timestamp || data.t || data.time;
        let candleIdx = 0;

        // Helper to parse IST Date (YYYY-MM-DD) and hours & minutes from Epoch / Unix timestamp or formatted string using Asia/Kolkata timezone
        const getISTDateTime = (tsVal: any): { dateStr: string; hours: number; minutes: number } | null => {
          if (tsVal === undefined || tsVal === null) return null;

          const num = Number(tsVal);
          if (!isNaN(num) && num > 0) {
            const sec = num > 1e11 ? Math.floor(num / 1000) : num;
            const dateObj = new Date(sec * 1000);
            try {
              const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: 'numeric',
                minute: 'numeric',
                hour12: false
              });
              const formatted = formatter.format(dateObj); // e.g. "2026-07-31, 09:15"
              const parts = formatted.split(', ');
              if (parts.length >= 2) {
                const [dPart, tPart] = parts;
                const [h, m] = tPart.split(':').map((n) => parseInt(n, 10));
                return { dateStr: dPart.trim(), hours: h, minutes: m };
              }
            } catch (e) {
              const utcDate = new Date(sec * 1000);
              const istDate = new Date(utcDate.getTime() + 19800 * 1000);
              const y = istDate.getUTCFullYear();
              const m = String(istDate.getUTCMonth() + 1).padStart(2, '0');
              const d = String(istDate.getUTCDate()).padStart(2, '0');
              return {
                dateStr: `${y}-${m}-${d}`,
                hours: istDate.getUTCHours(),
                minutes: istDate.getUTCMinutes()
              };
            }
          }

          if (typeof tsVal === 'string') {
            const dateMatch = tsVal.match(/(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/);
            if (dateMatch) {
              return {
                dateStr: dateMatch[1],
                hours: parseInt(dateMatch[2], 10),
                minutes: parseInt(dateMatch[3], 10)
              };
            }
            const timeMatch = tsVal.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
              const h = parseInt(timeMatch[1], 10);
              const m = parseInt(timeMatch[2], 10);
              if (!isNaN(h) && !isNaN(m)) return { dateStr: '', hours: h, minutes: m };
            }
          }

          return null;
        };
        const getISTTime = getISTDateTime;

        // Find exact first 15-minute candle (09:15 AM IST) for the target foundDate
        if (timestamps && Array.isArray(timestamps) && timestamps.length > 0) {
          let exactTargetDate915Idx = -1;
          let targetDate930Idx = -1;
          let targetDateEarliestIdx = -1;
          let targetDateMinDiff = Infinity;

          let fallback915Idx = -1;
          let fallbackEarliestIdx = -1;

          for (let i = 0; i < timestamps.length; i++) {
            const parsed = getISTDateTime(timestamps[i]);
            if (parsed) {
              const { dateStr, hours, minutes } = parsed;

              // Check if date matches target foundDate
              const isTargetDate = !dateStr || dateStr === foundDate;

              if (isTargetDate) {
                if (hours === 9 && minutes === 15) {
                  exactTargetDate915Idx = i;
                  break; // Found exact 09:15 AM on target date!
                }
                if (hours === 9 && minutes === 30 && targetDate930Idx === -1) {
                  targetDate930Idx = i;
                }
                if (hours === 9 && minutes >= 15 && minutes <= 45) {
                  const diff = Math.abs(minutes - 15);
                  if (diff < targetDateMinDiff) {
                    targetDateMinDiff = diff;
                    targetDateEarliestIdx = i;
                  }
                }
              }

              // General fallbacks across entire timestamp array if target date isn't explicitly matched
              if (hours === 9 && minutes === 15 && fallback915Idx === -1) {
                fallback915Idx = i;
              }
              if (hours === 9 && minutes >= 15 && minutes <= 45 && fallbackEarliestIdx === -1) {
                fallbackEarliestIdx = i;
              }
            }
          }

          if (exactTargetDate915Idx !== -1) {
            candleIdx = exactTargetDate915Idx;
          } else if (targetDateEarliestIdx !== -1) {
            candleIdx = targetDateEarliestIdx;
          } else if (targetDate930Idx !== -1) {
            candleIdx = targetDate930Idx;
          } else if (fallback915Idx !== -1) {
            candleIdx = fallback915Idx;
          } else if (fallbackEarliestIdx !== -1) {
            candleIdx = fallbackEarliestIdx;
          } else {
            candleIdx = 0;
          }
        }

        const rawOpen = Number(data.open[candleIdx]);
        const rawClose = Number(data.close[candleIdx]);
        const rawHigh = Number(data.high[candleIdx]);
        const rawLow = Number(data.low[candleIdx]);
        const rawVol = Number(data.volume ? data.volume[candleIdx] : 0);

        const first15MinOpen = Math.round(rawOpen * 100) / 100;
        const first15MinClose = Math.round(rawClose * 100) / 100;
        const first15MinHigh = Math.round(rawHigh * 100) / 100;
        const first15MinLow = Math.round(rawLow * 100) / 100;
        const first15MinVol = Math.round(rawVol);

        let timeStr = '09:15 AM';
        if (timestamps && timestamps[candleIdx]) {
          const parsed = getISTTime(timestamps[candleIdx]);
          if (parsed) {
            const h = parsed.hours;
            const m = parsed.minutes;
            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayH = h % 12 === 0 ? 12 : h % 12;
            const displayM = m < 10 ? `0${m}` : m;
            timeStr = `${displayH}:${displayM} ${ampm}`;
          }
        }

        const candleTimestamp = `${foundDate} ${timeStr} (15m)`;

        // Calculate 14-period RSI from the historical candle close prices
        let rsi: number | null = null;
        if (data.close && Array.isArray(data.close) && data.close.length >= 2) {
          const numCloses = data.close.map(Number).filter((n: any) => !isNaN(Number(n)) && Number(n) > 0);
          if (numCloses.length >= 2) {
            const period = Math.min(14, numCloses.length - 1);
            let gains = 0, losses = 0;
            for (let i = 1; i <= period; i++) {
              const diff = numCloses[i] - numCloses[i - 1];
              if (diff >= 0) gains += diff;
              else losses += Math.abs(diff);
            }
            let avgGain = gains / period;
            let avgLoss = losses / period;
            for (let i = period + 1; i < numCloses.length; i++) {
              const diff = numCloses[i] - numCloses[i - 1];
              const gain = diff >= 0 ? diff : 0;
              const loss = diff < 0 ? Math.abs(diff) : 0;
              avgGain = (avgGain * (period - 1) + gain) / period;
              avgLoss = (avgLoss * (period - 1) + loss) / period;
            }
            if (avgLoss === 0) rsi = 100;
            else rsi = Math.round((100 - (100 / (1 + (avgGain / avgLoss)))) * 100) / 100;
          }
        }

        // Calculate Volume Weighted Average Price (VWAP) across all candles
        let vwap: number | null = null;
        if (data.close && data.high && data.low && Array.isArray(data.close) && data.close.length > 0) {
          let totalTPV = 0;
          let totalVol = 0;
          for (let i = 0; i < data.close.length; i++) {
            const h = Number(data.high[i]) || 0;
            const l = Number(data.low[i]) || 0;
            const c = Number(data.close[i]) || 0;
            const v = Number(data.volume ? data.volume[i] : 0) || 0;
            const tp = (h + l + c) / 3;
            const volWeight = v > 0 ? v : 1;
            totalTPV += tp * volWeight;
            totalVol += volWeight;
          }
          if (totalVol > 0) {
            vwap = Math.round((totalTPV / totalVol) * 100) / 100;
          }
        }

        return res.json({
          success: true,
          symbol,
          securityId: String(secId),
          candleTimestamp,
          fetchedDate: foundDate,
          open: first15MinOpen,
          close: first15MinClose,
          high: first15MinHigh,
          low: first15MinLow,
          volume: first15MinVol,
          rsi,
          vwap,
          totalCandles: openCandles.length
        });
      } else {
        return res.status(404).json({
          error: `No 15-minute candle data returned from Dhan for ${symbol} (Security ID: ${secId}) on ${targetDate} or recent trading days.`,
          dhanResponse: result.data
        });
      }
    } catch (err: any) {
      console.error('Error proxying Dhan API:', err);
      res.status(500).json({
        error: err.message || 'Internal Server Error while communicating with Dhan API'
      });
    }
  });

  // API Route: Test Dhan Credentials
  apiRouter.post('/dhan/verify-credentials', async (req, res) => {
    try {
      const { clientId, accessToken } = req.body;
      if (!clientId || !accessToken) {
        return res.status(400).json({ success: false, error: 'Client ID and Access Token required' });
      }

      const response = await fetch('https://api.dhan.co/v2/fundlimit', {
        method: 'GET',
        headers: {
          'client-id': clientId,
          'access-token': accessToken,
        }
      });

      const data = await response.json();
      if (response.ok && data.status !== 'failure') {
        return res.json({ success: true, message: 'Dhan HQ API Credentials verified successfully!' });
      } else {
        return res.status(400).json({
          success: false,
          error: data.remarks || data.message || 'Invalid Client ID or Access Token'
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to verify Dhan connection' });
    }
  });

  // Mount API router on both /api and / (for serverless compatibility)
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  return app;
}
