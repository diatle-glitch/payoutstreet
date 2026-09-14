const $ = (s) => document.querySelector(s);
const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
const compact = (n) => '$' + ((n || 0) / 1000).toFixed(1) + 'k';
const escapeHtml = window.escapeHtml;
const safeUrl = window.safeUrl;
const Street = window.StreetState;

let firms = [];
let snapshot = [];
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
let tick = 0;
const sponsors = {};
const live = new LiveClient();
let lastStatus = '';
let tapeEvents = [];
let topups = [];
let period = '24h';
let mappingNote = null;
let serverStats = null;

function periodLabel(id) {
  return ({ '24h': '24h', '7d': '7d', '30d': '30d', '90d': '90d', alltime: 'All Time' })[id] || id;
}

function billboardText(i) {
  return sponsors[i]?.name || 'YOUR BRAND';
}

function cameoHtml(f) {
  if (f.cameo === 'brett') {
    return '<span class="window-cameo cameo-brett" aria-label="Brett Simba at the Tradeify window"><img src="assets/brett-tradeify.png" alt="Brett Simba"><small>BRETT</small></span>';
  }
  if (f.cameo === 'matt') {
    return '<span class="window-cameo cameo-matt" aria-label="Matt Leech at the My Funded Futures window"><img src="assets/matt-mff.png" alt="Matt Leech"><small>MATT</small></span>';
  }
  return '';
}

function setConnectionUi() {
  const status = live.status();
  const labels = {
    loading: 'LOADING',
    live: 'LIVE · CONNECTED',
    fixture: 'FIXTURE MODE',
    reconnecting: 'RECONNECTING',
    stale: 'STALE SNAPSHOT',
    partial: 'PARTIAL FEED',
    outage: 'FEED OUTAGE',
    delayed: 'DATA DELAYED',
    unknown: 'CONNECTING',
  };
  $('#conn-label').textContent = labels[status] || status.toUpperCase();
  const asOf = live.asOf ? new Date(live.asOf).toISOString().replace('.000', '') : '';
  $('#as-of').textContent = asOf ? `as of ${asOf}` : 'UTC';
  const dot = $('#conn-dot');
  const sky = $('#skyline-dot');
  dot.className = 'status-dot';
  sky.className = 'status-dot';
  if (status === 'reconnecting' || status === 'stale' || status === 'partial' || status === 'fixture') {
    dot.classList.add('amber');
    sky.classList.add('amber');
  }
  if (status === 'outage') {
    dot.classList.add('down');
    sky.classList.add('down');
  }
  const banner = $('#conn-banner');
  const messages = {
    loading: 'Loading rankings from the Partner feed.',
    fixture: 'OnTheTape /v1 is not reachable from this host. Showing captured fixtures — not a live Partner connection. Point ONTATAPE_API_BASE at a tunnel or post-PR #34 Railway/prod to go live.',
    reconnecting: 'Temporary feed error. Last good skyline is still on screen.',
    stale: 'Serving last good snapshot while the live path recovers.',
    partial: 'Rankings loaded; a live lane failed. Totals are not wiped.',
    outage: 'The feed is down. Retrying without clearing the street.',
    live: '',
  };
  const text = messages[status] || '';
  banner.hidden = !text;
  banner.dataset.state = status;
  banner.textContent = text;
  $('#replay-status').textContent = status === 'live' ? 'Live tape' : status === 'fixture' ? 'Fixture replay' : labels[status] || 'Street';
  $('#key-note').textContent = live.demoMode
    ? (status === 'live' ? 'Demo controls on · live path also wired' : 'Demo / simulator · ENABLE_DEMO_MODE')
    : (status === 'live' ? 'Verified payouts only add to totals' : 'Fixture or delayed feed');
  $('#skyline-subtle').textContent = mappingNote || 'Every payout builds the street.';
  $('#books-stamp').textContent = `${periodLabel(period)} snapshot${asOf ? ' · ' + asOf : ''}${status === 'fixture' ? ' / Fixture' : ''}`;
  $('#footer-note').innerHTML = status === 'live'
    ? 'Staging observatory · live Partner /v1<br>Advertising never changes payout rankings.'
    : 'Staging observatory · fixture until /v1 is deployed<br>Advertising never changes payout rankings.';
  $('#demo-panel').hidden = !live.demoMode;
}

