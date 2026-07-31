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

        // Helper to parse IST hours & minutes from Epoch / Unix timestamp or formatted string using Asia/Kolkata timezone
        const getISTTime = (tsVal: any): { hours: number; minutes: number } | null => {
          if (tsVal === undefined || tsVal === null) return null;

          const num = Number(tsVal);
          if (!isNaN(num) && num > 0) {
            const sec = num > 1e11 ? Math.floor(num / 1000) : num;
            const date = new Date(sec * 1000);
            try {
              const formatter = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Kolkata',
                hour: 'numeric',
                minute: 'numeric',
                hour12: false
              });
              const parts = formatter.formatToParts(date);
              let hours = -1, minutes = -1;
              for (const p of parts) {
                if (p.type === 'hour') hours = parseInt(p.value, 10);
                if (p.type === 'minute') minutes = parseInt(p.value, 10);
              }
              if (hours !== -1 && minutes !== -1) return { hours, minutes };
            } catch (e) {
              const utcDate = new Date(sec * 1000);
              const istDate = new Date(utcDate.getTime() + 19800 * 1000);
              return { hours: istDate.getUTCHours(), minutes: istDate.getUTCMinutes() };
            }
          }

          if (typeof tsVal === 'string') {
            const timeMatch = tsVal.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
              const h = parseInt(timeMatch[1], 10);
              const m = parseInt(timeMatch[2], 10);
              if (!isNaN(h) && !isNaN(m)) return { hours: h, minutes: m };
            }
          }

          return null;
        };

        // Find exact first 15-minute candle (09:15 AM IST start time)
        if (timestamps && Array.isArray(timestamps) && timestamps.length > 0) {
          let exact915Idx = -1;
          let exact930Idx = -1;
          let earliestMorningIdx = -1;
          let minDiffFrom915 = Infinity;

          for (let i = 0; i < timestamps.length; i++) {
            const parsed = getISTTime(timestamps[i]);
            if (parsed) {
              const { hours, minutes } = parsed;

              // Exact 09:15 AM IST start time
              if (hours === 9 && minutes === 15) {
                exact915Idx = i;
                break;
              }

              if (hours === 9 && minutes === 30 && exact930Idx === -1) {
                exact930Idx = i;
              }

              if (hours === 9 && minutes >= 15 && minutes <= 45) {
                const diff = Math.abs(minutes - 15);
                if (diff < minDiffFrom915) {
                  minDiffFrom915 = diff;
                  earliestMorningIdx = i;
                }
              }
            }
          }

          if (exact915Idx !== -1) {
            candleIdx = exact915Idx;
          } else if (earliestMorningIdx !== -1) {
            candleIdx = earliestMorningIdx;
          } else if (exact930Idx !== -1) {
            candleIdx = exact930Idx;
          } else {
            const firstTs = Number(timestamps[0]);
            const lastTs = Number(timestamps[timestamps.length - 1]);
            if (!isNaN(firstTs) && !isNaN(lastTs) && firstTs > lastTs) {
              candleIdx = timestamps.length - 1;
            } else {
              candleIdx = 0;
            }
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
