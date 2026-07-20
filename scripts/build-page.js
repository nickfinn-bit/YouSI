// Assemble a subpage from its extracted section fragments + shared header/footer.
const fs = require('fs');
const path = require('path');
const { rewriteNavLinks } = require('./nav-links');

const slug = process.argv[2];
const titleArg = process.argv[3] || '';
if (!slug) { console.error('usage: node build-page.js <slug> [title]'); process.exit(1); }

const ROOT = path.join(__dirname, '..');
const RECON = path.join(ROOT, 'recon', slug);
const SITE = path.join(ROOT, 'site');
const PAGE_DIR = path.join(SITE, slug);
fs.mkdirSync(PAGE_DIR, { recursive: true });

// Same media-id map used for the homepage build, for header/footer assets.
const HEADER_FOOTER_MAP = {
  'be068c_6485d91e47c941e69303a6836ba7a299': 'logo-crop-3x.png',
  'be068c_98136ea391fb41af92816fc5566a4f18': 'be068c_98136ea391fb41af92816fc5566a4f18~mv2.jpg',
};

function rewriteByMediaId(str) {
  let out = str;
  for (const [id, file] of Object.entries(HEADER_FOOTER_MAP)) {
    const re = new RegExp(`https:\\/\\/static\\.wixstatic\\.com\\/media\\/${id}[^"'\\s)]*`, 'g');
    out = out.replace(re, `/assets/images/${file}`);
  }
  return out;
}

function rewriteByExactMap(str, map) {
  let out = str;
  for (const [url, local] of Object.entries(map)) {
    out = out.split(url).join(`/${local}`);
  }
  return out;
}

const header = rewriteNavLinks(rewriteByMediaId(fs.readFileSync(path.join(ROOT, 'recon', 'header.html'), 'utf8')));
const footer = rewriteNavLinks(rewriteByMediaId(fs.readFileSync(path.join(ROOT, 'recon', 'footer.html'), 'utf8')));

const urlMap = JSON.parse(fs.readFileSync(path.join(RECON, 'urlmap.json'), 'utf8'));

const sectionFiles = fs.readdirSync(RECON).filter((f) => /^section\d+\.html$/.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
const sections = sectionFiles.map((f) => rewriteByExactMap(fs.readFileSync(path.join(RECON, f), 'utf8'), urlMap));

let css = fs.readFileSync(path.join(RECON, 'all.css'), 'utf8');
css = rewriteByExactMap(css, urlMap);
css = rewriteByMediaId(css);
fs.writeFileSync(path.join(PAGE_DIR, 'style.css'), css);

const dataPath = path.join(RECON, 'data.json');
const data = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, 'utf8')) : {};
const title = titleArg || data.title || slug;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="icon" href="/assets/images/be068c_98136ea391fb41af92816fc5566a4f18~mv2.jpg">
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="/assets/local.css">
</head>
<body>
<div id="page-root" class="theme-vars max-width-container">
${header}
<main id="PAGES_CONTAINER">
<div data-testid="mesh-container-content" class="page-sections">
${sections.join('\n')}
</div>
</main>
${footer}
</div>
<script src="/assets/site.js"></script>
</body>
</html>
`;

fs.writeFileSync(path.join(PAGE_DIR, 'index.html'), html);
console.log(`Built site/${slug}/index.html (${html.length} chars), style.css (${css.length} chars), ${sections.length} sections`);
