import React from 'react';
import {
  CloudSun,
  Droplets,
  Wind,
  Thermometer,
  CloudRain,
  AlertCircle,
  CalendarDays,
  Wifi,
  WifiOff,
} from 'lucide-react';

/**
 * WeatherSummaryCard — Stage 3 Updated
 *
 * Now accepts REAL data from Open-Meteo via weatherData prop (WeatherHistoryResponse).
 * Falls back gracefully to the legacy `data` prop (simulated analytics) if weatherData is absent.
 *
 * Props:
 *   - weatherData: WeatherHistoryResponse | null   (real data from /api/v1/weather/farm/{id})
 *   - data: object | null                           (legacy simulated fallback)
 *   - weatherLoading: boolean
 *   - weatherError: string | null
 *   - lang: 'en' | 'te'
 */
export default function WeatherSummaryCard({
  weatherData = null,
  data = null,
  weatherLoading = false,
  weatherError = null,
  lang = 'en',
}) {
  const isTelugu = lang === 'te' || lang === 'Telugu';

  /* ── Derive current-conditions from real data ─────────────────────────── */
  let realCurrent = null;
  let realForecast = [];

  if (weatherData?.records?.length) {
    const today = new Date().toISOString().split('T')[0];
    // History: past records (sorted ascending by date, already from API)
    const historyRecords = weatherData.records.filter((r) => r.date <= today);
    // Latest historical record = "today" or yesterday's observation
    const latestRecord = historyRecords[historyRecords.length - 1] || weatherData.records[0];
    // Forecast = future dates
    const forecastRecords = weatherData.records.filter((r) => r.date > today).slice(0, 3);

    realCurrent = latestRecord;

    realForecast = forecastRecords.map((r) => ({
      day: new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      temp_max: r.temp_max?.toFixed(0) ?? '—',
      temp_min: r.temp_min?.toFixed(0) ?? '—',
      rain_pct: r.precipitation != null ? (r.precipitation > 5 ? 80 : r.precipitation > 1 ? 40 : 10) : '—',
    }));
  }

  /* ── Last-7-day rainfall total from real data ─────────────────────────── */
  let rain7d = null;
  if (weatherData?.records?.length) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().split('T')[0];
    rain7d = weatherData.records
      .filter((r) => r.date >= cutoff && r.precipitation != null)
      .reduce((sum, r) => sum + r.precipitation, 0)
      .toFixed(1);
  }

  /* ── Irrigation advisory based on real rain ──────────────────────────── */
  const getIrrigationAdvice = () => {
    if (!weatherData?.summary) return null;
    const rain = weatherData.summary.total_rainfall_mm ?? 0;
    const avgTemp = weatherData.summary.avg_temp ?? 30;
    if (rain > 100)
      return isTelugu
        ? 'పుష్కలమైన వర్షం కారణంగా నీటిపారుదల అవసరం లేదు. వరదను నివారించండి.'
        : 'Good rainfall received. No irrigation needed. Monitor for waterlogging.';
    if (rain > 50)
      return isTelugu
        ? 'సరిపోయే వర్షం. మొక్కల పరిస్థితి బట్టి నీటిపారుదల మోతాదు నిర్ణయించండి.'
        : 'Adequate rainfall. Supplement irrigation based on crop growth stage.';
    if (avgTemp > 34)
      return isTelugu
        ? 'అధిక ఉష్ణోగ్రత కారణంగా నీటిపారుదల పెంచండి. సాయంత్రం నీరు పెట్టండి.'
        : 'High temperature stress detected. Increase irrigation frequency. Water in evenings.';
    return isTelugu
      ? 'వర్షపాతం తక్కువగా ఉంది. పొలానికి తప్పనిసరిగా నీరు పెట్టండి.'
      : 'Low rainfall period. Regular irrigation recommended every 4–5 days.';
  };

  /* ── Loading state ────────────────────────────────────────────────────── */
  if (weatherLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-pulse space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sky-100 rounded-xl" />
          <div>
            <div className="h-4 w-40 bg-slate-200 rounded mb-1" />
            <div className="h-3 w-28 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-16 bg-blue-50 rounded-xl" />
      </div>
    );
  }

  /* ── Derive display values (real > fallback) ─────────────────────────── */
  const displayTempMax = realCurrent?.temp_max?.toFixed(1) ?? data?.temperature_c ?? '—';
  const displayTempMin = realCurrent?.temp_min?.toFixed(1) ?? '—';
  const displayHumidity = realCurrent?.humidity?.toFixed(0) ?? data?.humidity_pct ?? '—';
  const displayRain7d = rain7d ?? data?.rainfall_mm_last_7d ?? '—';
  const displaySolar = realCurrent?.solar_radiation?.toFixed(1) ?? '—';
  const forecastItems = realForecast.length > 0 ? realForecast : (data?.forecast ?? []);
  const irrigationAdvice = getIrrigationAdvice() ?? (isTelugu ? data?.irrigation_advice_te : data?.irrigation_advice);
  const isRealData = weatherData !== null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
            <CloudSun className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              {isTelugu ? 'వాతావరణ సమగ్ర సమాచారం' : 'Microclimate & Weather Summary'}
            </h3>
            <div className="flex items-center gap-1.5">
              {isRealData ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">
                    {weatherData?.cache_hit
                      ? isTelugu ? 'కాష్ నుండి డేటా' : 'Cached · Open-Meteo'
                      : isTelugu ? 'లైవ్ డేటా · Open-Meteo' : 'Live · Open-Meteo API'}
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-400">
                    {isTelugu ? 'సిమ్యులేటెడ్ డేటా' : 'Simulated Data'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {isRealData ? (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            ✓ {isTelugu ? 'నిజ సమాచారం' : 'Real Data'}
          </span>
        ) : (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
            {data?.rainfall_forecast_next_3d_pct ?? '—'}% {isTelugu ? 'వర్ష సూచన' : 'Rain Prob'}
          </span>
        )}
      </div>

      {/* Weather error banner */}
      {weatherError && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{isTelugu ? 'వాతావరణ డేటా లభించలేదు. కాష్ చూపిస్తున్నాం.' : `Weather API issue: ${weatherError}. Showing cached data.`}</span>
        </div>
      )}

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        {/* Temperature */}
        <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">
            {isTelugu ? 'గరిష్ట / కనిష్ట ఉష్ణో.' : 'Max / Min Temp'}
          </span>
          <div className="font-black text-slate-900 flex items-center justify-center gap-1 text-lg">
            <Thermometer className="w-4 h-4 text-amber-500" />
            <span>{displayTempMax}°</span>
          </div>
          <span className="text-[10px] text-slate-400">{displayTempMin !== '—' ? `Min: ${displayTempMin}°C` : 'Real data'}</span>
        </div>

        {/* Humidity */}
        <div className="p-3 rounded-xl bg-sky-50 border border-sky-100">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">
            {isTelugu ? 'తేమ శాతం' : 'Humidity'}
          </span>
          <div className="text-xl font-black text-sky-900 flex items-center justify-center gap-1">
            <Droplets className="w-4 h-4 text-sky-500" />
            <span>{displayHumidity}%</span>
          </div>
          <span className="text-[10px] text-slate-400">
            {isRealData ? (isTelugu ? 'రోజువారీ సగటు' : 'Daily mean') : data?.heat_index ?? '—'}
          </span>
        </div>

        {/* 7-Day Rain */}
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">
            {isTelugu ? 'గత 7 రోజుల వర్షం' : '7-Day Rain'}
          </span>
          <div className="text-xl font-black text-blue-900 flex items-center justify-center gap-1">
            <CloudRain className="w-4 h-4 text-blue-500" />
            <span>{displayRain7d}</span>
            <span className="text-xs font-normal">mm</span>
          </div>
          <span className="text-[10px] text-slate-400">
            {isRealData ? (isTelugu ? 'Open-Meteo నుండి' : 'From Open-Meteo') : 'Delta Rain Gauge'}
          </span>
        </div>

        {/* Solar Radiation */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">
            {isTelugu ? 'సౌర వికిరణం' : 'Solar Radiation'}
          </span>
          <div className="text-xl font-black text-amber-900 flex items-center justify-center gap-1">
            <span className="text-lg">☀️</span>
            <span className="text-base">{displaySolar}</span>
          </div>
          <span className="text-[10px] text-slate-400">MJ/m²/day</span>
        </div>
      </div>

      {/* 3-Day Forecast */}
      {forecastItems.length > 0 && (
        <div>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 mb-2">
            <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
            <span>{isTelugu ? '3 రోజుల వాతావరణ అంచనా' : '3-Day Forecast'}</span>
            {isRealData && (
              <span className="ml-1 text-[10px] text-emerald-600 font-normal normal-case">
                (Open-Meteo)
              </span>
            )}
          </span>
          <div className="grid grid-cols-3 gap-2">
            {forecastItems.map((fc, i) => (
              <div key={i} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-center text-xs">
                <span className="font-bold text-slate-800 block text-[11px] mb-1">{fc.day}</span>
                <div className="font-extrabold text-slate-900 text-sm">
                  {fc.temp_max}° / <span className="text-slate-500 font-normal">{fc.temp_min}°</span>
                </div>
                <span className="text-[10px] text-sky-700 font-semibold block mt-1">
                  🌧 {fc.rain_pct}% rain
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart Irrigation Advisory */}
      {irrigationAdvice && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-950">
          <Droplets className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-blue-900 font-bold mb-0.5">
              {isTelugu ? 'నీటి నిర్వహణ సలహా:' : 'Irrigation Management Advisory:'}
            </strong>
            <span>{irrigationAdvice}</span>
          </div>
        </div>
      )}
    </div>
  );
}
