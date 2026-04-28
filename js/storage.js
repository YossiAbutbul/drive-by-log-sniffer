/* localStorage persistence — survives page refresh. */

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      records:   State.allRecords,
      labels:    State.deviceLabels,
      interval:  State.interval,
      threshold: State.threshold,
      files:     State.loadedFiles,
      activeTab: State.activeTab,
      compareEnabled: State.compareEnabled,
      yLimits:   State.yLimits,
      ts:        Date.now(),
    }));
  } catch (e) {
    console.warn('localStorage save failed', e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    State.allRecords      = s.records   || [];
    State.deviceLabels    = s.labels    || {};
    State.interval        = s.interval  ?? 11;
    State.threshold       = s.threshold ?? 10;
    State.loadedFiles     = s.files     || [];
    State.activeTab       = s.activeTab || 'overview';
    State.compareEnabled  = !!s.compareEnabled;
    if (s.yLimits) {
      Object.keys(State.yLimits).forEach(c => {
        if (s.yLimits[c]) State.yLimits[c] = s.yLimits[c];
      });
    }
    return State.allRecords.length > 0;
  } catch {
    return false;
  }
}

function clearAll() {
  if (!confirm('Purge all loaded data?')) return;
  softReset();
  localStorage.removeItem(STORAGE_KEY);
}
