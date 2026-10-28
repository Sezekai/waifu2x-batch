'use strict';
const fs = require('fs');
const https = require('https');
const { URL } = require('url');

// Downloads a file to disk, following redirects. onProgress(bytesSoFar, totalBytes) is called
// about every quarter second. totalBytes is 0 if the server didn't say how big the file is.
function downloadFile(url, dest, onProgress, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 10) return reject(new Error('Too many redirects while downloading'));
    const req = https.get(url, { headers: { 'User-Agent': 'waifu2x-batch' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, url).href;
        return resolve(downloadFile(next, dest, onProgress, redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Download failed (HTTP ${res.statusCode}) for ${url}`));
      }
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let got = 0;
      let last = 0;
      const out = fs.createWriteStream(dest);
      res.on('data', (chunk) => {
        got += chunk.length;
        const now = Date.now();
        if (onProgress && now - last > 250) {
          last = now;
          onProgress(got, total);
        }
      });
      res.on('error', reject);
      out.on('error', reject);
      out.on('finish', () => {
        if (onProgress) onProgress(got, total);
        resolve();
      });
      res.pipe(out);
    });
    req.on('error', reject);
  });
}

module.exports = { downloadFile };
