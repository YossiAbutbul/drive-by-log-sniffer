/* LoRa log parser. Pulls PUSH_DATA JSON + LoRaWAN PHY Data blocks
   from drive-by .log files into structured records. */

const TS_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2})\s+DBG\s+PUSH_DATA:\s*$/;
const ANY_TS_RE = /^\d{4}-\d{2}-\d{2}T/;
const PHY_RE = /DBG\s+LoRaWAN PHY Data:/;

function parseLogText(text, fname) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const m = lines[i].match(TS_RE);
    if (!m) { i++; continue; }

    const tsStr = m[1];
    const tz = tsStr.slice(19);
    const tsDate = new Date(tsStr);
    if (isNaN(tsDate.getTime())) { i++; continue; }

    // Collect JSON block by brace depth
    i++;
    let depth = 0;
    const jsonLines = [];
    while (i < lines.length) {
      const l = lines[i];
      jsonLines.push(l);
      depth += countChar(l, '{') - countChar(l, '}');
      i++;
      if (depth === 0 && jsonLines.length) break;
    }

    let rxpk = {};
    try {
      const obj = JSON.parse(jsonLines.join('\n'));
      if (obj.rxpk && obj.rxpk.length) rxpk = obj.rxpk[0];
    } catch (e) { /* skip malformed */ }

    // Find LoRaWAN PHY Data block within next 10 lines
    const phy = {};
    let j = i;
    const limit = Math.min(i + 10, lines.length);
    while (j < limit) {
      if (PHY_RE.test(lines[j])) {
        j++;
        while (j < lines.length) {
          const pl = lines[j];
          if (ANY_TS_RE.test(pl)) break;
          const idx = pl.indexOf(': ');
          if (idx > 0) phy[pl.slice(0, idx).trim()] = pl.slice(idx + 2).trim();
          j++;
        }
        break;
      }
      j++;
    }

    const devaddr = (phy.DevAddr || '').toLowerCase();
    if (!devaddr) continue;
    const fcnt = parseInt(phy.FCnt);

    out.push({
      devaddr,
      timestamp: tsStr,
      ts: tsDate.getTime() / 1000,
      fcnt: isNaN(fcnt) ? -1 : fcnt,
      rssi: rxpk.rssi ?? null,
      snr:  rxpk.lsnr ?? null,
      chan: rxpk.chan ?? null,
      freq: rxpk.freq ?? null,
      tz,
      file: fname,
    });
  }
  return out;
}

function countChar(str, ch) {
  let n = 0;
  for (let k = 0; k < str.length; k++) if (str[k] === ch) n++;
  return n;
}
