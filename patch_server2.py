import sys

with open('src/serverApp.ts', 'r') as f:
    content = f.read()

target = '''        try {
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
    print('Target not found')
    sys.exit(1)

content = content.replace(target, '')

bulk_endpoint = '''  apiRouter.post('/dhan/bulk-marketfeed', async (req, res) => {
    try {
      const { clientId, accessToken, securityIds, exchangeSegment = 'NSE_EQ' } = req.body;
      if (!clientId || !accessToken) return res.status(401).json({ error: 'Missing auth' });
      
      const payload = {
        [exchangeSegment]: securityIds.map(Number)
      };
      
      const feedRes = await fetch('https://api.dhan.co/v2/marketfeed/ohlc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'client-id': clientId,
          'access-token': accessToken,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000)
      });
      
      const data = await feedRes.json();
      return res.json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

'''

content = content.replace("apiRouter.post('/dhan/intraday-15m'", bulk_endpoint + "apiRouter.post('/dhan/intraday-15m'")

with open('src/serverApp.ts', 'w') as f:
    f.write(content)