function render() {
  if (!firms.length) {
    $('#skyline').innerHTML = '';
    $('#firm-labels').innerHTML = '';
    $('#book-rows').innerHTML = '';
    return;
  }
  const totals = Street.streetTotals(firms);
  const total = serverStats?.totalPaidVisual && !live.stale ? serverStats.totalPaidVisual : totals.total;
  const count = serverStats?.payoutCount && !live.stale ? serverStats.payoutCount : totals.count;
  $('#total').innerHTML = `${escapeHtml(money(total))}<span>.00</span>`;
  $('#payout-count').textContent = String(count);
  $('#total-caption').textContent = `Across the street · ${periodLabel(period)}`;
  $('#firm-count').innerHTML = `${String(totals.firms).padStart(2, '0')}<span> firms</span>`;
  $('#firm-caption').textContent = totals.unverified
    ? `${totals.firms - totals.unverified} provider labels · ${totals.unverified} unverified*`
    : `${totals.firms} firms in this window`;
  const leader = totals.leader;
  if (leader) {
    $('#leader-name').textContent = leader.name;
    $('#leader-rank').textContent = '01';
    $('.firm-mark').textContent = leader.mark || '•';
    $('.firm-mark').style.background = leader.color || '#e1f784';
    $('#leader-share').textContent = `${totals.leaderShare.toFixed(1)}% of ${periodLabel(period)}`;
  }
  const sorted = Street.sortByTotal(firms);
  const max = Math.max(200000, ...firms.map((f) => f.value * 1.1));
  $('#skyline').innerHTML = firms.map((f, i) => `<div class="building-lot" style="--height:${100 + f.value / max * 270}px;--firm-color:${escapeHtml(f.color)}">
 <button class="rooftop-ad theme-${escapeHtml(sponsors[i]?.theme || ['ivory', 'lime', 'ink', 'ivory', 'ink', 'lime', 'ivory', 'ink'][i])}" data-ad="${i}" aria-label="Preview advertising above ${escapeHtml(f.name)}"><span class="ad-meta">ROOFTOP ${String(i + 1).padStart(2, '0')} / AD</span><b></b><span class="ad-cta">${sponsors[i] ? 'PREVIEW' : 'ADVERTISE HERE'} ↗</span></button>
 <button class="tower ${f.unverified ? 'unverified' : ''}" data-firm="${i}" aria-label="${escapeHtml(f.name)}: ${escapeHtml(money(f.value))}. View details"><span class="building-facade facade-${i}" aria-hidden="true"></span><span class="building-facade building-entry facade-${i}" aria-hidden="true"></span>${cameoHtml(f)}<span class="building-payout">${escapeHtml(compact(f.value))}<small>TOTAL PAID</small></span><span class="building-rank">${String(sorted.findIndex((x) => x.id === f.id) + 1).padStart(2, '0')}</span>${f.unverified ? '<span class="building-unverified">UNVERIFIED</span>' : ''}</button></div>`).join('');
  document.querySelectorAll('[data-ad]').forEach((el) => {
    el.querySelector('b').textContent = billboardText(+el.dataset.ad);
    el.onclick = () => advertise(+el.dataset.ad);
  });
  $('#firm-labels').innerHTML = firms.map((f, i) => `<button class="firm-label" data-firm="${i}"><b>${escapeHtml(f.shortName || f.short || f.name)}</b><small class="${f.unverified ? 'source-warning' : ''}">${f.unverified ? 'Unverified' : escapeHtml(String(f.count) + ' paid')}<span class="source-name"> · ${escapeHtml(f.source)}</span></small></button>`).join('');
  if (!sorted.length || total <= 0) {
    $('#book-rows').innerHTML = '<tr><td colspan="7">No payouts in this period.</td></tr>';
  } else {
    $('#book-rows').innerHTML = sorted.map((f, i) => `<tr tabindex="0" role="button" data-firm="${firms.findIndex((x) => x.id === f.id)}" aria-label="View ${escapeHtml(f.name)}"><td>${String(i + 1).padStart(2, '0')}</td><td><span style="color:${escapeHtml(f.color)}">${escapeHtml(f.mark)}</span>${escapeHtml(f.name)}</td><td>${escapeHtml(money(f.value))}</td><td>${escapeHtml(f.count)}</td><td><span class="share"><i style="width:${f.value / total * 300}%"></i></span>${(f.value / total * 100).toFixed(1)}%</td><td><span class="source ${f.unverified ? 'unverified' : ''}">${f.unverified ? '◌' : '↗'} ${escapeHtml(f.source)}${f.unverified ? ' · unverified' : ''}</span></td><td>↗</td></tr>`).join('');
  }
  document.querySelectorAll('[data-firm]').forEach((el) => {
    el.onclick = () => showFirm(+el.dataset.firm);
    if (el.tagName === 'TR') {
      el.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      };
    }
  });
  setConnectionUi();
}

