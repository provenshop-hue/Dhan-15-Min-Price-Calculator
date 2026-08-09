import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { getDhanSecurityId, isIndexSymbol } from './data/dhanSecurityMap.js';

let geminiCoolOffUntil = 0;

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

      // Resolve Security ID & Segment Type
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

      const isIndex = isIndexSymbol(symbol || '') || secId === '13' || secId === '25';
      const exchangeSegment = isIndex ? 'IDX_I' : 'NSE_EQ';
      const instrument = isIndex ? 'INDEX' : 'EQUITY';

      const targetDate = date || new Date().toISOString().split('T')[0];

      // Helper function to query Dhan Intraday Chart API for a date range
      async function fetchDhanCandles(queryDate: string) {
        // Calculate 10 calendar days back from queryDate to ensure sufficient 15-min candles for 14-period RSI
        const targetDt = new Date(queryDate);
        const fromDt = new Date(targetDt);
        fromDt.setDate(fromDt.getDate() - 10);
        const fromDateStr = fromDt.toISOString().split('T')[0];

        const payloadMultiDay = {
          securityId: String(secId),
          exchangeSegment,
          instrument,
          instrumentType: instrument,
          fromDate: fromDateStr,
          toDate: queryDate,
          interval: '15'
        };

        const payloadSingleDay = {
          securityId: String(secId),
          exchangeSegment,
          instrument,
          instrumentType: instrument,
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
              signal: AbortSignal.timeout(3000)
            });

            if (response.status === 401 || response.status === 403) {
              const data = await response.json().catch(() => ({}));
              return { ok: false, status: response.status, data };
            }

            if (response.status === 429) {
              await new Promise((r) => setTimeout(r, 200 * (retry + 1)));
              continue;
            }

            const data = await response.json().catch(() => null);

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
              signal: AbortSignal.timeout(3000)
            });

            if (responseSingle.status === 401 || responseSingle.status === 403) {
              const dataS = await responseSingle.json().catch(() => ({}));
              return { ok: false, status: responseSingle.status, data: dataS };
            }

            const dataSingle = await responseSingle.json().catch(() => null);
            if (responseSingle.ok && dataSingle?.open && Array.isArray(dataSingle.open) && dataSingle.open.length > 0) {
              return { ok: true, status: responseSingle.status, data: dataSingle };
            }

            return { ok: response.ok, status: response.status, data: data || dataSingle };
          } catch (e: any) {
            if (retry === 0) {
              await new Promise((r) => setTimeout(r, 150));
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

        // Calculate 14-period RSI timeline for every candle from 09:15 AM to current time
        const calcRsiForCloses = (closes: number[]): number => {
          if (closes.length < 2) return 50;
          const period = 14;

          if (closes.length <= period) {
            let gains = 0, losses = 0;
            for (let i = 1; i < closes.length; i++) {
              const diff = closes[i] - closes[i - 1];
              if (diff >= 0) gains += diff;
              else losses += Math.abs(diff);
            }
            const count = closes.length - 1;
            const avgGain = gains / count;
            const avgLoss = losses / count;
            if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
            const rs = avgGain / avgLoss;
            return Math.round((100 - (100 / (1 + rs))) * 10) / 10;
          }

          let gains = 0, losses = 0;
          for (let i = 1; i <= period; i++) {
            const diff = closes[i] - closes[i - 1];
            if (diff >= 0) gains += diff;
            else losses += Math.abs(diff);
          }
          let avgGain = gains / period;
          let avgLoss = losses / period;

          for (let i = period + 1; i < closes.length; i++) {
            const diff = closes[i] - closes[i - 1];
            const gain = diff >= 0 ? diff : 0;
            const loss = diff < 0 ? Math.abs(diff) : 0;
            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;
          }

          if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
          return Math.round((100 - (100 / (1 + (avgGain / avgLoss)))) * 10) / 10;
        };

        const rsiTimeline = sessionCandles.map((c, idx) => {
          const closesUpToCandle = candlesList.slice(0, c.idx + 1).map((x) => x.close).filter((x) => x > 0);
          const candleRsi = calcRsiForCloses(closesUpToCandle);

          let prevRsi = candleRsi;
          if (idx > 0) {
            const prevCloses = candlesList.slice(0, sessionCandles[idx - 1].idx + 1).map((x) => x.close).filter((x) => x > 0);
            prevRsi = calcRsiForCloses(prevCloses);
          }

          const delta = Math.round((candleRsi - prevRsi) * 10) / 10;
          const direction = delta > 0.1 ? 'INCREASING' : delta < -0.1 ? 'DECREASING' : 'FLAT';

          // Calculate 15m volume direction and delta
          const vol = c.volume || 0;
          let prevVol = vol;
          if (idx > 0) {
            prevVol = sessionCandles[idx - 1].volume || 0;
          }
          const volDelta = vol - prevVol;
          const volDeltaPct = prevVol > 0 ? Math.round(((vol - prevVol) / prevVol) * 1000) / 10 : 0;
          const volDirection: 'INCREASING' | 'DECREASING' | 'FLAT' = volDelta > 0 ? 'INCREASING' : volDelta < 0 ? 'DECREASING' : 'FLAT';

          return {
            timeStr: c.timeStr,
            close: c.close,
            volume: vol,
            rsi: candleRsi,
            rsiDirection: direction,
            rsiDelta: delta,
            volumeDirection: volDirection,
            volumeDelta: volDelta,
            volumeDeltaPct: volDeltaPct
          };
        });

        // 14-period RSI calculated up to the latest candle
        const latestRsiObj = rsiTimeline[rsiTimeline.length - 1];
        const rsi = latestRsiObj ? latestRsiObj.rsi : null;

        // Calculate 14-period ADX from historical candles
        const calcADXForCandles = (cList: Array<{ high: number; low: number; close: number }>, period = 14): number | null => {
          if (!cList || cList.length < 2) return null;
          const trs: number[] = [];
          const plusDMs: number[] = [];
          const minusDMs: number[] = [];

          for (let i = 1; i < cList.length; i++) {
            const h = cList[i].high;
            const l = cList[i].low;
            const prevH = cList[i - 1].high;
            const prevL = cList[i - 1].low;
            const prevC = cList[i - 1].close;

            const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
            trs.push(tr);

            const upMove = h - prevH;
            const downMove = prevL - l;

            if (upMove > downMove && upMove > 0) plusDMs.push(upMove);
            else plusDMs.push(0);

            if (downMove > upMove && downMove > 0) minusDMs.push(downMove);
            else minusDMs.push(0);
          }

          if (trs.length === 0) return null;
          const p = Math.min(period, trs.length);

          let trSmooth = 0;
          let plusDMSmooth = 0;
          let minusDMSmooth = 0;

          for (let i = 0; i < p; i++) {
            trSmooth += trs[i];
            plusDMSmooth += plusDMs[i];
            minusDMSmooth += minusDMs[i];
          }

          const dxs: number[] = [];
          const getDX = (pDM: number, mDM: number, tr: number) => {
            if (tr === 0) return 0;
            const plusDI = 100 * (pDM / tr);
            const minusDI = 100 * (mDM / tr);
            const diff = Math.abs(plusDI - minusDI);
            const sum = plusDI + minusDI;
            if (sum === 0) return 0;
            return 100 * (diff / sum);
          };

          dxs.push(getDX(plusDMSmooth, minusDMSmooth, trSmooth));

          for (let i = p; i < cList.length - 1; i++) {
            trSmooth = trSmooth - (trSmooth / p) + trs[i];
            plusDMSmooth = plusDMSmooth - (plusDMSmooth / p) + plusDMs[i];
            minusDMSmooth = minusDMSmooth - (minusDMSmooth / p) + minusDMs[i];
            dxs.push(getDX(plusDMSmooth, minusDMSmooth, trSmooth));
          }

          if (dxs.length === 0) return null;
          const adxVal = dxs.reduce((a, b) => a + b, 0) / dxs.length;
          return Math.round(adxVal * 10) / 10;
        };

        const adx = calcADXForCandles(candlesList);

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
          first15mHigh: Math.round(first15MinHigh * 100) / 100,
          first15mLow: Math.round(first15MinLow * 100) / 100,
          volume: first15MinVol,
          rsi,
          adx,
          vwap: sessionVWAP,
          rsiTimeline,
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

  // API Route: Fetch Previous Month Daily OHLC for Gann Analysis (Equity & Spot Indices)
  apiRouter.post('/dhan/prev-month-ohlc', async (req, res) => {
    try {
      const { clientId, accessToken, symbol, securityId, fromDate, toDate } = req.body;

      if (!clientId || !accessToken) {
        return res.status(400).json({
          error: 'Missing Dhan credentials. Please provide Client ID and Access Token in Dhan Settings.'
        });
      }

      const symUpper = (symbol || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const isIndex =
        isIndexSymbol(symbol || '') ||
        symUpper.includes('NIFTY') ||
        symUpper.includes('BANKNIFTY') ||
        securityId === '13' ||
        securityId === '25';

      let secId = securityId;
      if (symUpper === 'NIFTY' || symUpper === 'NIFTY50' || symUpper === 'NIFTY50INDEX') {
        secId = '13';
      } else if (symUpper === 'BANKNIFTY' || symUpper === 'NIFTYBANK' || symUpper === 'BANKNIFTYINDEX') {
        secId = '25';
      } else if (!secId) {
        secId = getDhanSecurityId(symbol);
      }

      if (!secId) {
        return res.status(400).json({
          error: `Could not find Dhan Security ID for "${symbol}".`
        });
      }

      const segmentsToTry = isIndex
        ? [
            { exchangeSegment: 'IDX_I', instrument: 'INDEX' },
            { exchangeSegment: 'NSE_IDX', instrument: 'INDEX' }
          ]
        : [
            { exchangeSegment: 'NSE_EQ', instrument: 'EQUITY' }
          ];

      let apiData: any = null;
      let successfulSegment: any = null;

      const formatISTDateDisplay = (rawTs: any): string => {
        if (!rawTs) return '';
        const num = Number(rawTs);
        let dt: Date;
        if (!isNaN(num) && num > 0) {
          const sec = num > 1e11 ? Math.floor(num / 1000) : num;
          dt = new Date(sec * 1000);
        } else {
          dt = new Date(rawTs);
        }
        if (isNaN(dt.getTime())) return String(rawTs);

        try {
          const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
          return formatter.format(dt);
        } catch (e) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const d = String(dt.getUTCDate()).padStart(2, '0');
          const m = months[dt.getUTCMonth()];
          const y = dt.getUTCFullYear();
          return `${d} ${m} ${y}`;
        }
      };

      // 1. Try /v2/charts/historical for Daily Candles
      for (const seg of segmentsToTry) {
        try {
          const payloadHistorical = {
            securityId: String(secId),
            exchangeSegment: seg.exchangeSegment,
            instrument: seg.instrument,
            expiryCode: 0,
            fromDate,
            toDate
          };

          const response = await fetch('https://api.dhan.co/v2/charts/historical', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'client-id': clientId,
              'access-token': accessToken,
            },
            body: JSON.stringify(payloadHistorical),
            signal: AbortSignal.timeout(4000)
          });

          if (response.ok) {
            const resJson = await response.json().catch(() => null);
            if (resJson && Array.isArray(resJson.high) && resJson.high.length > 0) {
              apiData = resJson;
              successfulSegment = seg;
              break;
            }
          }
        } catch (e) {
          // Continue
        }
      }

      // 2. Fallback to /v2/charts/intraday if historical chart returned empty
      if (!apiData) {
        for (const seg of segmentsToTry) {
          try {
            const payloadIntraday = {
              securityId: String(secId),
              exchangeSegment: seg.exchangeSegment,
              instrument: seg.instrument,
              instrumentType: seg.instrument,
              fromDate,
              toDate,
              interval: '60'
            };

            const response = await fetch('https://api.dhan.co/v2/charts/intraday', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'client-id': clientId,
                'access-token': accessToken,
              },
              body: JSON.stringify(payloadIntraday),
              signal: AbortSignal.timeout(4000)
            });

            if (response.ok) {
              const resJson = await response.json().catch(() => null);
              if (resJson && Array.isArray(resJson.high) && resJson.high.length > 0) {
                apiData = resJson;
                successfulSegment = seg;
                break;
              }
            }
          } catch (e) {
            // Continue
          }
        }
      }

      if (apiData && Array.isArray(apiData.high) && apiData.high.length > 0) {
        const highs = apiData.high;
        const lows = apiData.low;
        const closes = apiData.close;
        const opens = apiData.open;
        const times = apiData.start_time || apiData.timestamp || apiData.t || apiData.time || [];

        let maxHigh = -Infinity;
        let maxHighDate = '';
        let minLow = Infinity;
        let minLowDate = '';

        for (let i = 0; i < highs.length; i++) {
          const h = Number(highs[i]) || 0;
          const l = Number(lows[i]) || 0;
          const ts = times[i];
          const dateDisp = formatISTDateDisplay(ts);

          if (h > maxHigh) {
            maxHigh = h;
            if (dateDisp) maxHighDate = dateDisp;
          }

          if (l > 0 && l < minLow) {
            minLow = l;
            if (dateDisp) minLowDate = dateDisp;
          }
        }

        const prevMonthClose = Number(closes[closes.length - 1]) || Number(opens[0]) || maxHigh;
        const cmp = Number(closes[closes.length - 1]) || prevMonthClose;

        return res.json({
          success: true,
          symbol,
          securityId: String(secId),
          isIndex,
          segment: successfulSegment?.exchangeSegment,
          prevMonthHigh: Math.round(maxHigh * 100) / 100,
          prevMonthHighDate: maxHighDate,
          prevMonthLow: Math.round(minLow * 100) / 100,
          prevMonthLowDate: minLowDate,
          prevMonthClose: Math.round(prevMonthClose * 100) / 100,
          cmp: Math.round(cmp * 100) / 100
        });
      }

      return res.status(404).json({
        error: `No chart data returned from Dhan for ${symbol} (SecId: ${secId}) in range ${fromDate} to ${toDate}.`,
        securityId: String(secId),
        isIndex
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error processing Dhan request' });
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

  // API Route: AI RSI Trend & Intraday Analyst Report
  apiRouter.post('/ai/rsi-analysis', async (req, res) => {
    try {
      const {
        symbol,
        companyName,
        openPrice,
        highPrice,
        lowPrice,
        closePrice,
        vwap,
        buyAbove,
        sellBelow,
        targetsUp,
        targetsDown,
        rsiTimeline
      } = req.body;

      const points = Array.isArray(rsiTimeline) ? rsiTimeline : [];
      let gradualIncrease = false;
      const startRsi = points[0]?.rsi ?? 50;
      const endRsi = points[points.length - 1]?.rsi ?? startRsi;
      const rsiDiff = endRsi - startRsi;

      if (points.length >= 2) {
        let increases = 0;
        for (let i = 1; i < points.length; i++) {
          if (points[i].rsi > points[i - 1].rsi) increases++;
        }
        if ((increases / (points.length - 1)) >= 0.5 && rsiDiff > 1.5) {
          gradualIncrease = true;
        }
      }

      let report = null;

      // Try Gemini API if process.env.GEMINI_API_KEY is defined and cooloff has expired
      if (process.env.GEMINI_API_KEY && Date.now() > geminiCoolOffUntil) {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const timelineText = points
            .map((p: any) => `Time: ${p.timeStr}, Price: ₹${p.close}, Volume: ${p.volume || 'N/A'} (${p.volumeDirection || 'N/A'}, ${p.volumeDeltaPct ? (p.volumeDeltaPct > 0 ? '+' : '') + p.volumeDeltaPct + '%' : '0%'}), RSI: ${p.rsi} (${p.rsiDirection})`)
            .join('\n');

          const prompt = `
You are a senior algorithmic trader and technical analyst specializing in intraday RSI momentum, VWAP interaction, and Gann Square of 9 levels on NSE/BSE stocks.

Analyze the intraday 15-minute RSI progression data starting from 09:15 AM to the current time for the stock:
Stock Symbol: ${symbol} (${companyName || symbol})
Current Market Price: ₹${closePrice}
Session Open: ₹${openPrice}, High: ₹${highPrice}, Low: ₹${lowPrice}
VWAP: ₹${vwap || 'N/A'}
Gann Buy Above Level: ₹${buyAbove || 'N/A'}
Gann Sell Below Level: ₹${sellBelow || 'N/A'}
Targets Up: ${targetsUp?.map((t: number) => '₹' + t.toFixed(2)).join(', ') || 'N/A'}
Targets Down: ${targetsDown?.map((t: number) => '₹' + t.toFixed(2)).join(', ') || 'N/A'}

Intraday 15-Min RSI Timeline (09:15 AM to Current Time):
${timelineText || 'No timeline points provided'}

Please analyze:
1. Is RSI increasing gradually from 09:15 AM to current time?
2. Is it POSITIVE to take/buy the stock at this point of time or NOT?
3. What is the exact Entry Point (price level or condition)?
4. What are the exact Exit Points (Target 1, Target 2, Target 3) and Stop Loss level?
5. What is the Risk-Reward ratio?

Return ONLY a valid JSON object matching this schema:
{
  "verdict": "POSITIVE_BUY" | "NEGATIVE_AVOID" | "NEUTRAL_WAIT",
  "verdictTitle": "Short punchy headline summary",
  "confidencePct": 85,
  "gradualIncreaseDetected": true | false,
  "rsiTrendSummary": "Detailed summary of how RSI progressed from 09:15 AM to current time",
  "analysisDetails": "In-depth analysis of momentum, RSI levels, VWAP position, and Gann levels",
  "entryPoint": "Specific recommended entry price or condition (e.g. Buy at CMP ₹1,245 or on pullback to ₹1,240 near VWAP)",
  "exitTargets": ["Target 1: ₹1,260.00 (+1.2%)", "Target 2: ₹1,275.00 (+2.4%)", "Target 3: ₹1,290.00 (+3.6%)"],
  "stopLoss": "Strict Stop Loss at ₹1,232.00 (below Gann Sell level)",
  "riskRewardRatio": "1 : 2.5",
  "actionableAdvice": "Direct advice for the trader right now"
}
`;

          const geminiPromise = ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json'
            }
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API timeout')), 2000)
          );

          const geminiRes: any = await Promise.race([geminiPromise, timeoutPromise]);

          if (geminiRes.text) {
            const parsed = JSON.parse(geminiRes.text);
            report = {
              ...parsed,
              analyzedAt: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST'
            };
          }
        } catch (e: any) {
          // If rate limited, quota exceeded or timed out, cool off for 5 mins to prevent spamming
          geminiCoolOffUntil = Date.now() + 300000;
        }
      }

      // Rule-based fallback if report was not produced by Gemini
      if (!report) {
        const cmp = closePrice || openPrice || 0;
        const isAboveBuy = buyAbove ? cmp >= buyAbove : false;
        const isBelowSell = sellBelow ? cmp <= sellBelow : false;

        const isPositive = (gradualIncrease && endRsi > 48) || (isAboveBuy && endRsi >= 50);
        const isNegative = isBelowSell || (endRsi < 42 && rsiDiff < -2);

        const verdict = isPositive ? 'POSITIVE_BUY' : isNegative ? 'NEGATIVE_AVOID' : 'NEUTRAL_WAIT';
        const verdictTitle = isPositive
          ? 'Gradual Upward RSI Momentum - POSITIVE BUY SETUP'
          : isNegative
          ? 'RSI Momentum Falling - NEGATIVE / AVOID ENTRY'
          : 'RSI Sideways Consolidation - NEUTRAL / WAIT FOR BREAKOUT';

        const t1 = targetsUp?.[0] || cmp * 1.01;
        const t2 = targetsUp?.[1] || cmp * 1.02;
        const t3 = targetsUp?.[2] || cmp * 1.03;
        const sl = sellBelow || cmp * 0.99;

        report = {
          verdict,
          verdictTitle,
          confidencePct: isPositive ? 86 : isNegative ? 80 : 65,
          gradualIncreaseDetected: gradualIncrease,
          rsiTrendSummary: `RSI started at ${startRsi.toFixed(1)} at 09:15 AM and moved to ${endRsi.toFixed(1)} at ${points[points.length - 1]?.timeStr || 'Current Time'} (${rsiDiff >= 0 ? '+' : ''}${rsiDiff.toFixed(1)} pts). ${gradualIncrease ? 'Confirmed a steady, step-by-step gradual rise across 15-minute candles.' : 'RSI showed fluctuating momentum.'}`,
          analysisDetails: `The stock is currently trading at ₹${cmp.toFixed(2)}. ${vwap ? `Intraday VWAP is ₹${vwap.toFixed(2)}.` : ''} ${buyAbove ? `Gann Square of 9 Buy Above trigger is ₹${buyAbove.toFixed(2)}.` : ''} RSI value of ${endRsi.toFixed(1)} indicates ${endRsi > 55 ? 'bullish momentum expansion' : endRsi < 45 ? 'bearish pressure' : 'neutral range'}.`,
          entryPoint: isPositive
            ? `Buy around CMP ₹${cmp.toFixed(2)} or near VWAP pullback (₹${vwap?.toFixed(2) || cmp.toFixed(2)})`
            : `Wait for breakout above Gann Buy level ₹${buyAbove?.toFixed(2) || 'N/A'} with RSI > 52`,
          exitTargets: [
            `Target 1: ₹${t1.toFixed(2)} (+${(((t1 - cmp)/cmp)*100).toFixed(1)}%)`,
            `Target 2: ₹${t2.toFixed(2)} (+${(((t2 - cmp)/cmp)*100).toFixed(1)}%)`,
            `Target 3: ₹${t3.toFixed(2)} (+${(((t3 - cmp)/cmp)*100).toFixed(1)}%)`
          ],
          stopLoss: `Strict Stop Loss at ₹${sl.toFixed(2)} (-${(((cmp - sl)/cmp)*100).toFixed(1)}%)`,
          riskRewardRatio: '1 : 2.4',
          actionableAdvice: isPositive
            ? 'Favorable risk-reward entry setup. Maintain strict stop loss below Gann support.'
            : 'Do not initiate new long positions until RSI rises above 50 and price crosses Gann Buy level.',
          analyzedAt: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST'
        };
      }

      res.json({ success: true, report });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate RSI AI report' });
    }
  });

  // Mount API router on both /api and / (for serverless compatibility)
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  return app;
}
