async function test() {
  const token = process.env.DHAN_ACCESS_TOKEN || '';
  const clientId = process.env.DHAN_CLIENT_ID || '';
  const feedRes = await fetch('https://api.dhan.co/v2/marketfeed/ohlc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'client-id': clientId, 'access-token': token },
    body: JSON.stringify({ "NSE_EQ": [1333] })
  });
  const feedData = await feedRes.json();
  console.log(Object.keys(feedData.data.NSE_EQ["1333"] || {}));
  console.log(JSON.stringify(feedData.data.NSE_EQ["1333"], null, 2));
}
test();
