import React, { useState, useEffect } from 'react';
import { 
  Sprout, 
  MapPin, 
  Phone, 
  Lock, 
  User, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Crosshair, 
  Layers, 
  Droplets,
  ShieldCheck,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { authAPI, geoAPI } from '../api';
import FarmMapPicker from './FarmMapPicker';

export default function Register({ onRegisterSuccess, onSwitchToLogin, lang }) {
  const isTelugu = lang === 'Telugu';

  // Geographic state
  const [districts, setDistricts] = useState([]);
  const [mandals, setMandals] = useState([]);
  const [villages, setVillages] = useState([]);
  const [riceVarieties, setRiceVarieties] = useState([]);
  const [soilTypes, setSoilTypes] = useState([]);
  const [irrigationSources, setIrrigationSources] = useState([]);
  
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingMandals, setLoadingMandals] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    mobile_number: '',
    password: '',
    confirm_password: '',
    district: '',
    mandal: '',
    village: '',
    custom_village: '',
    preferred_language: lang,
    
    // Farm details
    farm_name: 'వరి పొలం (Main Rice Plot)',
    variety: 'BPT 5204 (Samba Mahsuri)',
    area_acres: '2.5',
    area_cents: '0',
    latitude: '',
    longitude: '',
    sowing_date: new Date().toISOString().split('T')[0],
    soil_type: 'Alluvial Soil (ఒండ్రు నేల)',
    irrigation_source: 'Canal Irrigation (కాలువ నీరు - Godavari/Krishna/Pennar)',
    
    // SMS Consent
    sms_consent: true,
    boundary_points: [],
  });

  const [showMap, setShowMap] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load AP Metadata on component mount
  useEffect(() => {
    async function loadMetadata() {
      setLoadingGeo(true);
      try {
        const meta = await geoAPI.getMetadata();
        setDistricts(meta.districts || []);
        setRiceVarieties(meta.rice_varieties || []);
        setSoilTypes(meta.soil_types || []);
        setIrrigationSources(meta.irrigation_sources || []);

        // Default select East Godavari if available
        if (meta.districts && meta.districts.length > 0) {
          const defaultDist = meta.districts[0].name;
          setFormData(prev => ({ ...prev, district: defaultDist }));
          loadMandalsForDistrict(defaultDist);
        }
      } catch (err) {
        console.error("Failed to load AP geographic metadata:", err);
      } finally {
        setLoadingGeo(false);
      }
    }
    loadMetadata();
  }, []);

  // Update preferred language in form when lang changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, preferred_language: lang }));
  }, [lang]);

  // Load mandals when district changes
  const loadMandalsForDistrict = async (districtName) => {
    if (!districtName) return;
    setLoadingMandals(true);
    setMandals([]);
    setVillages([]);
    try {
      const data = await geoAPI.getMandals(districtName);
      setMandals(data || []);
      if (data && data.length > 0) {
        const firstMandal = data[0].name;
        setFormData(prev => ({ ...prev, mandal: firstMandal, village: '' }));
        loadVillagesForMandal(districtName, firstMandal);
      }
    } catch (err) {
      console.error("Failed to fetch mandals:", err);
    } finally {
      setLoadingMandals(false);
    }
  };

  // Load villages when mandal changes
  const loadVillagesForMandal = async (districtName, mandalName) => {
    if (!districtName || !mandalName) return;
    setLoadingVillages(true);
    setVillages([]);
    try {
      const data = await geoAPI.getVillages(districtName, mandalName);
      setVillages(data || []);
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, village: data[0] }));
      }
    } catch (err) {
      console.error("Failed to fetch villages:", err);
    } finally {
      setLoadingVillages(false);
    }
  };

  const handleDistrictChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, district: val, mandal: '', village: '' }));
    loadMandalsForDistrict(val);
  };

  const handleMandalChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, mandal: val, village: '' }));
    loadVillagesForMandal(formData.district, val);
  };

  // Browser GPS auto-detection
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert(isTelugu ? "మీ బ్రౌజర్ GPS ని సపోర్ట్ చేయదు." : "Geolocation is not supported by your browser.");
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        setDetectingGps(false);
      },
      (err) => {
        console.warn("GPS detection error, using standard AP delta coordinates:", err);
        // Fallback to average AP agricultural zone coordinates (East Godavari 16.9891, 81.7840)
        setFormData(prev => ({
          ...prev,
          latitude: '16.989065',
          longitude: '81.784012'
        }));
        setDetectingGps(false);
      },
      { timeout: 7000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!formData.full_name.trim()) {
      setError(isTelugu ? "దయచేసి రైతు పేరును నమోదు చేయండి." : "Please enter farmer's full name.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(formData.mobile_number.trim())) {
      setError(isTelugu ? "చెల్లుబాటు అయ్యే 10 అంకెల మొబైల్ సంఖ్యను నమోదు చేయండి (6, 7, 8, 9 తో ప్రారంభం కావాలి)." : "Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      return;
    }
    if (formData.password.length < 6) {
      setError(isTelugu ? "పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి." : "Password must be at least 6 characters.");
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setError(isTelugu ? "పాస్‌వర్డ్‌లు సరిపోలడం లేదు." : "Passwords do not match.");
      return;
    }
    if (!formData.district || !formData.mandal) {
      setError(isTelugu ? "దయచేసి జిల్లా మరియు మండలాన్ని ఎంచుకోండి." : "Please select district and mandal.");
      return;
    }
    const finalVillage = formData.village === 'OTHER' ? formData.custom_village : formData.village;
    if (!finalVillage) {
      setError(isTelugu ? "దయచేసి గ్రామం పేరును నమోదు చేయండి." : "Please select or enter village name.");
      return;
    }
    if (!formData.area_acres || parseFloat(formData.area_acres) <= 0) {
      setError(isTelugu ? "దయచేసి సరైన పొలం విస్తీర్ణాన్ని (ఎకరాలు) నమోదు చేయండి." : "Please enter valid farm area in acres.");
      return;
    }
    if (!formData.sowing_date) {
      setError(isTelugu ? "దయచేసి వరి నాటు వేసిన తేదీని ఎంచుకోండి." : "Please select sowing date.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: formData.full_name.trim(),
        mobile_number: formData.mobile_number.trim(),
        password: formData.password,
        district: formData.district,
        mandal: formData.mandal,
        village: finalVillage,
        preferred_language: formData.preferred_language,
        farm_name: formData.farm_name,
        variety: formData.variety,
        area_acres: parseFloat(formData.area_acres),
        area_cents: parseFloat(formData.area_cents || 0),
        latitude: formData.latitude ? parseFloat(formData.latitude) : 16.9890,
        longitude: formData.longitude ? parseFloat(formData.longitude) : 81.7840,
        sowing_date: formData.sowing_date,
        soil_type: formData.soil_type,
        irrigation_source: formData.irrigation_source,
        sms_consent: formData.sms_consent
      };

      const result = await authAPI.register(payload);
      if (onRegisterSuccess) {
        onRegisterSuccess(result.user);
      }
    } catch (err) {
      console.error("Registration error:", err);
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
          ? detail[0]?.msg || "Validation error"
          : isTelugu ? "నమోదు విఫలమైంది. దయచేసి వివరాలను సరిచూసుకోండి." : "Registration failed. Please check your inputs."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Title & Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-700/80 text-emerald-100 text-xs px-3 py-1 rounded-full font-medium mb-3">
            <Sprout className="w-3.5 h-3.5 text-amber-400" />
            <span>{isTelugu ? "ఆంధ్రప్రదేశ్ వరి రైతు నమోదు వేదిక" : "AP Rice Cultivator Registration Portal"}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isTelugu ? "నూతన రైతు నమోదు & పొలం అనుసంధానం" : "Farmer Registration & Farm Geotagging"}
          </h2>
          <p className="mt-2 text-emerald-200 text-sm sm:text-base max-w-2xl">
            {isTelugu 
              ? "మీ వరి పంట విస్తీర్ణం, రకం మరియు నాటు తేదీని నమోదు చేసి కృత్రిమ మేధస్సు (AI) ద్వారా ముందస్తు ఒత్తిడి హెచ్చరికలు & ఉచిత SMS సలహాలను పొందండి."
              : "Register your paddy plot, variety, and sowing timeline to unlock AI-powered early crop stress alerts and automated SMS advisories."}
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-10 translate-y-10">
          <Sprout className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* Main Registration Form Card */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECTION 1: FARMER PERSONAL & CREDENTIALS */}
          <div className="border-b border-slate-200 pb-6">
            <div className="flex items-center gap-2 mb-4 text-emerald-800">
              <User className="w-5 h-5" />
              <h3 className="text-lg font-bold">
                {isTelugu ? "1. రైతు ప్రాథమిక వివరాలు (Farmer Details)" : "1. Farmer Personal Details"}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {isTelugu ? "పూర్తి పేరు *" : "Full Name *"}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder={isTelugu ? "ఉదా: రావులపాటి వెంకటేశ్వరరావు" : "e.g. Venkata Ramanamurthy"}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {isTelugu ? "మొబైల్ సంఖ్య (10 అంకెలు) *" : "Mobile Number (10 digits) *"}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={formData.mobile_number}
                    onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value.replace(/\D/g, '') })}
                    placeholder="9876543210"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
                <span className="text-xs text-slate-500 mt-1 block">
                  {isTelugu ? "ఈ సంఖ్యకు పంట సలహా SMS వస్తుంది" : "SMS crop alerts will be delivered to this number"}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {isTelugu ? "పాస్‌వర్డ్ (కనీసం 6 అక్షరాలు) *" : "Password (min 6 characters) *"}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {isTelugu ? "పాస్‌వర్డ్ నిర్ధారణ *" : "Confirm Password *"}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {isTelugu ? "ఇష్టపడే భాష *" : "Preferred Language *"}
                </label>
                <select
                  value={formData.preferred_language}
                  onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="Telugu">తెలుగు (Telugu - Recommended)</option>
                  <option value="English">English</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: ANDHRA PRADESH ADMINISTRATIVE LOCATION */}
          <div className="border-b border-slate-200 pb-6">
            <div className="flex items-center gap-2 mb-4 text-emerald-800">
              <MapPin className="w-5 h-5" />
              <h3 className="text-lg font-bold">
                {isTelugu ? "2. ఆంధ్రప్రదేశ్ ప్రాంత వివరాలు (AP Administrative Location)" : "2. Andhra Pradesh Administrative Location"}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* District Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {isTelugu ? "జిల్లా (District) *" : "District *"}
                </label>
                <select
                  value={formData.district}
                  onChange={handleDistrictChange}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="">{isTelugu ? "-- జిల్లాను ఎంచుకోండి --" : "-- Select District --"}</option>
                  {districts.map((d) => (
                    <option key={d.code} value={d.name}>
                      {d.name} {d.name_te ? `(${d.name_te})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mandal Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {isTelugu ? "మండలం (Mandal) *" : "Mandal *"}
                  {loadingMandals && <span className="ml-2 text-emerald-600 font-normal">Loading...</span>}
                </label>
                <select
                  value={formData.mandal}
                  onChange={handleMandalChange}
                  disabled={!formData.district || loadingMandals}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white disabled:bg-slate-100"
                >
                  <option value="">{isTelugu ? "-- మండలాన్ని ఎంచుకోండి --" : "-- Select Mandal --"}</option>
                  {mandals.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} {m.name_te ? `(${m.name_te})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Village Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {isTelugu ? "గ్రామం (Village) *" : "Village *"}
                  {loadingVillages && <span className="ml-2 text-emerald-600 font-normal">Loading...</span>}
                </label>
                <select
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  disabled={!formData.mandal || loadingVillages}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white disabled:bg-slate-100"
                >
                  <option value="">{isTelugu ? "-- గ్రామాన్ని ఎంచుకోండి --" : "-- Select Village --"}</option>
                  {villages.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                  <option value="OTHER">{isTelugu ? "+ ఇతర గ్రామం (ఇక్కడ టైప్ చేయండి)" : "+ Other Village (Enter manually)"}</option>
                </select>

                {formData.village === 'OTHER' && (
                  <input
                    type="text"
                    required
                    value={formData.custom_village}
                    onChange={(e) => setFormData({ ...formData, custom_village: e.target.value })}
                    placeholder={isTelugu ? "గ్రామం పేరు నమోదు చేయండి" : "Type your village name"}
                    className="w-full mt-2 px-3 py-1.5 text-sm border border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: RICE CROP & PLOT ATTRIBUTES */}
          <div className="border-b border-slate-200 pb-6">
            <div className="flex items-center gap-2 mb-4 text-emerald-800">
              <Sprout className="w-5 h-5" />
              <h3 className="text-lg font-bold">
                {isTelugu ? "3. వరి పంట & పొలం వివరాలు (Rice Plot Parameters)" : "3. Rice Crop & Farm Parameters"}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Rice Variety */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {isTelugu ? "వరి రకం (Paddy Variety) *" : "Rice Variety *"}
                </label>
                <select
                  value={formData.variety}
                  onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                >
                  {riceVarieties.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.duration_days} days)
                    </option>
                  ))}
                  <option value="Other High-Yielding Rice Variety">Other AP Rice Variety</option>
                </select>
              </div>

              {/* Farm Area (Acres & Cents) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {isTelugu ? "పొలం విస్తీర్ణం (Area) *" : "Farm Area (Acres & Cents) *"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.25"
                      min="0.1"
                      required
                      value={formData.area_acres}
                      onChange={(e) => setFormData({ ...formData, area_acres: e.target.value })}
                      placeholder="Acres"
                      className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-2.5 top-2.5 text-xs font-semibold text-slate-400">
                      {isTelugu ? "ఎక." : "Ac"}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="99"
                      value={formData.area_cents}
                      onChange={(e) => setFormData({ ...formData, area_cents: e.target.value })}
                      placeholder="Cents"
                      className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-2.5 top-2.5 text-xs font-semibold text-slate-400">
                      {isTelugu ? "సెం." : "Ct"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sowing / Transplantation Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {isTelugu ? "వరి నాటు / విత్తనం వేసిన తేదీ *" : "Sowing / Transplanting Date *"}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={formData.sowing_date}
                    onChange={(e) => setFormData({ ...formData, sowing_date: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <span className="text-xs text-slate-500 mt-1 block">
                  {isTelugu ? "దిగుబడి మరియు పంట పెరుగుదల దశ అంచనాకు అవసరం" : "Used to track crop growth stage and predict yield"}
                </span>
              </div>

              {/* Soil Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {isTelugu ? "నేల రకం (Soil Classification)" : "Soil Classification"}
                </label>
                <select
                  value={formData.soil_type}
                  onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-xs"
                >
                  {soilTypes.map((st) => (
                    <option key={st.id} value={st.name}>{st.name}</option>
                  ))}
                </select>
              </div>

              {/* Irrigation Source */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {isTelugu ? "నీటి పారుదల వనరు (Irrigation)" : "Irrigation Source"}
                </label>
                <select
                  value={formData.irrigation_source}
                  onChange={(e) => setFormData({ ...formData, irrigation_source: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-xs"
                >
                  {irrigationSources.map((ir) => (
                    <option key={ir.id} value={ir.name}>{ir.name}</option>
                  ))}
                </select>
              </div>

              {/* GPS Coordinates Geotagging */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    {isTelugu ? "పొలం GPS కోఆర్డినేట్స్" : "Farm GPS Geotag"}
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={detectingGps}
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
                  >
                    {detectingGps ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Crosshair className="w-3 h-3" />
                    )}
                    <span>{detectingGps ? "Detecting..." : (isTelugu ? "GPS తీసుకోండి" : "Detect GPS")}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Latitude (16.xxxx)"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Longitude (81.xxxx)"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowMap(!showMap)}
                  className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{showMap ? (isTelugu ? "మ్యాప్ దాచండి" : "Hide Map") : (isTelugu ? "మ్యాప్‌లో గుర్తించండి (Open Map)" : "Open Map to Pin & Draw")}</span>
                </button>
              </div>
            </div>

            {/* Collapsible Leaflet Map */}
            {showMap && (
              <div className="mt-4 pt-3 border-t border-slate-200">
                <FarmMapPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  boundaryPoints={formData.boundary_points}
                  onChangeCoordinates={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))}
                  onChangeBoundary={(pts) => setFormData(prev => ({ ...prev, boundary_points: pts }))}
                  isEditable={true}
                  lang={lang}
                  farmName={formData.farm_name}
                />
              </div>
            )}
          </div>

          {/* SECTION 4: SMS ADVISORY CONSENT */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="sms_consent"
                checked={formData.sms_consent}
                onChange={(e) => setFormData({ ...formData, sms_consent: e.target.checked })}
                className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="sms_consent" className="text-sm cursor-pointer select-none">
                <span className="font-bold text-emerald-900 block mb-1">
                  {isTelugu 
                    ? "ఉచిత పంట రక్షణ & వాతావరణ SMS హెచ్చరికల సమ్మతి (SMS Advisory Consent) *"
                    : "Free Paddy Stress & Weather SMS Alert Consent *"}
                </span>
                <span className="text-emerald-800 text-xs block leading-relaxed">
                  {isTelugu
                    ? "నా వరి పొలానికి సంబంధించి కాండం తొలుచు పురుగు (Stem Borer), అగ్గి తెగులు (Blast), వర్షపాత హెచ్చరికలు మరియు ఎరువుల మోతాదు సమాచారాన్ని తెలుగులో మొబైల్ SMS ద్వారా అందుకోవడానికి నేను సమ్మతిస్తున్నాను."
                    : "I agree to receive localized crop advisories via SMS in Telugu regarding pest attacks (Stem Borer, Blast, BPH), rainfall forecasts, and fertilizer schedules based on my sowing date."}
                </span>
              </label>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition order-2 sm:order-1"
            >
              {isTelugu ? "ఇప్పటికే ఖాతా ఉందా? ఇక్కడ లాగిన్ అవ్వండి →" : "Already registered? Login here →"}
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg transition transform active:scale-95 disabled:opacity-50 order-1 sm:order-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isTelugu ? "నమోదు అవుతోంది..." : "Registering Farmer..."}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{isTelugu ? "రైతు ఖాతా సృష్టించండి" : "Complete Registration"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
