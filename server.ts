import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Route: Healthcheck
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API Route: Fetch Intraday 15-min Candle Data from Dhan API
  app.post('/api/dhan/intraday-15m', async (req, res) => {
    try {
      const { clientId, accessToken, securityId, exchangeSegment, symbol, date } = req.body;

      // Validate inputs
      if (!clientId || !accessToken) {
        return res.status(400).json({
          error: 'Missing Dhan credentials. Please provide Client ID and Access Token.'
        });
      }

      if (!securityId && !symbol) {
        return res.status(400).json({
          error: 'Missing securityId or stock symbol.'
        });
      }

      const secId = securityId || '1333'; // Default fallback if symbol lookup needed
      const exSegment = exchangeSegment || 'NSE_EQ';
      const reqDate = date || new Date().toISOString().split('T')[0];

      const payload = {
        securityId: String(secId),
        exchangeSegment: exSegment,
        instrumentType: exSegment === 'NSE_FNO' ? 'FUTSTK' : 'EQUITY',
        fromDate: `${reqDate} 09:15:00`,
        toDate: `${reqDate} 15:30:00`,
        interval: '15'
      };

      console.log('Requesting Dhan API:', payload);

      const response = await fetch('https://api.dhan.co/v2/charts/intraday', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-id': clientId,
          'access-token': accessToken,
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || data.status === 'failure' || data.remarks) {
        // Return clear error message from Dhan
        return res.status(response.status || 400).json({
          error: data.remarks || data.message || 'Failed to fetch intraday data from Dhan API',
          dhanResponse: data
        });
      }

      // Dhan Intraday Chart response format:
      // { start_time: [...], open: [...], high: [...], low: [...], close: [...], volume: [...] }
      if (data.open && Array.isArray(data.open) && data.open.length > 0) {
        const first15MinOpen = data.open[0];
        const first15MinClose = data.close[0];
        const first15MinHigh = data.high[0];
        const first15MinLow = data.low[0];
        const first15MinVol = data.volume ? data.volume[0] : 0;
        const candleTime = data.start_time ? new Date(data.start_time[0] * 1000).toLocaleTimeString('en-IN') : '09:15 AM';

        return res.json({
          success: true,
          symbol,
          securityId: secId,
          candleTimestamp: candleTime,
          open: first15MinOpen,
          close: first15MinClose,
          high: first15MinHigh,
          low: first15MinLow,
          volume: first15MinVol,
          totalCandles: data.open.length
        });
      } else {
        return res.status(404).json({
          error: 'No 15-minute candle data returned from Dhan for this date/security.',
          dhanResponse: data
        });
      }
    } catch (err: any) {
      console.error('Error proxying Dhan API:', err);
      res.status(500).json({
        error: err.message || 'Internal Server Error while communicating with Dhan API'
      });
    }
  });

  // API Route: Test Dhan Credentials
  app.post('/api/dhan/verify-credentials', async (req, res) => {
    try {
      const { clientId, accessToken } = req.body;
      if (!clientId || !accessToken) {
        return res.status(400).json({ success: false, error: 'Client ID and Access Token required' });
      }

      // Query Dhan Fund limits or profile endpoint to test connection
      const response = await fetch('https://api.dhan.co/v2/fundlimit', {
        method: 'GET',
        headers: {
          'client-id': clientId,
          'access-token': accessToken,
        }
      });

      const data = await response.json();
      if (response.ok && data.status !== 'failure') {
        return res.json({ success: true, message: 'Dhan HQ API Credentials verified successfully!' });
      } else {
        return res.status(400).json({
          success: false,
          error: data.remarks || data.message || 'Invalid Client ID or Access Token'
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to verify Dhan connection' });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
