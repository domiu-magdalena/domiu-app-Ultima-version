import { NextRequest, NextResponse } from 'next/server';

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function wrap(value: string, length = 22) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > length && current) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

const themes: Record<string, { start: string; end: string; accent: string; drawing: string }> = {
  wings: {
    start: '#3B2314', end: '#9A3412', accent: '#FFD400',
    drawing: '<ellipse cx="320" cy="245" rx="145" ry="66" fill="#fff" opacity=".94"/><path d="M220 225c35-64 95-69 128-21-30 11-52 33-68 67-42 4-69-12-60-46Z" fill="#D97706"/><path d="M318 214c41-55 99-42 118 10-38 2-67 19-90 51-38-4-52-27-28-61Z" fill="#F59E0B"/>',
  },
  pizza: {
    start: '#7C2D12', end: '#EA580C', accent: '#FDE68A',
    drawing: '<circle cx="320" cy="245" r="105" fill="#FDE68A" stroke="#B45309" stroke-width="18"/><circle cx="280" cy="210" r="17" fill="#DC2626"/><circle cx="358" cy="205" r="17" fill="#DC2626"/><circle cx="330" cy="270" r="17" fill="#DC2626"/><circle cx="255" cy="280" r="12" fill="#16A34A"/><circle cx="392" cy="260" r="12" fill="#16A34A"/>',
  },
  pasta: {
    start: '#713F12', end: '#D97706', accent: '#FEF3C7',
    drawing: '<path d="M190 230h260c-8 98-52 137-130 137S198 328 190 230Z" fill="#fff" opacity=".94"/><path d="M225 235c45-70 152-70 195 0" fill="none" stroke="#F59E0B" stroke-width="26" stroke-linecap="round"/><path d="M245 255c44-45 106-45 150 0" fill="none" stroke="#FBBF24" stroke-width="20" stroke-linecap="round"/>',
  },
  bakery: {
    start: '#78350F', end: '#D97706', accent: '#FEF3C7',
    drawing: '<path d="M210 280c28-85 83-125 110-42 27-83 82-43 110 42-56 62-164 62-220 0Z" fill="#FDE68A" stroke="#B45309" stroke-width="13"/><path d="M260 226l-24 98M320 220v116M380 226l24 98" stroke="#D97706" stroke-width="11" opacity=".65"/>',
  },
  pharmacy: {
    start: '#064E3B', end: '#059669', accent: '#D1FAE5',
    drawing: '<rect x="230" y="160" width="180" height="180" rx="35" fill="#fff" opacity=".95"/><rect x="295" y="185" width="50" height="130" rx="8" fill="#10B981"/><rect x="255" y="225" width="130" height="50" rx="8" fill="#10B981"/>',
  },
  liquor: {
    start: '#312E81', end: '#7C3AED', accent: '#EDE9FE',
    drawing: '<path d="M265 155h70v50c0 18 12 29 25 44 32 36 24 101-40 101s-72-65-40-101c13-15 25-26 25-44v-50Z" fill="#fff" opacity=".92"/><rect x="278" y="245" width="84" height="58" rx="12" fill="#F59E0B" opacity=".85"/><path d="M392 214h56l-14 88h-28Z" fill="#fff" opacity=".8"/>',
  },
  grocery: {
    start: '#14532D', end: '#65A30D', accent: '#ECFCCB',
    drawing: '<path d="M215 205h210l-20 150H235Z" fill="#fff" opacity=".94"/><path d="M265 205c0-62 110-62 110 0" fill="none" stroke="#FDE68A" stroke-width="18"/><circle cx="276" cy="270" r="28" fill="#EF4444"/><circle cx="345" cy="282" r="32" fill="#22C55E"/><rect x="365" y="225" width="30" height="80" rx="7" fill="#60A5FA"/>',
  },
  burger: {
    start: '#7C2D12', end: '#B45309', accent: '#FEF3C7',
    drawing: '<path d="M205 228c12-86 218-86 230 0Z" fill="#FBBF24"/><rect x="210" y="240" width="220" height="34" rx="15" fill="#16A34A"/><rect x="215" y="280" width="210" height="45" rx="20" fill="#7C2D12"/><path d="M205 336h230c-10 49-220 49-230 0Z" fill="#F59E0B"/>',
  },
  beverage: {
    start: '#0C4A6E', end: '#0284C7', accent: '#E0F2FE',
    drawing: '<path d="M270 155h100l-12 190h-76Z" fill="#fff" opacity=".9"/><path d="M300 145h40l32 60" fill="none" stroke="#FDE68A" stroke-width="12" stroke-linecap="round"/><circle cx="320" cy="265" r="34" fill="#38BDF8" opacity=".8"/>',
  },
  default: {
    start: '#1F2937', end: '#4B5563', accent: '#FFD400',
    drawing: '<rect x="220" y="160" width="200" height="190" rx="35" fill="#fff" opacity=".94"/><path d="M270 235h100M270 275h100" stroke="#F59E0B" stroke-width="18" stroke-linecap="round"/>',
  },
};

export async function GET(request: NextRequest) {
  const name = (request.nextUrl.searchParams.get('name') || 'Producto DomiU').slice(0, 80);
  const type = request.nextUrl.searchParams.get('type') || 'default';
  const theme = themes[type] || themes.default;
  const lines = wrap(name);
  const text = lines.map((line, index) => `<text x="320" y="${420 + index * 34}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${index === 0 ? 25 : 22}" font-weight="800" fill="#fff">${escapeXml(line)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${theme.start}"/><stop offset="1" stop-color="${theme.end}"/></linearGradient><filter id="shadow"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-opacity=".28"/></filter></defs><rect width="640" height="640" rx="52" fill="url(#bg)"/><circle cx="540" cy="94" r="120" fill="${theme.accent}" opacity=".12"/><circle cx="88" cy="560" r="155" fill="#fff" opacity=".07"/><g filter="url(#shadow)">${theme.drawing}</g>${text}<text x="320" y="555" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" letter-spacing="3" fill="${theme.accent}">CATÁLOGO DOMIU</text><text x="320" y="582" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#fff" opacity=".74">Imagen digital de referencia</text></svg>`;
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
