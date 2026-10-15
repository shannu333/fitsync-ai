import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const TEXT = {
  Telugu: {
    title: 'ఆంధ్రప్రదేశ్ వరి పర్యవేక్షణ - అడ్మినిస్ట్రేటర్ డాష్‌బోర్డ్',
    subtitle: 'రాష్ట్రవ్యాప్త రైతులు, పొలాలు, API స్ట్రీమ్‌లు మరియు ఆటోమేటెడ్ SMS నిఘా విశ్లేషణ',
    refresh: 'రిఫ్రెష్ చేయండి',
    triggerCycle: 'నిఘా రౌండ్ ప్రారంభించు',
    runningCycle: 'నిఘా నడుస్తోంది...',
    statsOverview: 'రాష్ట్ర గణాంకాలు',
    apiHealth: 'API స్ట్రీమ్ స్థితి & ప్రతిస్పందన సమయం',
    schedulerStatus: 'నేపథ్య షెడ్యూలర్ స్థితి (APScheduler)',
    failedSms: 'విఫలమైన / వేచి ఉన్న SMS ఆడిట్ లాగ్',
    farmerDirectory: 'నమోదైన రైతుల జాబితా',
    totalUsers: 'మొత్తం రైతులు',
    totalFarms: 'మొత్తం పొలాలు',
    totalAcres: 'సాగు విస్తీర్ణం (ఎకరాలు)',
    activeConsents: 'SMS సమ్మతులు (ఆప్ట్-ఇన్)',
    totalAlerts: 'మొత్తం పంపిన SMSలు',
    failedAlerts: 'విఫలమైన హెచ్చరికలు',
    districtBreakdown: 'జిల్లాల వారీగా రైతులు & పొలాలు',
    stressBreakdown: 'ఒత్తిడి రకాల విశ్లేషణ',
    testApis: 'API లను మళ్లీ పరీక్షించు',
    testing: 'పరీక్షిస్తోంది...',
    allDistricts: 'అన్ని జిల్లాలు',
    colName: 'రైతు పేరు',
    colMobile: 'మొబైల్',
    colDistrict: 'జిల్లా',
    colLocation: 'మండలం / గ్రామం',
    colFarms: 'పొలాలు',
    colLang: 'భాష',
    colConsent: 'SMS సమ్మతి',
    colDate: 'తేదీ & సమయం',
    colCategory: 'ఒత్తిడి రకం',
    colStatus: 'స్థితి',
    colReason: 'కారణం / గేట్‌వే రెస్పాన్స్',
    noFailedSms: 'ప్రస్తుతం విఫలమైన లేదా వేచి ఉన్న SMSలు లేవు. వ్యవస్థ సజావుగా పనిచేస్తోంది!',
    disclaimer: 'అధికారిక ఉపయోగం మాత్రమే: ఈ పేజీ ఆంధ్రప్రదేశ్ వ్యవసాయ శాఖ సాంకేతిక పర్యవేక్షకుల కోసం రూపొందించబడింది.',
  },
  English: {
    title: 'RicePulse AP — Administrator Surveillance Dashboard',
    subtitle: 'Statewide farmer analytics, real-time satellite/weather API streams & automated SMS audit',
    refresh: 'Refresh All',
    triggerCycle: 'Trigger Surveillance Cycle',
    runningCycle: 'Running Cycle...',
    statsOverview: 'Statewide Overview',
    apiHealth: 'External API Stream Health & Latency',
    schedulerStatus: 'Background Scheduler Surveillance (APScheduler)',
    failedSms: 'Failed / Queued SMS Audit Log',
    farmerDirectory: 'Registered Farmer Directory',
    totalUsers: 'Registered Farmers',
    totalFarms: 'Mapped Rice Plots',
    totalAcres: 'Total Cultivated Acres',
    activeConsents: 'SMS Consents (Opt-in)',
    totalAlerts: 'Total SMS Dispatched',
    failedAlerts: 'Failed Deliveries',
    districtBreakdown: 'Farmers & Plots by AP District',
    stressBreakdown: 'Stress Anomalies by Category',
    testApis: 'Re-test API Streams',
    testing: 'Testing Streams...',
    allDistricts: 'All Districts',
    colName: 'Farmer Name',
    colMobile: 'Mobile',
    colDistrict: 'District',
    colLocation: 'Mandal / Village',
    colFarms: 'Plots',
    colLang: 'Language',
    colConsent: 'SMS Opt-in',
    colDate: 'Date & Time',
    colCategory: 'Stress Category',
    colStatus: 'Status',
    colReason: 'Failure Reason / Gateway Response',
    noFailedSms: 'No failed or queued SMS alerts recorded. All deliveries nominal!',
    disclaimer: 'Restricted Access: Authorized agricultural extension officers and system administrators only.',
  }
};

