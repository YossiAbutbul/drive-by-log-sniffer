/* App orchestration: top-level render, key figures with sparklines,
   roster table, topbar metadata, status pill, init, live clock. */

function renderAll() {
  const data = getFiltered();
  renderOverviewSubtitle();
  renderKeyFigures(data);
  renderTable(data);
  renderActiveChart();
  updateStatusFromData();
}

/* ── Overview subtitle ─────────────────────────────────────── */
function renderOverviewSubtitle() {
  const el = document.getElementById('overview-subtitle');
  if (!el) return;

  const devs = Object.values(State.stats);
  if (!devs.length) { el.textContent = '—'; return; }

  const allTs = devs.flatMap(d => d.messages.map(m => m.ts));
  const minT = Math.min(...allTs), maxT = Math.max(...allTs);
  const dur = fmtDur(maxT - minT);

  const totMsgs = devs.reduce((s, d) => s + d.total, 0);
  const date = new Date(minT * 1000).toLocaleDateString(undefined,
    { year: 'numeric', month: 'short', day: 'numeric' });

  el.textContent = `${devs.length} address${devs.length===1?'':'es'} · ${totMsgs.toLocaleString()} packets · ${date} · ${dur} span`;
}

/* ── Status pill ───────────────────────────────────────────── */
function setStatus(mode, label) {
  const el = document.getElementById('status-pill');
  el.classList.remove('live', 'alarm');
  if (mode === 'live')  el.classList.add('live');
  if (mode === 'alarm') el.classList.add('alarm');
  document.getElementById('status-text').textContent = label;
}

function updateStatusFromData() {
  const data = getFiltered();
  const devs = Object.values(data);
  if (!devs.length) { setStatus('idle', 'No data'); return; }
  const totMissed = devs.reduce((s, d) => s + d.missed, 0);
  const totExp = devs.reduce((s, d) => s + d.total + d.missed, 0);
  const per = totExp ? (totMissed / totExp * 100) : 0;
  if (per > State.threshold) setStatus('alarm', `PER ${per.toFixed(1)}% above threshold`);
  else                       setStatus('live', `PER ${per.toFixed(2)}% · within range`);
}

/* ── Key figures ───────────────────────────────────────────── */
function renderKeyFigures(data) {
  const devs = Object.values(data);
  const totMsgs   = devs.reduce((s, d) => s + d.total, 0);
  const totMissed = devs.reduce((s, d) => s + d.missed, 0);
  const totExp = totMsgs + totMissed;
  const per = totExp ? (totMissed / totExp * 100).toFixed(2) : 0;

  const allRssi = devs.flatMap(d => d.messages.map(m => m.rssi).filter(v => v != null));
  const allSnr  = devs.flatMap(d => d.messages.map(m => m.snr ).filter(v => v != null));
  const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '—';

  setText('fig-msgs', totMsgs.toLocaleString());
  setText('fig-msgs-sub', `${devs.length} address${devs.length===1?'':'es'} · all sources`);

  setText('fig-devs', String(devs.length));
  setText('fig-devs-sub', formatDevsSub(devs));

  setText('fig-missed', totMissed.toLocaleString());
  setText('fig-missed-sub', 'frame-counter gaps');

  document.getElementById('fig-per').innerHTML = `${per}<span class="unit">%</span>`;
  setText('fig-per-sub', `${(100 - parseFloat(per)).toFixed(2)}% delivered`);

  document.getElementById('fig-rssi').innerHTML = `${avg(allRssi)}<span class="unit">dBm</span>`;
  setText('fig-rssi-sub', allRssi.length
    ? `min ${Math.min(...allRssi)} · max ${Math.max(...allRssi)}` : '—');

  document.getElementById('fig-snr').innerHTML = `${avg(allSnr)}<span class="unit">dB</span>`;
  setText('fig-snr-sub', allSnr.length
    ? `min ${Math.min(...allSnr)} · max ${Math.max(...allSnr)}` : '—');

  // Sparklines (combined across selected devices)
  const allMsgs = devs.flatMap(d => d.messages).sort((a, b) => a.ts - b.ts);
  const sw = 110, sh = 22;

  document.getElementById('fig-msgs-spark').innerHTML =
    sparkline(bucketCumulative(allMsgs, 60), { width: sw, height: sh, fill: true, endDot: false });
  document.getElementById('fig-devs-spark').innerHTML =
    sparkline(bucketCumulative(allMsgs, 60), { width: sw, height: sh, fill: true, endDot: false });
  document.getElementById('fig-missed-spark').innerHTML =
    sparkline(bucketPER(allMsgs, 60), { width: sw, height: sh, fill: true });
  document.getElementById('fig-per-spark').innerHTML =
    sparkline(bucketPER(allMsgs, 60), { width: sw, height: sh, fill: true });
  document.getElementById('fig-rssi-spark').innerHTML =
    sparkline(bucketSeries(allMsgs, m => m.rssi, 60), { width: sw, height: sh });
  document.getElementById('fig-snr-spark').innerHTML =
    sparkline(bucketSeries(allMsgs, m => m.snr, 60), { width: sw, height: sh });
}

