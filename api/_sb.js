// Shared Supabase helpers (server-side only). Files starting with "_" are not exposed as routes by Vercel.
const URL_ = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const KEY_ = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const sbReady = () => !!(URL_ && KEY_);

export async function sb(path, { method = 'GET', body, prefer } = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: KEY_,
      Authorization: `Bearer ${KEY_}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`supabase ${r.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

// Minimal RFC-4180 CSV parser (handles quotes, doubled quotes, CRLF, BOM).
export function parseCsv(src) {
  const s = String(src || '').replace(/^﻿/, '');
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cur); rows.push(row); row = []; cur = '';
    } else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// Turns the enquiry CSV into header fields plus one object per item row.
export function splitEnquiryCsv(csv) {
  const rows = parseCsv(csv);
  const meta = {};
  let i = 0;
  for (; i < rows.length && rows[i].length > 1 && rows[i][0] !== 'Item'; i++) meta[rows[i][0]] = rows[i][1] || '';
  while (i < rows.length && rows[i][0] !== 'Item') i++;
  const items = [];
  for (i++; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    items.push({
      item_no: String(r[0]).slice(0, 10),
      type: String(r[1] || '').slice(0, 40),
      model: String(r[2] || '').slice(0, 120),
      product: String(r[3] || '').slice(0, 160),
      capacity: String(r[4] || '').slice(0, 60),
      swl: String(r[5] || '').slice(0, 60),
      size_requirements: String(r[6] || '').slice(0, 1000),
      qty: Math.max(1, Math.min(999, parseInt(r[7], 10) || 1)),
      notes: String(r[8] || '').slice(0, 2000),
    });
  }
  return {
    fields: {
      phone: String(meta['Phone'] || '').slice(0, 60),
      project: String(meta['Project / ref'] || '').slice(0, 200),
      location: String(meta['Delivery location'] || '').slice(0, 200),
      required_date: String(meta['Required date'] || '').slice(0, 20),
      remarks: String(meta['Remarks'] || '').slice(0, 2000),
    },
    items,
  };
}
