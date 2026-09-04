import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

target_fetch_all = '''  const handleFetchAllDhan = async () => {
    setIsBulkLoading(true);
    setBulkProgress({ current: 0, total: stocks.length });

    // Reset errors
    setStocks((prev) =>
      prev.map((s) => ({ ...s, error: null }))
    );

    const CONCURRENCY = 8;
    let completed = 0;
    let authErrorOccurred = false;'''

replacement_fetch_all = '''  const handleFetchAllDhan = async () => {
    setIsBulkLoading(true);
    setBulkProgress({ current: 0, total: stocks.length });

    // Reset errors
    setStocks((prev) =>
      prev.map((s) => ({ ...s, error: null }))
    );

    let bulkMarketFeed: Record<string, any> = {};
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const isToday = !credentials.date || credentials.date === todayStr;
      
      if (isToday && stocks.length > 0) {
        const secIds = stocks.map(s => s.securityId || getDhanSecurityId(s.symbol)).filter(Boolean);
        if (secIds.length > 0) {
          const res = await fetch('/api/dhan/bulk-marketfeed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              clientId: credentials.clientId, 
              accessToken: credentials.accessToken, 
              securityIds: secIds,
              exchangeSegment: credentials.segment || 'NSE_EQ'
            })
          });
          const data = await res.json();
          const seg = credentials.segment || 'NSE_EQ';
          if (data?.status === 'success' && data?.data?.[seg]) {
            bulkMarketFeed = data.data[seg];
          }
        }
      }
    } catch(err) {
      console.error("Failed to fetch bulk marketfeed", err);
    }

    const CONCURRENCY = 8;
    let completed = 0;
    let authErrorOccurred = false;'''

if target_fetch_all not in content:
    print('Target fetch all not found')
    sys.exit(1)

content = content.replace(target_fetch_all, replacement_fetch_all)


target_result = '''          if (result.success && result.data) {
            const data = result.data;
            const openPrice = data.open;
            const closePrice = data.close;
            const rsi = data.rsi;
            const adx = data.adx;
            const vwap = data.vwap !== undefined ? data.vwap : (data.high && data.low ? Math.round(((data.high + data.low + closePrice) / 3) * 100) / 100 : null);
            const calc = calculateGann15Min(openPrice, closePrice, rsi, vwap, data.high, data.low, 0.001, adx, data.first15mHigh, data.first15mLow, stock.symbol, data.candleTimestamp);'''


replacement_result = '''          if (result.success && result.data) {
            const data = result.data;
            const secId = String(result.secId);
            
            let openPrice = data.open;
            let closePrice = data.close;
            let highPrice = data.high;
            let lowPrice = data.low;
            
            if (bulkMarketFeed[secId]) {
               const feed = bulkMarketFeed[secId];
               if (feed.ohlc?.open > 0) openPrice = feed.ohlc.open;
               if (feed.ohlc?.high > 0) highPrice = Math.max(highPrice, feed.ohlc.high);
               if (feed.ohlc?.low > 0) lowPrice = Math.min(lowPrice, feed.ohlc.low);
               if (feed.last_price > 0) closePrice = feed.last_price;
            }

            const rsi = data.rsi;
            const adx = data.adx;
            const vwap = data.vwap !== undefined ? data.vwap : (highPrice && lowPrice ? Math.round(((highPrice + lowPrice + closePrice) / 3) * 100) / 100 : null);
            const calc = calculateGann15Min(openPrice, closePrice, rsi, vwap, highPrice, lowPrice, 0.001, adx, data.first15mHigh, data.first15mLow, stock.symbol, data.candleTimestamp);'''

content = content.replace(target_result, replacement_result)


target_update_obj = '''            const updatedObj: StockCalculated = {
              ...stock,
              securityId: data.securityId || result.secId,
              openPrice,
              closePrice,
              highPrice: data.high,
              lowPrice: data.low,
              previousClose: data.previousClose !== undefined ? data.previousClose : stock.previousClose,'''

