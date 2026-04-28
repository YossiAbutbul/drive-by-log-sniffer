/* Global app state and constants. Loaded first. */

const State = {
  allRecords: [],
  stats: {},
  selectedDevices: new Set(['__all__']),
  deviceLabels: {},
  interval: 11,
  threshold: 10,
  charts: {},
  sortCol: 'devaddr',
  sortDir: 'asc',
  compareEnabled: false,
  loadedFiles: [],          // [{ name, count, enabled }]
  activeTab: 'overview',
  yLimits: {                // per-chart Y-axis overrides; null → auto
    rssi: { min: null, max: null },
    snr:  { min: null, max: null },
    per:  { min: null, max: null },
    hist: { min: null, max: null },
    freq: { min: null, max: null },
    gaps: { min: null, max: null },
  },
};

const STORAGE_KEY = 'lora-per-survey-v4';

/* Chart palette — distinctive, technical, professional.
   Avoid trendy SaaS purples / pinks. */
const DEV_COLORS = [
  '#0d7d8a', // deep teal (primary)
  '#1e40af', // deep blue
  '#15803d', // forest
  '#c2410c', // burnt orange
  '#7c2d12', // umber
  '#4338ca', // indigo
  '#0891b2', // cyan
  '#a16207', // bronze
];

const COLUMNS = [
  { key: 'devaddr',    label: 'Device',     type: 'str'  },
  { key: 'total',      label: 'Total',      type: 'num'  },
  { key: 'first_ts',   label: 'First',      type: 'date' },
  { key: 'last_ts',    label: 'Last',       type: 'date' },
  { key: 'duration',   label: 'Span',       type: 'num'  },
  { key: 'rate',       label: 'Msg/min',    type: 'num'  },
  { key: 'missed',     label: 'Missed',     type: 'num'  },
  { key: 'per',        label: 'PER',        type: 'num'  },
  { key: 'rssi_spark', label: 'RSSI trend', type: 'spark', sortKey: 'avg_rssi' },
  { key: 'avg_rssi',   label: 'Avg RSSI',   type: 'num'  },
  { key: 'avg_snr',    label: 'Avg SNR',    type: 'num'  },
  { key: 'channels',   label: 'CH',         type: 'str'  },
];
