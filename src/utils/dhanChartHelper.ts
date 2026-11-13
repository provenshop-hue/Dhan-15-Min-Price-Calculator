import { getDhanSecurityId } from '../data/dhanSecurityMap';

export function openDhanChart(stock: { symbol: string; securityId?: string }) {
  const symbol = stock.symbol || 'NIFTY';
  const secId = stock.securityId || getDhanSecurityId(symbol) || '13';
  console.log(`Opening Dhan TV Chart (https://tv.dhan.co) for symbol: ${symbol}, Security ID: ${secId}`);
  window.open('https://tv.dhan.co', '_blank');
}
