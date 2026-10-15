/**
 * WeatherChartsPanel — Stage 3: Real Weather Data from Open-Meteo API
 *
 * Renders two Recharts charts:
 *  1. ComposedChart — Daily max/min temperature (lines) + precipitation (bars)
 *  2. LineChart     — Relative humidity + solar radiation trends
 *
 * Props:
 *  - weatherData: WeatherHistoryResponse object from /api/v1/weather/farm/{farmId}
 *  - loading: boolean
 *  - error: string | null
 *  - lang: "en" | "te"
 */

import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  ReferenceLine,
} from 'recharts';

/* ─── Bilingual Labels ───────────────────────────────────────────────────── */
const LABELS = {
  en: {
    title: 'Real-Time Weather Trends',
    subtitle: 'Last 30 days • Source:',
    tempChart: 'Temperature & Rainfall',
    humidChart: 'Humidity & Solar Radiation',
    tempMax: 'Max Temp (°C)',
    tempMin: 'Min Temp (°C)',
    rain: 'Rainfall (mm)',
    humidity: 'Humidity (%)',
    solar: 'Solar Radiation (MJ/m²)',
    noData: 'No weather data available.',
    noDataSub: 'Ensure your farm has GPS coordinates set in the map picker.',
    loading: 'Fetching real weather data…',
    cacheHit: 'Cached',
    liveData: 'Live Data',
    apiError: 'Weather API unavailable — showing cached data',
    optimalTemp: 'Optimal rice range',
    summary: 'Summary',
    totalRain: 'Total Rainfall',
    avgTemp: 'Avg Temperature',
    rainyDays: 'Rainy Days',
    avgHumid: 'Avg Humidity',
  },
  te: {
    title: 'రియల్-టైమ్ వాతావరణ ట్రెండ్‌లు',
    subtitle: 'గత 30 రోజులు • మూలం:',
    tempChart: 'ఉష్ణోగ్రత & వర్షపాతం',
    humidChart: 'తేమ & సౌర వికిరణం',
    tempMax: 'గరిష్ట ఉష్ణో. (°C)',
    tempMin: 'కనిష్ట ఉష్ణో. (°C)',
    rain: 'వర్షపాతం (mm)',
    humidity: 'తేమ (%)',
    solar: 'సౌర వికిరణం (MJ/m²)',
    noData: 'వాతావరణ డేటా అందుబాటులో లేదు.',
    noDataSub: 'మ్యాప్ పికర్‌లో మీ పొలానికి GPS కోఆర్డినేట్లు సెట్ చేయండి.',
    loading: 'రియల్ వాతావరణ డేటా తీసుకొస్తున్నాం…',
    cacheHit: 'కాష్',
    liveData: 'లైవ్ డేటా',
    apiError: 'వాతావరణ API అందుబాటులో లేదు — కాష్ డేటా చూపిస్తున్నాం',
    optimalTemp: 'వరి అనుకూల పరిధి',
    summary: 'సారాంశం',
    totalRain: 'మొత్తం వర్షపాతం',
    avgTemp: 'సగటు ఉష్ణో.',
    rainyDays: 'వర్షం రోజులు',
    avgHumid: 'సగటు తేమ',
  },
};

