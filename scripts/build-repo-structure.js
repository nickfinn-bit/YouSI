/* Draw REPO-STRUCTURE.png at the repository root: every top-level folder and
 * file, what goes in each, and every folder one level down.
 *
 *   node scripts/build-repo-structure.js [<port>]
 *
 * The tree is the folder tree on disk, read with fs; git is never run. What
 * .gitignore lists is left out: the root's .gitignore for top-level entries,
 * and a top-level folder's own .gitignore, if it has one, for the folders in
 * it. ignoreRules matches the patterns here, as git would; git's other ignore
 * files (the global excludes file, .git/info/exclude) are not read. It never
 * looks inside .git, node_modules or caches; a top-level one that .gitignore
 * does not list is still drawn and must be named. Root entries .gitignore lists
 * go in the footer, with what IGNORED says they hold. It draws first, then
 * reads the names back off the drawn page and exits 1 unless they are the root
 * entries on disk, each once, and each has a line in FOLDERS, FILES or IGNORED
 * below, so nothing new reaches the root without saying what it is.
 *
 * With a port, it draws in the Chrome already answering on that port, in a
 * browser context of its own that it closes, and leaves that Chrome running.
 * Without one, Puppeteer launches its own Chrome and closes it.
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
  '.claude': 'Claude Code\'s folder for this repository. It holds only '
    + 'scheduled_tasks.lock, the lock file for Claude Code\'s scheduled tasks',
  '.git': 'Git\'s own store: the history of every commit to this repository',
};

const FILES = {
  'index.html': 'The home page, /',
  'INDEX.md': 'The index of this repository: what the site is and is for, its '
    + 'pages, assets and scripts counted, and what each folder holds',
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

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/* A .gitignore pattern as a regular expression over a path from the folder the
 * .gitignore is in, as git matches it: * and ? never match /, [...] is a set
 * ([!...] or [^...] negated), a whole ** segment spans folders, \ escapes. */
function globToRegex(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*' && (i === 0 || glob[i - 1] === '/')
      && (i + 2 === glob.length || glob[i + 2] === '/')) {
      if (i + 2 === glob.length) { re += '.*'; i += 1; } else { re += '(?:.*/)?'; i += 2; }
    } else if (c === '*') {
      while (glob[i + 1] === '*') i++;
      re += '[^/]*';
    } else if (c === '?') {
      re += '[^/]';
    } else if (c === '[') {
      let j = i + 1;
      if (glob[j] === '!' || glob[j] === '^') j++;
      if (glob[j] === ']') j++;
      while (j < glob.length && glob[j] !== ']') j++;
      if (j >= glob.length) { re += '\\['; continue; }
      const body = glob.slice(i + 1, j);
      const negated = body[0] === '!' || body[0] === '^';
      re += '[' + (negated ? '^/' : '') + body.slice(negated ? 1 : 0).replace(/[\]^]/g, '\\$&') + ']';
      i = j;
    } else if (c === '\\' && i + 1 < glob.length) {
      re += escRe(glob[++i]);
    } else {
      re += escRe(c);
    }
  }
  return re;
}

/* The patterns of dir's .gitignore, if it has one, read as git reads them:
 * trailing spaces dropped unless escaped, blank lines and # comments skipped,
 * ! re-includes, a trailing / matches folders only, and any other / anchors
 * the pattern to dir; without one it matches a name at any depth. */
function ignoreRules(dir) {
  const file = path.join(dir, '.gitignore');
  if (!fs.existsSync(file)) return [];
  const rules = [];
  for (let line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    while (line.endsWith(' ') && !line.endsWith('\\ ')) line = line.slice(0, -1);
    if (!line || line[0] === '#') continue;
    const negate = line[0] === '!';
    if (negate) line = line.slice(1);
    const dirOnly = line.endsWith('/');
    if (dirOnly) line = line.slice(0, -1);
    const anchored = line.includes('/');
    if (line[0] === '/') line = line.slice(1);
    rules.push({ negate, dirOnly, re: new RegExp((anchored ? '^' : '(?:^|/)') + globToRegex(line) + '$') });
  }
  return rules;
}

