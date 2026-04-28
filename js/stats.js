/* Statistics computation: per-device aggregation, rolling PER,
   histograms, time-above-threshold, and small formatting helpers. */

function computeStats(records) {
  const byDev = {};
  for (const r of records) (byDev[r.devaddr] = byDev[r.devaddr] || []).push(r);

  const result = {};
  for (const dev of Object.keys(byDev)) {
    const msgs = byDev[dev].sort((a, b) => a.ts - b.ts);

    const rssi  = msgs.map(m => m.rssi).filter(v => v != null);
    const snr   = msgs.map(m => m.snr).filter(v => v != null);
    const chans = [...new Set(msgs.map(m => m.chan).filter(v => v != null))].sort((a,b)=>a-b);
    const freqs = [...new Set(msgs.map(m => m.freq).filter(v => v != null))].sort((a,b)=>a-b);

    // FCnt-based missed messages + gap list (for the FCnt gap map chart)
    let missed = 0;
    const gaps = [];
    const fcnts = msgs.filter(m => m.fcnt >= 0);
    for (let k = 1; k < fcnts.length; k++) {
      const diff = fcnts[k].fcnt - fcnts[k - 1].fcnt;
      if (diff > 1 && diff < 10000) {
        missed += diff - 1;
        gaps.push({ ts: fcnts[k].ts, size: diff - 1, _record: fcnts[k] });
      }
    }
    const totalExp = msgs.length + missed;
    const per = totalExp ? +(missed / totalExp * 100).toFixed(2) : 0;

    const duration = msgs.length > 1 ? (msgs[msgs.length - 1].ts - msgs[0].ts) : 0;
    const rate = duration > 0 ? +(msgs.length / (duration / 60)).toFixed(2) : 0;

    result[dev] = {
      devaddr:   dev,
      total:     msgs.length,
      missed,
      per,
      first_ts:  msgs[0].timestamp,
      last_ts:   msgs[msgs.length - 1].timestamp,
      first_unix: msgs[0].ts,
      last_unix:  msgs[msgs.length - 1].ts,
      duration,
      rate,
      timezone:  msgs[0].tz,
      max_rssi:  rssi.length ? Math.max(...rssi) : null,
      min_rssi:  rssi.length ? Math.min(...rssi) : null,
      avg_rssi:  avgN(rssi),
      max_snr:   snr.length ? Math.max(...snr) : null,
      min_snr:   snr.length ? Math.min(...snr) : null,
      avg_snr:   avgN(snr),
      channels:  chans,
      freqs,
      messages:  msgs,
      gaps,
    };
  }
  return result;
}

function rollingPER(msgs, windowSize) {
  if (msgs.length < windowSize) return [];
  const pts = [];
  for (let k = windowSize; k <= msgs.length; k++) {
    const win = msgs.slice(k - windowSize, k);
    const fcnts = win.map(m => m.fcnt).filter(f => f >= 0);
    let missed = 0;
    for (let j = 1; j < fcnts.length; j++) {
      const d = fcnts[j] - fcnts[j - 1];
      if (d > 1 && d < 10000) missed += d - 1;
    }
    const exp = fcnts.length + missed;
    const per = exp ? +(missed / exp * 100).toFixed(2) : 0;
    pts.push({ x: win[win.length - 1].ts * 1000, y: per });
  }
  return pts;
}

function computeTimeAboveThreshold(data) {
  const windowSize = perWindowSize();
  let above = 0, totalDur = 0;
  for (const dev of Object.values(data)) {
    const pts = rollingPER(dev.messages, windowSize);
    if (pts.length < 2) continue;
    for (let k = 1; k < pts.length; k++) {
      const dur = (pts[k].x - pts[k - 1].x) / 1000;
      totalDur += dur;
      if (pts[k].y > State.threshold) above += dur;
    }
  }
  const pct = totalDur ? (above / totalDur * 100).toFixed(1) : 0;
  return { percent: pct, duration: fmtDur(above) };
}

function histogram(values, numBins) {
  if (!values.length) return { centers: [], counts: [] };
  const min = Math.min(...values), max = Math.max(...values);
  const w = (max - min) / numBins || 1;
  const counts = Array(numBins).fill(0);
  values.forEach(v => {
    const idx = Math.min(Math.floor((v - min) / w), numBins - 1);
    counts[idx]++;
  });
  const centers = Array.from({ length: numBins }, (_, i) => +(min + i * w + w / 2).toFixed(2));
  return { centers, counts };
}

function perWindowSize() {
  return Math.max(10, Math.min(100, Math.round(300 / State.interval)));
}

/* ── Helpers ─────────────────────────────────────────────────── */
function avgN(arr) {
  return arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null;
}

function fmtDur(secs) {
  if (!secs) return '0s';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtTs(iso) {
  try { return new Date(iso).toLocaleString(undefined, { hour12: false }); }
  catch { return iso; }
}

function fmtN(v, unit) { return v == null ? '—' : v + unit; }