replacement_update_obj = '''            const updatedObj: StockCalculated = {
              ...stock,
              securityId: data.securityId || result.secId,
              openPrice,
              closePrice,
              highPrice,
              lowPrice,
              previousClose: data.previousClose !== undefined ? data.previousClose : stock.previousClose,'''

content = content.replace(target_update_obj, replacement_update_obj)

# Now also fix fetchSingleStockCandle in App.tsx! (handleFetchSingleDhan)
target_single = '''    const result = await fetchSingleStockCandle(stock);
    if (result.success && result.data) {
      const data = result.data;
      const openPrice = data.open;
      const closePrice = data.close;
      const rsi = data.rsi;'''

replacement_single = '''    let bulkMarketFeed: Record<string, any> = {};
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const isToday = !credentials.date || credentials.date === todayStr;
      const secId = stock.securityId || getDhanSecurityId(stock.symbol);
      if (isToday && secId) {
          const res = await fetch('/api/dhan/bulk-marketfeed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              clientId: credentials.clientId, 
              accessToken: credentials.accessToken, 
              securityIds: [secId],
              exchangeSegment: credentials.segment || 'NSE_EQ'
            })
          });
          const data = await res.json();
          const seg = credentials.segment || 'NSE_EQ';
          if (data?.status === 'success' && data?.data?.[seg]) {
            bulkMarketFeed = data.data[seg];
          }
      }
    } catch(err) {}

    const result = await fetchSingleStockCandle(stock);
    if (result.success && result.data) {
      const data = result.data;
      const secId = String(result.secId);
      
      let openPrice = data.open;
      let closePrice = data.close;
      let highPrice = data.high;
      let lowPrice = data.low;
      
      if (bulkMarketFeed[secId]) {
         const feed = bulkMarketFeed[secId];
         if (feed.ohlc?.open > 0) openPrice = feed.ohlc.open;
         if (feed.ohlc?.high > 0) highPrice = Math.max(highPrice, feed.ohlc.high);
         if (feed.ohlc?.low > 0) lowPrice = Math.min(lowPrice, feed.ohlc.low);
         if (feed.last_price > 0) closePrice = feed.last_price;
      }
      
      const rsi = data.rsi;'''

content = content.replace(target_single, replacement_single)

target_single_calc = '''      const vwap = data.vwap !== undefined ? data.vwap : (data.high && data.low ? Math.round(((data.high + data.low + closePrice) / 3) * 100) / 100 : null);
      const calc = calculateGann15Min(openPrice, closePrice, rsi, vwap, data.high, data.low, 0.001, adx, data.first15mHigh, data.first15mLow, stock.symbol, data.candleTimestamp);
      const updatedObj: StockCalculated = {
        ...stock,
        securityId: data.securityId || result.secId,
        openPrice,
        closePrice,
        highPrice: data.high,
        lowPrice: data.low,
        previousClose: data.previousClose !== undefined ? data.previousClose : stock.previousClose,'''

replacement_single_calc = '''      const vwap = data.vwap !== undefined ? data.vwap : (highPrice && lowPrice ? Math.round(((highPrice + lowPrice + closePrice) / 3) * 100) / 100 : null);
      const calc = calculateGann15Min(openPrice, closePrice, rsi, vwap, highPrice, lowPrice, 0.001, adx, data.first15mHigh, data.first15mLow, stock.symbol, data.candleTimestamp);
      const updatedObj: StockCalculated = {
        ...stock,
        securityId: data.securityId || result.secId,
        openPrice,
        closePrice,
        highPrice,
        lowPrice,
        previousClose: data.previousClose !== undefined ? data.previousClose : stock.previousClose,'''

content = content.replace(target_single_calc, replacement_single_calc)

with open('src/App.tsx', 'w') as f:
    f.write(content)

