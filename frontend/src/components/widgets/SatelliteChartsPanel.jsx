/**
 * SatelliteChartsPanel — Stage 4: Copernicus Sentinel-2 L2A Satellite Analytics
 *
 * Recharts multi-metric time-series panel showing:
 *  - NDVI (Normalized Difference Vegetation Index)
 *  - NDMI (Normalized Difference Moisture Index)
 *  - NDWI (Normalized Difference Water Index)
 *  - Cloud masking indicators for high cloud coverage (>25%) acquisitions
 *
 * Bilingual English / Telugu support with agricultural thresholds for AP rice cultivation.
 */

import React, { useState } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
} from 'recharts';
import {
  Satellite,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

/* ─── Bilingual Dictionary ────────────────────────────────────────────────── */
const LABELS = {
  en: {
    title: 'Copernicus Sentinel-2 Vegetation & Moisture Dynamics',
    subtitle: 'Spectral Band Analytics (B03, B04, B08, B11) · Last 90 Days',
    filterLabel: 'Cloud Filter:',
    showAll: 'Show All (incl. Cloud-masked)',
    showCleanOnly: 'Cloud-Free Passes Only',
    ndvi: 'NDVI (Vegetation Index)',
    ndmi: 'NDMI (Moisture Index)',
    ndwi: 'NDWI (Water / Flooding)',
    cloudCover: 'Cloud Cover (%)',
    latestTile: 'Sentinel-2 Tile',
    healthyCanopy: 'Optimal Canopy (>0.60)',
    stressThreshold: 'Stress Alert (<0.40)',
    cloudMaskedBadge: 'Cloud Obscured',
    clearBadge: 'Clean Acquisition',
    noData: 'No Sentinel-2 observations found for this field coordinate.',
    noDataSub: 'Ensure your farm boundary is correctly mapped in Andhra Pradesh.',
    loading: 'Processing Copernicus Sentinel-2 spectral telemetry...',
    summaryTitle: 'Canopy Health Metrics',
    curNdvi: 'Current NDVI',
    curNdmi: 'Canopy Moisture',
    trend30d: '30-Day Trend',
    validPasses: 'Valid Passes',
    copernicusSource: 'Copernicus Data Space Ecosystem (ESA)',
  },
  te: {
    title: 'కోపర్నికస్ సెంటినెల్-2 పంట పచ్చదనం & తేమ విశ్లేషణ',
    subtitle: 'స్పెక్ట్రల్ బ్యాండ్ విశ్లేషణ (B03, B04, B08, B11) · గత 90 రోజులు',
    filterLabel: 'మబ్బుల ఫిల్టర్:',
    showAll: 'అన్ని చిత్రాలు (మబ్బులతో సహా)',
    showCleanOnly: 'స్పష్టమైన చిత్రాలు మాత్రమే',
    ndvi: 'NDVI (పంట పచ్చదనం సూచిక)',
    ndmi: 'NDMI (మొక్కల తేమ శాతం)',
    ndwi: 'NDWI (పొలంలో నీటి నిల్వ)',
    cloudCover: 'మబ్బుల శాతం (%)',
    latestTile: 'శాటిలైట్ టైల్',
    healthyCanopy: 'ఆరోగ్యకరమైన వరి చేను (>0.60)',
    stressThreshold: 'పంట ఒత్తిడి హెచ్చరిక (<0.40)',
    cloudMaskedBadge: 'మబ్బుల వల్ల అస్పష్టం',
    clearBadge: 'స్పష్టమైన శాటిలైట్ చిత్రం',
    noData: 'ఈ పొలానికి శాటిలైట్ పరిశీలనలు లభించలేదు.',
    noDataSub: 'మ్యాప్ పికర్‌లో మీ పొలం సరిహద్దులను సరిగ్గా గుర్తించండి.',
    loading: 'కోపర్నికస్ సెంటినెల్-2 శాటిలైట్ సమాచారాన్ని విశ్లేషిస్తున్నాము...',
    summaryTitle: 'పంట స్థితి కొలమానాలు',
    curNdvi: 'ప్రస్తుత NDVI',
    curNdmi: 'మొక్కలలో తేమ',
    trend30d: '30 రోజుల మార్పు',
    validPasses: 'స్పష్టమైన చిత్రాలు',
    copernicusSource: 'యూరోపియన్ స్పేస్ ఏజెన్సీ (కోపర్నికస్ డేటా స్పేస్)',
  },
};

/* ─── Custom Recharts Tooltip ────────────────────────────────────────────── */
const SatelliteTooltip = ({ active, payload, label, lang }) => {
  if (!active || !payload?.length) return null;
  const isTelugu = lang === 'te' || lang === 'Telugu';
  const dataPoint = payload[0]?.payload;

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-xs shadow-2xl space-y-2 max-w-xs text-white">
      <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
        <span className="font-bold text-amber-300">{label}</span>
        {dataPoint?.is_cloud_masked ? (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-950/80 text-red-400 border border-red-800">
            ☁ {isTelugu ? 'మబ్బులు' : 'Cloud Masked'} ({dataPoint?.cloud_coverage_pct}%)
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            ✓ {isTelugu ? 'స్పష్టం' : 'Clear'} ({dataPoint?.cloud_coverage_pct}%)
          </span>
        )}
      </div>

      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}:</span>
            </span>
            <span className="font-mono font-bold text-white">
              {entry.value !== null && entry.value !== undefined ? Number(entry.value).toFixed(3) : '—'}
            </span>
          </div>
        ))}
      </div>

      {dataPoint && (
        <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 grid grid-cols-2 gap-1">
          <div>B04 (Red): <span className="text-slate-200 font-mono">{dataPoint.b04_red}</span></div>
          <div>B08 (NIR): <span className="text-slate-200 font-mono">{dataPoint.b08_nir}</span></div>
          <div>B03 (Grn): <span className="text-slate-200 font-mono">{dataPoint.b03_green}</span></div>
          <div>B11 (SWIR): <span className="text-slate-200 font-mono">{dataPoint.b11_swir}</span></div>
        </div>
      )}

      {dataPoint?.tile_id && (
        <div className="text-[10px] text-slate-500 truncate pt-0.5">
          Tile: <span className="text-slate-300 font-mono">{dataPoint.tile_id}</span> ({dataPoint.platform})
        </div>
      )}
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function SatelliteChartsPanel({
  satelliteData,
  loading = false,
  error = null,
  lang = 'Telugu',
}) {
  const isTelugu = lang === 'te' || lang === 'Telugu';
  const t = isTelugu ? LABELS.te : LABELS.en;

  const [filterMode, setFilterMode] = useState('clean_only'); // 'clean_only' | 'all'

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20" />
          <div className="space-y-2">
            <div className="h-4 w-64 bg-slate-800 rounded" />
            <div className="h-3 w-40 bg-slate-800 rounded" />
          </div>
        </div>
        <div className="h-64 bg-slate-800/50 rounded-2xl" />
      </div>
    );
  }

  if (error || !satelliteData) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-2">
        <Satellite className="w-10 h-10 text-slate-600 mx-auto" />
        <h4 className="text-white font-bold">{error || t.noData}</h4>
        <p className="text-xs text-slate-400">{t.noDataSub}</p>
      </div>
    );
  }

  const rawRecords = satelliteData.records || [];
  const summary = satelliteData.summary || {};

  // Filter based on selected view mode
  const displayedRecords = filterMode === 'clean_only'
    ? rawRecords.filter((r) => !r.is_cloud_masked)
    : rawRecords;

  const chartData = displayedRecords.map((r) => {
    const d = new Date(r.observation_date);
    const dateFormatted = d.toLocaleDateString(isTelugu ? 'te-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
    });
    return {
      date: dateFormatted,
      fullDate: r.observation_date,
      ndvi: r.ndvi,
      ndmi: r.ndmi,
      ndwi: r.ndwi,
      cloud_coverage_pct: r.cloud_coverage_pct,
      is_cloud_masked: r.is_cloud_masked,
      tile_id: r.tile_id,
      platform: r.platform,
      b03_green: r.b03_green,
      b04_red: r.b04_red,
      b08_nir: r.b08_nir,
      b11_swir: r.b11_swir,
    };
  });

  return (
    <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl p-5 sm:p-7 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Satellite className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
              <span>{t.title}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                L2A MSI
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {t.subtitle} · <span className="text-emerald-400 font-medium">{t.copernicusSource}</span>
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-xl text-xs">
          <button
            onClick={() => setFilterMode('clean_only')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterMode === 'clean_only'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.showCleanOnly} ({summary.cloud_free_acquisitions})
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterMode === 'all'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.showAll} ({summary.total_acquisitions})
          </button>
        </div>
      </div>

      {/* ── Key Metrics Ribbon ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* NDVI */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5">
          <span className="text-[11px] font-semibold text-emerald-400 block mb-0.5">
            {t.curNdvi}
          </span>
          <div className="text-xl font-black text-white flex items-baseline gap-1.5">
            <span>{summary.latest_ndvi != null ? summary.latest_ndvi.toFixed(3) : '—'}</span>
            <span className="text-[10px] text-emerald-400 font-bold">
              {summary.latest_ndvi >= 0.60 ? 'Optimal' : summary.latest_ndvi >= 0.40 ? 'Moderate' : 'Stress'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 truncate block mt-0.5">
            {summary.health_status}
          </span>
        </div>

        {/* NDMI (Moisture) */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5">
          <span className="text-[11px] font-semibold text-cyan-400 block mb-0.5">
            {t.curNdmi}
          </span>
          <div className="text-xl font-black text-white">
            {summary.latest_ndmi != null ? summary.latest_ndmi.toFixed(3) : '—'}
          </div>
          <span className="text-[10px] text-slate-400 truncate block mt-0.5">
            Canopy Water Index
          </span>
        </div>

        {/* 30-Day Trend */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5">
          <span className="text-[11px] font-semibold text-amber-400 block mb-0.5">
            {t.trend30d}
          </span>
          <div className="text-xl font-black text-white flex items-center gap-1">
            <span>
              {summary.ndvi_trend_30d > 0 ? `+${summary.ndvi_trend_30d}` : summary.ndvi_trend_30d || '0.00'}
            </span>
            <span className="text-xs">
              {summary.ndvi_trend_30d >= 0 ? '📈' : '📉'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 truncate block mt-0.5">
            Biomass Progression
          </span>
        </div>

        {/* Passes / Tile */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5">
          <span className="text-[11px] font-semibold text-purple-400 block mb-0.5">
            {t.latestTile}
          </span>
          <div className="text-xl font-black text-white font-mono">
            {summary.latest_tile_id || '44QND'}
          </div>
          <span className="text-[10px] text-slate-400 truncate block mt-0.5">
            {summary.cloud_free_acquisitions} {isTelugu ? 'పరిశీలనలు' : 'clear passes'}
          </span>
        </div>
      </div>

      {/* ── Recharts Time-Series Graph ────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold text-slate-300">
            {isTelugu ? 'కాలక్రమేణా స్పెక్ట్రల్ సూచికల మార్పులు' : 'Spectral Indices Progression Over Time'}
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>NDVI</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
              <span>NDMI</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              <span>NDWI</span>
            </span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
            >
              <defs>
                <linearGradient id="ndviGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />

              <XAxis
                dataKey="date"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
              />

              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                domain={[-0.8, 1.0]}
                tickLine={false}
                ticks={[-0.6, -0.3, 0.0, 0.3, 0.6, 0.9]}
              />

              <Tooltip content={<SatelliteTooltip lang={lang} />} />

              {/* Agricultural Threshold Reference Lines */}
              <ReferenceLine
                y={0.60}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{
                  value: '0.60 (Healthy)',
                  fill: '#10b981',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />
              <ReferenceLine
                y={0.40}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: '0.40 (Stress Threshold)',
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'insideBottomRight',
                }}
              />

              {/* NDVI Area Shading */}
              <Area
                type="monotone"
                dataKey="ndvi"
                stroke="transparent"
                fill="url(#ndviGradient)"
                legendType="none"
              />

              {/* Spectral Index Lines */}
              <Line
                type="monotone"
                dataKey="ndvi"
                name={t.ndvi}
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#10b981', stroke: '#0f172a', strokeWidth: 1.5 }}
                activeDot={{ r: 6 }}
              />

              <Line
                type="monotone"
                dataKey="ndmi"
                name={t.ndmi}
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ r: 3, fill: '#06b6d4' }}
              />

              <Line
                type="monotone"
                dataKey="ndwi"
                name={t.ndwi}
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={{ r: 2.5, fill: '#3b82f6' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Footer Info Strip ────────────────────────────────────────────── */}
      <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            {isTelugu
              ? 'వరి పంట పెరుగుదల దశలలో NDVI 0.60 కంటే ఎక్కువ ఉంటే అధిక దిగుబడి వచ్చే అవకాశం ఉంది.'
              : 'Vegetative rice canopy with NDVI > 0.60 corresponds to healthy biomass and optimal tiller density.'}
          </span>
        </div>
        <span className="text-slate-500 font-mono shrink-0">
          ESA S2 L2A · Cloud Threshold: &lt;25%
        </span>
      </div>
    </div>
  );
}
