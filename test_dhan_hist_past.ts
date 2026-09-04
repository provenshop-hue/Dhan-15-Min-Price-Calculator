async function test() {
  const token = process.env.DHAN_ACCESS_TOKEN || '';
  const clientId = process.env.DHAN_CLIENT_ID || '';
  // past date
  const pastDate = "2026-09-02"; // Yesterday
  const res = await fetch('https://api.dhan.co/v2/charts/historical', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'client-id': clientId, 'access-token': token },
    body: JSON.stringify({
      "securityId": "1333", "exchangeSegment": "NSE_EQ", "instrument": "EQUITY", "expiryCode": 0, "fromDate": pastDate, "toDate": pastDate
    })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
