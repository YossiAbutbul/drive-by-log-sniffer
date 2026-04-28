/* Tiny inline-SVG sparklines. Lightweight, no dependencies.
   Used in key figures and channel roster. */

function sparkline(values, opts = {}) {
  const w = opts.width  ?? 110;
  const h = opts.height ?? 22;
  const pad = opts.pad  ?? 1.5;
  const stroke = opts.stroke ?? 1.2;

  if (!values || values.length < 2) {
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"></svg>`;
  }

  // Downsample to avoid 5000-point sparklines (still represents shape)
  const target = opts.maxPoints ?? 80;
  let pts = values;
  if (values.length > target) {
    const step = values.length / target;
    pts = [];
    for (let i = 0; i < target; i++) {
      const start = Math.floor(i * step);
      const end = Math.floor((i + 1) * step);
      const slice = values.slice(start, Math.max(end, start + 1));
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      pts.push(avg);
    }
  }

  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / Math.max(pts.length - 1, 1);

  const coords = pts.map((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y];
  });

  const linePath = coords.map(([x, y], i) =>
    (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2)
  ).join(' ');

  // optional fill area underneath
  let fillPath = '';
  if (opts.fill) {
    const last = coords[coords.length - 1];
    const first = coords[0];
    fillPath = `<path d="${linePath} L${last[0].toFixed(2)},${(h - pad).toFixed(2)} L${first[0].toFixed(2)},${(h - pad).toFixed(2)} Z" fill="currentColor" opacity="0.08"/>`;
  }

  // optional dot at the end
  let dot = '';
  if (opts.endDot !== false) {
    const last = coords[coords.length - 1];
    dot = `<circle cx="${last[0].toFixed(2)}" cy="${last[1].toFixed(2)}" r="${opts.dotR || 1.6}" fill="currentColor"/>`;
  }

  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    ${fillPath}
    <path d="${linePath}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>
    ${dot}
  </svg>`;
}

/* Build a sparkline series from per-device messages, time-bucketed.
   Returns numeric array (one value per bucket). */
function bucketSeries(msgs, valueFn, buckets = 60) {
  if (!msgs.length) return [];
  const t0 = msgs[0].ts, t1 = msgs[msgs.length - 1].ts;
  const span = t1 - t0 || 1;
  const out = Array(buckets).fill(null);
  const counts = Array(buckets).fill(0);
  for (const m of msgs) {
    const v = valueFn(m);
    if (v == null) continue;
    const idx = Math.min(buckets - 1, Math.floor(((m.ts - t0) / span) * buckets));
    out[idx] = (out[idx] ?? 0) + v;
    counts[idx]++;
  }
  // Convert sums to averages, fill gaps with last seen
  let last = null;
  for (let i = 0; i < buckets; i++) {
    if (counts[i] > 0) { out[i] /= counts[i]; last = out[i]; }
    else { out[i] = last; }
  }
  // Trim leading nulls
  return out.filter(v => v != null);
}

/* Rolling PER series (percentage values per bucket) */
function bucketPER(msgs, buckets = 60) {
  if (msgs.length < 2) return [];
  const t0 = msgs[0].ts, t1 = msgs[msgs.length - 1].ts;
  const span = t1 - t0 || 1;
  const recv   = Array(buckets).fill(0);
  const missed = Array(buckets).fill(0);
  for (let i = 0; i < msgs.length; i++) {
    const idx = Math.min(buckets - 1, Math.floor(((msgs[i].ts - t0) / span) * buckets));
    recv[idx]++;
    if (i > 0) {
      const d = msgs[i].fcnt - msgs[i - 1].fcnt;
      if (d > 1 && d < 10000) missed[idx] += d - 1;
    }
  }
  return recv.map((r, i) => {
    const exp = r + missed[i];
    return exp ? (missed[i] / exp * 100) : 0;
  });
}

/* Cumulative-count series (good for "messages received" sparkline) */
function bucketCumulative(msgs, buckets = 60) {
  if (!msgs.length) return [];
  const t0 = msgs[0].ts, t1 = msgs[msgs.length - 1].ts;
  const span = t1 - t0 || 1;
  const counts = Array(buckets).fill(0);
  for (const m of msgs) {
    const idx = Math.min(buckets - 1, Math.floor(((m.ts - t0) / span) * buckets));
    counts[idx]++;
  }
  let total = 0;
  return counts.map(c => (total += c));
}
