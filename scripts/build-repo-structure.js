/* Draw REPO-STRUCTURE.png at the repository root: every top-level folder and
 * file, what goes in each, and every folder one level down.
 *
 *   node scripts/build-repo-structure.js
 *
 * The tree is git's view of the repository: `git ls-files` plus untracked files
 * that are not ignored. It never looks inside .git, node_modules or caches; a
 * top-level one that git sees is still drawn and must be named. Ignored root
 * entries are listed in the footer, with what IGNORED says they hold. It draws
 * first, then exits 1 if any
 * top-level entry has no line in FOLDERS or FILES below, so nothing new reaches
 * the root without saying what it is.
 *
 * GitHub Pages serves this repository's root, so the picture is published with
 * the site: keep every line below fit for the public.
 */
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'REPO-STRUCTURE.png');

/* Never looked inside, at any depth. */
const SKIP = new Set(['.git', 'node_modules', '__pycache__', '.cache']);

/* In the order they are drawn. */
const FOLDERS = {
  'about-us': 'The About Us page, /about-us/: index.html and the style.css only '
    + 'it loads',
  projects: 'The Projects page, /projects/: index.html and its style.css. It lists '
    + 'each year\'s projects and links their briefs in assets/documents/ and the '
    + '2026/27 posters in assets/images/2026-27/posters/',
  'business-development-competition': 'The Entrepreneurship page, '
    + '/business-development-competition/: index.html and its style.css',
  assets: 'What the pages share. local.css and site.js load on every page: fixes '
    + 'to the styles exported from Wix, a layer for phones and tablets, and the '
    + 'entrance animations. site.css holds the home page\'s styles. documents/ '
    + 'holds the project briefs as PDFs: 2026-27/ for this year, the rest earlier '
    + 'years\' under their Wix file names. images/ holds the photos, logos and '
    + 'backgrounds, with this year\'s project images in 2026-27/ and their posters '
    + 'in 2026-27/posters/',
  scripts: 'Node tools, run by hand, that rebuilt the old Wix site as these static '
    + 'pages in July 2026. recon*.js, recon-page.js and extract-*.js scraped it into '
    + 'recon/, which git ignores; process-page.js, download-images.js, build.js and '
    + 'build-page.js made pages from that, with nav-links.js mapping the old links; '
    + 'serve.js, shot-local*.js, final-check.js, click-nav-test.js and '
    + 'debug-section0.js served and checked the copy on localhost:5500. build.js and '
    + 'build-page.js still write to site/ on purpose: a rebuild at the root would '
    + 'overwrite the edits made to the pages since. Also build-repo-structure.js, '
    + 'which draws this picture',
};

const FILES = {
  'index.html': 'The home page, /',
  '.gitignore': 'Keeps node_modules/ and recon/ out of git, and so off the site: '
    + 'see the foot of this picture',
  CNAME: 'The custom domain GitHub Pages serves the site on, '
    + 'theuniversitysustainabilityinitiative.org',
  'REPO-STRUCTURE.png': 'This picture, drawn by scripts/build-repo-structure.js',
  'package.json': 'The npm packages scripts/ needs. The site itself uses none of '
    + 'them',
  'package-lock.json': 'Exact package versions, as npm pinned them',
};

/* Entries at the root that belong elsewhere, and where, drawn in amber. A
 * proposal: nothing is moved by this script. */
const LOOSE = {};

/* What the root entries .gitignore names hold, for the footer. */
const IGNORED = {
  node_modules: 'The npm packages package.json asks for, and the packages they '
    + 'need: puppeteer, which scripts/ uses, and image-size, which nothing here '
    + 'calls. npm install puts them back',
  recon: 'Working material, kept on disk only: the July 2026 scrape of the old Wix '
    + 'site the pages were built from, which scripts/ reads and writes, screenshots '
    + 'of the rebuilt pages, and screenshots and a preview PDF from later checks of '
    + 'changes to the Projects page',
};