/* Whether the .gitignore files in sets (root first, each with the folder it
 * is in) leave out rel, a path from ROOT: the last pattern that matches
 * decides, and a deeper file's patterns come after the root's. */
function isIgnored(rel, isDir, sets) {
  let ignored = false;
  for (const { base, rules } of sets) {
    const sub = base ? rel.slice(base.length + 1) : rel;
    for (const r of rules) {
      if ((!r.dirOnly || isDir) && r.re.test(sub)) ignored = !r.negate;
    }
  }
  return ignored;
}

/* Top-level folders with their sub-folders, and root files, as on disk less
 * what .gitignore lists; and the root entries it lists, for the footer. A
 * top-level folder in SKIP is drawn with no sub-folders. */
function readTree() {
  const rootSets = [{ base: '', rules: ignoreRules(ROOT) }];
  const folders = new Map();
  const files = new Set();
  const ignored = [];
  for (const d of fs.readdirSync(ROOT, { withFileTypes: true })) {
    const isDir = d.isDirectory();
    if (isIgnored(d.name, isDir, rootSets)) {
      ignored.push({ key: d.name, name: d.name + (isDir ? '/' : '') });
    } else if (!isDir) {
      files.add(d.name);
    } else {
      const subs = new Set();
      folders.set(d.name, subs);
      if (SKIP.has(d.name)) continue;
      const sets = rootSets.concat({ base: d.name, rules: ignoreRules(path.join(ROOT, d.name)) });
      for (const s of fs.readdirSync(path.join(ROOT, d.name), { withFileTypes: true })) {
        if (s.isDirectory() && !SKIP.has(s.name) && !isIgnored(d.name + '/' + s.name, true, sets)) {
          subs.add(s.name);
        }
      }
    }
  }
  files.add(path.basename(OUT));
  return { folders, files, ignored };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const byName = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());

