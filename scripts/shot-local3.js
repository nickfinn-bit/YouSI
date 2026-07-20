const puppeteer = require('puppeteer');
const path = require('path');

const urlPath = process.argv[2];   // e.g. "about-us/"
const selector = process.argv[3];
const name = process.argv[4];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:5500/${urlPath}`, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y <= h; y += 400) { window.scrollTo(0, y); await sleep(150); }
    window.scrollTo(0, 0);
    await sleep(900);
  });
  const el = await page.$(selector);
  if (!el) { console.error('NOT FOUND: ' + selector); process.exit(1); }
  const out = path.join(__dirname, '..', 'recon', name);
  await el.screenshot({ path: out });
  console.log('saved ' + out);
  await browser.close();
})();
