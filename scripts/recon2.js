const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('https://www.theuniversitysustainabilityinitiative.org', {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 2500));

  const data = await page.evaluate(() => {
    function walk(el, depth, out) {
      const hasShadow = !!el.shadowRoot;
      out.push({
        depth,
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        cls: (el.getAttribute && el.getAttribute('class')) || null,
        dataTestId: el.getAttribute ? el.getAttribute('data-testid') : null,
        hasShadow,
      });
      const root = el.shadowRoot || el;
      Array.from(root.children).forEach((c) => walk(c, depth + 1, out));
    }
    const out = [];
    walk(document.getElementById('SITE_PAGES'), 0, out);
    return {
      total: out.length,
      shadowCount: out.filter(o => o.hasShadow).length,
      firstLevels: out.filter(o => o.depth <= 6),
    };
  });

  require('fs').writeFileSync(
    'c:/Users/Asus/Documents/Repositories/YouSI/recon/shadow.json',
    JSON.stringify(data, null, 2)
  );
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
