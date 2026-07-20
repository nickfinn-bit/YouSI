const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'recon', 'logos');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 3 });
  await page.goto('https://www.theuniversitysustainabilityinitiative.org', {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 2000));
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y <= h; y += 400) { window.scrollTo(0, y); await sleep(150); }
    window.scrollTo(0, 1200);
    await sleep(600);
  });

  const imgs = await page.$$('#comp-mg9rg3fl img');
  const meta = [];
  for (let i = 0; i < imgs.length; i++) {
    const info = await imgs[i].evaluate(el => ({
      src: el.currentSrc || el.src,
      alt: el.alt,
      rect: el.getBoundingClientRect().toJSON(),
    }));
    try {
      await imgs[i].screenshot({ path: path.join(OUT, `logo-${i}.png`) });
    } catch (e) {
      info.error = e.message;
    }
    meta.push(info);
  }
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log(JSON.stringify(meta, null, 2));
  await browser.close();
})();
