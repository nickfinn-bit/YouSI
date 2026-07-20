// Click each nav link from the homepage and confirm it lands on the correct
// local page (real browser navigation, not just an HTTP status check).
const puppeteer = require('puppeteer');

const expected = [
  { label: 'About Us', urlIncludes: '/about-us/' },
  { label: 'Events', urlIncludes: '/events/' },
  { label: 'Projects', urlIncludes: '/projects/' },
  { label: 'Entrepreneurship', urlIncludes: '/business-development-competition/' },
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const results = [];
  for (const e of expected) {
    await page.goto('http://localhost:5500/', { waitUntil: 'networkidle0' });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click(`a[aria-label="${e.label}"]`),
    ]);
    const url = page.url();
    results.push({ label: e.label, url, ok: url.includes(e.urlIncludes) });
  }
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
