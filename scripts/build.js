const fs = require('fs');
const path = require('path');
const { rewriteNavLinks } = require('./nav-links');

const RECON = path.join(__dirname, '..', 'recon');
const SITE = path.join(__dirname, '..', 'site');

// media-id -> local asset file (all under site/assets/images/)
const MAP = {
  'be068c_6485d91e47c941e69303a6836ba7a299': 'logo-crop-3x.png',
  '11062b_6a0d3eec46e1448bb4d61d9cd83138fd': '11062b_6a0d3eec46e1448bb4d61d9cd83138fd~mv2.jpg',
  'be068c_3761e82a57524b0faadea0d6e69f0cb5': 'be068c_3761e82a57524b0faadea0d6e69f0cb5~mv2.png',
  'be068c_c14183790dc84d72aa8aad2a2b15c09d': 'icon-c14183-crop-3x.png',
  'be068c_5e8049da239f4069a742c6bb2a9f8f38': 'be068c_5e8049da239f4069a742c6bb2a9f8f38~mv2.png',
  'be068c_7a25106c5b524b35b29dcfefbf1b1e2d': 'be068c_7a25106c5b524b35b29dcfefbf1b1e2d~mv2.png',
  'be068c_674059fabfdd442e9de139abc7ffe601': 'be068c_674059fabfdd442e9de139abc7ffe601~mv2.png',
  'be068c_9253bb2aec0a44ac877c05a70438b14e': 'be068c_9253bb2aec0a44ac877c05a70438b14e~mv2.png',
  'be068c_61763e1efd314fcf8f079b90488e1f1a': 'be068c_61763e1efd314fcf8f079b90488e1f1a~mv2.png',
  'be068c_98136ea391fb41af92816fc5566a4f18': 'be068c_98136ea391fb41af92816fc5566a4f18~mv2.jpg',
};

function rewriteAssetUrls(str) {
  let out = str;
  for (const [id, file] of Object.entries(MAP)) {
    const re = new RegExp(`https:\\/\\/static\\.wixstatic\\.com\\/media\\/${id}[^"'\\s)]*`, 'g');
    out = out.replace(re, `/assets/images/${file}`);
  }
  return out;
}

const header = rewriteNavLinks(rewriteAssetUrls(fs.readFileSync(path.join(RECON, 'header.html'), 'utf8')));
const section0 = rewriteAssetUrls(fs.readFileSync(path.join(RECON, 'section0.html'), 'utf8'));
const section1 = rewriteAssetUrls(fs.readFileSync(path.join(RECON, 'section1.html'), 'utf8'));
const footer = rewriteNavLinks(rewriteAssetUrls(fs.readFileSync(path.join(RECON, 'footer.html'), 'utf8')));
let css = fs.readFileSync(path.join(RECON, 'all.css'), 'utf8');
css = rewriteAssetUrls(css);

fs.mkdirSync(path.join(SITE, 'assets'), { recursive: true });
fs.writeFileSync(path.join(SITE, 'assets', 'site.css'), css);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>USI: Bringing exciting opportunities to students</title>
<meta name="description" content="USI is a multi-university organisation dedicated to supporting student interest in sustainability-related academics; constituent university societies open up projects that would otherwise only be open to that university´s student body, giving more students access to exciting hands-on projects and competitions.">
<link rel="icon" href="/assets/images/be068c_98136ea391fb41af92816fc5566a4f18~mv2.jpg">
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/local.css">
</head>
<body>
<div id="page-root" class="theme-vars max-width-container">
${header}
<main id="PAGES_CONTAINER">
<div data-testid="mesh-container-content" class="page-sections">
${section0}
${section1}
</div>
</main>
${footer}
</div>
<script src="/assets/site.js"></script>
</body>
</html>
`;

fs.writeFileSync(path.join(SITE, 'index.html'), html);
console.log('Built site/index.html (' + html.length + ' chars) and assets/site.css (' + css.length + ' chars)');
