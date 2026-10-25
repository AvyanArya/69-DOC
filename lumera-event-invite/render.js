// Renders index.html frame by frame with headless Chromium and encodes it with ffmpeg.
//
//   node render.js                       full film -> lumera-invite.mp4
//   node render.js --events-only         just write audio/events.json (SFX timing)
//   node render.js --from 12 --to 16     a slice, handy while iterating
//
// Options: --fps 30  --workers 4  --audio audio/soundtrack.wav  --out lumera-invite.mp4
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : args[i + 1]; };
const flag = name => args.includes('--' + name);

const ROOT = __dirname;
const FPS = +opt('fps', 30);
const WORKERS = +opt('workers', 4);
const OUT = path.resolve(opt('out', path.join(ROOT, 'lumera-invite.mp4')));
const WAV = path.join(ROOT, 'audio', 'soundtrack.wav');
const AUDIO = path.resolve(opt('audio', fs.existsSync(WAV) ? WAV : path.join(ROOT, 'assets', 'audio', 'soundtrack.m4a')));
const TMP = path.resolve(opt('tmp', path.join(ROOT, '.render')));
const URL = 'file://' + path.join(ROOT, 'index.html') + '?render=1';

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  return page;
}

function ffmpeg(argv) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', argv, { stdio: ['pipe', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d; if (err.length > 20000) err = err.slice(-20000); });
    p.on('close', code => code === 0 ? resolve() : reject(new Error('ffmpeg failed:\n' + err)));
  });
}

async function renderSegment(browser, k, f0, f1, file) {
  const page = await openPage(browser);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(FPS), file], { stdio: ['pipe', 'ignore', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg segment ' + k))));
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    await page.evaluate(t => window.seekAsync(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 96 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 60 === 0) {
      const n = f - f0 + 1, rate = n / ((Date.now() - t0) / 1000);
      console.log(`  worker ${k}: frame ${f}/${f1 - 1}  (${rate.toFixed(1)} fps)`);
    }
  }
  ff.stdin.end();
  await done;
  await page.close();
}

(async () => {
  const browser = await chromium.launch();
  const probe = await openPage(browser);
  const DUR = await probe.evaluate(() => window.DUR);
  const events = await probe.evaluate(() => window.events());
  fs.mkdirSync(path.join(ROOT, 'audio'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'audio', 'events.json'), JSON.stringify(events, null, 1));
  console.log('wrote audio/events.json');
  await probe.close();
  if (flag('events-only')) { await browser.close(); return; }

  const from = Math.round(+opt('from', 0) * FPS), to = Math.round(+opt('to', DUR) * FPS);
  fs.mkdirSync(TMP, { recursive: true });
  const per = Math.ceil((to - from) / WORKERS);
  const segs = [];
  const jobs = [];
  for (let k = 0; k < WORKERS; k++) {
    const a = from + k * per, b = Math.min(to, a + per);
    if (a >= b) break;
    const file = path.join(TMP, `seg_${k}.mp4`);
    segs.push(file);
    jobs.push(renderSegment(browser, k, a, b, file));
  }
  console.log(`rendering frames ${from}..${to - 1} at ${FPS} fps with ${jobs.length} workers`);
  await Promise.all(jobs);
  await browser.close();

  const list = path.join(TMP, 'list.txt');
  fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
  const video = path.join(TMP, 'video.mp4');
  await ffmpeg(['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);
  const hasAudio = fs.existsSync(AUDIO) && !flag('silent');
  const start = from / FPS;
  const mux = ['-y', '-loglevel', 'error', '-i', video];
  if (hasAudio) mux.push('-ss', String(start), '-t', String((to - from) / FPS), '-i', AUDIO, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '256k');
  // segments are near-lossless (crf 14); the deliverable gets one careful pass
  mux.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT);
  await ffmpeg(mux);
  console.log(`done -> ${OUT}${hasAudio ? '' : ' (no audio)'}`);
})().catch(e => { console.error(e); process.exit(1); });
