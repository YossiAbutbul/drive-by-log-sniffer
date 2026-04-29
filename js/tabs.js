/* Tab switching. Overview + Compare are static panels;
   chart tabs render only their canvas on activation. */

function syncIntervalLock() {
  const input = document.getElementById('interval-input');
  if (!input) return;
  const onPer = State.activeTab === 'per';
  input.disabled = !onPer;
  input.closest('.field').style.opacity = onPer ? '' : '0.4';
  input.closest('.field').title = onPer ? '' : 'Only affects PER — switch to the PER tab to edit';
}

function switchTab(name) {
  if (State.activeTab === name) return;
  State.activeTab = name;

  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === name);
  });

  const hasData = Object.keys(State.stats).length > 0;
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', hasData && p.dataset.panel === name);
  });
  document.getElementById('empty-main').style.display = hasData ? 'none' : 'flex';

  syncIntervalLock();
  renderActiveChart();
  saveState();
}

function renderActiveChart() {
  const tab = State.activeTab;
  destroyCharts();
  if (tab === 'overview' || tab === 'compare') return;
  if (!Object.keys(State.stats).length) return;
  const data = getFiltered();
  const fn = CHART_RENDERERS[tab];
  if (fn) fn(data);
}
