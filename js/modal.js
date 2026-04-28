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

function setupModalDismiss() {
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeModal();
    if (typeof closeRenameModal === 'function') closeRenameModal();
  });
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target.id === 'modal') closeModal();
  });
  const rm = document.getElementById('rename-modal');
  if (rm) rm.addEventListener('click', e => {
    if (e.target.id === 'rename-modal') closeRenameModal();
  });
}
