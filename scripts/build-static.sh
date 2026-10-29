#!/bin/sh
# Builds dist/ from the source:
#   dist/index.html     standalone page for any static host (GitHub Pages, Netlify, itch.io…);
#                       online play there uses free peer-to-peer PeerJS
#   dist/artifact.html  the same page without the document wrapper, for publishing as a claude.ai artifact
# All data/*.js files are bundled into dist/data/bank.js (one request instead of dozens).
cd "$(dirname "$0")/.." || exit 1
sh scripts/sync-data.sh >/dev/null
rm -rf dist && mkdir -p dist/data
cp -R css js dist/
cat data/*.js > dist/data/bank.js
python3 - <<'PY'
import re
src = open('index.html').read()
src = re.sub(r'<!-- DATA:start -->.*?<!-- DATA:end -->', '<script src="data/bank.js"></script>', src, flags=re.S)
open('dist/artifact.html', 'w').write(src)
cut = src.index('css/screens.css">') + len('css/screens.css">')
head, body = src[:cut], src[cut:]
out = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
       + head + '\n</head>\n<body>' + body + '</body>\n</html>\n')
open('dist/index.html', 'w').write(out)
PY
touch dist/.nojekyll
echo "Built dist/ ($(du -sh dist | cut -f1))"
