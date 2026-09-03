import sys
with open('src/components/ParabolicRallyDashboard.tsx', 'r') as f:
    lines = f.readlines()

out = lines[:-5] + [
"          </div>\n",
"        </div>\n",
"      )}\n",
"      </>\n",
"      )}\n",
"    </div>\n",
"  );\n",
"};\n"
]
with open('src/components/ParabolicRallyDashboard.tsx', 'w') as f:
    f.writelines(out)
