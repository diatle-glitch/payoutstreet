window.PS = window.PS || {};
PS.PARENT = { name: "OnTheTape", url: "https://onthetape.io", line: "The independent prop firm payout record" };
PS.EVIDENCE = {
  L1: { code: "L1", band: "top", label: "Public-chain verified", short: "CHAIN", tone: "chain" },
  L2: { code: "L2", band: "top", label: "Payment-rail verified", short: "RAIL", tone: "rail" },
  L3: { code: "L3", band: "lowest", label: "Community reported", short: "COMM", tone: "comm" }
};
PS.FIRMS = [
  { id: "northrail", name: "Northrail Capital", plot: "W-01", method: "WISE", level: "L2", volume: 1842500, count: 41, median: 31200, latest: "2026-09-11", tag: "Futures" },
  { id: "riseblock", name: "Riseblock Desk", plot: "E-01", method: "RISE", level: "L1", volume: 1620800, count: 36, median: 28500, latest: "2026-09-12", tag: "Crypto perps" },
  { id: "cliffside", name: "Cliffside Funded", plot: "W-02", method: "CLFF", level: "L2", volume: 1299400, count: 28, median: 24100, latest: "2026-09-10", tag: "FX / indices" },
  { id: "aeroledger", name: "Aero Ledger", plot: "E-02", method: "AERO", level: "L2", volume: 1187200, count: 33, median: 19840, latest: "2026-09-13", tag: "On-chain" },
  { id: "cfmo", name: "CFMO Markets", plot: "W-03", method: "CFMO", level: "L1", volume: 976500, count: 22, median: 33400, latest: "2026-09-09", tag: "Crypto" },
  { id: "tapehouse", name: "Tapehouse Prop", plot: "E-03", method: "CHAIN", level: "L1", volume: 812300, count: 19, median: 27600, latest: "2026-09-08", tag: "Futures" },
  { id: "plainsplit", name: "Plainsplit", plot: "W-04", method: "DISC", level: "L3", volume: 640000, count: 17, median: 21000, latest: "2026-09-07", tag: "Multi-asset" },
  { id: "midwire", name: "Midwire Trading", plot: "E-04", method: "WISE", level: "L2", volume: 588400, count: 21, median: 15400, latest: "2026-09-12", tag: "FX" },
  { id: "lot9", name: "Open lot", plot: "W-05", method: "—", level: null, volume: 0, count: 0, median: 0, latest: null, tag: "Vacant", vacant: true },
  { id: "harborstep", name: "Harborstep", plot: "E-05", method: "DISC", level: "L3", volume: 421000, count: 11, median: 18800, latest: "2026-09-05", tag: "Futures" },
  { id: "goldrail", name: "Goldrail Desk", plot: "W-06", method: "PLNE", level: "L2", volume: 390700, count: 14, median: 14250, latest: "2026-09-11", tag: "Indices" },
  { id: "chainyard", name: "Chainyard", plot: "E-06", method: "CHAIN", level: "L1", volume: 305200, count: 9, median: 26100, latest: "2026-09-06", tag: "Perps" },
  { id: "lot13", name: "Open lot", plot: "W-07", method: "—", level: null, volume: 0, count: 0, median: 0, latest: null, tag: "Vacant", vacant: true },
  { id: "southprint", name: "Southprint", plot: "E-07", method: "DISC", level: "L3", volume: 188400, count: 8, median: 12100, latest: "2026-09-03", tag: "FX" },
  { id: "nightdesk", name: "Night Desk Co.", plot: "W-08", method: "AERO", level: "L2", volume: 156000, count: 6, median: 19800, latest: "2026-09-04", tag: "Crypto" },
  { id: "lot16", name: "Open lot", plot: "E-08", method: "—", level: null, volume: 0, count: 0, median: 0, latest: null, tag: "Vacant", vacant: true }
];
PS.money = (n) => {
  if (!n) return "—";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2).replace(/\.00$/, "") + "M";
  if (n >= 1e3) return "$" + Math.round(n / 1e3) + "k";
  return "$" + n.toLocaleString();
};
PS.moneyFull = (n) => (!n ? "—" : "$" + n.toLocaleString());
PS.active = () => PS.FIRMS.filter((f) => !f.vacant);
PS.totals = () => {
  const a = PS.active();
  return {
    volume: a.reduce((s, f) => s + f.volume, 0),
    count: a.reduce((s, f) => s + f.count, 0),
    firms: a.length,
    verifiedShare: Math.round((a.filter((f) => f.level === "L1" || f.level === "L2").length / a.length) * 100)
  };
};
