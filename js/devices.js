/* Channel pills (sidebar), filtered-data accessor, label rename. */

function devLabel(addr) { return State.deviceLabels[addr] || addr; }

function devColor(idx, alpha = 1) {
  const hex = DEV_COLORS[idx % DEV_COLORS.length];
  if (alpha >= 1) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function buildDevicePills(devs) {
  const c = document.getElementById('device-pills');
  c.innerHTML = '';

  // "All" pill
  c.appendChild(makePill('All addresses', '__all__', null, true));

  devs.forEach((d, i) => c.appendChild(makePill(devLabel(d), d, i, false)));

  document.getElementById('channels-count').textContent = devs.length;

  const search = document.getElementById('dev-search');
  if (search && search.value) filterDevicePills(search.value);
}

function filterDevicePills(q) {
  const needle = (q || '').trim().toLowerCase();
  document.querySelectorAll('#device-pills .dev-pill').forEach(p => {
    const v = p.dataset.value;
    if (v === '__all__') { p.style.display = ''; return; }
    const label = (State.deviceLabels[v] || '').toLowerCase();
    const match = !needle || v.toLowerCase().includes(needle) || label.includes(needle);
    p.style.display = match ? '' : 'none';
  });
}

function makePill(label, value, colorIdx, isAll) {
  const el = document.createElement('button');
  el.className = 'dev-pill';
  el.dataset.value = value;
  el.type = 'button';

  const color = isAll ? '#71717a' : DEV_COLORS[colorIdx % DEV_COLORS.length];
  el.dataset.color = color;
  el.style.color = color;

  const txt = document.createElement('span');
  txt.className = 'label-text';
  if (isAll) {
    txt.textContent = label;
  } else if (State.deviceLabels[value]) {
    txt.innerHTML = `<span style="color:var(--text)">${State.deviceLabels[value]}</span> <span class="nick">${value}</span>`;
  } else {
    txt.textContent = label;
  }
  el.appendChild(txt);

  if (!isAll) {
    const ren = document.createElement('span');
    ren.className = 'ren';
    ren.title = 'Rename device address';
    ren.innerHTML = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" stroke="currentColor" stroke-width="1.4"
            stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M10 4l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`;
    ren.onclick = (e) => { e.stopPropagation(); openRenameModal(value); };
    el.appendChild(ren);
  }

  const allSelected = State.selectedDevices.has('__all__');
  const active = (value === '__all__' && allSelected)
    || (value !== '__all__' && (allSelected || State.selectedDevices.has(value)));
  el.classList.toggle('active', active);

  el.onclick = () => toggleDevice(value);
  return el;
}

function toggleDevice(value) {
  if (value === '__all__') {
    State.selectedDevices = new Set(['__all__']);
  } else {
    State.selectedDevices.delete('__all__');
    if (State.selectedDevices.has(value)) State.selectedDevices.delete(value);
    else State.selectedDevices.add(value);
    if (!State.selectedDevices.size) State.selectedDevices.add('__all__');
  }
  document.querySelectorAll('.dev-pill').forEach(p => {
    const v = p.dataset.value;
    const active = (v === '__all__' && State.selectedDevices.has('__all__'))
      || (v !== '__all__' && (State.selectedDevices.has('__all__') || State.selectedDevices.has(v)));
    p.classList.toggle('active', active);
  });
  renderAll();
}

/* ── Rename modal ───────────────────────────────────────────── */
let _renameTarget = null;

function openRenameModal(addr) {
  _renameTarget = addr;
  document.getElementById('rename-addr').textContent = addr;
  const input = document.getElementById('rename-input');
  input.value = State.deviceLabels[addr] || '';
  document.getElementById('rename-modal').classList.add('show');
  setTimeout(() => { input.focus(); input.select(); }, 30);
}

function closeRenameModal() {
  document.getElementById('rename-modal').classList.remove('show');
  _renameTarget = null;
}

function saveRename() {
  if (!_renameTarget) return;
  const v = document.getElementById('rename-input').value.trim();
  if (v) State.deviceLabels[_renameTarget] = v;
  else   delete State.deviceLabels[_renameTarget];
  saveState();
  buildDevicePills(Object.keys(State.stats));
  renderAll();
  closeRenameModal();
}

function getFiltered() {
  if (State.selectedDevices.has('__all__')) return { ...State.stats };
  const out = {};
  for (const d of State.selectedDevices) if (State.stats[d]) out[d] = State.stats[d];
  return out;
}
