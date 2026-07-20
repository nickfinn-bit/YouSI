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
  // nudge scroll to trigger any scroll-based reveal animations, then back to top
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y <= h; y += 400) {
      window.scrollTo(0, y);
      await sleep(120);
    }
    window.scrollTo(0, 0);
    await sleep(500);
  });

  const data = await page.evaluate(() => {
    const allCss = Array.from(document.querySelectorAll('style'))
      .map(s => s.textContent)
      .join('\n');

    const linkSheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href);

    const mesh = document.querySelector('[data-testid="mesh-container-content"]');
    const sections = Array.from(mesh.children).map((el, i) => {
      const r = el.getBoundingClientRect();
      return {
        index: i,
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        cls: el.getAttribute('class'),
        testid: el.getAttribute('data-testid'),
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        text: el.innerText ? el.innerText.slice(0, 80) : '',
      };
    });

    // header (fixed nav) is usually a sibling outside the page scroll container
    const headerCandidates = Array.from(document.querySelectorAll('header, [data-testid*="header"], [id*="HEADER"], [id*="SITE_HEADER"]')).map(el => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), id: el.id, cls: el.getAttribute('class'), rect: { x: r.x, y: r.y, w: r.width, h: r.height } };
    });
    const footerCandidates = Array.from(document.querySelectorAll('footer, [data-testid*="footer"], [id*="FOOTER"], [id*="SITE_FOOTER"]')).map(el => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), id: el.id, cls: el.getAttribute('class'), rect: { x: r.x, y: r.y, w: r.width, h: r.height } };
    });

    const images = Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.currentSrc || img.src,
      srcset: img.srcset || null,
      alt: img.alt,
      w: img.naturalWidth,
      h: img.naturalHeight,
      displayRect: (() => { const r = img.getBoundingClientRect(); return { w: r.width, h: r.height }; })(),
    }));

    const bgImages = [];
    document.querySelectorAll('*').forEach(el => {
      const bg = getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none' && bg.includes('wixstatic')) {
        bgImages.push(bg);
      }
    });

    return {
      allCssLength: allCss.length,
      linkSheets,
      sections,
      headerCandidates,
      footerCandidates,
      images,
      bgImages: Array.from(new Set(bgImages)),
      docHeight: document.documentElement.scrollHeight,
    };
  });

  const allCss = await page.evaluate(() =>
    Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n\n/* ---- next <style> ---- */\n\n')
  );
  fs.writeFileSync('c:/Users/Asus/Documents/Repositories/YouSI/recon/all.css', allCss);

  const bodyHtml = await page.evaluate(() => document.body.outerHTML);
  fs.writeFileSync('c:/Users/Asus/Documents/Repositories/YouSI/recon/body.html', bodyHtml);

  fs.writeFileSync('c:/Users/Asus/Documents/Repositories/YouSI/recon/data.json', JSON.stringify(data, null, 2));
  console.log(JSON.stringify({ ...data, images: data.images.length + ' images', bgImages: data.bgImages.length + ' bg images' }, null, 2));

  await browser.close();
})();