function advertise(i) {
  const f = firms[i];
  if (!f) return;
  open(`<span class="eyebrow">ROOFTOP ${String(i + 1).padStart(2, '0')} / ADVERTISING</span><h2>Your brand.<br>Above the street.</h2><p>A dedicated billboard above <b>${escapeHtml(f.name)}</b>. The placement stays with this building as its payout floors grow.</p><form id="ad-form"><label for="ad-name">Preview your brand name</label><input id="ad-name" maxlength="22" placeholder="YOUR BRAND" autocomplete="organization"><label for="ad-theme">Billboard finish</label><select id="ad-theme"><option value="ivory">Warm white</option><option value="lime">Street lime</option><option value="ink">Midnight</option></select><button class="preview-ad" type="submit">See it on the rooftop ↗</button><button class="reset-ad" type="button" id="reset-ad">Reset this placement</button></form><p class="ad-note">Concept preview only. No reservation or payment. Rates and booking are not yet available.</p><p class="ad-note">Advertising never changes payout rankings or verification status. A rooftop placement does not imply the prop firm endorses the advertiser.</p>`);
  $('#ad-name').value = sponsors[i]?.name || '';
  $('#ad-theme').value = sponsors[i]?.theme || 'ivory';
  $('#ad-form').onsubmit = (e) => {
    e.preventDefault();
    const name = $('#ad-name').value.trim();
    if (!name) {
      $('#ad-name').focus();
      $('#ad-name').setCustomValidity('Enter a brand name to preview.');
      $('#ad-name').reportValidity();
      return;
    }
    sponsors[i] = { name, theme: $('#ad-theme').value };
    $('#detail-dialog').close();
    render();
    document.querySelector(`[data-ad="${i}"]`)?.focus();
  };
  $('#ad-name').oninput = () => $('#ad-name').setCustomValidity('');
  $('#reset-ad').onclick = () => {
    delete sponsors[i];
    $('#detail-dialog').close();
    render();
    document.querySelector(`[data-ad="${i}"]`)?.focus();
  };
}

function open(content) {
  $('#dialog-content').innerHTML = content;
  $('#detail-dialog').showModal();
}

async function showFirm(i) {
  const f = firms[i];
  if (!f) return;
  const avg = f.avg ? money(Number(f.avg)) : money(f.count ? f.value / f.count : 0);
  const median = f.median ? money(Number(f.median)) : '—';
  open(`<span class="eyebrow">FIRM SNAPSHOT / ${escapeHtml(periodLabel(period).toUpperCase())}</span><h2>${escapeHtml(f.name)}</h2><strong>${escapeHtml(money(f.value))}</strong><p>Total trader payouts in this window. Firm top-ups are not included.</p><div class="detail-grid"><span>Payouts<b>${escapeHtml(f.count)}</b></span><span>Average payout<b>${escapeHtml(avg)}</b></span><span>Median<b>${escapeHtml(median)}</b></span><span>Source<b>${escapeHtml(f.source)}</b></span></div><p>${f.unverified ? 'Discord-reported or unconfirmed mix is unverified and shown with a dashed tower.' : 'Verified from a non-Discord primary mix (Rise or on-chain). Provider labels alone never prove verification.'}</p><p class="ad-note" id="cash-line">Cash on hand · loading</p><ul class="payout-history" id="firm-history"><li>Loading recent payouts…</li></ul>`);
  try {
    const [cash, history] = await Promise.all([
      fetch(`/api/firms/${encodeURIComponent(f.id)}/cash-on-hand`).then((r) => r.json()),
      fetch(`/api/firms/${encodeURIComponent(f.id)}/payouts?window=${encodeURIComponent(period)}&limit=8`).then((r) => r.json()),
    ]);
    const cashEl = $('#cash-line');
    if (cashEl && cash.data?.amount) cashEl.textContent = `Cash on hand · ${money(cash.data.amountVisual)} (${cash.data.token || 'USD'})`;
    else if (cashEl) cashEl.textContent = 'Cash on hand · not published for this firm';
    const list = $('#firm-history');
    if (list) {
      list.replaceChildren();
      const rows = history.data || [];
      if (!rows.length) {
        const li = document.createElement('li');
        li.textContent = 'No payouts in this window.';
        list.append(li);
      }
      for (const row of rows.slice(0, 8)) {
        const li = document.createElement('li');
        if (!row.verified) li.className = 'unverified';
        const left = document.createElement('span');
        left.textContent = `${row.verified ? '' : 'Unverified · '}${row.source || ''} · ${row.occurredAt ? new Date(row.occurredAt).toISOString().slice(0, 16) : ''}Z`;
        const right = document.createElement('b');
        right.textContent = money(row.amount);
        li.append(left, right);
        if (row.evidenceUrl && safeUrl(row.evidenceUrl)) {
          const a = document.createElement('a');
          a.href = safeUrl(row.evidenceUrl);
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = ' proof';
          li.append(a);
        }
        list.append(li);
      }
    }
  } catch {
    const cashEl = $('#cash-line');
    if (cashEl) cashEl.textContent = 'Detail lanes unavailable; ranking totals are unchanged.';
  }
}

