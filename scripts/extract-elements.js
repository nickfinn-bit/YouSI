const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'recon');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });
  await page.goto('https://www.theuniversitysustainabilityinitiative.org', {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 2000));
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y <= h; y += 400) { window.scrollTo(0, y); await sleep(150); }
    window.scrollTo(0, 0);
    await sleep(600);
  });

  const targets = [
    { name: 'header', selector: '#SITE_HEADER' },
    { name: 'section0', selector: '#comp-mfqwwdpd' },
    { name: 'section1', selector: '#comp-mg9rg3fl' },
    { name: 'footer', selector: '#SITE_FOOTER' },
  ];

  for (const t of targets) {
    const html = await page.$eval(t.selector, el => el.outerHTML);
    fs.writeFileSync(path.join(OUT, `${t.name}.html`), html);
    const el = await page.$(t.selector);
    await el.screenshot({ path: path.join(OUT, `live-${t.name}.png`) });
    console.log(`saved ${t.name}: ${html.length} chars`);
  }

  await browser.close();
})();
