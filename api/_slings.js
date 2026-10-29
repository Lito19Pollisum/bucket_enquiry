// Wire sling per model (from the sample quotations and the Sept 2026 price list). Size 'TBC' where the price list gives only the SWL.
export const SLINGS = {};
const sl4 = (size, swl) => ({ size: size + ' 4-legged', swl });
for (const [code, v] of Object.entries({ 'SB-072': ['14mm x 1.5m', '4T'], 'SB-100': ['14mm x 1.5m', '4T'], 'SB-150': ['16mm x 2m', '6T'], 'SB-200': ['16mm x 2m', '6T'], 'SB-250': ['18mm x 2m', '8T'], 'SB-300': ['18mm x 2m', '8T'],
  'MC-1500': ['16mm x 1.5m', '6T'], 'MC-2000': ['16mm x 2m', '6T'], 'MC-2500': ['16mm x 2.5m', '6T'], 'RMC-2500': ['16mm x 2.5m', '6T'], 'RMC-3000': ['16mm x 3m', '6T'] })) SLINGS[code] = sl4(v[0], v[1]);
for (const f of ['CDCB', 'SDCB', 'SPB']) {
  for (const n of ['050', '075', '100', '120']) SLINGS[`${f}-${n}`] = sl4('14mm x 1.5m', '4T');
  SLINGS[`${f}-150`] = sl4('16mm x 2m', '6T'); SLINGS[`${f}-200`] = sl4('18mm x 2m', '8T'); SLINGS[`${f}-250`] = sl4('18mm x 2m', '8T');
  SLINGS[`${f}-300`] = sl4(f === 'SPB' ? '20mm x 2m' : '20mm x 2.5m', '10T');
}
// Models added from the Sept 2026 price list (sling SWL only; size not stated there).
const tbc = swl => ({ size: 'TBC', swl });
Object.assign(SLINGS, {
  'SB-400': tbc('12T'), 'SB-500': tbc('12T'), 'SDCB-400': tbc('14T'), 'SPB-400': tbc('14T'), 'SPB-500': tbc('18T'),
  'MC-3200': sl4('16mm x 2.5m', '6T'),
  'RCB-200': tbc('8T'), 'RCB-300': tbc('11T'), 'RCB-350': tbc('14T'), 'RCB-400': tbc('14T'), 'RCB-500': tbc('17T'),
});
