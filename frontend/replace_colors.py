import os
import re

replacements = {
    '#0D1117': '#050000',
    '#161B22': '#0f0202',
    '#30363D': '#3a0909',
    '#58A6FF': '#ff2a2a',
    '#E6EDF3': '#ffe5e5',
    '#8B949E': '#a37c7c',
    '#21262D': '#1a0505',
    '#1f3a5a': '#330000',
    '#388bfd': '#ff5555',
    '#1f6cc7': '#cc0000',
    '#484F58': '#662222',
    '#1f3a4a': '#2a0505',
}

files = [
    r'c:\Users\vignesh\Downloads\hackathon\project\frontend\src\App.jsx',
    r'c:\Users\vignesh\Downloads\hackathon\project\frontend\src\index.css'
]

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    for old, new in replacements.items():
        content = re.sub(re.escape(old), new, content, flags=re.IGNORECASE)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print('Colors replaced successfully.')
