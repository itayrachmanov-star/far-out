#!/bin/sh
# Builds dist/ from the source:
#   dist/index.html     standalone page for any static host (GitHub Pages, Netlify, itch.io…);
#                       online play there uses free peer-to-peer PeerJS
#   dist/artifact.html  the same page without the document wrapper, for publishing as a claude.ai artifact
# All data/*.js files are bundled into dist/data/bank.js (one request instead of dozens).
cd "$(dirname "$0")/.." || exit 1
sh scripts/sync-data.sh >/dev/null
rm -rf dist && mkdir -p dist/data
cp -R css js assets manifest.webmanifest dist/
sed "s/__BUILD__/$(date +%Y%m%d%H%M%S)/" sw.js > dist/sw.js
cat data/*.js > dist/data/bank.js
python3 - <<'PY'
import re
src = open('index.html').read()
src = re.sub(r'<!-- DATA:start -->.*?<!-- DATA:end -->', '<script src="data/bank.js"></script>', src, flags=re.S)
open('dist/artifact.html', 'w').write(src.replace('<script src="js/text.js">', '<script>window.FAROUT_ARTIFACT = true;</script>\n<script src="js/text.js">', 1))
cut = src.index('css/screens.css">') + len('css/screens.css">')
head, body = src[:cut], src[cut:]
app = ('<link rel="manifest" href="manifest.webmanifest">\n<meta name="theme-color" content="#05060d">\n'
       '<link rel="icon" href="assets/icon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">\n'
       '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n'
       '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="Far Out">\n'
       '<meta property="og:title" content="Far Out">\n<meta property="og:description" content="The game of rare answers. Everyone says apple, you say rambutan.">\n'
       '<meta property="og:image" content="assets/icon-512.png">\n')
out = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
       + app + head + '\n</head>\n<body>' + body + '</body>\n</html>\n')
open('dist/index.html', 'w').write(out)
PY
touch dist/.nojekyll
echo "Built dist/ ($(du -sh dist | cut -f1))"
