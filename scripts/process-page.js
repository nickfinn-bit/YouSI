// End-to-end pipeline for one subpage: navigate, settle animations, capture
// header/section/footer outerHTML + per-element live screenshots, collect
// every image URL actually used (via DOM, not regex-on-HTML — that approach
// truncated at commas embedded in Wix's own transform path earlier), download
// each at the exact quality the live site serves (never a lazy/thumbnail
// src), then assemble the local page with asset URLs rewritten by exact
// string match.
const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const path = require('path');

const url = process.argv[2];
const slug = process.argv[3];
if (!url || !slug) { console.error('usage: node process-page.js <url> <slug>'); process.exit(1); }

const ROOT = path.join(__dirname, '..');
const RECON = path.join(ROOT, 'recon', slug);
const IMG_DIR = path.join(ROOT, 'site', 'assets', 'images');
const DOC_DIR = path.join(ROOT, 'site', 'assets', 'documents');
fs.mkdirSync(RECON, { recursive: true });
fs.mkdirSync(IMG_DIR, { recursive: true });
fs.mkdirSync(DOC_DIR, { recursive: true });

function download(fileUrl, dest) {
  return new Promise((resolve, reject) => {
    https.get(fileUrl, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`${fileUrl} -> ${res.statusCode}`));
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => { fs.writeFileSync(dest, Buffer.concat(chunks)); resolve(); });
    }).on('error', reject);
  });
}

function localNameFor(u) {
  const m = u.match(/\/media\/([^/]+)\/(?:v1\/)?(?:crop\/[^/]+\/)?fill\/(w_\d+,h_\d+)[^/]*\/([^/?]+)$/);
  if (m) {
    const [, mediaId, wh, filename] = m;
    return `${mediaId}__${wh}__${decodeURIComponent(filename)}`;
  }
  // fallback: plain media URL with no transform (rare)
  const parts = u.split('/');
  return decodeURIComponent(parts[parts.length - 1]);
}

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
    await sleep(700);
  });

  // Section outerHTML + list of section ids/rects
  const sectionInfo = await page.evaluate(() => {
    const mesh = document.querySelector('main#PAGES_CONTAINER [data-testid="mesh-container-content"]');
    return Array.from(mesh.children).map((el) => ({ id: el.id, tag: el.tagName.toLowerCase() }));
  });

  const sectionHtmls = [];
  for (let i = 0; i < sectionInfo.length; i++) {
    const html = await page.evaluate((id) => document.getElementById(id).outerHTML, sectionInfo[i].id);
    sectionHtmls.push(html);
    fs.writeFileSync(path.join(RECON, `section${i}.html`), html);
  }

  // Per-section + header/footer live reference screenshots (element-level, not full page)
  const shotTargets = [{ name: 'header', sel: '#SITE_HEADER' }, ...sectionInfo.map((s, i) => ({ name: `section${i}`, sel: `#${s.id}` })), { name: 'footer', sel: '#SITE_FOOTER' }];
  for (const t of shotTargets) {
    const el = await page.$(t.sel);
    if (el) await el.screenshot({ path: path.join(RECON, `live-${t.name}.png`) });
  }

  // Collect every distinct image URL actually rendered within the page content
  const urls = await page.evaluate(() => {
    const root = document.querySelector('main#PAGES_CONTAINER');
    const set = new Set();
    root.querySelectorAll('img').forEach((img) => {
      if (img.src) set.add(img.src);
      if (img.srcset) img.srcset.split(/,\s*(?=https?:\/\/)/).forEach((c) => { const u = c.trim().split(' ')[0]; if (u) set.add(u); });
    });
    return Array.from(set).filter((u) => u.includes('wixstatic.com'));
  });

  // Collect first-party document links (PDF briefs etc. hosted on the site's
  // own domain under /_files/) — these are static files, unlike the Google
  // Forms/Sheets/Calendar links elsewhere on the page, which are live
  // third-party services and must keep pointing at the real site.
  const docUrls = await page.evaluate(() => {
    const root = document.querySelector('main#PAGES_CONTAINER');
    const set = new Set();
    root.querySelectorAll('a[href*="/_files/"]').forEach((a) => set.add(a.href));
    return Array.from(set);
  });

  const css = await page.evaluate(() =>
    Array.from(document.querySelectorAll('style')).map((s) => s.textContent).join('\n')
  );
  fs.writeFileSync(path.join(RECON, 'all.css'), css);

  await browser.close();

  // Download images, build exact-URL -> local-path map
  const urlMap = {};
  for (const u of urls) {
    const localName = localNameFor(u);
    const dest = path.join(IMG_DIR, localName);
    if (!fs.existsSync(dest)) {
      try { await download(u, dest); } catch (e) { console.error('FAILED', u, e.message); continue; }
    }
    urlMap[u] = `assets/images/${localName}`;
  }
  for (const u of docUrls) {
    const localName = decodeURIComponent(u.split('/').pop());
    const dest = path.join(DOC_DIR, localName);
    if (!fs.existsSync(dest)) {
      try { await download(u, dest); } catch (e) { console.error('FAILED', u, e.message); continue; }
    }
    urlMap[u] = `assets/documents/${localName}`;
  }
  fs.writeFileSync(path.join(RECON, 'urlmap.json'), JSON.stringify(urlMap, null, 2));

  console.log(`[${slug}] sections=${sectionHtmls.length} images=${urls.length} docs=${docUrls.length} downloaded=${Object.keys(urlMap).length}`);
})();