function methodology() {
  open('<span class="eyebrow">READING THE STREET</span><h2>Payouts, made visible.</h2><p>Each tower represents a prop firm. Every building has the same base height; the extra floors above it are proportional to total dollars paid. Exact totals are shown on the facade and in Daily books. Rooftop advertisements are excluded from that height. Each verified payout is counted immediately. A walker then visits the building and leaves with a cash bag (under $2,000), a duffel ($2,000–$9,999), a cash trolley ($10,000–$49,999), or drives in for a supercar pickup ($50,000+). Buildings process visitors independently, one at a time per entrance. Twenty different men and women use four sidewalk lanes. Supercars use a separate road lane. A maximum of 16 visible visitors keep the street readable; extra visitors wait in a queue. Pausing freezes motion, not the books.</p><p><b>Source matters.</b> A source label identifies the reported payment rail. An unverified badge and dashed outline mark Discord-only reports. Verification is never inferred from a provider name alone.</p><p><b>Top-ups are not payouts.</b> Helicopter drops are firm account inflows and never add to trader totals.</p><p>UI period 90d maps to Partner window <code>365d</code> (closest supported). Amounts arrive as decimal strings and are parsed before any canvas number is used.</p>');
}

function updatePause() {
  $('#pause').innerHTML = paused ? '▶ <span>Play</span>' : 'Ⅱ <span>Pause</span>';
  $('#pause').setAttribute('aria-label', paused ? 'Play replay' : 'Pause replay');
}