function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

/* Show first 2 addresses + "+ N more" so we don't overflow on large fleets */
function formatDevsSub(devs) {
  if (!devs.length) return '—';
  const labelOf = d => devLabel(d.devaddr);
  if (devs.length <= 2) return devs.map(labelOf).join(', ');
  const head = devs.slice(0, 2).map(labelOf).join(', ');
  return `${head} + ${devs.length - 2} more`;
}

/* ── Inputs ───────────────────────────────────────────────── */
function onIntervalChange() {
  State.interval = parseFloat(document.getElementById('interval-input').value) || 11;
  saveState();
  if (Object.keys(State.stats).length) renderAll();
}

function onThresholdChange() {
  State.threshold = parseFloat(document.getElementById('threshold-input').value) || 10;
  saveState();
  if (Object.keys(State.stats).length) renderAll();
}

/* ── Per-chart Y-axis overrides ─────────────────────────────── */
function onYLimitChange(chart, kind, raw) {
  if (!State.yLimits[chart]) State.yLimits[chart] = { min: null, max: null };
  const v = raw === '' ? null : parseFloat(raw);
  State.yLimits[chart][kind] = (v == null || isNaN(v)) ? null : v;
  saveState();
  if (State.activeTab === chart) renderActiveChart();
}

function resetYLimit(chart) {
  State.yLimits[chart] = { min: null, max: null };
  const minEl = document.getElementById('y-min-' + chart);
  const maxEl = document.getElementById('y-max-' + chart);
  if (minEl) minEl.value = '';
  if (maxEl) maxEl.value = '';
  saveState();
  if (State.activeTab === chart) renderActiveChart();
}

function syncYLimitInputs() {
  Object.keys(State.yLimits || {}).forEach(c => {
    const lim = State.yLimits[c] || {};
    const minEl = document.getElementById('y-min-' + c);
    const maxEl = document.getElementById('y-max-' + c);
    if (minEl) minEl.value = lim.min == null ? '' : lim.min;
    if (maxEl) maxEl.value = lim.max == null ? '' : lim.max;
  });
}

/* ── Live clock ────────────────────────────────────────────── */
function tickClock() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const el = document.getElementById('clock');
  if (el) el.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/* ── Init ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setupDragDrop();
  setupModalDismiss();
  tickClock();
  setInterval(tickClock, 1000);

  if (loadState()) {
    document.getElementById('interval-input').value  = State.interval;
    document.getElementById('threshold-input').value = State.threshold;
    document.getElementById('compare-toggle').checked = State.compareEnabled;
    if (State.compareEnabled) {
      document.getElementById('tab-compare').hidden = false;
    }
    syncYLimitInputs();
    onDataLoaded();
  }
});