function git(...args) {
  return execFileSync('git', ['-c', 'core.quotepath=off', ...args],
    { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
}

function gitPaths(...args) {
  return git('ls-files', '-z', ...args).split('\0').filter(Boolean);
}

/* Top-level folders with their sub-folders, root files, and which of each git
 * tracks. A sub-folder is untracked when no tracked path runs through it. A
 * top-level folder in SKIP is drawn with no sub-folders, and its tracked files
 * are counted. */
function readTree() {
  const folders = new Map();
  const files = new Set();
  const tracked = new Set();
  const skipped = {};
  for (const [isTracked, paths] of [[true, gitPaths()],
    [false, gitPaths('--others', '--exclude-standard')]]) {
    for (const p of paths) {
      const parts = p.replace(/\/$/, '').split('/');
      const isDir = p.endsWith('/');
      if (parts.length === 1 && !isDir) {
        files.add(parts[0]);
        if (isTracked) tracked.add(parts[0]);
        continue;
      }
      if (!folders.has(parts[0])) folders.set(parts[0], new Set());
      if (isTracked) tracked.add(parts[0] + '/');
      if (SKIP.has(parts[0])) {
        if (isTracked) skipped[parts[0]] = (skipped[parts[0]] || 0) + 1;
        continue;
      }
      if ((parts.length >= 3 || isDir) && !SKIP.has(parts[1])) {
        folders.get(parts[0]).add(parts[1]);
        if (isTracked) tracked.add(parts[0] + '/' + parts[1] + '/');
      }
    }
  }
  files.add(path.basename(OUT));
  return { folders, files, tracked, skipped };
}

/* Root entries git ignores, from its own ignore rules (.gitignore, the global
 * excludes file and .git/info/exclude). */
function ignoredAtRoot() {
  const names = gitPaths('--others', '--ignored', '--exclude-standard', '--directory')
    .map((p) => p.split('/')[0]);
  return new Set(names);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const byName = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());
const tag = '<span class="tag">not in git</span>';
const list = (names) => names.map(esc).join(',  ');

function page({ folders, files, tracked, skipped }, unnamed) {
  const order = [...folders.keys()].filter((n) => !(n in FOLDERS)).sort(byName)
    .concat(Object.keys(FOLDERS).filter((n) => folders.has(n)));
  const cards = order.map((name) => {
    const subs = [...folders.get(name)].sort(byName).map((s) => {
      const cls = tracked.has(name + '/' + s + '/') ? '' : ' class="untracked"';
      return `<span${cls}>${esc(s)}/</span>`;
    });
    const inside = SKIP.has(name)
      ? `<p class="note">Not drawn further: git tracks ${(skipped[name] || 0).toLocaleString('en-GB')} files here</p>`
      : (subs.length ? `<p class="inside">${subs.join('  ')}</p>` : '');
    return `<div class="card${name in LOOSE ? ' loose' : ''}">
      <h3 class="${unnamed.has(name + '/') ? 'bad' : ''}">${esc(name)}/${tracked.has(name + '/') ? '' : tag}</h3>
      <p>${esc(FOLDERS[name] || 'NOT NAMED: add it to FOLDERS in scripts/build-repo-structure.js')}</p>
      ${inside}
      ${name in LOOSE ? `<p class="where">Belongs ${esc(LOOSE[name])}</p>` : ''}
    </div>`;
  }).join('\n');

  const fileOrder = [...files].filter((n) => !(n in FILES)).sort(byName)
    .concat(Object.keys(FILES).filter((n) => files.has(n)));
  const rows = fileOrder.map((name) => `<div class="row${name in LOOSE ? ' loose' : ''}">
      <div class="name ${unnamed.has(name) ? 'bad' : ''}">${esc(name)}${tracked.has(name) ? '' : tag}</div>
      <div>${esc(FILES[name] || 'NOT NAMED: add it to FILES in scripts/build-repo-structure.js')}${name in LOOSE ? `<div class="where">Belongs ${esc(LOOSE[name])}</div>` : ''}</div>
    </div>`).join('\n');

  const drawn = new Set([...folders.keys(), ...files]);
  const ignored = ignoredAtRoot();
  const offView = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => !drawn.has(d.name) && d.name !== '.git')
    .map((d) => ({ key: d.name, name: d.name + (d.isDirectory() ? '/' : ''), ignored: ignored.has(d.name) }));
  const ignoredRows = offView.filter((e) => e.ignored).sort((a, b) => byName(a.name, b.name))
    .map((e) => `<div class="row"><div class="name">${esc(e.name)}</div><div>${esc(IGNORED[e.key] || '')}</div></div>`);
  const otherNames = offView.filter((e) => !e.ignored).map((e) => e.name).sort(byName);
  const anyLoose = [...folders.keys(), ...files].some((n) => n in LOOSE);

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; padding: 36px 40px 32px; width: 1720px; font: 15px/1.45 "Segoe UI", system-ui, sans-serif; color: #1f2933; background: #fff; }
    h1 { font-size: 30px; margin: 0 0 6px; }
    .sub { color: #52606d; margin: 0 0 2px; }
    code { font: 14px Consolas, monospace; }
    h2 { font-size: 20px; margin: 28px 0 12px; }
    .cards { column-count: 3; column-gap: 18px; }
    .card { break-inside: avoid; background: #f4f7fb; border: 1px solid #c3cfdc; border-radius: 8px; padding: 12px 16px; margin: 0 0 18px; }
    .card.loose { background: #fdf6ec; border-color: #e4c48f; }
    h3 { font-size: 18px; margin: 0 0 4px; color: #2563a8; }
    .bad { color: #c0262d !important; }
    .card p { margin: 0 0 6px; }
    .inside { font: 13.5px/1.6 Consolas, monospace; color: #52606d; word-spacing: 4px; }
    .inside span { white-space: nowrap; }
    .note { color: #52606d; font-size: 13.5px; }
    .untracked { color: #8a96a3; font-style: italic; }
    .where { color: #a15c00; font-style: italic; }
    .tag { font: 11px "Segoe UI", sans-serif; color: #fff; background: #8a96a3; border-radius: 4px; padding: 1px 6px; margin-left: 10px; vertical-align: 2px; font-style: normal; }
    .files { display: grid; grid-template-columns: 1fr 1fr; column-gap: 36px; row-gap: 8px; }
    .row { display: grid; grid-template-columns: 290px 1fr; column-gap: 12px; }
    .row .name { font-weight: 600; color: #2563a8; }
    .row.loose .name { color: #a15c00; }
    .foot { color: #52606d; font-size: 13.5px; margin-top: 26px; border-top: 1px solid #d9e1ea; padding-top: 10px; }
    .foot p { margin: 0 0 4px; }
    .foot .ignored { display: grid; grid-template-columns: 1fr; row-gap: 4px; margin: 4px 0 8px 18px; }
    .foot .row { grid-template-columns: 140px 1fr; }
    .foot .row .name { font: 600 13.5px/1.45 Consolas, monospace; color: #52606d; }
  </style></head><body>
    <h1>YouSI: what goes where</h1>
    <p class="sub">The repository behind theuniversitysustainabilityinitiative.org. Every top-level folder and file git sees (tracked, or untracked and not ignored), what goes in each, and the folders one level down. What git ignores at the root is listed at the foot.</p>
    <p class="sub">Redraw with <code>node scripts/build-repo-structure.js</code>, which fails while any top-level entry is unnamed. Grey tag or grey italic: not in git.${anyLoose ? ' Amber: loose at the root, with where it belongs.' : ''} Red: not named.</p>
    <h2>Folders</h2>
    <div class="cards">${cards}</div>
    <h2>Files at the root</h2>
    <div class="files">${rows}</div>
    <div class="foot">
      <p>Ignored by git at the root, so not drawn${ignoredRows.length ? ':' : ': none.'}</p>
      ${ignoredRows.length ? `<div class="ignored">${ignoredRows.join('\n')}</div>` : ''}
      ${otherNames.length ? `<p>Also on this disk but outside git's view (empty, or holding only ignored files): ${list(otherNames)}.</p>` : ''}
      <p>Not drawn: .git/, git's own store.</p>
    </div>
  </body></html>`;
}

/* Close the browser this script launched, and if it will not close, end its
 * process tree by its own PID. */
async function close(browser) {
  const pid = browser.process() && browser.process().pid;
  const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 15000));
  if (await Promise.race([browser.close().then(() => 'closed'), timeout]) === 'timeout' && pid) {
    try { execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) { /* already gone */ }
  }
}

async function main() {
  const tree = readTree();
  const unnamed = new Set([...tree.folders.keys()].filter((n) => !(n in FOLDERS)).map((n) => n + '/')
    .concat([...tree.files].filter((n) => !(n in FILES))));
  const stale = Object.keys(FOLDERS).filter((n) => !tree.folders.has(n))
    .concat(Object.keys(FILES).filter((n) => !tree.files.has(n)));

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  console.log(`browser pid ${browser.process() && browser.process().pid}`);
  try {
    const tab = await browser.newPage();
    await tab.setViewport({ width: 1800, height: 1000, deviceScaleFactor: 1.25 });
    await tab.setContent(page(tree, unnamed), { waitUntil: 'load' });
    await tab.screenshot({ path: OUT, fullPage: true });
  } finally {
    await close(browser);
  }

  const nTop = tree.folders.size + tree.files.size;
  const nSub = [...tree.folders.values()].reduce((n, s) => n + s.size, 0);
  console.log(`drew ${path.basename(OUT)}: ${nTop} top-level entries (${tree.folders.size} folders, `
    + `${tree.files.size} files), ${nSub} second-level folders`);
  if (stale.length) console.log('note: named here but not in the repository: ' + stale.join(', '));
  const loose = [...tree.folders.keys(), ...tree.files].filter((n) => n in LOOSE).sort(byName);
  console.log(`loose at the root (amber): ${loose.length ? loose.join(', ') : 'none'}`);
  if (unnamed.size) {
    console.log(`top-level check FAILED: ${unnamed.size} of ${nTop} entries unnamed: `
      + [...unnamed].sort(byName).join(', '));
    return 1;
  }
  console.log(`top-level check: all ${nTop} top-level entries named`);
  return 0;
}

main().then((code) => { process.exitCode = code; }, (err) => {
  console.error(err);
  process.exitCode = 2;
});
