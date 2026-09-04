async function test() {
  const token = process.env.DHAN_ACCESS_TOKEN || '';
  const clientId = process.env.DHAN_CLIENT_ID || '';
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const res = await fetch('https://api.dhan.co/v2/charts/historical', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'client-id': clientId,
      'access-token': token,
    },
    body: JSON.stringify({
      "securityId": "1333",
      "exchangeSegment": "NSE_EQ",
      "instrument": "EQUITY",
      "expiryCode": 0,
      "fromDate": yesterday,
      "toDate": today
    })
  });
  console.log("v2 historical:");
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
