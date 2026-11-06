// Neutralises spreadsheet formula injection: a cell that starts with = + - @ (or tab/CR) is
// prefixed with an apostrophe so Excel/Sheets show it as text and never run it.
// Plain numbers and phone numbers ("+65 6755 7600", "-3") are left alone.
import { parseCsv } from './_sb.js';

export function neutral(v) {
  const s = String(v ?? '');
  return /^[=+\-@\t\r]/.test(s) && !/^[+-]?[\d\s().,-]+$/.test(s) ? "'" + s : s;
}

export function safeCsv(csv) {
  const rows = parseCsv(csv);
  const out = rows.map(r => (r.length === 1 && r[0] === '') ? '' : r.map(c => '"' + neutral(c).replace(/"/g, '""') + '"').join(','));
  while (out.length && out[out.length - 1] === '') out.pop();
  return '﻿' + out.join('\r\n');
}
