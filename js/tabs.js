/* Tab switching. Overview + Compare are static panels;
   chart tabs render only their canvas on activation. */

function switchTab(name) {
  if (State.activeTab === name) return;
  State.activeTab = name;

  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === name);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.dataset.panel === name);
  });

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
