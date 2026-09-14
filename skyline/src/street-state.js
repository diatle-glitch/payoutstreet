/**
 * Street accounting + firmId ↔ building index map.
 * Browser copy lives at public/js/street-state.js (UMD).
 */

export class EventDedupe {
  constructor(limit = 4000) {
    this.limit = limit;
    this.seen = new Set();
    this.order = [];
  }
  has(id) {
    return this.seen.has(id);
  }
  add(id) {
    if (!id || this.seen.has(id)) return false;
    this.seen.add(id);
    this.order.push(id);
    if (this.order.length > this.limit) {
      const drop = this.order.shift();
      this.seen.delete(drop);
    }
    return true;
  }
}

export function sortByTotal(firms) {
  return [...firms].sort((a, b) => {
    const dv = (b.value || 0) - (a.value || 0);
    if (dv !== 0) return dv;
    return String(a.id).localeCompare(String(b.id));
  });
}

export class FirmSlots {
  constructor() {
    this.slots = [];
  }
  reset(firms) {
    this.slots = sortByTotal(firms).slice(0, 8);
    return this.slots;
  }
  applySnapshot(firms) {
    const incoming = sortByTotal(firms).slice(0, 8);
    const byId = new Map(incoming.map((f) => [f.id, f]));
    if (!this.slots.length) {
      this.slots = incoming;
      return this.slots;
    }
    const next = [];
    for (const slot of this.slots) {
      const fresh = byId.get(slot.id);
      if (fresh) next.push(fresh);
    }
    for (const firm of incoming) {
      if (next.length >= 8) break;
      if (!next.some((s) => s.id === firm.id)) next.push(firm);
    }
    this.slots = next.slice(0, 8);
    return this.slots;
  }
  indexOf(firmId) {
    return this.slots.findIndex((f) => f.id === firmId);
  }
  map() {
    const out = {};
    this.slots.forEach((f, i) => {
      out[f.id] = i;
    });
    return out;
  }
}

export function applyVerifiedPayout(slots, event) {
  if (!event || !event.verified) return { applied: false, reason: 'unverified' };
  const idx = slots.findIndex((f) => f.id === event.firmId);
  if (idx < 0) return { applied: false, reason: 'unknown_firm' };
  const firm = slots[idx];
  firm.value = (firm.value || 0) + event.amount;
  firm.count = (firm.count || 0) + 1;
  if (firm.totalPaid != null && event.amountExact) {
    firm.totalPaid = event.amountExact;
  }
  return { applied: true, index: idx, firm };
}

export function streetTotals(firms) {
  const total = firms.reduce((a, f) => a + (f.value || 0), 0);
  const count = firms.reduce((a, f) => a + (f.count || 0), 0);
  const unverified = firms.filter((f) => f.unverified).length;
  const sorted = sortByTotal(firms);
  const leader = sorted[0] || null;
  return {
    total,
    count,
    firms: firms.length,
    unverified,
    leader,
    leaderShare: leader && total ? (leader.value / total) * 100 : 0,
  };
}
