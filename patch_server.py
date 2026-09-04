import sys

with open('src/serverApp.ts', 'r') as f:
    content = f.read()

target = '''        // Calculate Previous Day Close from candle stream prior to foundDate
        const prevSessionCandles = candlesList.filter((c) => c.dateStr && c.dateStr < foundDate);
        const previousDayClose = prevSessionCandles.length > 0 ? prevSessionCandles[prevSessionCandles.length - 1].close : null;'''

replacement = '''        // Calculate Previous Day Close from candle stream prior to foundDate
        const prevSessionCandles = candlesList.filter((c) => c.dateStr && c.dateStr < foundDate);
        let previousDayClose = prevSessionCandles.length > 0 ? prevSessionCandles[prevSessionCandles.length - 1].close : null;

        let accurateOpen = first15MinOpen;
        let accurateClose = effectiveClose;
        let accurateHigh = sessionHigh;
        let accurateLow = sessionLow;
        let accurateVolume = sessionTotalVol;
        let accuratePreviousClose = previousDayClose;

        try {
          const todayStr = new Date().toISOString().split('T')[0];
          
          // Use /v2/charts/historical for precise daily OHLC
          const histPayload = {
            securityId: String(secId),
            exchangeSegment,
            instrument,
            expiryCode: 0,
            fromDate: foundDate,
            toDate: foundDate
          };
          
          const histRes = await fetch('https://api.dhan.co/v2/charts/historical', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'client-id': clientId,
              'access-token': accessToken,
            },
            body: JSON.stringify(histPayload),
            signal: AbortSignal.timeout(4000)
          });
          
          if (histRes.ok) {
            const histData = await histRes.json().catch(() => null);
            if (histData && Array.isArray(histData.open) && histData.open.length > 0) {
              const lastIdx = histData.open.length - 1;
              if (histData.open[lastIdx] > 0) accurateOpen = histData.open[lastIdx];
              if (histData.high[lastIdx] > 0) accurateHigh = Math.max(accurateHigh, histData.high[lastIdx]);
              if (histData.low[lastIdx] > 0) accurateLow = Math.min(accurateLow, histData.low[lastIdx]);
              if (histData.close[lastIdx] > 0) accurateClose = histData.close[lastIdx];
              if (histData.volume && histData.volume[lastIdx] > 0) {
                 accurateVolume = histData.volume[lastIdx];
              }
            }
          }

          // Fetch Marketfeed for true real-time accurate data if foundDate is today
          if (foundDate === todayStr || !date) {
            const feedPayload = {
               [exchangeSegment]: [Number(secId)]
            };
            
            const feedRes = await fetch('https://api.dhan.co/v2/marketfeed/ohlc', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'client-id': clientId,
                'access-token': accessToken,
              },
              body: JSON.stringify(feedPayload),
              signal: AbortSignal.timeout(3000)
            });
            
            if (feedRes.ok) {
               const feedData = await feedRes.json().catch(() => null);
               const stockData = feedData?.data?.[exchangeSegment]?.[String(secId)];
               if (stockData && stockData.ohlc) {
                  if (stockData.ohlc.open > 0) accurateOpen = stockData.ohlc.open;
                  if (stockData.ohlc.high > 0) accurateHigh = stockData.ohlc.high;
                  if (stockData.ohlc.low > 0) accurateLow = stockData.ohlc.low;
                  if (stockData.ohlc.close > 0) accuratePreviousClose = stockData.ohlc.close;
                  if (stockData.last_price > 0) accurateClose = stockData.last_price;
               }
            }
          }
        } catch (err) {
           console.log("Error fetching accurate OHLC: ", err);
        }'''

if target not in content:
    print('Target string not found')
    sys.exit(1)

content = content.replace(target, replacement)
content = content.replace('open: first15MinOpen,', 'open: accurateOpen,')
content = content.replace('close: Math.round(effectiveClose * 100) / 100,', 'close: Math.round(accurateClose * 100) / 100,')
content = content.replace('high: Math.round(sessionHigh * 100) / 100,', 'high: Math.round(accurateHigh * 100) / 100,')
content = content.replace('low: Math.round(sessionLow * 100) / 100,', 'low: Math.round(accurateLow * 100) / 100,')
content = content.replace('previousClose: previousDayClose ? Math.round(previousDayClose * 100) / 100 : null,', 'previousClose: accuratePreviousClose ? Math.round(accuratePreviousClose * 100) / 100 : null,')
content = content.replace('volume: sessionTotalVol > 0 ? sessionTotalVol : first15MinVol,', 'volume: accurateVolume > 0 ? accurateVolume : first15MinVol,')
content = content.replace('totalVolume: sessionTotalVol,', 'totalVolume: accurateVolume,')

with open('src/serverApp.ts', 'w') as f:
    f.write(content)