function page({ folders, files, ignored }, unnamed) {
  const order = [...folders.keys()].filter((n) => !(n in FOLDERS)).sort(byName)
    .concat(Object.keys(FOLDERS).filter((n) => folders.has(n)));
  const cards = order.map((name) => {
    const subs = [...folders.get(name)].sort(byName).map((s) => `<span>${esc(s)}/</span>`);
    const inside = SKIP.has(name)
      ? '<p class="note">Not looked inside</p>'
      : (subs.length ? `<p class="inside">${subs.join('  ')}</p>` : '');
    return `<div class="card${name in LOOSE ? ' loose' : ''}">
      <h3 class="${unnamed.has(name + '/') ? 'bad' : ''}">${esc(name)}/</h3>
      <p>${esc(FOLDERS[name] || 'NOT NAMED: add it to FOLDERS in scripts/build-repo-structure.js')}</p>
      ${inside}
      ${name in LOOSE ? `<p class="where">Belongs ${esc(LOOSE[name])}</p>` : ''}
    </div>`;
  }).join('\n');

  const fileOrder = [...files].filter((n) => !(n in FILES)).sort(byName)
    .concat(Object.keys(FILES).filter((n) => files.has(n)));
  const rows = fileOrder.map((name) => `<div class="row${name in LOOSE ? ' loose' : ''}">
      <div class="name ${unnamed.has(name) ? 'bad' : ''}">${esc(name)}</div>
      <div>${esc(FILES[name] || 'NOT NAMED: add it to FILES in scripts/build-repo-structure.js')}${name in LOOSE ? `<div class="where">Belongs ${esc(LOOSE[name])}</div>` : ''}</div>
    </div>`).join('\n');

  const ignoredRows = [...ignored].sort((a, b) => byName(a.name, b.name))
    .map((e) => `<div class="row"><div class="name ${unnamed.has(e.name) ? 'bad' : ''}">${esc(e.name)}</div>`
      + `<div>${esc(IGNORED[e.key] || 'NOT NAMED: add it to IGNORED in scripts/build-repo-structure.js')}</div></div>`);
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
    .where { color: #a15c00; font-style: italic; }
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
    <p class="sub">The repository behind theuniversitysustainabilityinitiative.org. Every top-level folder and file on disk that .gitignore does not list, what goes in each, and the folders one level down. The root entries .gitignore lists are at the foot.</p>
    <p class="sub">Redraw with <code>node scripts/build-repo-structure.js</code>, which fails while any top-level entry is unnamed.${anyLoose ? ' Amber: loose at the root, with where it belongs.' : ''} Red: not named.</p>
    <h2>Folders</h2>
    <div class="cards">${cards}</div>
    <h2>Files at the root</h2>
    <div class="files">${rows}</div>
    <div class="foot">
      <p>Listed in .gitignore at the root, so kept out of git and not drawn above${ignoredRows.length ? ':' : ': none.'}</p>
      ${ignoredRows.length ? `<div class="ignored">${ignoredRows.join('\n')}</div>` : ''}
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
  const port = process.argv[2];
  const tree = readTree();
  const unnamed = new Set([...tree.folders.keys()].filter((n) => !(n in FOLDERS)).map((n) => n + '/')
    .concat([...tree.files].filter((n) => !(n in FILES)))
    .concat(tree.ignored.filter((e) => !(e.key in IGNORED)).map((e) => e.name)));
  const stale = Object.keys(FOLDERS).filter((n) => !tree.folders.has(n))
    .concat(Object.keys(FILES).filter((n) => !tree.files.has(n)))
    .concat(Object.keys(IGNORED).filter((n) => !tree.ignored.some((e) => e.key === n)));

  const browser = port
    ? await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}` })
    : await puppeteer.launch({ args: ['--no-sandbox'] });
  if (!port) console.log(`browser pid ${browser.process() && browser.process().pid}`);
  const context = port ? await browser.createBrowserContext() : browser.defaultBrowserContext();
  let drawn;
  try {
    const tab = await context.newPage();
    await tab.setViewport({ width: 1800, height: 1000, deviceScaleFactor: 1.25 });
    await tab.setContent(page(tree, unnamed), { waitUntil: 'load' });
    await tab.screenshot({ path: OUT, fullPage: true });
    drawn = await tab.$$eval('h3, .row .name', (els) => els.map((e) => e.textContent.trim()));
  } finally {
    if (port) await context.close().finally(() => browser.disconnect());
    else await close(browser);
  }

  const nTop = tree.folders.size + tree.files.size;
  const nSub = [...tree.folders.values()].reduce((n, s) => n + s.size, 0);
  console.log(`drew ${path.basename(OUT)}: ${nTop} top-level entries (${tree.folders.size} folders, `
    + `${tree.files.size} files), ${nSub} second-level folders, and at the foot the `
    + `${tree.ignored.length} root entries .gitignore lists`);
  if (stale.length) console.log('note: named here but not at the root: ' + stale.join(', '));
  const loose = [...tree.folders.keys(), ...tree.files].filter((n) => n in LOOSE).sort(byName);
  console.log(`loose at the root (amber): ${loose.length ? loose.join(', ') : 'none'}`);

  let failed = false;
  const onDisk = fs.readdirSync(ROOT, { withFileTypes: true }).map((d) => d.name + (d.isDirectory() ? '/' : ''));
  const notDrawn = onDisk.filter((n) => !drawn.includes(n));
  const notOnDisk = drawn.filter((n, i) => !onDisk.includes(n) || drawn.indexOf(n) !== i);
  if (notDrawn.length || notOnDisk.length) {
    console.log(`disk check FAILED: ${onDisk.length} root entries on disk, ${drawn.length} names drawn; `
      + `not drawn: ${notDrawn.join(', ') || 'none'}; drawn but not on disk, or twice: `
      + `${notOnDisk.join(', ') || 'none'}`);
    failed = true;
  } else {
    console.log(`disk check: the ${drawn.length} names drawn are the ${onDisk.length} root entries `
      + `on disk, each once: ${onDisk.sort(byName).join(', ')}`);
  }
  if (unnamed.size) {
    console.log(`top-level check FAILED: ${unnamed.size} of ${nTop + tree.ignored.length} entries unnamed: `
      + [...unnamed].sort(byName).join(', '));
    failed = true;
  } else {
    console.log(`top-level check: all ${nTop + tree.ignored.length} top-level entries named`);
  }
  return failed ? 1 : 0;
}

main().then((code) => { process.exitCode = code; }, (err) => {
  console.error(err);
  process.exitCode = 2;
});
