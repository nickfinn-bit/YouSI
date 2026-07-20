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
  await new Promise((r) => setTimeout(r, 2000));

  const data = await page.evaluate(() => {
    const navLinks = Array.from(document.querySelectorAll('#SITE_HEADER a[href]')).map(a => ({
      text: a.innerText.trim(),
      href: a.href,
    }));
    const footerText = document.getElementById('SITE_FOOTER').innerText;
    const footerLinks = Array.from(document.getElementById('SITE_FOOTER').querySelectorAll('a[href]')).map(a => ({
      text: a.innerText.trim(), href: a.href,
    }));
    const favicon = Array.from(document.querySelectorAll('link[rel*="icon"]')).map(l => l.href);
    const metaDesc = (document.querySelector('meta[name="description"]') || {}).content;
    return { navLinks, footerText, footerLinks, favicon, metaDesc, title: document.title };
  });

  console.log(JSON.stringify(data, null, 2));
  fs.writeFileSync('c:/Users/Asus/Documents/Repositories/YouSI/recon/nav.json', JSON.stringify(data, null, 2));
  await browser.close();
})();
