'use strict';
const path = require('path');

const FONT_EXT = ['.ttf', '.otf', '.woff', '.woff2'];
const WEIGHT_WORDS = [
  [/hairline|thin/i, 100], [/extra-?light|ultra-?light/i, 200], [/light/i, 300], [/semi-?bold|demi-?bold/i, 600],
  [/extra-?bold|ultra-?bold/i, 800], [/black|heavy/i, 900], [/medium/i, 500], [/bold/i, 700], [/regular|normal|book|roman/i, 400],
];
// Guesses weight, style and family from a font file name such as "Satoshi-BoldItalic.otf".
function describeFontFile(file) {
  const P = file.includes('\\') ? path.win32 : path; // Windows paths also work when tested elsewhere
  const base = P.parse(file).name;
  const variable = /variable|\[wght/i.test(base);
  let weight = 400;
  for (const [re, w] of WEIGHT_WORDS) if (re.test(base)) { weight = w; break; }
  const italic = /italic|oblique/i.test(base);
  const family = base
    .replace(/[-_ ]?(variable|vf)\b.*$/i, '')
    .replace(/\[.*?\]/g, '')
    .replace(/[-_ ]?(hairline|thin|extra-?light|ultra-?light|light|regular|normal|book|roman|medium|semi-?bold|demi-?bold|extra-?bold|ultra-?bold|bold|black|heavy)?(italic|oblique)?$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim() || base;
  return { file, name: P.basename(file), weight: variable ? '100 900' : weight, style: italic ? 'italic' : 'normal', family };
}

module.exports = { FONT_EXT, describeFontFile };
