import sys

with open('src/components/ParabolicRallyDashboard.tsx', 'r') as f:
    content = f.read()

broken = '''              <button
                onClick={() => setChartStock(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Chart
              </button>
            </div>
          </div>
        
        </>
      )}
    </div>
  );
};'''

fixed = '''              <button
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
};'''

content = content.replace(broken, fixed)
with open('src/components/ParabolicRallyDashboard.tsx', 'w') as f:
    f.write(content)
