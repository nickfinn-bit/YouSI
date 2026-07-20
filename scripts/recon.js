// Reconnaissance pass: map out top-level structure of the page so we can
// work through it element-by-element instead of dumping the whole DOM at once.
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('https://www.theuniversitysustainabilityinitiative.org', {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });

  // let any on-load transitions / observers settle
  await new Promise((r) => setTimeout(r, 2000));

  const structure = await page.evaluate(() => {
    function describe(el, depth) {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        classes: el.className && typeof el.className === 'string' ? el.className : null,
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        childCount: el.children.length,
      };
    }
    const body = document.body;
    const top = Array.from(body.children).map((el) => describe(el));
    // also drill one level into <main> or first big wrapper if present
    const main = document.querySelector('main') || body;
    const secondLevel = Array.from(main.children).map((el) => describe(el));
    return {
      title: document.title,
      bodyChildren: top,
      mainSelector: main.tagName.toLowerCase() + (main.id ? '#' + main.id : ''),
      mainChildren: secondLevel,
      docHeight: document.documentElement.scrollHeight,
      docWidth: document.documentElement.scrollWidth,
      stylesheets: Array.from(document.styleSheets).map((s) => s.href).filter(Boolean),
      scripts: Array.from(document.scripts).map((s) => s.src).filter(Boolean),
      inlineStyleTags: document.querySelectorAll('style').length,
      inlineScriptTags: Array.from(document.scripts).filter(s => !s.src).length,
      fonts: Array.from(document.querySelectorAll('link[rel="stylesheet"], link[href*="font"]')).map(l => l.href),
      metaGenerator: (document.querySelector('meta[name="generator"]') || {}).content || null,
    };
  });

  require('fs').writeFileSync(
    'c:/Users/Asus/Documents/Repositories/YouSI/recon/structure.json',
    JSON.stringify(structure, null, 2)
  );

  console.log(JSON.stringify(structure, null, 2));

  await browser.close();
})();
