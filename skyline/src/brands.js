/**
 * Stable firm brand table. Unknown firms get a deterministic default.
 * Cameos stay bound to firm id, not building slot.
 */

export const BRANDS = {
  topstep: { color: '#e1f784', mark: 'T', shortName: 'Topstep' },
  apex: { color: '#a7cabb', mark: 'A', shortName: 'Apex' },
  apextraderfunding: { color: '#a7cabb', mark: 'A', shortName: 'Apex' },
  'tradeify-futures': { color: '#cea992', mark: 'T', shortName: 'Tradeify', cameo: 'brett' },
  tradeify: { color: '#cea992', mark: 'T', shortName: 'Tradeify', cameo: 'brett' },
  'tradeify-247': { color: '#c4a07f', mark: 'T', shortName: 'Tradeify 247' },
  fundednext: { color: '#b2a9d1', mark: 'F', shortName: 'FundedNext' },
  myfundedfutures: { color: '#d3bf8b', mark: 'M', shortName: 'My Funded', cameo: 'matt' },
  alphafutures: { color: '#b7c1bf', mark: 'α', shortName: 'Alpha' },
  alphacapitalgroup: { color: '#9eb4c4', mark: 'α', shortName: 'Alpha Cap' },
  goat: { color: '#92af71', mark: 'G', shortName: 'GOAT' },
  goatfundedtrader: { color: '#92af71', mark: 'G', shortName: 'GOAT' },
  savius: { color: '#777d70', mark: 'S', shortName: 'Savius' },
  blueguardian: { color: '#8fb3c9', mark: 'B', shortName: 'Blue G' },
  futureselite: { color: '#d2c07a', mark: 'E', shortName: 'Fut. Elite' },
  fundingpips: { color: '#86b89a', mark: 'P', shortName: 'FundPips' },
  fundedtradermarkets: { color: '#c4a6c8', mark: 'F', shortName: 'FTM' },
  'blusky-pro': { color: '#7aa0c4', mark: 'B', shortName: 'BluSky' },
  e8markets: { color: '#c98b8b', mark: 'E', shortName: 'E8' },
  tradeday: { color: '#b9c47a', mark: 'T', shortName: 'TradeDay' },
  the5ers: { color: '#8aa88a', mark: '5', shortName: 'The5ers' },
  toptiertrader: { color: '#c9b48a', mark: 'T', shortName: 'Top Tier' },
  propr: { color: '#9aa7c2', mark: 'P', shortName: 'Propr' },
  aquafunded: { color: '#7eb0b8', mark: 'A', shortName: 'Aqua' },
};

const PALETTE = ['#e1f784', '#a7cabb', '#cea992', '#b2a9d1', '#d3bf8b', '#b7c1bf', '#92af71', '#8fb3c9'];

function hashId(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function shortenName(name) {
  if (!name) return 'Firm';
  const cleaned = String(name).replace(/\s+Futures$/i, '').replace(/\s+Trader$/i, '').trim();
  if (cleaned.length <= 12) return cleaned;
  const words = cleaned.split(/\s+/);
  if (words.length > 1) return words.map((w) => w[0]).join('').slice(0, 6).toUpperCase();
  return cleaned.slice(0, 11);
}

export function brandFor(id, name) {
  const known = BRANDS[id];
  if (known) {
    return {
      color: known.color,
      mark: known.mark,
      shortName: known.shortName,
      cameo: known.cameo || null,
    };
  }
  const color = PALETTE[hashId(id || name || 'firm') % PALETTE.length];
  const label = name || id || 'Firm';
  return {
    color,
    mark: label.replace(/[^A-Za-z0-9α]/g, '').charAt(0).toUpperCase() || '•',
    shortName: shortenName(label),
    cameo: null,
  };
}
