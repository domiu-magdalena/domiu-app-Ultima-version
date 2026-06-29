export interface StrictManualOrderParseResult {
  customerName: string;
  customerPhone: string;
  address: string;
  neighborhood: string;
  addressNotes: string;
  orderNotes: string;
  warnings: string[];
}

function cleanText(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/\b([a-záéíóúñü])/g, m => m.toUpperCase());
}

function normalizeLine(line: string): string {
  return cleanText(line)
    .replace(/^↪?\s*reenviado\s*/i, '')
    .replace(/^[-–•*]\s*/, '')
    .trim();
}

export function isProductLikeLine(line: string): boolean {
  const v = cleanText(line).toLowerCase();

  if (!v) return false;

  return (
    /\bx\s*\d+\b/i.test(v) ||
    /\b(alita|alitas|wings|hamburguesa|perro|salchipapa|pizza|pollo|combo|tocineta|coreana|bbq|salsa|bañada|banada|gaseosa|papas|mazorcada|arepa|desgranado|picada)\b/i.test(v)
  );
}

export function isPaymentLine(line: string): boolean {
  return /\b(pago|paga|efectivo|transferencia|nequi|daviplata|bancolombia|qr)\b/i.test(line);
}

export function isPhoneLine(line: string): boolean {
  return /(?:\+?57\s*)?3\d{9}/.test(line.replace(/\s+/g, ''));
}

export function isAddressLikeLine(line: string): boolean {
  const v = cleanText(line).toLowerCase();

  if (!v || isProductLikeLine(v) || isPaymentLine(v) || isPhoneLine(v)) return false;

  return (
    /#/.test(v) ||
    /\b(calle|cl|cra|carrera|kr|av|avenida|mz|manzana|casa|apto|apartamento|torre|bloque|conjunto|edificio|barrio|villa|urbanización|urbanizacion|sector|local|diagonal|transversal|tv)\b/i.test(v) ||
    /\d+[a-z]?\s*[-#]\s*\d+/i.test(v)
  );
}

function extractPhone(lines: string[]): string {
  const joined = lines.join(' ');
  const match = joined.replace(/\s+/g, '').match(/(?:\+?57)?(3\d{9})/);
  return match?.[1] || '';
}

function extractNeighborhood(address: string): string {
  const v = cleanText(address);

  const patterns = [
    /\b(villa\s+[a-záéíóúñü]+(?:\s+[a-záéíóúñü]+)?)\b/i,
    /\b(los\s+[a-záéíóúñü]+(?:\s+[a-záéíóúñü]+)?)\b/i,
    /\b(las\s+[a-záéíóúñü]+(?:\s+[a-záéíóúñü]+)?)\b/i,
    /\b(conjunto\s+[a-záéíóúñü]+(?:\s+[a-záéíóúñü]+){0,3})\b/i,
    /\b(barrio\s+[a-záéíóúñü]+(?:\s+[a-záéíóúñü]+){0,3})\b/i,
  ];

  for (const pattern of patterns) {
    const match = v.match(pattern);
    if (match?.[1]) {
      return titleCase(match[1].replace(/^barrio\s+/i, '').replace(/^conjunto\s+/i, ''));
    }
  }

  return '';
}

export function normalizeSantaMartaAddress(address: string, neighborhood?: string): string {
  const base = cleanText(address);
  const zone = cleanText(neighborhood || '');

  const parts = [base];

  if (zone && !base.toLowerCase().includes(zone.toLowerCase())) {
    parts.push(zone);
  }

  if (!/santa\s*marta/i.test(base)) parts.push('Santa Marta');
  if (!/magdalena/i.test(base)) parts.push('Magdalena');
  if (!/colombia/i.test(base)) parts.push('Colombia');

  return parts.filter(Boolean).join(', ');
}

export function validateManualDeliveryAddress(address: string, neighborhood?: string) {
  const clean = cleanText(address);
  const warnings: string[] = [];

  if (!clean || clean.length < 5) {
    return {
      ok: false,
      normalizedAddress: '',
      warnings: ['La dirección está vacía o incompleta.'],
    };
  }

  if (isProductLikeLine(clean)) {
    return {
      ok: false,
      normalizedAddress: '',
      warnings: ['La dirección parece ser un producto del pedido, no una ubicación real.'],
    };
  }

  if (!isAddressLikeLine(clean)) {
    warnings.push('La dirección no tiene señales suficientes de ubicación real. Confirma barrio, casa, manzana, calle o carrera.');
  }

  const normalizedAddress = normalizeSantaMartaAddress(clean, neighborhood);

  return {
    ok: warnings.length === 0,
    normalizedAddress,
    warnings,
  };
}

export function getRouteSafetyWarnings(distanceKm: number, routeWarnings: string[] = []): string[] {
  const warnings = [...routeWarnings];

  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    warnings.push('La distancia calculada no es válida.');
  }

  if (distanceKm > 35) {
    warnings.push('La distancia calculada es demasiado alta para un domicilio urbano. Puede estar apuntando a otra ciudad o país.');
  }

  return [...new Set(warnings)];
}

export function parseWhatsAppOrderStrict(raw: string): StrictManualOrderParseResult {
  const warnings: string[] = [];

  const lines = raw
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean)
    .filter(line => !/^reenviado$/i.test(line));

  const phone = extractPhone(lines);

  let customerName = '';
  let address = '';
  const orderLines: string[] = [];

  for (const line of lines) {
    const clean = cleanText(line);

    if (!clean || isPhoneLine(clean) || isPaymentLine(clean)) continue;

    if (!customerName && !isAddressLikeLine(clean) && !isProductLikeLine(clean)) {
      customerName = titleCase(clean);
      continue;
    }

    if (!address && isAddressLikeLine(clean)) {
      address = clean;
      continue;
    }

    if (isProductLikeLine(clean)) {
      orderLines.push(clean);
      continue;
    }

    if (customerName && address) {
      orderLines.push(clean);
    }
  }

  if (!customerName) warnings.push('No se detectó claramente el nombre del cliente.');
  if (!phone) warnings.push('No se detectó un teléfono celular válido.');
  if (!address) warnings.push('No se detectó claramente la dirección del cliente.');

  const neighborhood = extractNeighborhood(address);

  return {
    customerName,
    customerPhone: phone,
    address,
    neighborhood,
    addressNotes: '',
    orderNotes: orderLines.join('; '),
    warnings,
  };
}
