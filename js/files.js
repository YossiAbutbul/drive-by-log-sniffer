/* File loading + management.
   - Drag-and-drop and file picker for adding files
   - Sidebar shows compact "Manage files" button when files exist
   - Modal lists files with checkboxes that toggle VISIBILITY
     (not delete). All checked by default. Purge button does
     the destructive clear. */

function setupDragDrop() {
  const overlay = document.getElementById('drop-overlay');
  let dragCounter = 0;

  document.addEventListener('dragenter', e => {
    e.preventDefault();
    if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) {
      dragCounter++;
      overlay.classList.add('show');
    }
  });
  document.addEventListener('dragleave', e => {
    e.preventDefault();
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) overlay.classList.remove('show');
  });
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => {
    e.preventDefault();
    dragCounter = 0;
    overlay.classList.remove('show');
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  });

  document.getElementById('file-input').addEventListener('change', e => {
    if (e.target.files.length) handleFiles(e.target.files);
    e.target.value = '';
  });

  // Files-modal: close on backdrop click
  document.getElementById('files-modal').addEventListener('click', e => {
    if (e.target.id === 'files-modal') closeFilesModal();
  });

  // "Show all" checkbox toggles every file's enabled state
  document.getElementById('files-modal-selectall').addEventListener('change', e => {
    const enabled = e.target.checked;
    State.loadedFiles.forEach(f => { f.enabled = enabled; });
    afterFileVisibilityChange();
    renderFilesModal();
  });
}

async function handleFiles(fileList) {
  const files = [...fileList].filter(f => /\.(log|txt)$/i.test(f.name));
  if (!files.length) { alert('No .log files selected.'); return; }

  document.getElementById('loading').classList.add('show');
  await new Promise(r => setTimeout(r, 30));

  try {
    const newRecords = [];
    for (const f of files) {
      // Skip if same name already loaded
      if (State.loadedFiles.some(x => x.name === f.name)) continue;
      const text = await f.text();
      const recs = parseLogText(text, f.name);
      newRecords.push(...recs);
      State.loadedFiles.push({ name: f.name, count: recs.length, enabled: true });
    }
    if (!newRecords.length && files.length) {
      alert('No new files added (already loaded or empty).');
      return;
    }

    State.allRecords = State.allRecords.concat(newRecords);
    onDataLoaded();
    saveState();

    if (document.getElementById('files-modal').classList.contains('show')) {
      renderFilesModal();
    }
  } catch (e) {
    console.error(e);
    alert('Parse error: ' + e.message);
  } finally {
    document.getElementById('loading').classList.remove('show');
  }
}

/* ── Visibility filter ──────────────────────────────────────── */
function recomputeStats() {
  const enabledNames = new Set(
    State.loadedFiles.filter(f => f.enabled !== false).map(f => f.name)
  );
  const active = State.allRecords.filter(r => enabledNames.has(r.file));
  State.stats = computeStats(active);
}

function afterFileVisibilityChange() {
  recomputeStats();
  const devs = Object.keys(State.stats);

  // If channels disappeared, drop them from selection
  if (!State.selectedDevices.has('__all__')) {
    State.selectedDevices = new Set(
      [...State.selectedDevices].filter(d => devs.includes(d))
    );
    if (State.selectedDevices.size === 0) State.selectedDevices = new Set(['__all__']);
  }

  buildDevicePills(devs);
  renderAll();
  saveState();
}

/* ── Sidebar Manage-files button ────────────────────────────── */
function updateManageButton() {
  const btn = document.getElementById('manage-files-btn');
  const total = State.loadedFiles.length;
  const enabled = State.loadedFiles.filter(f => f.enabled !== false).length;
  document.getElementById('manage-count').textContent =
    enabled === total ? total : `${enabled}/${total}`;
  document.getElementById('files-count').textContent = total;
  btn.hidden = total === 0;
}

/* ── Files modal ────────────────────────────────────────────── */
function openFilesModal() {
  renderFilesModal();
  document.getElementById('files-modal').classList.add('show');
}

