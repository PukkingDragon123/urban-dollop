/* Render the animated itch cover and banner.
   node tools/make-gifs.js   (needs Playwright and a Chromium)
   Writes press/cover-630x500.gif and press/banner-1600x500.gif
   (the PNG stills beside them come from press-cover.html). */
const fs = require('fs'), path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const ROOT = path.resolve(__dirname, '..');
(async () => {
  const exe = process.env.CHROME || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
  const b = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(ROOT, 'tools', 'press-gif.html'));
  await p.waitForFunction(() => window.READY === 1);
  for (const [which, file, N, delay] of [['cover', 'cover-630x500', 32, 8], ['banner', 'banner-1600x500', 32, 8]]) {
    const r = await p.evaluate(([w, n, d]) => window.makeGIF(w, n, d), [which, N, delay]);
    fs.writeFileSync(path.join(ROOT, 'press', file + '.gif'), Buffer.from(r.gif, 'base64'));
    console.log(file + '.gif', Math.round(Buffer.from(r.gif, 'base64').length / 1024) + ' KB');
  }
  if (errs.length) { console.error('ERRORS', errs); process.exitCode = 1; }
  await b.close();
})();
