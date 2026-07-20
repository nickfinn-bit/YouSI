const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5500/', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 500));

  const info = await page.evaluate(() => {
    function cs(sel) {
      const el = document.querySelector(sel);
      if (!el) return { found: false };
      const c = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        found: true,
        tag: el.tagName,
        display: c.display, opacity: c.opacity, visibility: c.visibility,
        position: c.position, width: c.width, height: c.height,
        rect: { w: r.width, h: r.height },
      };
    }
    return {
      section: cs('#comp-mfqwwdpd'),
      innerStrip: cs('#comp-mfqwwdqn'),
      column: cs('#comp-mfqwwdqp1'),
      bgMedia: cs('#bgMedia_comp-mfqwwdqp1'),
      wowImage: cs('#bgMedia_comp-mfqwwdqp1 wow-image'),
      img: cs('#bgMedia_comp-mfqwwdqp1 img'),
      heading: cs('h1, h2'),
      headingText: (document.querySelector('h1,h2') || {}).textContent,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
