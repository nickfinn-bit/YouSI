const puppeteer = require('puppeteer');

const pages = ['', 'about-us/', 'events/', 'projects/', 'business-development-competition/'];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  let anyIssue = false;
  for (const p of pages) {
    const page = await browser.newPage();
    const failures = [];
    page.on('requestfailed', (r) => failures.push(`REQFAIL ${r.url()} ${r.failure().errorText}`));
    page.on('response', (r) => { if (r.status() >= 400) failures.push(`HTTP${r.status()} ${r.url()}`); });
    page.on('pageerror', (e) => failures.push(`JSERR ${e.message}`));
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:5500/${p}`, { waitUntil: 'networkidle0', timeout: 30000 });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(`/${p}  height=${height}  issues=${failures.length}`);
    failures.forEach((f) => console.log('   ' + f));
    if (failures.length) anyIssue = true;
    await page.close();
  }
  await browser.close();
  process.exit(anyIssue ? 1 : 0);
})();
