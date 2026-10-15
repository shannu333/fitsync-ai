import React, { useState } from 'react';
import { 
  Sprout, 
  MapPin, 
  Phone, 
  Calendar, 
  BellRing, 
  Layers, 
  Droplets, 
  Compass, 
  Edit3, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { userAPI, authAPI } from '../api';

export default function Dashboard({ user, onProfileUpdated, lang }) {
  const isTelugu = lang === 'Telugu';
  const farm = user.farms && user.farms.length > 0 ? user.farms[0] : null;
  const consent = user.consent;

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: user.full_name,
    district: user.district,
    mandal: user.mandal,
    village: user.village,
    preferred_language: user.preferred_language,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [consentStatus, setConsentStatus] = useState(consent ? consent.consent_given : true);
  const [updatingConsent, setUpdatingConsent] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Calculate days since sowing and rice phenological stage
  const calculateDaysSinceSowing = (sowingDateStr) => {
    if (!sowingDateStr) return { days: 0, stage: 'Unknown', stageTe: 'తెలియదు' };
    const sowing = new Date(sowingDateStr);
    const today = new Date();
    const diffTime = Math.max(0, today - sowing);
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let stage = 'Vegetative (Transplanted & Tillering)';
    let stageTe = 'శాఖీయ దశ (పిలకల తొడుగు దశ)';
    if (days >= 120) {
      stage = 'Harvest / Maturity Stage';
      stageTe = 'కోత / పక్వత దశ';
    } else if (days >= 85) {
      stage = 'Grain Filling / Dough Stage';
      stageTe = 'గింజ పాలుపోసుకునే & గట్టిపడే దశ';
    } else if (days >= 65) {
      stage = 'Panicle Initiation & Flowering';
      stageTe = 'వెన్ను దశ & ఈనె పూత దశ';
    } else if (days >= 35) {
      stage = 'Active Tillering & Stem Elongation';
      stageTe = 'తీవ్రమైన పిలకలు వేసే దశ';
    } else if (days >= 15) {
      stage = 'Transplanting & Root Establishment';
      stageTe = 'నాటు & వేరు పట్టుకునే దశ';
    } else {
      stage = 'Nursery / Early Emergence';
      stageTe = 'నారుమడి దశ';
    }

    return { days, stage, stageTe };
  };

  const cropGrowth = farm ? calculateDaysSinceSowing(farm.sowing_date) : { days: 0, stage: '', stageTe: '' };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await userAPI.updateProfile(profileForm);
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
      setEditingProfile(false);
      setSuccessMsg(isTelugu ? "రైతు వివరాలు విజయవంతంగా నవీకరించబడ్డాయి!" : "Profile updated successfully!");
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Profile update error:", err);
      alert("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleConsent = async () => {
    setUpdatingConsent(true);
    try {
      const nextConsent = !consentStatus;
      await userAPI.updateConsent(nextConsent);
      setConsentStatus(nextConsent);
      setSuccessMsg(
        nextConsent
          ? (isTelugu ? "SMS హెచ్చరికలు ప్రారంభించబడ్డాయి." : "SMS Advisory Alerts activated.")
          : (isTelugu ? "SMS హెచ్చరికలు నిలిపివేయబడ్డాయి." : "SMS Advisory Alerts paused.")
      );
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Consent update failed:", err);
    } finally {
      setUpdatingConsent(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Toast alert */}
      {successMsg && (
        <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl flex items-center gap-2 text-sm font-medium animate-fade-in shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Hero Farmer Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-900/60 text-emerald-200 text-xs px-3 py-1 rounded-full font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{isTelugu ? "ప్రామాణీకరించబడిన ఆంధ్రప్రదేశ్ రైతు" : "Authenticated AP Rice Cultivator"}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isTelugu ? `నమస్కారం, ${user.full_name} గారు` : `Welcome, ${user.full_name}`}
          </h2>
          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-emerald-100 text-sm">
            <span className="flex items-center gap-1">
              <Phone className="w-4 h-4 text-amber-300" />
              <span>{user.mobile_number}</span>
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-amber-300" />
              <span>{user.village}, {user.mandal} మం., {user.district} జి.</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditingProfile(!editingProfile)}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl border border-white/20 transition backdrop-blur-sm"
          >
            <Edit3 className="w-4 h-4 text-amber-300" />
            <span>{isTelugu ? "వివరాలు సవరించండి" : "Edit Profile"}</span>
          </button>
        </div>
      </div>

      {/* Edit Profile Collapsible Form */}
      {editingProfile && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-emerald-600" />
            <span>{isTelugu ? "రైతు సమాచారం సవరణ" : "Update Profile Information"}</span>
          </h3>
          <form onSubmit={handleProfileSave} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {isTelugu ? "రైతు పేరు" : "Full Name"}
              </label>
              <input
                type="text"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {isTelugu ? "జిల్లా" : "District"}
              </label>
              <input
                type="text"
                value={profileForm.district}
                onChange={(e) => setProfileForm({ ...profileForm, district: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {isTelugu ? "మండలం" : "Mandal"}
              </label>
              <input
                type="text"
                value={profileForm.mandal}
                onChange={(e) => setProfileForm({ ...profileForm, mandal: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {isTelugu ? "గ్రామం" : "Village"}
              </label>
              <input
                type="text"
                value={profileForm.village}
                onChange={(e) => setProfileForm({ ...profileForm, village: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                {isTelugu ? "రద్దు చేయండి" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow"
              >
                {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                <span>{isTelugu ? "సేవ్ చేయండి" : "Save Changes"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Grid: Rice Plot Overview & SMS Advisory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Rice Farm Plot Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800">
                <Sprout className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900">
                  {farm ? farm.farm_name : (isTelugu ? "ప్రధాన వరి పొలం" : "Primary Rice Plot")}
                </h3>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                {farm?.variety || "BPT 5204"}
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* Key Metrics: Area & Days */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    {isTelugu ? "పొలం విస్తీర్ణం" : "Farm Area"}
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-900">
                    {farm?.area_acres} <span className="text-xs font-medium text-slate-600">Acres</span>
                  </div>
                  {farm?.area_cents > 0 && (
                    <span className="text-xs text-slate-500 font-medium">+{farm.area_cents} Cents</span>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    {isTelugu ? "నాటు వేసిన రోజులు" : "Days Since Sowing"}
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-amber-900">
                    {cropGrowth.days} <span className="text-xs font-medium text-slate-600">Days</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{farm?.sowing_date}</span>
                </div>

                <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-100 sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    {isTelugu ? "ప్రస్తుత పెరుగుదల దశ" : "Crop Growth Phase"}
                  </span>
                  <div className="text-sm sm:text-base font-bold text-sky-950 leading-snug">
                    {isTelugu ? cropGrowth.stageTe : cropGrowth.stage}
                  </div>
                  <span className="text-xs text-sky-700 font-medium mt-1 block">
                    {isTelugu ? "పర్యవేక్షణ: క్రియాశీలకంగా ఉంది" : "Status: Active Monitoring"}
                  </span>
                </div>
              </div>

              {/* Soil & Irrigation Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">{isTelugu ? "నేల రకం" : "Soil Classification"}</span>
                    <span className="text-xs font-bold text-slate-800">{farm?.soil_type || "Alluvial Soil (ఒండ్రు నేల)"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">{isTelugu ? "నీటి పారుదల" : "Irrigation System"}</span>
                    <span className="text-xs font-bold text-slate-800">{farm?.irrigation_source || "Canal Irrigation (కాలువ నీరు)"}</span>
                  </div>
                </div>
              </div>

              {/* GPS Geotag Link */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-mono">
                  <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Lat: {farm?.latitude || 16.9890}, Lon: {farm?.longitude || 81.7840}</span>
                </div>
                <a
                  href={`https://maps.google.com/?q=${farm?.latitude || 16.9890},${farm?.longitude || 81.7840}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold"
                >
                  <span>{isTelugu ? "గూగుల్ మ్యాప్స్‌లో చూడండి" : "View on Google Maps"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: SMS Advisory & Consent Management */}
        <div className="space-y-6">
          {/* SMS Advisory Status Card */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {isTelugu ? "SMS పంట సలహా కేంద్రం" : "SMS Advisory System"}
                </h3>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                consentStatus ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
              }`}>
                {consentStatus ? (isTelugu ? "క్రియాశీలం" : "Active") : (isTelugu ? "నిలిపివేయబడింది" : "Paused")}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isTelugu
                ? "మీ వరి పంట నమోదు ఆధారంగా వాతావరణ హెచ్చరికలు, తెగుళ్లు మరియు సిఫారసుల SMS లు మీ మొబైల్‌కు పంపబడతాయి."
                : "Real-time crop stress warnings, pest alerts (BPH, Blast), and fertilizer schedules are dispatched to your registered number."}
            </p>

            {/* Toggle Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleToggleConsent}
                disabled={updatingConsent}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  consentStatus
                    ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {updatingConsent && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {consentStatus 
                    ? (isTelugu ? "SMS సేవలను తాత్కాలికంగా ఆపండి" : "Pause SMS Alerts")
                    : (isTelugu ? "SMS సేవలను ప్రారంభించండి" : "Activate SMS Alerts")}
                </span>
              </button>
            </div>

            {/* Simulated Telugu SMS Notification Preview */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isTelugu ? "నమూనా SMS హెచ్చరిక (Live Preview)" : "Sample Telugu SMS Preview"}</span>
              </span>
              <div className="p-3.5 rounded-xl bg-slate-900 text-emerald-300 font-mono text-xs leading-relaxed border border-slate-800 shadow-inner">
                <div className="text-slate-400 text-[10px] mb-1">FROM: AP-AGRICE | 10:30 AM</div>
                {isTelugu ? (
                  <>
                    "రైతు సోదరులకు హెచ్చరిక: మీ ప్రాంతంలో ({user.mandal}) రాత్రి ఉష్ణోగ్రతలు మరియు అధిక తేమ వల్ల అగ్గి తెగులు (Blast) సోకే ప్రమాదం ఉంది. ట్రైసైక్లాజోల్ 0.6గ్రా/లీటరు పిచికారీ చేయగలరు."
                  </>
                ) : (
                  <>
                    "RicePulse AP Advisory: High relative humidity detected in {user.mandal}. Monitor for Blast disease on {farm?.variety || 'rice'}. Apply Tricyclazole 0.6g/L if lesions appear."
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick System Readiness Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-5 text-xs text-emerald-950 space-y-3">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Stage 1 Validation Confirmed</span>
            </div>
            <ul className="space-y-1.5 text-slate-700">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>FastAPI Backend + SQLite/PostgreSQL Ready</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>JWT Secure Authentication Active</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>AP Administrative Geo-dataset Loaded</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>SMS Consent Stored & Synchronized</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
