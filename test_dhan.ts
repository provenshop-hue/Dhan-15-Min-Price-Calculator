async function test() {
  const token = process.env.DHAN_ACCESS_TOKEN || '';
  const clientId = process.env.DHAN_CLIENT_ID || '';
  if (!token || !clientId) {
    console.log("No credentials, can't test");
    return;
  }
  const res = await fetch('https://api.dhan.co/v2/marketfeed/ohlc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'client-id': clientId,
      'access-token': token,
    },
    body: JSON.stringify({
      "NSE_EQ": [1333]
    })
  });
  console.log(res.status);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
