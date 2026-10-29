// Reads a Polish fiscal receipt (paragon fiskalny) from OCR text boxes.
// Kept free of app imports so it can be unit tested with plain Node.

export type OcrBox = {
  readonly text: string;
  readonly confidence?: number;
  /** Corners in image pixels: top-left, top-right, bottom-right, bottom-left. */
  readonly quad: readonly { readonly x: number; readonly y: number }[];
};

export type Rect = { x: number; y: number; width: number; height: number };

export type ReceiptLine = {
  text: string;
  /** Upper case, Polish letters folded to ASCII, for keyword matching. */
  norm: string;
  rect: Rect;
};

export type ParsedReceipt = {
  total: number | null;
  /** Where the total line sits in the image, for highlighting it. */
  totalRect: Rect | null;
  /** YYYY-MM-DD */
  date: string | null;
  /** HH:MM */
  time: string | null;
  number: string | null;
  nip: string | null;
  /** Identifies this receipt so it can only be used once. Null when too little was read. */
  fingerprint: string | null;
  lines: ReceiptLine[];
};

const MAX_TOTAL = 10000;

export function fold(s: string) {
  return s
    .replace(/[łŁ]/g, 'L')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();
}

function boxRect(b: OcrBox): Rect {
  const xs = b.quad.map(p => p.x), ys = b.quad.map(p => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
}

/** Groups text boxes that share a printed line, top to bottom, left to right within a line. */
export function groupLines(boxes: readonly OcrBox[]): ReceiptLine[] {
  const items = boxes
    .filter(b => b.text.trim() && b.quad.length >= 4)
    .map(b => ({ b, r: boxRect(b) }))
    .sort((p, q) => p.r.y + p.r.height / 2 - (q.r.y + q.r.height / 2));
  const groups: { rect: Rect; parts: { b: OcrBox; r: Rect }[] }[] = [];
  for (const it of items) {
    let best: (typeof groups)[number] | null = null, bestOverlap = 0;
    for (const g of groups) {
      const overlap = Math.min(g.rect.y + g.rect.height, it.r.y + it.r.height) - Math.max(g.rect.y, it.r.y);
      const need = 0.5 * Math.min(g.rect.height, it.r.height);
      if (overlap >= need && overlap > bestOverlap) { best = g; bestOverlap = overlap; }
    }
    if (best) { best.parts.push(it); best.rect = union(best.rect, it.r); }
    else groups.push({ rect: it.r, parts: [it] });
  }
  return groups
    .sort((a, b) => a.rect.y - b.rect.y)
    .map(g => {
      const text = g.parts.sort((p, q) => p.r.x - q.r.x).map(p => p.b.text.trim()).join(' ');
      return { text, norm: fold(text), rect: g.rect };
    });
}

/**
 * Money amounts in a line, left to right. Fixes the usual OCR slips inside
 * numbers (O for 0, l or I for 1) and accepts a comma or a dot as the decimal mark.
 */
export function amountsIn(s: string): number[] {
  const out: number[] = [];
  const re = /(?<![\d,.])((?:\d|[OoIl|]){1,4}(?:[  ]\d{3})?)\s?[,.]\s?((?:\d|[Oo]){2})(?![\d%])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (!/\d/.test(m[1])) continue;
    const fix = (x: string) => x.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1').replace(/[  ]/g, '');
    const v = Number(fix(m[1]) + '.' + fix(m[2]));
    if (Number.isFinite(v)) out.push(v);
  }
  return out;
}

const STRONG = [/[S5]UMA\s*:?\s*PLN/, /DO\s*ZAP[L1I]ATY/, /NALEZNOSC/];
const WEAK = [/\b[S5]UMA\b/, /\bRAZEM\b/, /\bTOTAL\b/];
const NOT_TOTAL = /PTU|VAT|OPODAT|PODATEK|RABAT|NETTO|ZWOLN|SP\.?\s*OP|SPRZEDAZ/;
const PAID_BY_CARD = /KARTA|BLIK|PLATNOSC\s*KART/;

function isAmountOnly(line: ReceiptLine) {
  return amountsIn(line.text).length > 0 && line.norm.replace(/PLN|ZL/g, '').replace(/[\d\s,.OIL|]/g, '').length <= 2;
}

function findTotal(lines: ReceiptLine[]): { total: number; rect: Rect } | null {
  const pick = (patterns: RegExp[]) => {
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      if (!patterns.some(p => p.test(l.norm)) || NOT_TOTAL.test(l.norm)) continue;
      const own = amountsIn(l.text).filter(v => v > 0 && v < MAX_TOTAL);
      if (own.length) return { total: own[own.length - 1], rect: l.rect };
      // The amount was read as its own line just below or above the label
      for (const j of [i + 1, i - 1]) {
        const n = lines[j];
        if (!n || !isAmountOnly(n) || Math.abs(n.rect.y - l.rect.y) > 1.6 * Math.max(l.rect.height, n.rect.height)) continue;
        const v = amountsIn(n.text).filter(x => x > 0 && x < MAX_TOTAL);
        if (v.length) return { total: v[v.length - 1], rect: union(l.rect, n.rect) };
      }
    }
    return null;
  };
  return pick(STRONG) ?? pick(WEAK) ?? pick([PAID_BY_CARD]);
}

function findDate(all: string): string | null {
  const ymd = /\b(20\d{2})[-./](\d{1,2})[-./](\d{1,2})\b/.exec(all);
  const dmy = /\b(\d{1,2})[-./](\d{1,2})[-./](20\d{2})\b/.exec(all);
  let y: number, m: number, d: number;
  if (ymd) [y, m, d] = [+ymd[1], +ymd[2], +ymd[3]];
  else if (dmy) [y, m, d] = [+dmy[3], +dmy[2], +dmy[1]];
  else return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function findTime(all: string): string | null {
  const t = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(all);
  return t ? `${t[1].padStart(2, '0')}:${t[2]}` : null;
}

function findNumber(norm: string): string | null {
  const patterns = [
    /NR\s*WYDR\.?\s*[:#]?\s*(\d{2,})/,
    /PARAGON\s*(?:FISKALNY\s*)?(?:NR|#)\s*:?\s*(\d{2,})/,
    /\bNR\s*[:#.]?\s*(\d{3,})/,
    /#\s*(\d{4,})/,
  ];
  for (const p of patterns) {
    const m = p.exec(norm);
    if (m) return m[1].replace(/^0+(?=\d)/, '');
  }
  return null;
}

function findNip(norm: string): string | null {
  const m = /NIP\s*[:.]?\s*(?:PL)?\s*(\d[\d\- ]{8,14}\d)/.exec(norm);
  if (!m) return null;
  const digits = m[1].replace(/\D/g, '');
  return digits.length === 10 ? digits : null;
}

export function parseReceipt(boxes: readonly OcrBox[]): ParsedReceipt {
  const lines = groupLines(boxes);
  const all = lines.map(l => l.text).join('\n');
  const norm = lines.map(l => l.norm).join('\n');
  const found = findTotal(lines);
  const total = found ? Math.round(found.total * 100) / 100 : null;
  const date = findDate(all), time = findTime(all), number = findNumber(norm), nip = findNip(norm);
  const fingerprint = total != null && (date || number)
    ? [nip ?? '', date ?? '', time ?? '', number ?? '', total.toFixed(2)].join('|')
    : null;
  return { total, totalRect: found?.rect ?? null, date, time, number, nip, fingerprint, lines };
}

/** Local calendar date as YYYY-MM-DD. */
export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