const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

export default function AdminDashboard({ lang = 'Telugu', onBackToFarmerDashboard }) {
  const t = TEXT[lang] || TEXT.English;

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [apiHealth, setApiHealth] = useState(null);
  const [schedulerInfo, setSchedulerInfo] = useState(null);
  const [failedSms, setFailedSms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testingApis, setTestingApis] = useState(false);
  const [triggeringCycle, setTriggeringCycle] = useState(false);
  const [cycleResult, setCycleResult] = useState(null);
  const [error, setError] = useState(null);

  const loadAllAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes, healthRes, schedRes, failedRes] = await Promise.allSettled([
        adminAPI.getStats(),
        adminAPI.getUsers(50, 0),
        adminAPI.getApiHealth(),
        adminAPI.getSchedulerStatus(),
        adminAPI.getFailedSms(50),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value?.users || []);
      if (healthRes.status === 'fulfilled') setApiHealth(healthRes.value);
      if (schedRes.status === 'fulfilled') setSchedulerInfo(schedRes.value);
      if (failedRes.status === 'fulfilled') setFailedSms(failedRes.value?.logs || []);

      if (statsRes.status === 'rejected') {
        setError(statsRes.reason?.response?.data?.detail || 'Failed to load administrator statistics. Please ensure you are logged in as an authorized admin.');
      }
    } catch (err) {
      setError(err?.message || 'An unexpected error occurred loading admin telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const handleTestApis = async () => {
    setTestingApis(true);
    try {
      const res = await adminAPI.getApiHealth();
      setApiHealth(res);
    } catch (err) {
      console.error('Failed to test APIs:', err);
    } finally {
      setTestingApis(false);
    }
  };

  const handleTriggerCycle = async () => {
    setTriggeringCycle(true);
    setCycleResult(null);
    try {
      const res = await adminAPI.triggerCycle();
      setCycleResult(res);
      // Refresh stats and SMS log after cycle
      loadAllAdminData();
    } catch (err) {
      alert('Error triggering monitoring cycle: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setTriggeringCycle(false);
    }
  };

  // Prepare chart data for district distribution
  const districtChartData = React.useMemo(() => {
    if (!stats?.districts_list) return [];
    return stats.districts_list.map((dist) => ({
      name: dist,
      farmers: stats.users_by_district?.[dist] || 0,
      farms: stats.farms_by_district?.[dist] || 0,
    }));
  }, [stats]);

  // Prepare pie data for stress categories
  const stressPieData = React.useMemo(() => {
    if (!stats?.alerts_by_stress_category) return [];
    return Object.entries(stats.alerts_by_stress_category).map(([name, value]) => ({
      name,
      value,
    }));
  }, [stats]);

  if (loading && !stats) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-emerald-800">
          అడ్మినిస్ట్రేటర్ టెలిమెట్రీ లోడ్ అవుతోంది... (Loading Admin Telemetry)
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{t.title}</h1>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
              Admin Mode
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onBackToFarmerDashboard && (
            <button
              onClick={onBackToFarmerDashboard}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 transition flex items-center gap-1.5"
            >
              <span>←</span>
              <span>{lang === 'Telugu' ? 'రైతు డాష్‌బోర్డ్' : 'Farmer View'}</span>
            </button>
          )}

          <button
            onClick={loadAllAdminData}
            disabled={loading}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-2 rounded-xl border border-emerald-300 transition flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>{t.refresh}</span>
          </button>

          <button
            onClick={handleTriggerCycle}
            disabled={triggeringCycle}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>⚡</span>
            <span>{triggeringCycle ? t.runningCycle : t.triggerCycle}</span>
          </button>
        </div>
      </div>

      {/* Error or Alert banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-red-600 hover:text-red-800">✕</button>
        </div>
      )}

      {/* Manual Trigger Result Notification */}
      {cycleResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold">
              ✅ నిఘా రౌండ్ విజయవంతంగా పూర్తయింది (Surveillance Cycle Finished)
            </span>
            <button onClick={() => setCycleResult(null)} className="text-emerald-700 font-bold">✕</button>
          </div>
          <div className="flex flex-wrap gap-4 text-emerald-800 pt-1">
            <span>పొలాలు పరిశీలించినవి: <strong>{cycleResult.farms_scanned}</strong></span>
            <span>మూల్యాంకనం: <strong>{cycleResult.alerts_evaluated}</strong></span>
            <span>పంపిన SMS: <strong>{cycleResult.sms_sent}</strong></span>
            <span>కూల్‌డౌన్ స్కిప్: <strong>{cycleResult.sms_skipped_cooldown}</strong></span>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-slate-400 text-xs">👥</span>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-1">{t.totalUsers}</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{stats.total_users}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-slate-400 text-xs">🌾</span>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-1">{t.totalFarms}</p>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">{stats.total_farms}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-slate-400 text-xs">📐</span>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-1">{t.totalAcres}</p>
            <p className="text-2xl font-black text-teal-700 mt-0.5">{stats.total_area_acres}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-slate-400 text-xs">✍️</span>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-1">{t.activeConsents}</p>
            <p className="text-2xl font-black text-blue-700 mt-0.5">{stats.active_sms_consents}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-slate-400 text-xs">📨</span>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-1">{t.totalAlerts}</p>
            <p className="text-2xl font-black text-indigo-700 mt-0.5">{stats.total_sms_alerts}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-slate-400 text-xs">⚠️</span>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-1">{t.failedAlerts}</p>
            <p className={`text-2xl font-black mt-0.5 ${stats.failed_sms_count > 0 ? 'text-red-600' : 'text-slate-400'}`}>
              {stats.failed_sms_count}
            </p>
          </div>
        </div>
      )}

      {/* Row: API Health Streams & APScheduler Engine Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* API Stream Telemetry (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌐</span>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">{t.apiHealth}</h3>
            </div>
            <button
              onClick={handleTestApis}
              disabled={testingApis}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-lg border border-slate-300 font-semibold transition disabled:opacity-50"
            >
              {testingApis ? t.testing : t.testApis}
            </button>
          </div>

          {apiHealth ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(apiHealth.streams || {}).map(([key, stream]) => {
                const isUp = stream.status === 'UP';
                return (
                  <div
                    key={key}
                    className={`p-4 rounded-xl border ${
                      isUp ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/60 border-red-200'
                    } space-y-2`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-bold text-xs text-slate-800 leading-snug">{stream.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isUp ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                        }`}
                      >
                        {stream.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2">{stream.details || stream.error}</p>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Latency:</span>
                      <span className="font-bold text-slate-700">
                        {stream.latency_ms ? `${stream.latency_ms} ms` : 'N/A'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
              API health data loading...
            </div>
          )}

          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2">
            <span>Overall Gateway Health: <strong className="text-emerald-700">{apiHealth?.overall_status || 'OPTIMAL'}</strong></span>
            <span>Last checked: {apiHealth?.checked_at ? new Date(apiHealth.checked_at).toLocaleTimeString() : 'Just now'}</span>
          </div>
        </div>

        {/* APScheduler Background Worker Info (1 col) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⏱️</span>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">{t.schedulerStatus}</h3>
            </div>

            {schedulerInfo ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium">Worker Status:</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    schedulerInfo.scheduler_running ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {schedulerInfo.scheduler_running ? 'ACTIVE (RUNNING)' : 'STOPPED'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium">Cadence:</span>
                  <span className="font-bold text-slate-800">Every 6 Hours (Automatic)</span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-slate-600 font-medium block">Active Surveillance Jobs:</span>
                  {(schedulerInfo.jobs || []).map((j) => (
                    <div key={j.id} className="text-[11px] font-mono text-slate-700 flex justify-between">
                      <span>{j.name}</span>
                      <span className="text-emerald-700">Next: {j.next_run_time ? new Date(j.next_run_time).toLocaleTimeString() : 'Pending'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Loading scheduler state...</p>
            )}
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-snug">
            🛡️ Non-blocking background worker processes Sentinel-2 optical bands and Open-Meteo feeds without stalling farmer API queries.
          </div>
        </div>
      </div>

      {/* Row: Statewide Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* District Distribution Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">{t.districtBreakdown}</h3>
            <span className="text-[11px] text-slate-500 font-medium">{t.allDistricts}</span>
          </div>

          <div className="h-64 w-full">
            {districtChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districtChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', fontSize: '11px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="farmers" name="Registered Farmers" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="farms" name="Mapped Rice Farms" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No district farm distribution data yet.
              </div>
            )}
          </div>
        </div>

        {/* Stress Anomalies Pie Chart (1 col) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">{t.stressBreakdown}</h3>

          <div className="h-64 w-full flex items-center justify-center">
            {stressPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stressPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={40}
                    paddingAngle={3}
                  >
                    {stressPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', fontSize: '11px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs">
                <span>📊</span>
                <p className="mt-1">Routine advisories active. No severe anomalies recorded.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row: Failed / Queued SMS Audit Log */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-2">
        <div className="bg-gradient-to-r from-red-900 to-rose-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <h3 className="font-bold text-sm sm:text-base">{t.failedSms}</h3>
              <p className="text-red-200/80 text-xs">Automated delivery verification & gateway audit trail</p>
            </div>
          </div>
          <span className="bg-red-500/30 text-red-200 text-xs px-2.5 py-0.5 rounded-full font-bold border border-red-400/30">
            {failedSms.length} Records
          </span>
        </div>

        {failedSms.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            <span className="text-2xl block mb-1">🎉</span>
            <p className="font-semibold text-slate-700">{t.noFailedSms}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4">{t.colDate}</th>
                  <th className="py-2.5 px-4">{t.colMobile}</th>
                  <th className="py-2.5 px-4">{t.colCategory}</th>
                  <th className="py-2.5 px-4">{t.colStatus}</th>
                  <th className="py-2.5 px-4">{t.colReason}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {failedSms.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-800">{log.mobile_number}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-700">{log.stress_category}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                        {log.delivery_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 truncate max-w-sm">
                      {log.gateway_response || 'Gateway timeout or cooldown limit active'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row: Farmer Directory Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">{t.farmerDirectory}</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Showing {users.length} farmers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">{t.colName}</th>
                <th className="py-3 px-4">{t.colMobile}</th>
                <th className="py-3 px-4">{t.colDistrict}</th>
                <th className="py-3 px-4">{t.colLocation}</th>
                <th className="py-3 px-4">{t.colFarms}</th>
                <th className="py-3 px-4">{t.colLang}</th>
                <th className="py-3 px-4">{t.colConsent}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-800">{u.full_name}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{u.mobile_number}</td>
                  <td className="py-3 px-4 font-semibold text-emerald-800">{u.district}</td>
                  <td className="py-3 px-4 text-slate-600">{u.mandal} / {u.village}</td>
                  <td className="py-3 px-4">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold text-[10px]">
                      {u.farm_count} {lang === 'Telugu' ? 'పొలాలు' : 'Plots'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-600">{u.preferred_language}</span>
                  </td>
                  <td className="py-3 px-4">
                    {u.sms_consent ? (
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        Opted-In ✅
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Disclaimer Footer */}
      <div className="text-center text-[11px] text-slate-400 py-3">
        {t.disclaimer}
      </div>
    </div>
  );
}
