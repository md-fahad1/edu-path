export type Seg =
  | { t: 'text'; v: string }
  | { t: 'math'; v: string }
  | { t: 'block'; v: string }
  | { t: 'img'; v: string; alt: string };

// Sudhu http(s) ba site-er nijer path (/...) cholbe. javascript:/data: URL kokhono na.
const IMG = /!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/y;

/** Opening $ er por space thakle math na ("$5 ar $10" jeno math na hoy); closing $ er age-o space cholbe na */
function inlineEnd(s: string, from: number): number {
  if (from >= s.length || /\s/.test(s[from])) return -1;
  for (let j = from; j < s.length; j++) {
    if (s[j] === '\n') return -1;
    if (s[j] === '\\') { j++; continue; }
    if (s[j] === '$') return /\s/.test(s[j - 1]) ? -1 : j;
  }
  return -1;
}

/**
 * Lekha theke math/chhobi alada kore.
 *   $x^2$      => inline math        $$\frac{a}{b}$$ => alada line-e math
 *   ![nam](https://...jpg) => chhobi  \$ => sadharon $ chinho (taka)
 */
export function parseRich(src: string): Seg[] {
  if (!src) return [];
  if (!src.includes('$') && !src.includes('![')) return [{ t: 'text', v: src }];
  const out: Seg[] = [];
  let buf = '';
  const flush = () => { if (buf) { out.push({ t: 'text', v: buf }); buf = ''; } };
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\' && src[i + 1] === '$') { buf += '$'; i += 2; continue; }
    if (c === '$') {
      if (src[i + 1] === '$') {
        const end = src.indexOf('$$', i + 2);
        if (end > i + 2) { flush(); out.push({ t: 'block', v: src.slice(i + 2, end).trim() }); i = end + 2; continue; }
      } else {
        const end = inlineEnd(src, i + 1);
        if (end > 0) { flush(); out.push({ t: 'math', v: src.slice(i + 1, end) }); i = end + 1; continue; }
      }
    }
    if (c === '!' && src[i + 1] === '[') {
      IMG.lastIndex = i;
      const m = IMG.exec(src);
      if (m) { flush(); out.push({ t: 'img', v: m[2], alt: m[1] }); i += m[0].length; continue; }
    }
    buf += c;
    i++;
  }
  flush();
  return out;
}

/** Meta title/description, JSON-LD, search result-er jonno: sadha lekha (math-er TeX source thake, chhobi bad) */
export function plain(src: string | null | undefined): string {
  if (!src) return '';
  return parseRich(src).map((s) => (s.t === 'img' ? s.alt : s.v)).join('').replace(/\s+/g, ' ').trim();
}