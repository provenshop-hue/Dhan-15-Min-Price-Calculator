async function test() {
  const token = process.env.DHAN_ACCESS_TOKEN || '';
  const clientId = process.env.DHAN_CLIENT_ID || '';
  const today = new Date().toISOString().split('T')[0];

  // 1. marketfeed/ohlc
  const feedRes = await fetch('https://api.dhan.co/v2/marketfeed/ohlc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'client-id': clientId, 'access-token': token },
    body: JSON.stringify({ "NSE_EQ": [1333] })
  });
  const feedData = await feedRes.json();
  console.log("Marketfeed OHLC:", JSON.stringify(feedData.data, null, 2));

  // 2. intraday
  const intraRes = await fetch('https://api.dhan.co/v2/charts/intraday', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'client-id': clientId, 'access-token': token },
    body: JSON.stringify({
      "securityId": "1333", "exchangeSegment": "NSE_EQ", "instrument": "EQUITY", "fromDate": today, "toDate": today, "interval": "15"
    })
  });
  const intraData = await intraRes.json();
  if (intraData.open && intraData.open.length > 0) {
     const o = intraData.open[0];
     const h = Math.max(...intraData.high);
     const l = Math.min(...intraData.low);
     const c = intraData.close[intraData.close.length - 1];
     console.log("Intraday Aggregated OHLC:", { o, h, l, c });
  }

  // 3. historical
  const histRes = await fetch('https://api.dhan.co/v2/charts/historical', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'client-id': clientId, 'access-token': token },
    body: JSON.stringify({
      "securityId": "1333", "exchangeSegment": "NSE_EQ", "instrument": "EQUITY", "expiryCode": 0, "fromDate": today, "toDate": today
    })
  });
  const histData = await histRes.json();
  console.log("Historical Daily OHLC:", JSON.stringify(histData, null, 2));
}
test();
