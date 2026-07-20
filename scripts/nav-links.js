// Maps the live site's absolute page URLs to this local mirror's root-relative
// paths, so internal navigation stays on the local copy instead of jumping
// back out to the real site.
const LIVE_BASE = 'https://www.theuniversitysustainabilityinitiative.org';
const NAV_LINK_MAP = {
  [`${LIVE_BASE}/`]: '/',
  [LIVE_BASE]: '/',
  [`${LIVE_BASE}/about-us`]: '/about-us/',
  [`${LIVE_BASE}/events`]: '/events/',
  [`${LIVE_BASE}/s-projects-side-by-side`]: '/projects/',
  [`${LIVE_BASE}/business-development-competition`]: '/business-development-competition/',
};

function rewriteNavLinks(str) {
  let out = str;
  // longest keys first so "/about-us" doesn't get shadowed by a shorter match
  const keys = Object.keys(NAV_LINK_MAP).sort((a, b) => b.length - a.length);
  for (const url of keys) {
    out = out.split(`href="${url}"`).join(`href="${NAV_LINK_MAP[url]}"`);
  }
  return out;
}

module.exports = { rewriteNavLinks, NAV_LINK_MAP };
