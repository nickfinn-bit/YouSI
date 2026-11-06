# YouSI: the index

## About

description: The website of the University Sustainability Initiative (USI), a static HTML, CSS and JavaScript copy of its Wix site, with the Node.js scripts that made the copy and check it.
aim: To keep the USI site as plain pages that can be edited by hand and served at the domain its CNAME names.
numerical_result_summary: 4 pages (the home page and 3 subpages), 110 asset files (94 images, 13 PDFs, 3 shared CSS and JS files) and 21 scripts.

## Contents

- `about-us/` — The site's About Us page, its index.html and style.css.
- `assets/` — What the pages load: the shared site.css, local.css and site.js, the images in images/ and the PDF documents in documents/.
- `business-development-competition/` — The site's Entrepreneurship page, its index.html and style.css.
- `projects/` — The site's Projects page, its index.html and style.css.
- `scripts/` — Node.js scripts that captured the live Wix site with Puppeteer, build pages from that capture, serve the site locally, check its navigation and draw REPO-STRUCTURE.png.
- `package*.json` — The npm manifest and lock file naming the packages the scripts use, Puppeteer and image-size.
