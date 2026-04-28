/* CSV exporters: per-device summary table + raw filtered messages. */

function exportSummaryCSV() {
  const data = getFiltered();
  const cols = COLUMNS.filter(c => c.type !== 'spark');
  const rows = [cols.map(c => c.label).join(',')];
  Object.values(data).forEach(d => {
    rows.push(cols.map(col => csvCell(
      Array.isArray(d[col.key]) ? d[col.key].map(c => 'CH' + c).join(' ') : d[col.key]
    )).join(','));
  });
  download(rows.join('\n'), `lora_summary_${stamp()}.csv`);
}

function exportRawCSV() {
  const data = getFiltered();
  const msgs = Object.values(data).flatMap(d => d.messages).sort((a, b) => a.ts - b.ts);
  const cols = ['DevAddr','Timestamp','TimeZone','FCnt','RSSI','SNR','Channel','Frequency','SourceFile'];
  const rows = [cols.join(',')];
  msgs.forEach(m => rows.push([
    devLabel(m.devaddr), m.timestamp, m.tz, m.fcnt,
    m.rssi ?? '', m.snr ?? '', m.chan ?? '', m.freq ?? '', m.file
  ].map(csvCell).join(',')));
  download(rows.join('\n'), `lora_raw_${stamp()}.csv`);
}

function csvCell(v) {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(text, name) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function stamp() {
  return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
}
