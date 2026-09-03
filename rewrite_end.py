import sys
with open('src/components/ParabolicRallyDashboard.tsx', 'r') as f:
    content = f.read()

parts = content.split('      {/* 📈 15-MINUTE CANDLESTICK CHART MODAL */}')
if len(parts) < 2:
    print("Cannot find modal start")
    sys.exit(1)

new_tail = '''      {/* 📈 15-MINUTE CANDLESTICK CHART MODAL */}
      {chartStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-black">{chartStock.symbol}</h3>
                  <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded font-bold">
                    15-Minute TradingView Style Chart
                  </span>
                </div>
                <p className="text-xs text-slate-400">{chartStock.companyName}</p>
              </div>
              <button
                onClick={() => setChartStock(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 bg-slate-900">
              <FifteenMinCandleChartSnapshot
                stock={chartStock}
                credentials={credentials}
                height={400}
                onSelectStock={(s) => setChartStock(s)}
              />
            </div>
            <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-600">
                15-Minute Candles, Session VWAP &amp; Volume Histogram
              </div>
              <button
                onClick={() => setChartStock(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Chart
              </button>
            </div>
          </div>
        </div>
      )}

        </>
      )}
    </div>
  );
};
'''

with open('src/components/ParabolicRallyDashboard.tsx', 'w') as f:
    f.write(parts[0] + new_tail)