/* ─── Custom Tooltip ─────────────────────────────────────────────────────── */
const WeatherTooltip = ({ active, payload, label, lang }) => {
  if (!active || !payload?.length) return null;
  const t = LABELS[lang] || LABELS.en;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="font-semibold text-white mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-300">{entry.name}:</span>
          <span className="text-white font-medium">
            {entry.value !== null && entry.value !== undefined
              ? Number(entry.value).toFixed(1)
              : '—'}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── Loading Skeleton ───────────────────────────────────────────────────── */
const ChartSkeleton = ({ label }) => (
  <div className="animate-pulse">
    <div className="h-4 w-1/3 bg-gray-700 rounded mb-3" />
    <div className="h-52 bg-gray-800 rounded-xl" />
  </div>
);

/* ─── Summary Stats Bar ──────────────────────────────────────────────────── */
const SummaryStats = ({ summary, lang }) => {
  const t = LABELS[lang] || LABELS.en;
  const stats = [
    { label: t.totalRain, value: summary?.total_rainfall_mm != null ? `${summary.total_rainfall_mm} mm` : '—', icon: '🌧️' },
    { label: t.avgTemp, value: summary?.avg_temp != null ? `${summary.avg_temp} °C` : '—', icon: '🌡️' },
    { label: t.rainyDays, value: summary?.rainy_days != null ? `${summary.rainy_days} days` : '—', icon: '☔' },
    { label: t.avgHumid, value: summary?.avg_humidity != null ? `${summary.avg_humidity}%` : '—', icon: '💧' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {stats.map((s, i) => (
        <div key={i} className="bg-gray-800/60 rounded-xl p-3 text-center border border-gray-700/50">
          <div className="text-xl mb-1">{s.icon}</div>
          <div className="text-white font-bold text-sm">{s.value}</div>
          <div className="text-gray-400 text-xs mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
};

/* ─── Helper: format date label ──────────────────────────────────────────── */
const formatDateTick = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
const WeatherChartsPanel = ({ weatherData, loading, error, lang = 'en' }) => {
  const t = LABELS[lang] || LABELS.en;

  /* Loading state */
  if (loading) {
    return (
      <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-2xl p-5 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <span className="text-lg">🌤️</span>
          </div>
          <div>
            <div className="h-4 w-48 bg-gray-700 rounded animate-pulse" />
            <div className="h-3 w-32 bg-gray-700 rounded animate-pulse mt-1" />
          </div>
        </div>
        <ChartSkeleton label={t.tempChart} />
        <ChartSkeleton label={t.humidChart} />
      </div>
    );
  }

  /* Error / no-farm state */
  if (error || !weatherData) {
    return (
      <div className="bg-gray-900/80 border border-red-500/30 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">🌩️</div>
        <p className="text-red-400 font-medium">{error || t.noData}</p>
        <p className="text-gray-500 text-sm mt-1">{t.noDataSub}</p>
      </div>
    );
  }

  const records = weatherData.records || [];

  /* No records state */
  if (records.length === 0) {
    return (
      <div className="bg-gray-900/80 border border-gray-700 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-gray-400 font-medium">{t.noData}</p>
        <p className="text-gray-500 text-sm mt-1">{t.noDataSub}</p>
      </div>
    );
  }

  /* Prepare chart data — skip future dates for history chart, include all for forecast chart */
  const today = new Date().toISOString().split('T')[0];
  const chartData = records.map((r) => ({
    date: formatDateTick(r.date),
    rawDate: r.date,
    temp_max: r.temp_max,
    temp_min: r.temp_min,
    precipitation: r.precipitation,
    humidity: r.humidity,
    solar_radiation: r.solar_radiation,
    isForecast: r.date > today,
  }));

  /* Stride for x-axis ticks — show every 5th label if >20 points */
  const tickInterval = chartData.length > 20 ? 4 : chartData.length > 10 ? 2 : 0;

  /* Source badge */
  const isLive = !weatherData.cache_hit;
  const sourceBadge = isLive
    ? <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs px-2 py-0.5 rounded-full">{t.liveData}</span>
    : <span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 text-xs px-2 py-0.5 rounded-full">{t.cacheHit}</span>;

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700/60 rounded-2xl p-5 space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 flex items-center justify-center text-xl">🌤️</div>
          <div>
            <h3 className="text-white font-bold text-base">{t.title}</h3>
            <p className="text-gray-400 text-xs">
              {t.subtitle}{' '}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 underline"
              >
                Open-Meteo API
              </a>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {sourceBadge}
          {weatherData.api_error && (
            <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-xs px-2 py-0.5 rounded-full">
              ⚠️ {t.apiError}
            </span>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <SummaryStats summary={weatherData.summary} lang={lang} />

      {/* Chart 1: Temperature + Precipitation */}
      <div>
        <h4 className="text-gray-300 font-semibold text-sm mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-orange-400 rounded-full inline-block" />
          {t.tempChart}
        </h4>
        <ResponsiveContainer width="100%" height={230}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="tempAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
              interval={tickInterval}
            />
            {/* Left Y-axis: Temperature */}
            <YAxis
              yAxisId="temp"
              orientation="left"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              unit="°C"
              domain={['dataMin - 2', 'dataMax + 2']}
            />
            {/* Right Y-axis: Precipitation */}
            <YAxis
              yAxisId="rain"
              orientation="right"
              tick={{ fill: '#38bdf8', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              unit="mm"
            />
            <Tooltip content={<WeatherTooltip lang={lang} />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              formatter={(value) => <span style={{ color: '#d1d5db' }}>{value}</span>}
            />
            {/* Shaded area between max and min temp */}
            <Area
              yAxisId="temp"
              type="monotone"
              dataKey="temp_max"
              stroke="transparent"
              fill="url(#tempAreaGradient)"
              name={t.tempMax}
              dot={false}
              legendType="none"
              activeDot={false}
            />
            {/* Max temperature line */}
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temp_max"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              name={t.tempMax}
              activeDot={{ r: 4, stroke: '#f97316', fill: '#111827' }}
            />
            {/* Min temperature line */}
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temp_min"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              name={t.tempMin}
              activeDot={{ r: 4, stroke: '#60a5fa', fill: '#111827' }}
            />
            {/* Precipitation bars */}
            <Bar
              yAxisId="rain"
              dataKey="precipitation"
              name={t.rain}
              fill="url(#rainGradient)"
              stroke="#38bdf8"
              strokeWidth={0.5}
              radius={[3, 3, 0, 0]}
              opacity={0.85}
            />
            {/* Optimal rice temp references */}
            <ReferenceLine yAxisId="temp" y={22} stroke="#22c55e" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: '22°C', fill: '#22c55e', fontSize: 9, position: 'insideLeft' }} />
            <ReferenceLine yAxisId="temp" y={35} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: '35°C', fill: '#ef4444', fontSize: 9, position: 'insideLeft' }} />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-600 mt-1 text-center">
          <span className="text-emerald-600">— 22°C</span> / <span className="text-red-600">— 35°C</span> = {t.optimalTemp}
        </p>
      </div>

      {/* Chart 2: Humidity + Solar Radiation */}
      <div>
        <h4 className="text-gray-300 font-semibold text-sm mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-teal-400 rounded-full inline-block" />
          {t.humidChart}
        </h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
              interval={tickInterval}
            />
            {/* Left Y: Humidity */}
            <YAxis
              yAxisId="humid"
              orientation="left"
              tick={{ fill: '#2dd4bf', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              unit="%"
              domain={[0, 100]}
            />
            {/* Right Y: Solar Radiation */}
            <YAxis
              yAxisId="solar"
              orientation="right"
              tick={{ fill: '#fb923c', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              unit=" MJ"
            />
            <Tooltip content={<WeatherTooltip lang={lang} />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              formatter={(value) => <span style={{ color: '#d1d5db' }}>{value}</span>}
            />
            <Line
              yAxisId="humid"
              type="monotone"
              dataKey="humidity"
              stroke="#2dd4bf"
              strokeWidth={2}
              dot={false}
              name={t.humidity}
              activeDot={{ r: 4, stroke: '#2dd4bf', fill: '#111827' }}
            />
            <Line
              yAxisId="solar"
              type="monotone"
              dataKey="solar_radiation"
              stroke="#fb923c"
              strokeWidth={2}
              dot={false}
              name={t.solar}
              activeDot={{ r: 4, stroke: '#fb923c', fill: '#111827' }}
              strokeDasharray="5 2"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-800">
        <p className="text-gray-600 text-xs">
          📡 Lat: {weatherData.lat?.toFixed(2)}° N, Lng: {weatherData.lng?.toFixed(2)}° E
        </p>
        <p className="text-gray-600 text-xs">
          {records.length} data points
        </p>
      </div>
    </div>
  );
};

export default WeatherChartsPanel;
