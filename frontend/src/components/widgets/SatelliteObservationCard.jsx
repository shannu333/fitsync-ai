import React from 'react';
import {
  Satellite,
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function SatelliteObservationCard({
  data,
  satelliteRealData = null,
  lang = 'Telugu',
}) {
  if (!data && !satelliteRealData) return null;
  const isTelugu = lang === 'Telugu' || lang === 'te';

  // Use real Copernicus data if available
  const summary = satelliteRealData?.summary;
  const isReal = !!summary && summary.latest_ndvi != null;

  const currentNdvi = isReal ? summary.latest_ndvi.toFixed(2) : (data?.ndvi_current ?? 0.68);
  const ndviTrendVal = isReal ? summary.ndvi_trend_30d : (data?.ndvi_trend === 'improving' ? 0.05 : -0.04);
  const sensorLabel = isReal ? `Copernicus Sentinel-2 (${summary.latest_tile_id || '44QND'})` : (data?.satellite_sensor || 'Sentinel-2 MSI (ESA)');
  const vigorLabel = isReal ? summary.health_status : (isTelugu ? data?.vegetation_vigor_te : data?.vegetation_vigor);

  const getTrendIcon = () => {
    if (ndviTrendVal > 0) {
      return <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />;
    } else if (ndviTrendVal < 0) {
      return <TrendingDown className="w-3.5 h-3.5 text-red-600" />;
    }
    return <Minus className="w-3.5 h-3.5 text-slate-500" />;
  };

  const formattedPassDate = isReal && summary.latest_observation_date
    ? new Date(summary.latest_observation_date).toLocaleDateString(isTelugu ? 'te-IN' : 'en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : (data?.last_satellite_pass || 'Recent');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
            <Satellite className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              {isTelugu ? "ఉపగ్రహ పరిశీలన & పంట సాంద్రత" : "Satellite Remote Sensing (NDVI)"}
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {sensorLabel}
            </span>
          </div>
        </div>

        {isReal ? (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Copernicus L2A</span>
          </span>
        ) : (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
            {data?.resolution || '10m GSD'}
          </span>
        )}
      </div>

      {/* Main NDVI Metrics Hero */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Current NDVI Value */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {isTelugu ? "ప్రస్తుత NDVI విలువ" : "Current NDVI Index"}
            </span>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
              {getTrendIcon()}
              <span>{ndviTrendVal >= 0 ? `+${ndviTrendVal}` : ndviTrendVal}</span>
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-950 font-mono my-1">
            {currentNdvi}
          </div>
          <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>{vigorLabel}</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {isReal ? `Tile: ${summary.latest_tile_id || '44QND'} · Band 8/Band 4` : `Previous Pass: ${data?.ndvi_previous || '0.64'}`}
          </span>
        </div>

        {/* Moisture & Canopy Coverage */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-600">
                {isTelugu ? "తేమ సూచిక (NDMI)" : "Moisture Index (NDMI)"}
              </span>
              <strong className="text-slate-900 font-mono">
                {isReal && summary.latest_ndmi != null ? summary.latest_ndmi.toFixed(3) : (data?.canopy_cover_pct ? `${data.canopy_cover_pct}%` : '+0.38')}
              </strong>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-cyan-500 h-full rounded-full"
                style={{ width: `${Math.min(100, Math.max(10, ((Number(currentNdvi) || 0.6) * 100)))}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-600">
                {isTelugu ? "నీటి సూచిక (NDWI)" : "Water Index (NDWI)"}
              </span>
              <strong className="text-slate-900 font-mono">
                {isReal && summary.latest_ndwi != null ? summary.latest_ndwi.toFixed(3) : `+${data?.ndwi_moisture || 0.18}`}
              </strong>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full"
                style={{ width: `${Math.min(100, Math.max(15, (isReal ? 65 : (data?.ndwi_moisture || 0.18) * 120)))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* NDVI Spectrum Visual Scale */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] font-semibold text-slate-500">
          <span>0.1 (Water/Soil)</span>
          <span>0.4 (Low Greenery)</span>
          <span>0.6 (Optimal Rice)</span>
          <span>0.9 (Dense Canopy)</span>
        </div>
        <div className="h-2.5 rounded-full bg-gradient-to-r from-amber-400 via-lime-500 to-emerald-800 shadow-inner relative">
          <div
            className="absolute -top-1 w-4 h-4 bg-white border-2 border-slate-900 rounded-full shadow transform -translate-x-1/2"
            style={{ left: `${Math.min(100, Math.max(5, (Number(currentNdvi) || 0.6) * 100))}%` }}
          />
        </div>
      </div>

      {/* Orbit & Pass Timeline */}
      <div className="grid grid-cols-2 gap-3 text-xs pt-1">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-500 block">
              {isTelugu ? "చివరి ఉపగ్రహ పరిశీలన" : "Last Satellite Observation"}
            </span>
            <strong className="text-slate-800 text-[11px]">{formattedPassDate}</strong>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
          <Satellite className="w-4 h-4 text-purple-600 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-500 block">
              {isTelugu ? "డేటా మూలం" : "Satellite Constellation"}
            </span>
            <strong className="text-slate-800 text-[11px]">
              {isReal ? 'Copernicus Sentinel-2' : (data?.next_pass_estimate || 'Sentinel-2A/2B')}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
