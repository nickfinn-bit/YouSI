const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('https://www.theuniversitysustainabilityinitiative.org', {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 2500));
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y <= h; y += 400) { window.scrollTo(0, y); await sleep(120); }
    window.scrollTo(0, 0);
    await sleep(500);
  });

  const data = await page.evaluate(() => {
    const containerRoot = document.getElementById('Containersuyqo');
    const mesh = containerRoot.querySelector('[data-testid="mesh-container-content"]');
    const sections = Array.from(mesh.children).map((el, i) => {
      const r = el.getBoundingClientRect();
      return {
        index: i,
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        cls: el.getAttribute('class'),
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        text: (el.innerText || '').slice(0, 100).replace(/\n/g, ' | '),
      };
    });
    const r0 = mesh.getBoundingClientRect();
    return { meshRect: { x: r0.x, y: r0.y, w: r0.width, h: r0.height }, sections };
  });

  fs.writeFileSync('c:/Users/Asus/Documents/Repositories/YouSI/recon/sections.json', JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