function paintTape() {
  $('#tape').replaceChildren();
  if (!tapeEvents.length) {
    const empty = document.createElement('span');
    empty.className = 'tape-source';
    empty.textContent = 'No new tape rows yet.';
    $('#tape').append(empty);
    return;
  }
  for (const e of tapeEvents.slice(0, 10)) {
    const firm = document.createElement('b');
    const amount = document.createElement('span');
    const source = document.createElement('span');
    firm.textContent = e.firmName || firms[e.firm]?.name || e.firmId;
    amount.textContent = (e.verified ? '+' : '◌ ') + money(e.amount);
    source.className = 'tape-source';
    source.textContent = `${e.source || 'Tape'} · ${e.verified ? 'Verified' : 'Unverified'}`;
    $('#tape').append(firm, amount, source);
  }
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const canvas = $('#payout-people');
const ctx = canvas.getContext('2d');
const walkerSheet = new Image();
walkerSheet.src = 'assets/diverse-walkers.png';
const equipmentSheet = new Image();
equipmentSheet.src = 'assets/payout-equipment.png';
const helicopterImage = new Image();
helicopterImage.src = 'assets/topup-helicopter.png';
const supercarImage = new Image();
supercarImage.src = 'assets/payout-supercar.png';
const engine = new PayoutEngine({ width: $('.city-scene').clientWidth });
let lastTime = 0;

function sizeStreet() {
  const width = $('.city-scene').clientWidth;
  engine.resize(width);
  const height = parseFloat(getComputedStyle($('.city-scene')).getPropertyValue('--ground')) + 197;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
new ResizeObserver(sizeStreet).observe($('.city-scene'));
sizeStreet();

function receivePayouts(batch) {
  const visual = [];
  for (const e of batch) {
    const item = {
      id: e.id,
      firm: Number.isInteger(e.firm) ? e.firm : live.slots.indexOf(e.firmId),
      amount: e.amount,
      firmId: e.firmId,
      firmName: e.firmName,
      verified: e.verified !== false,
      source: e.source,
    };
    if (!Number.isInteger(item.firm) || item.firm < 0) {
      tapeEvents.unshift(item);
      continue;
    }
    if (item.verified) {
      Street.applyVerifiedPayout(firms, { ...item, firmId: firms[item.firm]?.id });
      visual.push(item);
    }
    tapeEvents.unshift(item);
  }
  if (visual.length) engine.enqueue(visual);
  if (batch.length) {
    render();
    paintTape();
  }
  if (reducedMotion.matches) engine.finishWithoutMotion();
  updateStreetStatus();
}

function updateStreetStatus() {
  const text = reducedMotion.matches
    ? 'Reduced motion · ' + engine.completed + ' payouts shown'
    : paused
      ? 'Paused · ' + engine.actors.length + ' on the street · ' + engine.pending.length + ' queued'
      : engine.actors.length + ' on the street · ' + engine.pending.length + ' queued · ' + engine.completed + ' collected';
  if (text !== lastStatus) {
    $('#walking-status').textContent = text;
    lastStatus = text;
  }
}

function runDemo(batch) {
  if (!live.demoMode) return;
  if (!reducedMotion.matches) paused = false;
  updatePause();
  receivePayouts(batch.map((e, i) => ({
    id: `local-demo-${Date.now()}-${i}-${e.firm}-${e.amount}`,
    firm: e.firm,
    firmId: firms[e.firm]?.id,
    firmName: firms[e.firm]?.name,
    amount: e.amount,
    verified: true,
    source: firms[e.firm]?.source || 'Demo',
  })));
}

function launchTopup(firm, amount) {
  const index = Number.isInteger(firm) ? firm : live.slots.indexOf(firm);
  if (index < 0) return;
  topups.push({ firm: index, amount: amount || 150000, x: -190, phase: 'fly', elapsed: 0, drop: 0 });
  if (!reducedMotion.matches) paused = false;
  updatePause();
}

$('#how').onclick = methodology;
$('#methodology').onclick = methodology;
$('.close-dialog').onclick = () => $('#detail-dialog').close();
$('#detail-dialog').addEventListener('click', (e) => {
  if (e.target === $('#detail-dialog')) {
    const r = e.target.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close();
  }
});
$('#sponsor-info').onclick = () => advertise(0);
$('#pause').onclick = () => {
  paused = !paused;
  updatePause();
  updateStreetStatus();
};
$('#restart').onclick = () => {
  engine.reset();
  firms = snapshot.map((f) => ({ ...f }));
  live.slots.slots = firms;
  tick = 0;
  topups = [];
  tapeEvents = [];
  render();
  paintTape();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updateStreetStatus();
};
document.querySelectorAll('[data-view]').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('nav-active', x === b));
    $(b.dataset.view === 'books' ? '#books' : '#street').scrollIntoView({
      behavior: reducedMotion.matches ? 'instant' : 'smooth',
      block: 'start',
    });
  };
});
document.querySelectorAll('[data-period]').forEach((btn) => {
  btn.onclick = async () => {
    period = btn.dataset.period;
    document.querySelectorAll('[data-period]').forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
    engine.reset();
    topups = [];
    tapeEvents = [];
    try {
      await live.loadRankings(period, { resetSlots: true });
    } catch {
      setConnectionUi();
    }
  };
});

$('#demo-one').onclick = () => {
  const amounts = [850, 4500, 18000];
  runDemo([{ firm: tick % Math.max(firms.length, 1), amount: amounts[tick++ % 3] }]);
};
$('#demo-truck').onclick = () => runDemo([{ firm: Math.min(2, firms.length - 1), amount: 75000 }]);
$('#demo-same').onclick = () => runDemo([850, 2400, 12500, 1800, 22000].map((amount) => ({ firm: 0, amount })));
$('#demo-many').onclick = () => runDemo([750, 2400, 75000, 1600, 6500, 24000, 1100, 85000].map((amount, firm) => ({ firm, amount })));
$('#demo-topup').onclick = () => launchTopup(tick++ % Math.max(firms.length, 1), [150000, 250000, 500000][tick % 3]);
$('#demo-disconnect').onclick = async () => {
  try {
    await live.simulate('disconnect');
    live.reconnecting = true;
    setConnectionUi();
  } catch {
    live.reconnecting = true;
    setConnectionUi();
  }
};

