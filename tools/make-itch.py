#!/usr/bin/env python3
"""Package the game for an itch.io browser upload.

itch serves the zip's index.html in an iframe, so the single-file build goes
in as index.html at the root of the zip with nothing beside it. Run
build-artifact.py first, or let this call it.
"""
import os
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, 'inf-egg-co.html')
OUT = os.path.join(ROOT, 'press', 'inf-egg-co-web.zip')


def main():
    subprocess.check_call([sys.executable, os.path.join(ROOT, 'tools', 'build-artifact.py')])
    assert os.path.exists(BUILD), 'build-artifact.py produced nothing'
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(BUILD, encoding='utf-8') as fh:
        frag = fh.read()
    # build-artifact.py emits a BODY FRAGMENT: the Artifact host supplies the
    # doctype, head and body around it. itch supplies nothing, so wrap it in a
    # real document here or the page has no charset, no viewport and no title.
    assert not frag.lstrip().lower().startswith('<!doctype'), \
        'build-artifact.py now emits a whole document; drop the wrapper below'
    html = (
        '<!doctype html>\n<html lang="en">\n<head>\n'
        '<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, '
        'maximum-scale=1, user-scalable=no, viewport-fit=cover">\n'
        '<meta name="description" content="A raccoon inherits one old hen and a bare '
        'field, and builds an egg empire. Every pixel generated in code.">\n'
        '<meta name="theme-color" content="#14171a">\n'
        '<style>html,body{margin:0;padding:0;background:#14171a;overflow:hidden;}</style>\n'
        '</head>\n<body>\n' + frag + '\n</body>\n</html>\n'
    )
    # itch wants the entry point called index.html, at the root
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        z.writestr('index.html', html)
    os.remove(BUILD)
    print('%s  %.0f KB  (index.html, %.0f KB uncompressed)'
          % (OUT, os.path.getsize(OUT) / 1024, len(html.encode('utf-8')) / 1024))


if __name__ == '__main__':
    main()
