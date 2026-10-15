import React, { useState } from 'react';
import { Sprout, Phone, Lock, LogIn, AlertCircle, Loader2, Sparkles, UserPlus } from 'lucide-react';
import { authAPI } from '../api';

export default function Login({ onLoginSuccess, onSwitchToRegister, lang }) {
  const isTelugu = lang === 'Telugu';
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setError(isTelugu ? "చెల్లుబాటు అయ్యే 10 అంకెల మొబైల్ సంఖ్యను నమోదు చేయండి." : "Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!password) {
      setError(isTelugu ? "దయచేసి పాస్‌వర్డ్ నమోదు చేయండి." : "Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.login({
        mobile_number: cleanMobile,
        password: password
      });
      if (onLoginSuccess) {
        onLoginSuccess(res.user);
      }
    } catch (err) {
      console.error("Login failed:", err);
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : isTelugu ? "మొబైల్ సంఖ్య లేదా పాస్‌వర్డ్ తప్పుగా ఉంది." : "Invalid mobile number or password."
      );
    } finally {
      setLoading(false);
    }
  };

  const fillDemoFarmer = () => {
    setMobileNumber('9876543210');
    setPassword('FarmerPassword@2026');
    setError('');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-emerald-700 text-white items-center justify-center shadow-lg mb-4">
          <Sprout className="w-8 h-8 text-amber-300" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          {isTelugu ? "రైతు లాగిన్ (Farmer Login)" : "Farmer Portal Login"}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          {isTelugu 
            ? "ఆంధ్రప్రదేశ్ వరి పంట ఆరోగ్య పర్యవేక్షణ వేదిక"
            : "Rice Crop Stress Detection & Yield Intelligence AP"}
        </p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Demo Fast Login Helper */}
        <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>{isTelugu ? "టెస్ట్ డెమో ఖాతా:" : "Stage 1 Test Account:"}</span>
          </div>
          <button
            type="button"
            onClick={fillDemoFarmer}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-2.5 py-1 rounded-lg transition"
          >
            {isTelugu ? "వివరాలు పూరించండి" : "Fill Demo Farmer"}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {isTelugu ? "మొబైల్ సంఖ్య (10 Digits) *" : "Mobile Number (10 Digits) *"}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="tel"
                required
                maxLength={10}
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="9876543210"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono tracking-wide"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {isTelugu ? "పాస్‌వర్డ్ *" : "Password *"}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition transform active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{isTelugu ? "లాగిన్ అవుతోంది..." : "Signing In..."}</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>{isTelugu ? "లాగిన్ అవ్వండి" : "Sign In to Dashboard"}</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 mb-2">
            {isTelugu ? "ఇంకా నమోదు చేసుకోలేదా?" : "Don't have an AP Farmer account yet?"}
          </p>
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:text-emerald-800 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isTelugu ? "ఇప్పుడే నూతన రైతు ఖాతా సృష్టించండి" : "Register New Farmer Account"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
