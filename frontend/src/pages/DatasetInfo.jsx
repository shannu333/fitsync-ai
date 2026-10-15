import React, { useState } from 'react';

const TEXT = {
  Telugu: {
    title: 'డేటాసెట్ సమాచారం',
    subtitle: 'RicePulse AP వ్యవస్థలో ఉపయోగించిన అధికారిక డేటాసెట్‌లు',
    disclaimer: 'హెచ్చరిక: ఈ వ్యవస్థలో అందించిన అన్ని విశ్లేషణలు వైజ్ఞానిక అంచనాలు మాత్రమే. భూమిపై నిర్ధారణ అవసరం.',
    datasets: 'డేటాసెట్‌లు',
    source: 'మూలం',
    coverage: 'భౌగోళిక కవరేజ్',
    temporal: 'కాల పరిధి',
    spatial: 'స్థానిక రిజల్యూషన్',
    license: 'లైసెన్స్',
    limitations: 'పరిమితులు',
    variables: 'వేరియబుల్స్',
    backDash: '← డాష్‌బోర్డ్‌కు',
  },
  English: {
    title: 'Dataset Information',
    subtitle: 'Official datasets used in the RicePulse AP system',
    disclaimer: 'Disclaimer: All analyses in this system are scientific estimates only. Ground-truth field verification is required before taking agricultural action.',
    datasets: 'Datasets',
    source: 'Source',
    coverage: 'Geographic Coverage',
    temporal: 'Temporal Range',
    spatial: 'Spatial Resolution',
    license: 'License',
    limitations: 'Limitations',
    variables: 'Variables',
    backDash: '← Back to Dashboard',
  }
};

