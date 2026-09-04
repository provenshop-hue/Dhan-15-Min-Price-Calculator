async function test() {
  const token = process.env.DHAN_ACCESS_TOKEN || '';
  const clientId = process.env.DHAN_CLIENT_ID || '';
  
  const feedRes = await fetch('https://api.dhan.co/v2/marketfeed/ohlc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'client-id': clientId,
      'access-token': token,
    },
    body: JSON.stringify({ "NSE_EQ": [1333, 2885, 3456] }) // HDFC BANK, RELIANCE, TCS etc
  });
  const feedData = await feedRes.json();
  console.log(JSON.stringify(feedData, null, 2));
}
test();
