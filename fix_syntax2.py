import sys
with open('src/components/ParabolicRallyDashboard.tsx', 'r') as f:
    lines = f.readlines()

# Strip lines and reconstruct correctly. We'll find the last 20 lines.
last_20 = lines[-20:]
# Let's just output the whole file without the last 5 lines.
# The last 5 lines are:
#         </>
#       )}
#     </div>
#   );
# };
out = lines[:-6] + [
"        </div>\n",
"      )}\n",
"\n",
"      </>\n",
"      )}\n",
"    </div>\n",
"  );\n",
"};\n"
]
with open('src/components/ParabolicRallyDashboard.tsx', 'w') as f:
    f.writelines(out)