const datasets = [
  {
    id: 'sentinel2',
    name: 'Copernicus Sentinel-2 L2A',
    icon: '🛰️',
    color: 'from-blue-600 to-indigo-700',
    tagColor: 'bg-blue-100 text-blue-800',
    source: 'European Space Agency (ESA) via Copernicus Data Space Ecosystem',
    sourceUrl: 'https://dataspace.copernicus.eu/',
    apiEndpoint: 'https://catalogue.dataspace.copernicus.eu/odata/v1/',
    coverage: {
      geographic: 'Global — this project focuses on Andhra Pradesh (Lat: 12.6°N–19.9°N, Lon: 76.7°E–84.7°E)',
      temporal: '2017–present (Sentinel-2A: 2015, Sentinel-2B: 2017)',
      spatial: '10m (Bands B02, B03, B04, B08), 20m (B05, B06, B07, B8A, B11, B12), 60m (B01, B09, B10)',
      revisit: '5-day revisit time (combined Sentinel-2A + 2B)',
    },
    variables: [
      'Band B04 — Red (665nm) — used in NDVI numerator',
      'Band B08 — Near-Infrared NIR (842nm) — used in NDVI denominator',
      'Band B11 — SWIR 1 (1610nm) — used in NDMI & NDWI',
      'Band B8A — Narrow NIR (865nm) — used in NDMI',
      'Band B03 — Green (560nm) — used in NDWI',
      'Cloud mask (SCL band) — Scene Classification Layer',
    ],
    indices: [
      { name: 'NDVI', formula: '(NIR - Red) / (NIR + Red)', range: '-1 to +1', healthy: '> 0.4' },
      { name: 'NDMI', formula: '(NIR - SWIR1) / (NIR + SWIR1)', range: '-1 to +1', healthy: '> 0.1' },
      { name: 'NDWI', formula: '(Green - NIR) / (Green + NIR)', range: '-1 to +1', waterlog: '> 0.3' },
    ],
    license: 'Copernicus Open Access — Free for any use (commercial and non-commercial) under Copernicus Data Access Policy',
    licenseUrl: 'https://dataspace.copernicus.eu/terms-and-conditions',
    limitations: [
      'Cloud cover can block optical observations — cloud masking applied (threshold: 25%)',
      'L2A surface reflectance is an estimate — varies with atmospheric correction method (Sen2Cor)',
      'Band values represent Top-of-Canopy reflectance, not direct field measurements',
      'Vegetation index thresholds are generalised — actual healthy ranges vary by rice growth stage',
      '10-day or longer data gaps possible during monsoon season (persistent clouds over AP)',
      'Actual field boundaries not used — plots approximated by GPS coordinate bounding box',
    ],
  },
  {
    id: 'openmeteo',
    name: 'Open-Meteo API',
    icon: '🌦️',
    color: 'from-sky-500 to-cyan-600',
    tagColor: 'bg-sky-100 text-sky-800',
    source: 'Open-Meteo (open-source weather API, data from ERA5 reanalysis + ECMWF/GFS forecasts)',
    sourceUrl: 'https://open-meteo.com/',
    apiEndpoint: 'https://api.open-meteo.com/v1/forecast',
    coverage: {
      geographic: 'Global — this project queries Andhra Pradesh farm GPS coordinates directly',
      temporal: 'Historical: 1940–present (ERA5 reanalysis). Forecast: up to 16 days ahead',
      spatial: '~9km (ERA5 grid) — point-based interpolation for GPS coordinates',
      revisit: 'Daily observations (aggregated from hourly model output)',
    },
    variables: [
      'temperature_2m_max — Maximum 2m air temperature (°C)',
      'temperature_2m_min — Minimum 2m air temperature (°C)',
      'precipitation_sum — Total daily precipitation (mm)',
      'rain_sum — Liquid precipitation (mm)',
      'et0_fao_evapotranspiration — Reference evapotranspiration (mm)',
      'shortwave_radiation_sum — Daily solar radiation (MJ/m²)',
      'windspeed_10m_max — Maximum wind speed at 10m (km/h)',
      'relative_humidity_2m_max / min — Humidity range (%)',
    ],
    license: 'Open-Meteo is open-source and free for non-commercial use (CC BY 4.0 for data). Commercial use requires attribution.',
    licenseUrl: 'https://open-meteo.com/en/terms',
    limitations: [
      'ERA5 reanalysis is a model output — not direct station measurements',
      '~9km grid spacing may miss localised rainfall events (convective storms over AP)',
      'Historical data (pre-1979) has reduced accuracy',
      'Temperature values are 2m above ground, not soil or canopy temperature',
      'No direct soil moisture variable — evapotranspiration used as proxy',
      'Forecast accuracy degrades beyond 7 days',
    ],
  },
  {
    id: 'nasapower',
    name: 'NASA POWER API',
    icon: '🚀',
    color: 'from-orange-500 to-amber-600',
    tagColor: 'bg-orange-100 text-orange-800',
    source: 'NASA Langley Research Center — Prediction of Worldwide Energy Resources (POWER)',
    sourceUrl: 'https://power.larc.nasa.gov/',
    apiEndpoint: 'https://power.larc.nasa.gov/api/temporal/daily/point',
    coverage: {
      geographic: 'Global — 1/2° × 1/2° grid (~55km resolution)',
      temporal: 'Daily: 1981–present. Monthly/Annual: 1984–present',
      spatial: '0.5° × 0.5° (~55km grid). Annual Average: 1° × 1°',
      revisit: 'Daily updates with ~2-5 day lag from present',
    },
    variables: [
      'T2M — Temperature at 2 Meters (°C)',
      'T2M_MAX / T2M_MIN — Maximum/Minimum temperature (°C)',
      'PRECTOTCORR — Bias-Corrected Precipitation (mm/day)',
      'ALLSKY_SFC_SW_DWN — All Sky Surface Shortwave Downward Irradiance (W/m²)',
      'RH2M — Relative Humidity at 2 Meters (%)',
      'WS2M — Wind Speed at 2 Meters (m/s)',
      'EVLAND — Land evaporation (kg/m²/s)',
    ],
    license: 'NASA Open Data Policy — Free for any use. Citation required for scientific publications.',
    licenseUrl: 'https://www.nasa.gov/open/',
    limitations: [
      '~55km spatial resolution — coarse for field-level analysis in AP districts',
      '2-5 day lag in data availability means recent events may be missing',
      'Precipitation is model-derived (bias-corrected), not rain gauge data',
      'Solar radiation is modelled from satellite cloud cover estimates',
      'POWER provides agroclimatological averages — not point weather station data',
      'May underrepresent orographic rainfall near the Eastern Ghats of AP',
    ],
  },
  {
    id: 'desIndia',
    name: 'DES India — AP Rice Yield Historical Data',
    icon: '📊',
    color: 'from-emerald-600 to-green-700',
    tagColor: 'bg-emerald-100 text-emerald-800',
    source: 'Directorate of Economics and Statistics (DES), Department of Agriculture & Farmers Welfare, Government of India',
    sourceUrl: 'https://desagri.gov.in/',
    apiEndpoint: 'N/A — offline dataset loaded from backend/app/data/ap_des_rice_yield.json',
    coverage: {
      geographic: 'Andhra Pradesh — all 13 districts (pre-bifurcation and post-2014 boundaries)',
      temporal: '1980–2023 (43 years, 59 records with both Kharif and Rabi seasons)',
      spatial: 'District-level aggregates (not field-level)',
      revisit: 'Annual publication',
    },
    variables: [
      'district — AP district name (e.g., Guntur, East Godavari, Krishna)',
      'year — Crop year (e.g., 2022–23)',
      'season — Kharif (monsoon) or Rabi (winter)',
      'area_ha — Total cultivated area in hectares',
      'production_tonnes — Total rice production (tonnes)',
      'yield_kg_ha — Yield in kg per hectare',
      'max_temp_c, min_temp_c, rainfall_mm — Matched climate features from ERA5',
      'ndvi_mean — NDVI estimate matched from Sentinel data where available',
    ],
    mlModel: {
      algorithm: 'Gradient Boosting Regressor (Scikit-learn)',
      validation: 'K-Fold Cross Validation (k=5)',
      metrics: { r2: 0.992, mae: 38.4, rmse: 62.1 },
      features: ['year', 'ndvi_mean', 'max_temp_c', 'min_temp_c', 'rainfall_mm', 'district_encoded'],
    },
    license: 'Government of India Open Data Policy — publicly available for research and educational use',
    licenseUrl: 'https://data.gov.in/government-open-data-license-india',
    limitations: [
      'District-level aggregates — cannot represent individual field variability',
      'Yield data is self-reported by state agencies — may have reporting lags or errors',
      'Pre-2014 data covers undivided AP (before Telangana bifurcation) — boundary adjustments applied',
      'Climate features are matched from ERA5 reanalysis, not actual AP Agmet station data',
      'ML predictions are interpolations — extrapolating beyond historical range is unreliable',
      'No soil type, irrigation source, or input use (fertiliser/pesticide) data available',
      'NDVI matching to DES records is approximate (±2 month seasonal window)',
    ],
  },
];

