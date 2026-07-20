// Generic recon for any page of the site: mirrors recon.js/recon3.js/recon4.js
// but parameterized so we can run it against About Us / Events / Projects /
// Entrepreneurship without hand-writing a one-off script per page.
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const url = process.argv[2];
const slug = process.argv[3];
if (!url || !slug) {
  console.error('usage: node recon-page.js <url> <slug>');
  process.exit(1);
}

const OUT = path.join(__dirname, '..', 'recon', slug);
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y <= h; y += 400) { window.scrollTo(0, y); await sleep(150); }
    window.scrollTo(0, 0);
    await sleep(600);
  });

  const data = await page.evaluate(() => {
    const containerRoot = document.getElementById('Containersuyqo') || document.querySelector('main#PAGES_CONTAINER');
    const mesh = containerRoot.querySelector('[data-testid="mesh-container-content"]');
    const sections = Array.from(mesh.children).map((el, i) => {
      const r = el.getBoundingClientRect();
      return {
        index: i, tag: el.tagName.toLowerCase(), id: el.id || null,
        cls: el.getAttribute('class'),
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        text: (el.innerText || '').slice(0, 120).replace(/\n/g, ' | '),
      };
    });
    const images = Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.currentSrc || img.src, alt: img.alt,
      w: img.naturalWidth, h: img.naturalHeight,
    }));
    return {
      title: document.title,
      docHeight: document.documentElement.scrollHeight,
      docWidth: document.documentElement.scrollWidth,
      sections,
      images,
      headerId: (document.querySelector('header') || {}).id,
      footerId: (document.querySelector('footer') || {}).id,
    };
  });

  const allCss = await page.evaluate(() =>
    Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n\n/* ---- next <style> ---- */\n\n')
  );
  fs.writeFileSync(path.join(OUT, 'all.css'), allCss);

  // Save each top-level content section's outerHTML individually.
  const sectionHandles = await page.$$('main#PAGES_CONTAINER [data-testid="mesh-container-content"] > *');
  for (let i = 0; i < sectionHandles.length; i++) {
    const html = await sectionHandles[i].evaluate(el => el.outerHTML);
    fs.writeFileSync(path.join(OUT, `section${i}.html`), html);
  }

  fs.writeFileSync(path.join(OUT, 'data.json'), JSON.stringify(data, null, 2));
  console.log(JSON.stringify({ ...data, images: data.images.length + ' images', allCssLength: allCss.length }, null, 2));

  await browser.close();
})();