function closeFilesModal() {
  document.getElementById('files-modal').classList.remove('show');
}

function renderFilesModal() {
  const list = document.getElementById('files-modal-list');
  list.innerHTML = '';

  State.loadedFiles.forEach(f => {
    const label = document.createElement('label');
    label.className = 'files-modal-item';
    if (f.enabled === false) label.classList.add('hidden-file');
    label.innerHTML = `
      <input type="checkbox" data-name="${escapeAttr(f.name)}" ${f.enabled !== false ? 'checked' : ''}>
      <span class="fi-name" title="${escapeAttr(f.name)}">${f.name}</span>
      <span class="fi-count">${(f.count ?? 0).toLocaleString()} pkts</span>
    `;
    list.appendChild(label);
  });

  list.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', e => {
      const f = State.loadedFiles.find(x => x.name === e.target.dataset.name);
      if (f) f.enabled = e.target.checked;
      afterFileVisibilityChange();
      // Update modal item styling + summary + select-all checkbox
      const item = e.target.closest('.files-modal-item');
      if (item) item.classList.toggle('hidden-file', !e.target.checked);
      updateModalSummary();
      syncSelectAllCheckbox();
    });
  });

  updateModalSummary();
  syncSelectAllCheckbox();
}

function updateModalSummary() {
  const total = State.loadedFiles.length;
  const enabled = State.loadedFiles.filter(f => f.enabled !== false);
  const totPkts = State.loadedFiles.reduce((s, f) => s + (f.count ?? 0), 0);
  const visPkts = enabled.reduce((s, f) => s + (f.count ?? 0), 0);
  document.getElementById('files-modal-summary').textContent =
    `${enabled.length}/${total} shown · ${visPkts.toLocaleString()} of ${totPkts.toLocaleString()} packets`;
}

function syncSelectAllCheckbox() {
  const cb = document.getElementById('files-modal-selectall');
  if (!State.loadedFiles.length) { cb.checked = true; return; }
  cb.checked = State.loadedFiles.every(f => f.enabled !== false);
}

/* ── Purge (hard reset) ─────────────────────────────────────── */
function purgeAll() {
  if (!confirm('Purge all loaded data?')) return;
  closeFilesModal();
  softReset();
  localStorage.removeItem(STORAGE_KEY);
}

/* Soft-reset: same as clearAll but no confirm prompt. */
function softReset() {
  State.allRecords = [];
  State.stats = {};
  State.loadedFiles = [];
  State.selectedDevices = new Set(['__all__']);
  State.compareEnabled = false;
  State.activeTab = 'overview';
  destroyCharts();

  document.getElementById('manage-files-btn').hidden = true;
  document.getElementById('files-count').textContent = '0';
  document.getElementById('sb-channels').hidden = true;
  document.getElementById('sb-export').hidden = true;
  document.getElementById('compare-toggle').checked = false;

  document.getElementById('panel-overview').hidden = true;
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.tab[data-tab="overview"]').classList.add('active');
  document.getElementById('tab-compare').hidden = true;
  document.getElementById('empty-main').style.display = 'flex';

  setStatus('idle', 'No data');
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/* ── Called after data loads ────────────────────────────────── */
function onDataLoaded() {
  // Backward-compat: ensure every loaded file has an `enabled` flag
  State.loadedFiles.forEach(f => { if (f.enabled === undefined) f.enabled = true; });

  recomputeStats();
  const devs = Object.keys(State.stats);
  if (State.selectedDevices.size === 0) State.selectedDevices = new Set(['__all__']);

  updateManageButton();
  document.getElementById('sb-channels').hidden = false;
  document.getElementById('sb-export').hidden = false;
  buildDevicePills(devs);

  document.getElementById('empty-main').style.display = 'none';
  document.getElementById('panel-overview').hidden = false;

  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === State.activeTab);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.dataset.panel === State.activeTab);
  });

  if (State.compareEnabled) {
    document.getElementById('tab-compare').hidden = false;
  }

  setCompareDefaults();
  renderAll();
}
