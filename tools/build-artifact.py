#!/usr/bin/env python3
"""
Pack the game into one self-contained HTML file.

The game ships as index.html plus a stylesheet and ten scripts. An Artifact is
a single page, so this inlines all of it in load order and writes the result
somewhere you can publish from. There are no external requests left at all -
the typeface is a base64 @font-face inside style.css - so the page works
offline and in a sandbox.

    python3 tools/build-artifact.py [out.html]
"""
import re, os, sys

here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, 'inf-egg-co.html')

html = open(os.path.join(here, 'index.html')).read()
css = open(os.path.join(here, 'style.css')).read()

body = html[html.index('<body>') + len('<body>'):html.index('</body>')]
scripts = re.findall(r'<script src="([^"]+)"></script>', body)
body = re.sub(r'<script src="[^"]+"></script>\s*', '', body).strip()
assert scripts, 'no scripts found in index.html'

parts = ['<title>Inf Egg Co.</title>', '<style>\n' + css + '\n</style>', body]
for src in scripts:
    code = open(os.path.join(here, src)).read()
    assert '</script' not in code, src + ' would close its own tag'
    parts.append('<script>\n/* ' + src + ' */\n' + code + '\n</script>')

open(out, 'w').write('\n\n'.join(parts) + '\n')
print('%s  %.0f KB  (%d scripts inlined)' % (out, os.path.getsize(out) / 1024, len(scripts)))
