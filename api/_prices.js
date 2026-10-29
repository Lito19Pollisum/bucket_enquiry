// Unit prices (SGD, excl. GST) per standard model code, used by the auto-quotation.
// Source: Pollisum price lists, Sept 2026 (Super / Side / Center Discharge / Sand & Mud buckets, hoppers, racks), July 2026 (Recumbent, Man Cage, Rescue Man Cage), scanned 29.10.26,
// including the handwritten corrections. RETAIL column is used; the Hardware Shop column is not loaded.
// A model with no entry (e.g. Self Dumping Crane Buckets) is shown with no price so sales can complete it.
import { SLINGS } from './_slings.js';

const withSling = code => { const s = SLINGS[code]; return `incl. proof load test cert w/ PE endorsement, new ${s && s.size !== 'TBC' ? s.size + ' ' : ''}wire sling (SWL ${s ? s.swl : ''}), masterlink and 4 shackles`; };
const P = {};
// price list amounts already include the wire sling and PE load test certificate
const incl = obj => { for (const [code, price] of Object.entries(obj)) P[code] = { price, note: withSling(code) }; };

incl({ // "SUPER Concrete Bucket" (Sept 2026); SPB-500 per handwritten $11,890 cw load test & wire sling
  'SPB-050': 2540, 'SPB-075': 2660, 'SPB-100': 2780, 'SPB-120': 2850, 'SPB-150': 3080, 'SPB-200': 3280, 'SPB-250': 3880, 'SPB-300': 4500, 'SPB-400': 5800, 'SPB-500': 11890,
  // Center Discharge Concrete Bucket (Sept 2026)
  'CDCB-050': 1500, 'CDCB-075': 1600, 'CDCB-100': 1680, 'CDCB-120': 1740, 'CDCB-150': 1980, 'CDCB-200': 2280, 'CDCB-250': 2700, 'CDCB-300': 3080,
  // Side Discharge Concrete Bucket (Sept 2026); SDCB-400 per handwritten $4,800 (13/10)
  'SDCB-050': 1350, 'SDCB-075': 1390, 'SDCB-100': 1460, 'SDCB-120': 1500, 'SDCB-150': 1800, 'SDCB-200': 2100, 'SDCB-250': 2600, 'SDCB-300': 2850, 'SDCB-400': 4800,
  // Sand & Mud bucket, C/W wire sling & load test certificate (Sept 2026)
  'SB-072': 1300, 'SB-100': 1440, 'SB-120': 1560, 'SB-150': 1700, 'SB-200': 1980, 'SB-250': 2390, 'SB-300': 2850,
  // Sand bucket SB-400 / SB-500: bucket only + 12T sling + load test (5,000 + 480 + 350 ; 5,500 + 650 + 400)
  'SB-400': 5000 + 480 + 350, 'SB-500': 5500 + 650 + 400,
  // Recumbent Concrete Bucket (July 2026): selling price WO sling/PE cert + wire sling + load test certificate
  'RCB-200': 5200 + 280 + 380, 'RCB-300': 6450 + 530 + 400, 'RCB-350': 7450 + 560 + 400, 'RCB-400': 9800 + 560 + 480, 'RCB-500': 12000 + 700 + 680,
  // Man Cage / Rescue Man Cage (July 2026): price with wire sling and load test certificate
  'MC-1500': 2680, 'MC-2000': 2950, 'MC-2500': 3200, 'MC-3200': 3980, 'RMC-2500': 3450, 'RMC-3000': 3950,
});
// Concrete hoppers (Mar 2026): PE load test $250 additional
for (const [code, price] of Object.entries({ 'CHS-600': 730, 'CHS-700': 760, 'CHR-600': 960, 'CHR-700': 980 })) P[code] = { price, note: 'excl. PE load test (additional $250)' };
// Gas cylinder racks (Mar / Sept 2026)
Object.assign(P, { 'CR-2B': { price: 800 }, 'CR-4B': { price: 850 }, 'CR-6B': { price: 950 }, 'LCR-2B': { price: 1180 }, 'LCR-4B': { price: 1300 }, 'LCR-6B': { price: 1560 }, 'LCR-12B': { price: 2380 } });

export const PRICES = P;
