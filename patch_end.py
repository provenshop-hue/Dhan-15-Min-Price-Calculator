import sys

with open('src/components/ParabolicRallyDashboard.tsx', 'r') as f:
    content = f.read()

# Let's fix the end manually
content = content.replace('''
              </div>
            </div>
                  </>
        )}
      </div>
    );
  };
''', '''
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
''')

with open('src/components/ParabolicRallyDashboard.tsx', 'w') as f:
    f.write(content)
