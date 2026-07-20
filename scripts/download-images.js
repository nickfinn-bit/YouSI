// Download the ORIGINAL, uncompressed master file for every image referenced
// on the page (strip Wix's /v1/fill|crop/... transform segment), so we work
// from full-resolution source assets rather than any thumbnail rendition.
const https = require('https');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'site', 'assets', 'images');
fs.mkdirSync(outDir, { recursive: true });

const mediaUrls = [
  'https://static.wixstatic.com/media/be068c_6485d91e47c941e69303a6836ba7a299~mv2.png',
  'https://static.wixstatic.com/media/11062b_6a0d3eec46e1448bb4d61d9cd83138fd~mv2.jpg',
  'https://static.wixstatic.com/media/be068c_3761e82a57524b0faadea0d6e69f0cb5~mv2.png',
  'https://static.wixstatic.com/media/be068c_c14183790dc84d72aa8aad2a2b15c09d~mv2.png',
  'https://static.wixstatic.com/media/be068c_5e8049da239f4069a742c6bb2a9f8f38~mv2.png',
  'https://static.wixstatic.com/media/be068c_7a25106c5b524b35b29dcfefbf1b1e2d~mv2.png',
  'https://static.wixstatic.com/media/be068c_674059fabfdd442e9de139abc7ffe601~mv2.png',
  'https://static.wixstatic.com/media/be068c_9253bb2aec0a44ac877c05a70438b14e~mv2.png',
  'https://static.wixstatic.com/media/be068c_61763e1efd314fcf8f079b90488e1f1a~mv2.png',
];

function download(url) {
  return new Promise((resolve, reject) => {
    const fileName = decodeURIComponent(url.split('/').pop());
    const dest = path.join(outDir, fileName);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`${url} -> ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        fs.writeFileSync(dest, buf);
        resolve({ url, fileName, bytes: buf.length });
      });
    }).on('error', reject);
  });
}

(async () => {
  const results = [];
  for (const url of mediaUrls) {
    const r = await download(url);
    results.push(r);
    console.log(`${r.fileName} - ${(r.bytes / 1024).toFixed(1)} KB`);
  }
  fs.writeFileSync(path.join(__dirname, '..', 'recon', 'downloaded.json'), JSON.stringify(results, null, 2));
})();
