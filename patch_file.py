import sys

with open('src/components/ParabolicRallyDashboard.tsx', 'r') as f:
    content = f.read()

live_start = '      {/* 📊 Summary Stats Chips */}'
if live_start not in content:
    print('Pattern not found')
    sys.exit(1)

parts = content.split(live_start, 1)

new_content = parts[0] + '''
      {viewMode === 'HISTORY' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Historical Parabolic Hits Log
            </h3>
            
            {historyRecords.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No historical records found in IndexedDB yet.
              </div>
            ) : (
              <div className="space-y-8">
                {historyRecords.map((record) => (
                  <div key={record.date} className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <span className="text-sm font-black text-slate-900">{record.date}</span>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {record.hits.length} Strong Hits
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {record.hits.map((hit: any, i: number) => {
                        const isBull = hit.direction === 'BULLISH';
                        const pct = hit.stock.pctChange || 0;
                        return (
                          <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs hover:border-indigo-300 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-black text-slate-900">{hit.stock.symbol}</span>
                                <span className={ `text-[10px] font-bold px-1.5 py-0.5 rounded ${isBull ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}` }>
                                  {isBull ? 'Bullish' : 'Bearish'}
                                </span>
                              </div>
                              <div className="text-[11px] font-black text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                {hit.score}/16
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-3 text-xs">
                              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                {hit.timing?.timeStr || 'N/A'}
                              </div>
                              <div className={ `font-bold ${pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}` }>
                                {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
''' + live_start + parts[1]

new_content = new_content.rsplit('</div>', 2)[0] + '        </>\n      )}\n    </div>\n  );\n};\n'

with open('src/components/ParabolicRallyDashboard.tsx', 'w') as f:
    f.write(new_content)
