async function test() {
  const token = process.env.DHAN_ACCESS_TOKEN || '';
  const clientId = process.env.DHAN_CLIENT_ID || '';
  const feedRes = await fetch('https://api.dhan.co/v2/marketfeed/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'client-id': clientId, 'access-token': token },
    body: JSON.stringify({ "NSE_EQ": [1333, 2885, 3456, 11536] })
  });
  const feedData = await feedRes.json();
  Object.keys(feedData.data.NSE_EQ).forEach(key => {
    const s = feedData.data.NSE_EQ[key];
    console.log(`Stock ${key}:`);
    console.log(`  last_price: ${s.last_price}`);
    console.log(`  net_change: ${s.net_change}`);
    console.log(`  ohlc.close: ${s.ohlc.close}`);
  });
}
test();