function drawEquipment(cell, x, feet, w, h) {
  if (!equipmentSheet.complete || !equipmentSheet.naturalWidth) return;
  const rects = [[142, 134, 310, 376], [633, 112, 601, 414], [46, 687, 515, 462], [628, 764, 613, 370]];
  const [sx, sy, sw, sh] = rects[cell];
  ctx.drawImage(equipmentSheet, sx, sy, sw, sh, x, feet - h, w, h);
}
function drawWalker(a, x, y, w, h, sw, sh, identity, moving) {
  const sx = (identity % 4) * sw;
  const sy = Math.floor(identity / 4) * sh;
  const split = 0.64;
  const step = moving ? Math.sin(engine.time * 13 + a.order) * 0.18 : 0;
  ctx.drawImage(walkerSheet, sx, sy, sw, sh * split, x, y, w, h * split);
  const hipY = y + h * split;
  const legH = h * (1 - split);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 4, hipY, w / 2 + 8, legH + 10);
  ctx.clip();
  ctx.translate(x + w * 0.43, hipY);
  ctx.rotate(step);
  ctx.drawImage(walkerSheet, sx, sy + sh * split, sw, sh * (1 - split), -w * 0.43, 0, w, legH);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + w / 2 - 4, hipY, w / 2 + 8, legH + 10);
  ctx.clip();
  ctx.translate(x + w * 0.57, hipY);
  ctx.rotate(-step);
  ctx.drawImage(walkerSheet, sx, sy + sh * split, sw, sh * (1 - split), -w * 0.57, 0, w, legH);
  ctx.restore();
}
function drawStreet() {
  const sceneHeight = canvas.height / Math.min(devicePixelRatio || 1, 2);
  ctx.clearRect(0, 0, engine.width, sceneHeight);
  for (const h of topups) {
    const target = engine.doorX(h.firm);
    const hx = h.x;
    const hy = 88 + Math.sin(h.elapsed * 5) * 3;
    if (helicopterImage.complete && helicopterImage.naturalWidth) ctx.drawImage(helicopterImage, hx - 105, hy - 54, 210, 136);
    ctx.font = '700 12px "DM Sans",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e1f784';
    ctx.fillText('FIRM TOP-UP · ' + money(h.amount), hx, hy - 48);
    if (h.phase === 'drop') {
      for (let i = 0; i < 13; i++) {
        const fall = Math.min(1, h.drop - i * 0.035);
        if (fall > 0) {
          const bx = target + Math.sin(i * 9.7) * 34;
          const by = 145 + fall * (330 + Math.cos(i) * 38);
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(fall * 5 + i);
          ctx.fillStyle = i % 2 ? '#d8e7aa' : '#eef1d5';
          ctx.fillRect(-6, -3, 12, 6);
          ctx.restore();
        }
      }
    }
  }
  const ready = walkerSheet.complete && walkerSheet.naturalWidth > 0;
  const groundOffset = parseFloat(getComputedStyle($('.city-scene')).getPropertyValue('--ground')) - 48;
  ctx.save();
  ctx.translate(0, groundOffset);
  for (const a of [...engine.actors].sort((a, b) => a.y - b.y)) {
    const truck = a.tier === 4;
    const driving = truck && ['approach', 'depart'].includes(a.phase);
    if (truck) {
      ctx.save();
      if (supercarImage.complete && supercarImage.naturalWidth) {
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 12;
        ctx.drawImage(supercarImage, a.x - 95, 143, 190, 72);
      } else drawEquipment(3, a.x - 83, 211, 168, 112);
      ctx.font = '700 11px "DM Sans",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e1f784';
      ctx.fillText(a.loaded ? 'BIG PAYCHECK · +' + money(a.amount) : 'VIP PAYOUT PICKUP', a.x, 137);
      ctx.restore();
    }
    if (a.phase === 'inside' || driving) continue;
    const moving = !['waiting', 'inside'].includes(a.phase);
    const identity = a.order % 20;
    const bob = moving ? Math.sin(engine.time * 13 + a.order) * 0.8 : 0;
    const w = 66;
    const h = 55;
    const x = a.x - w / 2;
    const feet = a.y + 48;
    const y = feet - h + bob;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(a.opacity, (a.x + 45) / 40, 1));
    if (ready) {
      const sw = walkerSheet.naturalWidth / 4;
      const sh = walkerSheet.naturalHeight / 5;
      drawWalker(a, x, y, w, h, sw, sh, identity, moving);
    }
    if (a.loaded && !truck) {
      if (a.tier === 1) drawEquipment(0, a.x + 2, feet - 6, 18, 22);
      else if (a.tier === 2) drawEquipment(1, a.x - 4, feet - 4, 32, 25);
      else drawEquipment(2, a.x + 12, feet + 1, 45, 42);
    }
    if (a.opacity > 0.22 && !truck) {
      const label = (a.loaded ? '+' : '') + money(a.amount);
      ctx.font = '700 12px "DM Sans",sans-serif';
      const tw = ctx.measureText(label).width;
      const lx = Math.max(tw / 2 + 8, Math.min(engine.width - tw / 2 - 8, a.x));
      const ly = Math.max(18, y - 25);
      ctx.fillStyle = a.loaded ? '#101713f5' : '#22291fed';
      ctx.strokeStyle = a.loaded ? '#e1f78499' : '#9eaa7955';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(lx - tw / 2 - 7, ly - 14, tw + 14, 20, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = a.loaded ? '#e1f784' : '#f0f2e8';
      ctx.textAlign = 'center';
      ctx.fillText(label, lx, ly);
    }
    ctx.restore();
  }
  for (let i = 0; i < 8; i++) {
    const n = engine.pending.filter((e) => e.firm === i).length + engine.actors.filter((a) => a.firm === i && ['approach', 'waiting'].includes(a.phase)).length;
    const tower = document.querySelector(`.tower[data-firm="${i}"]`);
    tower?.classList.toggle('door-active', engine.doors[i] !== null);
    if (n > 1) {
      ctx.font = '11px "DM Sans",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#192218ed';
      ctx.fillRect(engine.doorX(i) - 35, 3, 70, 18);
      ctx.fillStyle = '#d7e5c4';
      ctx.fillText(n + ' arriving', engine.doorX(i), 16);
    }
  }
  ctx.restore();
}

