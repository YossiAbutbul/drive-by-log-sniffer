/* Channel Roster — per-device sortable table with inline sparklines.
   Replaces the older "device pills + stat cards + summary table" trio. */

function renderTable(data) {
  // Header
  const thead = document.getElementById('roster-thead');
  thead.innerHTML = '';
  COLUMNS.forEach(col => {
    const th = document.createElement('th');
    th.dataset.col = col.key;
    const sortKey = col.sortKey || col.key;
    if (sortKey === State.sortCol) th.classList.add('sorted');
    const arrow = sortKey === State.sortCol ? (State.sortDir === 'asc' ? '↑' : '↓') : '';
    th.innerHTML = `${col.label}${arrow ? `<span class="arrow">${arrow}</span>` : ''}`;
    th.onclick = () => {
      if (State.sortCol === sortKey) {
        State.sortDir = State.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        State.sortCol = sortKey;
        State.sortDir = col.type === 'num' ? 'desc' : 'asc';
      }
      renderTable(data);
    };
    thead.appendChild(th);
  });

  // Sort
  const rows = Object.values(data);
  const dir = State.sortDir === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    const x = a[State.sortCol], y = b[State.sortCol];
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    if (Array.isArray(x)) return (x.length - y.length) * dir;
    if (typeof x === 'number') return (x - y) * dir;
    return String(x).localeCompare(String(y)) * dir;
  });

  // Body
  const tbody = document.getElementById('roster-tbody');
  tbody.innerHTML = '';

  // Determine each device's color index from the original stats order
  const allDevs = Object.keys(State.stats);

  rows.forEach(d => {
    const colorIdx = allDevs.indexOf(d.devaddr);
    const color = DEV_COLORS[colorIdx % DEV_COLORS.length];
    const perClass = d.per < 5 ? 'low' : d.per < 15 ? 'mid' : 'high';

    const rssiVals = d.messages.map(m => m.rssi).filter(v => v != null);
    const rssiSpark = sparkline(rssiVals, { width: 110, height: 24, stroke: 1.2, endDot: true });

    const friendly = State.deviceLabels[d.devaddr];
    const idCell = `
      <span class="r-id" style="color:${color}">
        <span class="marker"></span>
        <span>${d.devaddr}</span>
        ${friendly ? `<span class="nick">${friendly}</span>` : ''}
      </span>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idCell}</td>
      <td class="r-num">${d.total.toLocaleString()}</td>
      <td class="r-ts">${shortTs(d.first_ts)}</td>
      <td class="r-ts">${shortTs(d.last_ts)}</td>
      <td class="r-dim">${fmtDur(d.duration)}</td>
      <td class="r-num">${d.rate}</td>
      <td class="${d.missed > 0 ? 'r-warn' : 'r-ok'}">${d.missed.toLocaleString()}</td>
      <td><span class="r-pct ${perClass}">${d.per}%</span></td>
      <td style="color:${color}" class="r-spark">${rssiSpark}</td>
      <td class="r-num">${fmtN(d.avg_rssi, '')}</td>
      <td class="r-num">${fmtN(d.avg_snr, '')}</td>
      <td class="r-dim">${d.channels.map(c => c).join(' · ')}</td>
    `;
    tbody.appendChild(tr);
  });
}

function shortTs(iso) {
  try {
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return iso; }
}

