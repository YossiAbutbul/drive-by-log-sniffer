/* Raw record inspector modal — opened by clicking a chart point. */

function showModal(rec) {
  const body = document.getElementById('modal-body');
  body.innerHTML = '';
  const fields = [
    ['DevAddr',     devLabel(rec.devaddr) + (State.deviceLabels[rec.devaddr] ? ' (' + rec.devaddr + ')' : '')],
    ['Timestamp',   new Date(rec.timestamp).toLocaleString(undefined, { hour12: false })],
    ['Time Zone',   rec.tz],
    ['FCnt',        rec.fcnt],
    ['RSSI',        rec.rssi != null ? rec.rssi + ' dBm' : '—'],
    ['SNR',         rec.snr  != null ? rec.snr  + ' dB'  : '—'],
    ['Channel',     rec.chan != null ? 'CH' + rec.chan   : '—'],
    ['Frequency',   rec.freq != null ? rec.freq + ' MHz' : '—'],
    ['Source File', rec.file || '—'],
  ];
  fields.forEach(([k, v]) => {
    const kEl = document.createElement('div'); kEl.className = 'k'; kEl.textContent = k;
    const vEl = document.createElement('div'); vEl.className = 'v'; vEl.textContent = v;
    body.appendChild(kEl); body.appendChild(vEl);
  });
  document.getElementById('modal').classList.add('show');
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

function showPerWindowModal(point, datasetLabel) {
  const win = point._window || [];
  document.getElementById('per-window-title').textContent =
    `PER window · ${datasetLabel || ''}`.trim();
  const tEnd = new Date(point.x).toLocaleString(undefined, { hour12: false });
  const missed = point._missed ?? 0;
  document.getElementById('per-window-summary').textContent =
    `${win.length} packets · ${missed} missed · PER ${point.y.toFixed(2)}% · ends ${tEnd}`;

  const tbody = document.getElementById('per-window-tbody');
  tbody.innerHTML = '';
  let prevF = null;
  win.forEach((m, idx) => {
    const delta = (prevF != null && m.fcnt >= 0) ? (m.fcnt - prevF) : null;
    prevF = m.fcnt >= 0 ? m.fcnt : prevF;
    const gap = delta != null && delta > 1;
    const tr = document.createElement('tr');
    if (gap) tr.classList.add('per-window-gap');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${new Date(m.timestamp).toLocaleString(undefined, { hour12: false })}</td>
      <td>${m.fcnt >= 0 ? m.fcnt : '—'}</td>
      <td>${delta == null ? '—' : (delta > 1 ? `+${delta}` : delta)}</td>
      <td>${m.rssi != null ? m.rssi : '—'}</td>
      <td>${m.snr != null ? m.snr : '—'}</td>
      <td>${m.chan != null ? m.chan : '—'}</td>
      <td>${m.freq != null ? m.freq : '—'}</td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('per-window-modal').classList.add('show');
}

function closePerWindowModal() {
  document.getElementById('per-window-modal').classList.remove('show');
}

function setupModalDismiss() {
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeModal();
    closePerWindowModal();
    if (typeof closeRenameModal === 'function') closeRenameModal();
  });
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target.id === 'modal') closeModal();
  });
  const pwm = document.getElementById('per-window-modal');
  if (pwm) pwm.addEventListener('click', e => {
    if (e.target.id === 'per-window-modal') closePerWindowModal();
  });
  const rm = document.getElementById('rename-modal');
  if (rm) rm.addEventListener('click', e => {
    if (e.target.id === 'rename-modal') closeRenameModal();
  });
}
