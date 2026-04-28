/* Compare-two-time-windows mode. */

function toggleCompareMode() {
  State.compareEnabled = document.getElementById('compare-toggle').checked;
  document.getElementById('tab-compare').hidden = !State.compareEnabled;
  if (!State.compareEnabled && State.activeTab === 'compare') {
    switchTab('overview');
  }
  saveState();
}

function setCompareDefaults() {
  if (!State.allRecords.length) return;
  const sorted = State.allRecords.map(r => r.ts).sort((a, b) => a - b);
  const min = sorted[0], max = sorted[sorted.length - 1];
  const mid = (min + max) / 2;
  document.getElementById('cmpA-start').value = fmtLocalDt(min);
  document.getElementById('cmpA-end').value   = fmtLocalDt(mid);
  document.getElementById('cmpB-start').value = fmtLocalDt(mid);
  document.getElementById('cmpB-end').value   = fmtLocalDt(max);
}

function autoSplitCompare() {
  setCompareDefaults();
  runCompare();
}

function runCompare() {
  const aStart = parseLocalDt(document.getElementById('cmpA-start').value);
  const aEnd   = parseLocalDt(document.getElementById('cmpA-end').value);
  const bStart = parseLocalDt(document.getElementById('cmpB-start').value);
  const bEnd   = parseLocalDt(document.getElementById('cmpB-end').value);
  if ([aStart, aEnd, bStart, bEnd].some(v => v == null)) {
    alert('Set all four datetimes first.');
    return;
  }

  const filtA = State.allRecords.filter(r => r.ts >= aStart && r.ts <= aEnd);
  const filtB = State.allRecords.filter(r => r.ts >= bStart && r.ts <= bEnd);
  const sA = computeStats(filtA);
  const sB = computeStats(filtB);
  const aggA = aggregate(sA);
  const aggB = aggregate(sB);

  const html = `
    <thead>
      <tr>
        <th>Metric</th>
        <th style="color:var(--accent)">Window A</th>
        <th style="color:var(--success)">Window B</th>
        <th>Δ</th>
      </tr>
    </thead>
    <tbody>
      ${cmpRow('Messages',       aggA.total,    aggB.total,    false)}
      ${cmpRow('Missed',         aggA.missed,   aggB.missed,   true)}
      ${cmpRow('PER (%)',        aggA.per,      aggB.per,      true)}
      ${cmpRow('Avg RSSI (dBm)', aggA.avgRssi,  aggB.avgRssi,  false)}
      ${cmpRow('Avg SNR (dB)',   aggA.avgSnr,   aggB.avgSnr,   false)}
      ${cmpRow('Dev Addresses',  Object.keys(sA).length, Object.keys(sB).length, false)}
    </tbody>`;
  document.getElementById('compare-table').innerHTML = html;
  document.getElementById('compare-results').classList.add('show');
}

function aggregate(s) {
  const devs = Object.values(s);
  const total  = devs.reduce((a, d) => a + d.total, 0);
  const missed = devs.reduce((a, d) => a + d.missed, 0);
  const exp    = total + missed;
  const per    = exp ? +(missed / exp * 100).toFixed(2) : 0;
  const allR = devs.flatMap(d => d.messages.map(m => m.rssi).filter(v => v != null));
  const allS = devs.flatMap(d => d.messages.map(m => m.snr).filter(v => v != null));
  const avg = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null;
  return { total, missed, per, avgRssi: avg(allR), avgSnr: avg(allS) };
}

function cmpRow(label, a, b, lowerIsBetter) {
  if (a == null || b == null)
    return `<tr><td>${label}</td><td>${a ?? '—'}</td><td>${b ?? '—'}</td><td class="delta-zero">—</td></tr>`;
  const delta = +(b - a).toFixed(2);
  let cls = 'delta-zero', sign = '';
  if (delta > 0) { sign = '+'; cls = lowerIsBetter ? 'delta-up' : 'delta-down'; }
  else if (delta < 0) { cls = lowerIsBetter ? 'delta-down' : 'delta-up'; }
  return `<tr><td>${label}</td><td>${a}</td><td>${b}</td><td class="${cls}">${sign}${delta}</td></tr>`;
}

function fmtLocalDt(unixSec) {
  const d = new Date(unixSec * 1000);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseLocalDt(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.getTime() / 1000;
}
