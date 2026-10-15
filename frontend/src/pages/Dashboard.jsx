import React, { useState, useEffect, useCallback } from 'react';
import {
  Sprout,
  MapPin,
  Phone,
  Layers,
  Calendar,
  Settings,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  BellRing,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  CloudSun,
} from 'lucide-react';
import CropHealthStressWidget from '../components/widgets/CropHealthStressWidget';
import WeatherSummaryCard from '../components/widgets/WeatherSummaryCard';
import SatelliteObservationCard from '../components/widgets/SatelliteObservationCard';
import YieldPredictionCard from '../components/widgets/YieldPredictionCard';
import WeatherChartsPanel from '../components/widgets/WeatherChartsPanel';
import SatelliteChartsPanel from '../components/widgets/SatelliteChartsPanel';
import FarmerRecommendationCard from '../components/widgets/FarmerRecommendationCard';
import SMSHistoryPanel from '../components/widgets/SMSHistoryPanel';
import FarmMapPicker from '../components/FarmMapPicker';
import FarmManagerModal from '../components/FarmManagerModal';
import { farmAPI, userAPI, weatherAPI, satelliteAPI, yieldAPI, stressAPI, smsAPI } from '../api';

export default function Dashboard({ user, onProfileUpdated, lang = 'Telugu' }) {
  const isTelugu = lang === 'Telugu';
  const langCode = isTelugu ? 'te' : 'en';

  // ── Farm Plots State ──────────────────────────────────────────────────────
  const [farms, setFarms] = useState(user.farms || []);
  const [selectedFarmId, setSelectedFarmId] = useState(
    user.farms && user.farms.length > 0 ? user.farms[0].id : null
  );

  // ── Analytics Data (simulated, Stage 2) ──────────────────────────────────
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');

  // ── Real Weather Data (Stage 3) ───────────────────────────────────────────
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  // ── Sentinel-2 Satellite Data (Stage 4) ───────────────────────────────────
  const [satelliteData, setSatelliteData] = useState(null);
  const [satelliteLoading, setSatelliteLoading] = useState(false);
  const [satelliteError, setSatelliteError] = useState(null);

  // ── ML Yield Prediction & Stress Diagnosis (Stages 5 & 6) ─────────────────
  const [yieldData, setYieldData] = useState(null);
  const [loadingYield, setLoadingYield] = useState(false);
  const [stressData, setStressData] = useState(null);

  // ── Modals & UI ───────────────────────────────────────────────────────────
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [consentStatus, setConsentStatus] = useState(user.consent ? user.consent.consent_given : true);
  const [updatingConsent, setUpdatingConsent] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // ── SMS History Logs (Stage 7 & 8) ────────────────────────────────────────
  const [smsHistory, setSmsHistory] = useState(null);

  const loadSmsHistory = useCallback(async () => {
    try {
      const data = await smsAPI.getHistory();
      setSmsHistory(data);
    } catch (err) {
      console.warn('Failed to load SMS history:', err);
    }
  }, []);

  useEffect(() => {
    loadSmsHistory();
  }, [loadSmsHistory]);

  // ── Load farms on mount ───────────────────────────────────────────────────
  useEffect(() => {
    async function loadFarms() {
      try {
        const fetchedFarms = await farmAPI.getAll();
        setFarms(fetchedFarms);
        if (fetchedFarms.length > 0 && !selectedFarmId) {
          setSelectedFarmId(fetchedFarms[0].id);
        }
      } catch (err) {
        console.error('Failed to load farms:', err);
      }
    }
    loadFarms();
  }, []);

  // ── Load analytics when farm changes ─────────────────────────────────────
  useEffect(() => {
    if (!selectedFarmId) return;

    async function loadAnalytics() {
      setLoadingAnalytics(true);
      setAnalyticsError('');
      try {
        const data = await farmAPI.getAnalytics(selectedFarmId);
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to load farm analytics:', err);
        setAnalyticsError(
          isTelugu
            ? 'పంట విశ్లేషణ లోడ్ చేయడంలో లోపం సంభవించింది.'
            : 'Could not load farm analytics.'
        );
      } finally {
        setLoadingAnalytics(false);
      }
    }

    loadAnalytics();
  }, [selectedFarmId, isTelugu]);

  // ── Load REAL weather data when farm changes ──────────────────────────────
  const loadWeatherData = useCallback(async (farmId) => {
    if (!farmId) return;
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await weatherAPI.getFarmWeather(farmId, 30, 3);
      if (data.source === 'error') {
        setWeatherError(
          isTelugu
            ? 'వాతావరణ API లభించలేదు. కొంత సేపు తర్వాత మళ్ళీ ప్రయత్నించండి.'
            : 'Weather API unavailable. Please try again later.'
        );
        setWeatherData(null);
      } else {
        setWeatherData(data);
        setWeatherError(null);
      }
    } catch (err) {
      console.error('Weather fetch error:', err);
      const msg = err?.response?.data?.detail || err.message || 'Unknown error';
      // 422 means farm has no coordinates yet — show a friendly message
      if (err?.response?.status === 422) {
        setWeatherError(
          isTelugu
            ? 'పొలానికి GPS కోఆర్డినేట్లు సెట్ చేయలేదు. మ్యాప్ పికర్‌లో సెట్ చేయండి.'
            : 'Farm has no GPS coordinates. Set them using the map picker.'
        );
      } else {
        setWeatherError(msg);
      }
      setWeatherData(null);
    } finally {
      setWeatherLoading(false);
    }
  }, [isTelugu]);

  useEffect(() => {
    loadWeatherData(selectedFarmId);
  }, [selectedFarmId, loadWeatherData]);

  // ── Load Sentinel-2 Satellite telemetry (Stage 4) ─────────────────────────
  const loadSatelliteData = useCallback(async (farmId) => {
    if (!farmId) return;
    setSatelliteLoading(true);
    setSatelliteError(null);
    try {
      const data = await satelliteAPI.getFarmSatellite(farmId, 90, 25);
      if (data.source === 'error') {
        setSatelliteError(
          isTelugu
            ? 'కోపర్నికస్ శాటిలైట్ సర్వీస్ అందుబాటులో లేదు.'
            : 'Copernicus satellite service temporarily unavailable.'
        );
        setSatelliteData(null);
      } else {
        setSatelliteData(data);
        setSatelliteError(null);
      }
    } catch (err) {
      console.error('Satellite fetch error:', err);
      const msg = err?.response?.data?.detail || err.message || 'Error fetching satellite data';
      if (err?.response?.status === 422) {
        setSatelliteError(
          isTelugu
            ? 'పొలానికి GPS కోఆర్డినేట్లు లేవు. మ్యాప్ పికర్‌లో సెట్ చేయండి.'
            : 'Farm has no GPS coordinates. Set them using the map picker.'
        );
      } else {
        setSatelliteError(msg);
      }
      setSatelliteData(null);
    } finally {
      setSatelliteLoading(false);
    }
  }, [isTelugu]);

  useEffect(() => {
    loadSatelliteData(selectedFarmId);
  }, [selectedFarmId, loadSatelliteData]);

  // ── Load ML Yield & Stress Diagnosis (Stages 5 & 6) ───────────────────────
  const loadYieldAndStress = useCallback(async (farmId) => {
    if (!farmId) return;
    setLoadingYield(true);
    try {
      const [yRes, sRes] = await Promise.allSettled([
        yieldAPI.getFarmYield(farmId),
        stressAPI.getFarmStress(farmId),
      ]);
      if (yRes.status === 'fulfilled') {
        setYieldData(yRes.value);
      }
      if (sRes.status === 'fulfilled') {
        setStressData(sRes.value);
      }
    } catch (err) {
      console.error('Error fetching yield/stress telemetry:', err);
    } finally {
      setLoadingYield(false);
    }
  }, []);

  useEffect(() => {
    loadYieldAndStress(selectedFarmId);
  }, [selectedFarmId, loadYieldAndStress]);

  // ── Active Farm object ────────────────────────────────────────────────────
  const activeFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];

  // ── SMS Consent toggle ────────────────────────────────────────────────────
  const handleToggleConsent = async () => {
    setUpdatingConsent(true);
    try {
      const next = !consentStatus;
      await userAPI.updateConsent(next);
      setConsentStatus(next);
      setToastMsg(
        next
          ? (isTelugu ? 'SMS పంట సలహాలు విజయవంతంగా ప్రారంభించబడ్డాయి.' : 'SMS Advisory Alerts enabled.')
          : (isTelugu ? 'SMS హెచ్చరికలు నిలిపివేయబడ్డాయి.' : 'SMS Advisory Alerts paused.')
      );
      setTimeout(() => setToastMsg(''), 4000);
    } catch (err) {
      console.error('Consent error:', err);
    } finally {
      setUpdatingConsent(false);
    }
  };

  const handleFarmsUpdated = (newFarms) => {
    setFarms(newFarms);
    if (!newFarms.find((f) => f.id === selectedFarmId) && newFarms.length > 0) {
      setSelectedFarmId(newFarms[0].id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast */}
      {toastMsg && (
        <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-semibold shadow-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── HERO BANNER ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-700/60 text-emerald-200 text-xs px-3 py-1 rounded-full font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{isTelugu ? 'ఆంధ్రప్రదేశ్ వరి పర్యవేక్షణ వ్యవస్థ' : 'Andhra Pradesh Rice Monitoring Intelligence'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isTelugu ? `నమస్కారం, ${user.full_name} గారు` : `Welcome, ${user.full_name}`}
          </h1>
          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-emerald-200 text-xs sm:text-sm">
            <span className="flex items-center gap-1">
              <Phone className="w-4 h-4 text-amber-300" />
              <span>{user.mobile_number}</span>
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-amber-300" />
              <span>{user.village}, {user.mandal} మం., {user.district}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsManagerOpen(true)}
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-2xl shadow-lg transition transform active:scale-95"
          >
            <Layers className="w-4 h-4" />
            <span>{isTelugu ? 'పొలాల నిర్వహణ (Manage Plots)' : 'Manage Farm Plots'}</span>
            <span className="ml-1 bg-emerald-900 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
              {farms.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── FARM SELECTOR TABS ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline">
            {isTelugu ? 'పొలాన్ని ఎంచుకోండి:' : 'Select Plot:'}
          </span>
          {farms.map((f) => {
            const isSelected = f.id === selectedFarmId;
            return (
              <button
                key={f.id}
                onClick={() => setSelectedFarmId(f.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Sprout className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-emerald-700'}`} />
                <span>{f.farm_name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                  isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-600'
                }`}>
                  {f.area_acres} Ac
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsManagerOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 px-3 py-1.5 rounded-lg border border-dashed border-emerald-400 hover:bg-emerald-50 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isTelugu ? '+ కొత్త వరి చేను చేర్చండి' : '+ Add Plot'}</span>
        </button>
      </div>

      {/* ── ACTIVE PLOT SPECS ─────────────────────────────────────────────── */}
      {activeFarm && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-slate-500 text-xs font-semibold block mb-1">
              {isTelugu ? 'వరి రకం' : 'Paddy Variety'}
            </span>
            <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {activeFarm.variety || 'BPT 5204 (Samba Mahsuri)'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-slate-500 text-xs font-semibold block mb-1">
              {isTelugu ? 'విస్తీర్ణం' : 'Plot Area'}
            </span>
            <div className="text-sm sm:text-base font-bold text-slate-900">
              {activeFarm.area_acres} <span className="text-xs font-normal text-slate-500">Acres</span>
              {activeFarm.area_cents > 0 && <span className="text-xs font-normal text-slate-500"> (+{activeFarm.area_cents} Cents)</span>}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-slate-500 text-xs font-semibold block mb-1">
              {isTelugu ? 'నాటు తేదీ' : 'Sowing Date'}
            </span>
            <div className="text-sm sm:text-base font-bold text-slate-900">{activeFarm.sowing_date}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-slate-500 text-xs font-semibold block mb-1">
              {isTelugu ? 'నీటి పారుదల' : 'Irrigation Source'}
            </span>
            <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {activeFarm.irrigation_source || 'Canal Irrigation'}
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYTICS LOADING / ERROR ─────────────────────────────────────── */}
      {loadingAnalytics && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">
            {isTelugu
              ? 'ఉపగ్రహ & వాతావరణ సమాచారాన్ని సేకరిస్తున్నాము...'
              : 'Fetching real-time satellite, climate & yield telemetry...'}
          </p>
        </div>
      )}

      {analyticsError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{analyticsError}</span>
        </div>
      )}

      {/* ── STAGE 2 ANALYTICS WIDGETS GRID ───────────────────────────────── */}
      {analytics && !loadingAnalytics && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Crop Health & Stress */}
            <CropHealthStressWidget data={analytics.crop_health} lang={lang} />

            {/* 2. Weather Summary Card — now powered by real Open-Meteo data */}
            <WeatherSummaryCard
              weatherData={weatherData}
              data={analytics.weather}
              weatherLoading={weatherLoading}
              weatherError={weatherError}
              lang={langCode}
            />

            {/* 3. Satellite Observation — enhanced with real Copernicus Sentinel-2 telemetry */}
            <SatelliteObservationCard
              data={analytics.satellite}
              satelliteRealData={satelliteData}
              lang={lang}
            />

            {/* 4. Yield Prediction — powered by ML Scikit-learn on DES India statistics */}
            <YieldPredictionCard
              data={analytics.yield_prediction}
              mlYieldData={yieldData}
              farmAreaAcres={analytics.area_acres}
              lang={lang}
            />
          </div>

          {/* ── STAGE 6: ACTIONABLE NON-PESTICIDE FARMER RECOMMENDATIONS ── */}
          <div className="space-y-3">
            <FarmerRecommendationCard
              recommendations={yieldData?.recommendations || []}
              stressDiagnosis={stressData}
              lang={lang}
            />
          </div>

          {/* ── STAGE 4: COPERNICUS SENTINEL-2 VEGETATION & MOISTURE CHARTS ── */}
          <div className="space-y-3">
            <SatelliteChartsPanel
              satelliteData={satelliteData}
              loading={satelliteLoading}
              error={satelliteError}
              lang={lang}
            />
          </div>

          {/* ── STAGE 3: REAL WEATHER CHARTS ─────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                  <CloudSun className="w-5 h-5 text-sky-500" />
                  {isTelugu
                    ? 'రియల్ వాతావరణ ట్రెండ్‌లు (గత 30 రోజులు)'
                    : 'Real Weather Trends — Last 30 Days'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isTelugu
                    ? 'Open-Meteo API నుండి నిజ-సమయ వాతావరణ డేటా'
                    : 'Live data sourced from Open-Meteo API · Updated every 6 hours'}
                </p>
              </div>
              <button
                onClick={() => loadWeatherData(selectedFarmId)}
                disabled={weatherLoading}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 px-3 py-1.5 rounded-lg border border-emerald-300 hover:bg-emerald-50 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${weatherLoading ? 'animate-spin' : ''}`} />
                <span>{isTelugu ? 'రిఫ్రెష్' : 'Refresh'}</span>
              </button>
            </div>

            <WeatherChartsPanel
              weatherData={weatherData}
              loading={weatherLoading}
              error={weatherError}
              lang={langCode}
            />
          </div>

          {/* ── LEAFLET MAP ───────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  {isTelugu
                    ? 'పొలం ఉపగ్రహ మ్యాప్ & హద్దులు'
                    : 'Interactive Field Geotag & Boundary Mapping'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isTelugu
                    ? 'ఓపెన్‌స్ట్రీట్‌మ్యాప్ మరియు ఉపగ్రహ ఛాయాచిత్రాలపై మీ పొలం సరిహద్దులు'
                    : 'Satellite imagery and boundary polygon for this rice plot'}
                </p>
              </div>
              <button
                onClick={() => setIsManagerOpen(true)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
              >
                {isTelugu ? 'హద్దులను మార్చండి →' : 'Edit Boundaries →'}
              </button>
            </div>

            <FarmMapPicker
              latitude={activeFarm?.latitude}
              longitude={activeFarm?.longitude}
              boundaryPoints={activeFarm?.boundary_points}
              onChangeCoordinates={() => {}}
              onChangeBoundary={() => {}}
              isEditable={false}
              lang={lang}
              farmName={activeFarm?.farm_name}
            />
          </div>

          {/* ── SMS ADVISORY STRIP ────────────────────────────────────────── */}
          <div className="p-6 rounded-3xl bg-emerald-950 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <BellRing className="w-4 h-4" />
                <span>{isTelugu ? 'ఉచిత SMS సలహా కేంద్రం' : 'Automated Kisan SMS Advisory'}</span>
              </div>
              <h4 className="text-lg font-extrabold">
                {isTelugu
                  ? 'మీ ఫోన్‌కు పంట ఒత్తిడి మరియు తెగుళ్ల హెచ్చరికలు'
                  : 'Localized Mobile Advisories for Stem Borer & Blast'}
              </h4>
              <p className="text-xs text-emerald-200 max-w-xl">
                {isTelugu
                  ? 'శాటిలైట్ డేటాలో పంట ఒత్తిడి గుర్తించినప్పుడు వెంటనే మీ మొబైల్ సంఖ్యకు నివారణ చర్యలతో కూడిన సందేశం అందుతుంది.'
                  : 'Automated Telugu SMS alerts are dispatched whenever satellite anomaly thresholds or blast weather triggers occur.'}
              </p>
            </div>

            <button
              onClick={handleToggleConsent}
              disabled={updatingConsent}
              className={`px-6 py-3 rounded-2xl text-xs font-extrabold transition shadow-md whitespace-nowrap ${
                consentStatus
                  ? 'bg-amber-400 hover:bg-amber-300 text-emerald-950'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {updatingConsent ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating...</span>
                </span>
              ) : (
                consentStatus
                  ? (isTelugu ? 'SMS హెచ్చరికలు క్రియాశీలం (Pause)' : 'SMS Active (Click to Pause)')
                  : (isTelugu ? 'SMS ప్రారంభించండి (Activate)' : 'Activate SMS Alerts')
              )}
            </button>
          </div>

          {/* ── SMS ALERT AUDIT TRAIL (Stage 7 & 8) ─────────────────────────── */}
          <SMSHistoryPanel
            smsHistory={smsHistory}
            lang={lang}
            onRefresh={loadSmsHistory}
          />
        </>
      )}

      {/* ── FARM MANAGER MODAL ────────────────────────────────────────────── */}
      <FarmManagerModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        farms={farms}
        selectedFarmId={selectedFarmId}
        onSelectFarm={(fid) => setSelectedFarmId(fid)}
        onFarmsUpdated={handleFarmsUpdated}
        lang={lang}
      />
    </div>
  );
}
