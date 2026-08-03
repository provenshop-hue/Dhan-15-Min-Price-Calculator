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

      // Helper function to query Dhan Intraday Chart API for a date range in Spot Equity segment
      async function fetchDhanCandles(queryDate: string) {
        // Calculate 10 calendar days back from queryDate to ensure sufficient 15-min candles for 14-period RSI
        const targetDt = new Date(queryDate);
        const fromDt = new Date(targetDt);
        fromDt.setDate(fromDt.getDate() - 10);
        const fromDateStr = fromDt.toISOString().split('T')[0];

        const payloadMultiDay = {
          securityId: String(secId),
          exchangeSegment: 'NSE_EQ',
          instrument: 'EQUITY',
          instrumentType: 'EQUITY',
          fromDate: fromDateStr,
          toDate: queryDate,
          interval: '15'
        };

        const payloadSingleDay = {
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
            // First attempt: Multi-day range to get ample historical 15m candles for 14-period RSI
            const response = await fetch('https://api.dhan.co/v2/charts/intraday', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'client-id': clientId,
                'access-token': accessToken,
              },
              body: JSON.stringify(payloadMultiDay),
              signal: AbortSignal.timeout(6000)
            });

            // If rate limited (429), wait and retry
            if (response.status === 429) {
              await new Promise((r) => setTimeout(r, 300 * (retry + 1)));
              continue;
            }

            const data = await response.json();

            if (response.ok && data?.open && Array.isArray(data.open) && data.open.length > 0) {
              return { ok: true, status: response.status, data };
            }

            // Second attempt: Single day payload if multi-day returned empty
            const responseSingle = await fetch('https://api.dhan.co/v2/charts/intraday', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'client-id': clientId,
                'access-token': accessToken,
              },
              body: JSON.stringify(payloadSingleDay),
              signal: AbortSignal.timeout(6000)
            });

            const dataSingle = await responseSingle.json();
            if (responseSingle.ok && dataSingle?.open && Array.isArray(dataSingle.open) && dataSingle.open.length > 0) {
              return { ok: true, status: responseSingle.status, data: dataSingle };
            }

            // Third attempt: With HH:MM:SS format
            const payloadWithTime = {
              ...payloadSingleDay,
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

        // Parse all returned candles into structured objects
        const candlesList: Array<{
          idx: number;
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number;
          dateStr: string;
          hours: number;
          minutes: number;
          timeStr: string;
        }> = [];

        if (openCandles && Array.isArray(openCandles)) {
          for (let i = 0; i < openCandles.length; i++) {
            const rawO = Number(data.open?.[i]) || 0;
            const rawH = Number(data.high?.[i]) || 0;
            const rawL = Number(data.low?.[i]) || 0;
            const rawC = Number(data.close?.[i]) || 0;
            const rawV = Number(data.volume?.[i]) || 0;
            const rawTs = timestamps?.[i];

            const parsed = getISTDateTime(rawTs);
            let timeStr = '09:15 AM';
            let dateStr = '';
            let hours = 9;
            let minutes = 15;

            if (parsed) {
              dateStr = parsed.dateStr;
              hours = parsed.hours;
              minutes = parsed.minutes;
              const ampm = hours >= 12 ? 'PM' : 'AM';
              const displayH = hours % 12 === 0 ? 12 : hours % 12;
              const displayM = minutes < 10 ? `0${minutes}` : minutes;
              timeStr = `${displayH}:${displayM} ${ampm}`;
            }

            candlesList.push({
              idx: i,
              open: Math.round(rawO * 100) / 100,
              high: Math.round(rawH * 100) / 100,
              low: Math.round(rawL * 100) / 100,
              close: Math.round(rawC * 100) / 100,
              volume: Math.round(rawV),
              dateStr,
              hours,
              minutes,
              timeStr
            });
          }
        }

        // Target session candles for foundDate
        const targetSessionCandles = candlesList.filter((c) => !c.dateStr || c.dateStr === foundDate);
        const sessionCandles = targetSessionCandles.length > 0 ? targetSessionCandles : candlesList;

        // First 15-minute candle (09:15 AM IST) for Gann base open calculation
        let first15m = sessionCandles.find((c) => c.hours === 9 && c.minutes === 15);
        if (!first15m) {
          first15m = sessionCandles.find((c) => c.hours === 9 && c.minutes >= 15 && c.minutes <= 45);
        }
        if (!first15m && sessionCandles.length > 0) {
          first15m = sessionCandles[0];
        }

        const first15MinOpen = first15m ? first15m.open : (sessionCandles[0]?.open || 0);
        const first15MinClose = first15m ? first15m.close : (sessionCandles[0]?.close || 0);
        const first15MinHigh = first15m ? first15m.high : (sessionCandles[0]?.high || 0);
        const first15MinLow = first15m ? first15m.low : (sessionCandles[0]?.low || 0);
        const first15MinVol = first15m ? first15m.volume : (sessionCandles[0]?.volume || 0);

        // Latest candle in current session (e.g., 11:00 AM candle when refreshed at 11 AM)
        const latestCandle = sessionCandles[sessionCandles.length - 1] || candlesList[candlesList.length - 1];

        // Session high, low, VWAP accumulated up to latestCandle
        let sessionHigh = -Infinity;
        let sessionLow = Infinity;
        let sessionTotalTPV = 0;
        let sessionTotalVol = 0;

        for (const c of sessionCandles) {
          if (c.high > sessionHigh) sessionHigh = c.high;
          if (c.low > 0 && c.low < sessionLow) sessionLow = c.low;

          const tp = (c.high + c.low + c.close) / 3;
          const v = c.volume > 0 ? c.volume : 1;
          sessionTotalTPV += tp * v;
          sessionTotalVol += v;
        }

        if (sessionHigh === -Infinity || isNaN(sessionHigh)) sessionHigh = Math.max(first15MinHigh, latestCandle?.high || 0);
        if (sessionLow === Infinity || isNaN(sessionLow)) sessionLow = Math.min(first15MinLow, latestCandle?.low || 0);

        const sessionVWAP = sessionTotalVol > 0 ? Math.round((sessionTotalTPV / sessionTotalVol) * 100) / 100 : null;
        const effectiveClose = latestCandle ? latestCandle.close : first15MinClose;
        const latestTimeStr = latestCandle ? latestCandle.timeStr : '09:15 AM';

        // 14-period RSI calculated up to the latest candle
        let rsi: number | null = null;
        const allClosesUpToLatest = candlesList
          .slice(0, (latestCandle?.idx ?? candlesList.length - 1) + 1)
          .map((c) => c.close)
          .filter((c) => c > 0);

        if (allClosesUpToLatest.length >= 2) {
          const period = Math.min(14, allClosesUpToLatest.length - 1);
          if (period >= 1) {
            let gains = 0, losses = 0;
            for (let i = 1; i <= period; i++) {
              const diff = allClosesUpToLatest[i] - allClosesUpToLatest[i - 1];
              if (diff >= 0) gains += diff;
              else losses += Math.abs(diff);
            }
            let avgGain = gains / period;
            let avgLoss = losses / period;

            for (let i = period + 1; i < allClosesUpToLatest.length; i++) {
              const diff = allClosesUpToLatest[i] - allClosesUpToLatest[i - 1];
              const gain = diff >= 0 ? diff : 0;
              const loss = diff < 0 ? Math.abs(diff) : 0;
              avgGain = (avgGain * (period - 1) + gain) / period;
              avgLoss = (avgLoss * (period - 1) + loss) / period;
            }

            if (avgLoss === 0) {
              rsi = avgGain === 0 ? 50 : 100;
            } else {
              rsi = Math.round((100 - (100 / (1 + (avgGain / avgLoss)))) * 100) / 100;
            }
          }
        }

        const candleTimestamp = latestTimeStr !== '09:15 AM'
          ? `${foundDate} ${latestTimeStr} (Live | 15m)`
          : `${foundDate} 09:15 AM (15m)`;

        return res.json({
          success: true,
          symbol,
          securityId: String(secId),
          candleTimestamp,
          fetchedDate: foundDate,
          open: first15MinOpen,
          close: Math.round(effectiveClose * 100) / 100,
          high: Math.round(sessionHigh * 100) / 100,
          low: Math.round(sessionLow * 100) / 100,
          volume: first15MinVol,
          rsi,
          vwap: sessionVWAP,
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