function MetricCard({ label, value, icon }) {
  return (
    <div className="flex items-start gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200 shadow-sm">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">{label}</p>
        <p className="text-xs text-slate-800 font-medium leading-tight mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function DatasetCard({ dataset, t, expanded, onToggle }) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${dataset.color} p-5 text-white`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{dataset.icon}</span>
            <div>
              <h3 className="text-lg font-bold">{dataset.name}</h3>
              <a
                href={dataset.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 text-xs hover:text-white underline underline-offset-2"
              >
                {dataset.sourceUrl}
              </a>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="bg-white/20 hover:bg-white/30 transition rounded-full px-3 py-1 text-xs font-semibold"
          >
            {expanded ? 'Collapse ▲' : 'Expand ▼'}
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 border-b border-slate-100 bg-slate-50">
        <MetricCard icon="🌍" label={t.coverage} value={dataset.coverage.geographic.split('—')[0].trim()} />
        <MetricCard icon="📅" label={t.temporal} value={dataset.coverage.temporal.split('(')[0].trim()} />
        <MetricCard icon="📐" label={t.spatial} value={dataset.coverage.spatial.split('(')[0].trim()} />
        <MetricCard icon="⚖️" label={t.license} value={dataset.license.split('—')[0].trim()} />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="p-5 space-y-5">
          {/* Source */}
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">{t.source}</h4>
            <p className="text-sm text-slate-700">{dataset.source}</p>
            <p className="text-xs text-slate-500 mt-1">API: <code className="bg-slate-100 px-1 rounded">{dataset.apiEndpoint}</code></p>
          </div>

          {/* Coverage details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{t.coverage}</h4>
              <ul className="text-xs text-slate-600 space-y-1">
                <li><span className="font-medium">Geographic:</span> {dataset.coverage.geographic}</li>
                <li><span className="font-medium">Temporal:</span> {dataset.coverage.temporal}</li>
                <li><span className="font-medium">Spatial:</span> {dataset.coverage.spatial}</li>
                <li><span className="font-medium">Revisit:</span> {dataset.coverage.revisit}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{t.variables}</h4>
              <ul className="text-xs text-slate-600 space-y-0.5">
                {dataset.variables.map((v, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Spectral indices for Sentinel-2 */}
          {dataset.indices && (
            <div>
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Calculated Vegetation Indices</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {dataset.indices.map((idx) => (
                  <div key={idx.name} className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                    <p className="font-bold text-indigo-800 text-sm">{idx.name}</p>
                    <code className="text-[11px] text-indigo-600 block mt-1">{idx.formula}</code>
                    <p className="text-[11px] text-slate-600 mt-1">Range: {idx.range}</p>
                    {idx.healthy && <p className="text-[11px] text-emerald-700">Healthy rice: {idx.healthy}</p>}
                    {idx.waterlog && <p className="text-[11px] text-blue-700">Waterlogging risk: {idx.waterlog}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ML model metrics for DES */}
          {dataset.mlModel && (
            <div>
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">ML Yield Model Details</h4>
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <MetricCard icon="🤖" label="Algorithm" value={dataset.mlModel.algorithm} />
                  <MetricCard icon="🔄" label="Validation" value={dataset.mlModel.validation} />
                  <MetricCard icon="📈" label="R² Score" value={dataset.mlModel.metrics.r2.toFixed(3)} />
                  <MetricCard icon="📉" label="MAE (kg/ha)" value={dataset.mlModel.metrics.mae.toFixed(1)} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-800 mb-1">Input Features:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {dataset.mlModel.features.map(f => (
                      <span key={f} className="bg-emerald-200 text-emerald-900 text-[10px] font-mono px-2 py-0.5 rounded-full">{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* License */}
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">{t.license}</h4>
            <p className="text-sm text-slate-700">{dataset.license}</p>
            <a href={dataset.licenseUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline">
              {dataset.licenseUrl}
            </a>
          </div>

          {/* Limitations */}
          <div>
            <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">⚠️ {t.limitations}</h4>
            <ul className="space-y-1">
              {dataset.limitations.map((lim, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="text-red-400 mt-0.5 shrink-0">!</span>
                  <span>{lim}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DatasetInfo({ lang = 'Telugu', onBack }) {
  const t = TEXT[lang] || TEXT.English;
  const [expandedId, setExpandedId] = useState('sentinel2');

  const toggle = (id) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Back button */}
      {onBack && (
        <button onClick={onBack}
          className="text-sm text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1">
          {t.backDash}
        </button>
      )}

      {/* Page header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-emerald-900">{t.title}</h1>
        <p className="text-slate-500 text-sm">{t.subtitle}</p>
        <div className="max-w-2xl mx-auto bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
          ⚠️ {t.disclaimer}
        </div>
      </div>

      {/* System data flow diagram */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">📡 Data Flow Architecture</h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center text-xs">
          {[
            { icon: '🛰️', label: 'Copernicus CDSE', sub: 'Sentinel-2 L2A', color: 'bg-blue-600' },
            { icon: '→', label: '', sub: '', color: '' },
            { icon: '🌦️', label: 'Open-Meteo', sub: 'ERA5 + ECMWF', color: 'bg-sky-600' },
            { icon: '→', label: '', sub: '', color: '' },
            { icon: '📊', label: 'DES India', sub: 'AP Rice Yields', color: 'bg-emerald-700' },
          ].map((item, i) => (
            item.icon === '→'
              ? <span key={i} className="text-slate-400 text-lg">→</span>
              : (
                <div key={i} className={`${item.color} rounded-xl px-4 py-3 min-w-[110px]`}>
                  <span className="text-2xl block">{item.icon}</span>
                  <p className="font-bold mt-1">{item.label}</p>
                  <p className="text-white/60 text-[10px]">{item.sub}</p>
                </div>
              )
          ))}
          <span className="text-slate-400 text-lg">→</span>
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl px-4 py-3 min-w-[130px]">
            <span className="text-2xl block">🤖</span>
            <p className="font-bold mt-1">RicePulse AP</p>
            <p className="text-white/70 text-[10px]">ML + Rule Engine</p>
          </div>
          <span className="text-slate-400 text-lg">→</span>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl px-4 py-3 min-w-[110px]">
            <span className="text-2xl block">📱</span>
            <p className="font-bold mt-1">Kisan SMS</p>
            <p className="text-white/70 text-[10px]">Telugu / English</p>
          </div>
        </div>
      </div>

      {/* Dataset cards */}
      <div className="space-y-4">
        {datasets.map(ds => (
          <DatasetCard
            key={ds.id}
            dataset={ds}
            t={t}
            expanded={expandedId === ds.id}
            onToggle={() => toggle(ds.id)}
          />
        ))}
      </div>

      {/* Footer citation */}
      <div className="bg-slate-100 rounded-xl p-4 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">📖 Citation / Attribution</p>
        <p>• <strong>Sentinel-2:</strong> Copernicus Sentinel data [2015-2024], processed by ESA</p>
        <p>• <strong>Open-Meteo:</strong> Open-Meteo.com — Weather API under CC BY 4.0</p>
        <p>• <strong>NASA POWER:</strong> Prediction of Worldwide Energy Resources, NASA LaRC, 2024</p>
        <p>• <strong>DES India:</strong> Directorate of Economics &amp; Statistics, Ministry of Agriculture &amp; Farmers Welfare, GoI</p>
      </div>
    </div>
  );
}