function animate(now) {
  const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
  lastTime = now;
  const blocked = paused || document.hidden || $('#detail-dialog').open;
  if (!blocked) {
    if (!reducedMotion.matches) engine.step(dt);
    for (const h of topups) {
      h.elapsed += dt;
      const target = engine.doorX(h.firm);
      if (h.phase === 'fly') {
        h.x += 155 * dt;
        if (h.x >= target) {
          h.x = target;
          h.phase = 'drop';
          h.elapsed = 0;
        }
      } else if (h.phase === 'drop') {
        h.drop += dt / 2.4;
        if (h.drop >= 1) {
          h.phase = 'leave';
          h.elapsed = 0;
        }
      } else {
        h.x += 185 * dt;
      }
    }
    topups = topups.filter((h) => h.x < engine.width + 210);
  }
  drawStreet();
  updateStreetStatus();
  requestAnimationFrame(animate);
}

live.on(({ type, detail }) => {
  if (type === 'rankings') {
    firms = detail.firms.map((f) => ({ ...f }));
    snapshot = detail.firms.map((f) => ({ ...f }));
    mappingNote = detail.mappingNote;
    serverStats = detail.stats;
    render();
    setConnectionUi();
  }
  if (type === 'payouts') {
    receivePayouts(detail.map((row) => ({
      id: row.id,
      firmId: row.firmId,
      firmName: row.firmName,
      amount: row.amount,
      verified: row.verified,
      source: row.source,
    })));
    setConnectionUi();
  }
  if (type === 'inflows') {
    for (const row of detail) launchTopup(row.firmId, row.amount);
  }
  if (type === 'error') setConnectionUi();
});

$('#how').onclick = methodology;
updatePause();
render();
requestAnimationFrame(animate);
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) engine.finishWithoutMotion();
  updateStreetStatus();
});

(async function boot() {
  try {
    await live.loadConfig();
    setConnectionUi();
    await live.loadRankings(period, { resetSlots: true });
    await live.pollLive();
    live.start();
  } catch {
    setConnectionUi();
    live.start();
  }
})();
