import { getDhanSecurityId, isIndexSymbol } from '../data/dhanSecurityMap';

export function openDhanChart(stock: { symbol: string; securityId?: string }) {
  const symbol = (stock.symbol || 'NIFTY').toUpperCase().trim();
  const isIdx = isIndexSymbol ? isIndexSymbol(symbol) : (symbol.includes('NIFTY') || symbol.includes('SENSEX') || symbol === 'NIFTY' || symbol === 'BANKNIFTY' || symbol === 'SENSEX');
  const exchPrefix = symbol === 'SENSEX' ? 'BSE' : 'NSE';
  
  // Open direct TradingView interactive chart for the exact stock symbol (which powers Dhan charts)
  const chartUrl = `https://in.tradingview.com/chart/?symbol=${exchPrefix}:${symbol}`;
  console.log(`Opening stock chart for ${exchPrefix}:${symbol} -> ${chartUrl}`);
  window.open(chartUrl, '_blank');
}
