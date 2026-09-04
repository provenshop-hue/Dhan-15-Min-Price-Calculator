async function test() {
  const token = process.env.DHAN_ACCESS_TOKEN || '';
  const clientId = process.env.DHAN_CLIENT_ID || '';
  const res = await fetch('https://api.dhan.co/charts/historical', {
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
      "fromDate": "2024-05-01",
      "toDate": "2024-05-05"
    })
  });
  console.log("v1 historical:", res.status);
  const data = await res.text();
  console.log("body:", data.slice(0, 500));
}
test();
