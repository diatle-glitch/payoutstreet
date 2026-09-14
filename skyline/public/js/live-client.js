(function (root) {
  const Street = root.StreetState;

  class LiveClient {
    constructor({ pollMs = 12000, rankingRefreshMs = 60000, fetchImpl } = {}) {
      this.fetchImpl = fetchImpl || fetch.bind(root);
      this.pollMs = pollMs;
      this.rankingRefreshMs = rankingRefreshMs;
      this.slots = new Street.FirmSlots();
      this.payouts = new Street.EventDedupe();
      this.inflows = new Street.EventDedupe();
      this.period = '24h';
      this.mode = 'unknown';
      this.demoMode = false;
      this.asOf = null;
      this.connected = false;
      this.reconnecting = false;
      this.stale = false;
      this.lastError = null;
      this.partial = false;
      this.listeners = new Set();
      this.timers = [];
      this.lastPayoutId = null;
      this.lastInflowId = null;
      this.primed = false;
    }

    on(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    emit(type, detail) {
      for (const fn of this.listeners) fn({ type, detail, client: this });
    }

    status() {
      if (!this.connected && !this.slots.slots.length) return 'loading';
      if (this.reconnecting) return 'reconnecting';
      if (this.lastError && !this.slots.slots.length) return 'outage';
      if (this.mode === 'fixture') return 'fixture';
      if (this.stale) return 'stale';
      if (this.partial) return 'partial';
      if (this.connected && this.mode === 'live') return 'live';
      return this.mode;
    }

    async get(path) {
      const res = await this.fetchImpl(path, { headers: { Accept: 'application/json' } });
      const retryAfter = res.headers.get('Retry-After');
      let body = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      if (!res.ok) {
        const err = new Error(body?.message || `HTTP ${res.status}`);
        err.status = res.status;
        err.code = body?.error || 'http_error';
        err.retryAfter = retryAfter;
        throw err;
      }
      if (!body || typeof body !== 'object') {
        const err = new Error('Invalid response');
        err.code = 'invalid_response';
        throw err;
      }
      return body;
    }

    async loadConfig() {
      const body = await this.get('/api/config');
      this.demoMode = !!body.data?.demoMode;
      this.mode = body.data?.mode || body.meta?.mode || 'unknown';
      this.pollMs = body.data?.pollMs || this.pollMs;
      this.rankingRefreshMs = body.data?.rankingRefreshMs || this.rankingRefreshMs;
      this.asOf = body.meta?.as_of || this.asOf;
      return body.data;
    }

    async loadRankings(period = this.period, { resetSlots = false } = {}) {
      this.period = period;
      try {
        const [rankings, stats] = await Promise.all([
          this.get(`/api/rankings?window=${encodeURIComponent(period)}&limit=8`),
          this.get(`/api/stats?window=${encodeURIComponent(period)}`).catch(() => null),
        ]);
        this.mode = rankings.meta?.mode || this.mode;
        this.stale = !!rankings.meta?.stale;
        this.partial = Number(rankings.meta?.dropped_rows || 0) > 0;
        this.asOf = rankings.meta?.as_of || this.asOf;
        this.lastError = rankings.meta?.live_error || null;
        const firms = rankings.data || [];
        if (resetSlots) this.slots.reset(firms);
        else this.slots.applySnapshot(firms);
        this.connected = true;
        this.reconnecting = false;
        this.emit('rankings', {
          firms: this.slots.slots,
          stats: stats?.data || null,
          mappingNote: rankings.meta?.mapping_note || null,
        });
        return this.slots.slots;
      } catch (err) {
        this.lastError = err.code || err.message;
        this.reconnecting = this.slots.slots.length > 0;
        this.emit('error', { scope: 'rankings', error: err });
        throw err;
      }
    }

    async pollLive() {
      try {
        const qs = new URLSearchParams({ limit: '30' });
        if (this.lastPayoutId) qs.set('after_id', this.lastPayoutId);
        const payouts = await this.get(`/api/payouts?${qs}`);
        this.mode = payouts.meta?.mode || this.mode;
        this.stale = !!payouts.meta?.stale || this.stale;
        this.asOf = payouts.meta?.as_of || this.asOf;
        this.reconnecting = false;
        this.connected = true;
        const fresh = [];
        for (const row of payouts.data || []) {
          const first = this.payouts.add(row.id);
          if (first && this.primed) fresh.push(row);
        }
        if (payouts.data?.[0]?.id) this.lastPayoutId = payouts.data[0].id;
        if (fresh.length) this.emit('payouts', fresh);
      } catch (err) {
        this.reconnecting = true;
        this.lastError = err.code || err.message;
        this.emit('error', { scope: 'payouts', error: err });
      }
      try {
        const qs = new URLSearchParams({ limit: '30' });
        if (this.lastInflowId) qs.set('after_id', this.lastInflowId);
        const inflows = await this.get(`/api/inflows?${qs}`);
        const fresh = [];
        for (const row of inflows.data || []) {
          const first = this.inflows.add(row.id);
          if (first && this.primed) fresh.push(row);
        }
        if (inflows.data?.[0]?.id) this.lastInflowId = inflows.data[0].id;
        if (fresh.length) this.emit('inflows', fresh);
      } catch (err) {
        this.partial = true;
        this.emit('error', { scope: 'inflows', error: err });
      }
      this.primed = true;
    }

    async simulate(scenario) {
      const res = await this.fetchImpl('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'simulate_failed');
      return body;
    }

    start() {
      this.stop();
      this.timers.push(setInterval(() => this.pollLive(), this.pollMs));
      this.timers.push(setInterval(() => this.loadRankings(this.period).catch(() => {}), this.rankingRefreshMs));
    }

    stop() {
      for (const t of this.timers) clearInterval(t);
      this.timers = [];
    }
  }

  root.LiveClient = LiveClient;
})(typeof globalThis !== 'undefined' ? globalThis : this);
