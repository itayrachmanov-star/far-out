#!/bin/sh
# Rewrites the data <script> tags in index.html from the files in data/.
cd "$(dirname "$0")/.." || exit 1
tags=$(for f in data/*.js; do printf '<script src="%s"></script>\\n' "$f"; done)
python3 - "$tags" <<'PY'
import re, sys
tags = sys.argv[1].replace('\\n', '\n')
s = open('index.html').read()
s = re.sub(r'<!-- DATA:start -->.*?<!-- DATA:end -->', '<!-- DATA:start -->\n' + tags + '<!-- DATA:end -->', s, flags=re.S)
open('index.html', 'w').write(s)
PY
echo "index.html now loads: $(ls data/*.js | tr '\n' ' ')"
