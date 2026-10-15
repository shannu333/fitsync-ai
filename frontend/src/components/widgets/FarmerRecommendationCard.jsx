/**
 * FarmerRecommendationCard — Stage 6: Non-Pesticide Biological & Cultural Advisory
 *
 * Provides actionable, simple, zero-chemical agronomic recommendations
 * tailored to diagnosed crop stress and rice phenology in Andhra Pradesh.
 *
 * Categories:
 *  - Biological Pest Management (Trichogramma, Pheromone traps, Bird perches)
 *  - Water Management (Alternate Wetting & Drying - AWD, Pani Pipe)
 *  - Botanical Canopy Shield (NSKE 5% Neem extract)
 *  - Precision Nitrogen Timing (IRRI Leaf Color Chart - LCC)
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Bug,
  Droplets,
  Leaf,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  TrendingUp,
  Coins,
} from 'lucide-react';

export default function FarmerRecommendationCard({
  recommendations = [],
  stressDiagnosis = null,
  lang = 'Telugu',
}) {
  const isTelugu = lang === 'Telugu' || lang === 'te';
  const [activeCategory, setActiveCategory] = useState('all');

  const getCategoryIcon = (iconName) => {
    switch (iconName?.toLowerCase()) {
      case 'bug':
        return <Bug className="w-5 h-5 text-emerald-600" />;
      case 'droplets':
        return <Droplets className="w-5 h-5 text-sky-600" />;
      case 'leaf':
        return <Leaf className="w-5 h-5 text-teal-600" />;
      case 'sparkles':
      default:
        return <Sparkles className="w-5 h-5 text-amber-500" />;
    }
  };

  const getCategoryTheme = (iconName) => {
    switch (iconName?.toLowerCase()) {
      case 'bug':
        return 'bg-emerald-50 border-emerald-200 text-emerald-950';
      case 'droplets':
        return 'bg-sky-50 border-sky-200 text-sky-950';
      case 'leaf':
        return 'bg-teal-50 border-teal-200 text-teal-950';
      case 'sparkles':
      default:
        return 'bg-amber-50 border-amber-200 text-amber-950';
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-slate-900">
                {isTelugu ? 'రైతు మిత్ర: రసాయన రహిత పంట సంరక్షణ సలహాలు' : 'Actionable Non-Pesticide Farmer Recommendations'}
              </h3>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wide">
                Eco-Shield
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isTelugu
                ? 'సేంద్రీయ, జీవ నియంత్రణ మరియు తక్కువ ఖర్చుతో కూడిన వ్యవసాయ యాజమాన్య పద్ధతులు'
                : 'Biological, cultural, and AWD water-saving practices tailored to your field diagnostics'}
            </p>
          </div>
        </div>

        {/* Zero Chemical Badge */}
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-2xl">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">
              {isTelugu ? 'సున్నా పురుగుమందులు' : 'Zero Pesticides'}
            </span>
            <span className="text-xs font-black text-emerald-950">
              {isTelugu ? 'సేంద్రీయ మార్గం' : '100% Eco-Safe'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stress Context Strip (if available) ─────────────────────────── */}
      {stressDiagnosis && (
        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {isTelugu ? 'గుర్తించిన పరిస్థితి:' : 'Target Diagnosis:'}{' '}
              <strong className="font-extrabold text-amber-950">
                {isTelugu ? stressDiagnosis.primary_cause_te : stressDiagnosis.primary_cause}
              </strong>
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 shrink-0">
            {stressDiagnosis.risk_level} Risk
          </span>
        </div>
      )}

      {/* ── Recommendation Cards Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec, idx) => {
          const themeClass = getCategoryTheme(rec.icon);
          return (
            <div
              key={idx}
              className={`rounded-2xl border p-5 transition hover:shadow-md space-y-3.5 flex flex-col justify-between ${themeClass}`}
            >
              <div className="space-y-2.5">
                {/* Card Title & Icon */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white shadow-2xs border border-slate-200/60 flex items-center justify-center shrink-0">
                    {getCategoryIcon(rec.icon)}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                      {rec.category}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                      {isTelugu ? rec.title_te : rec.title}
                    </h4>
                  </div>
                </div>

                {/* Practical Action Steps */}
                <p className="text-xs text-slate-700 leading-relaxed pl-0.5">
                  {isTelugu ? rec.action_te : rec.action}
                </p>
              </div>

              {/* Economic & Environmental Savings Footer */}
              <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{isTelugu ? rec.cost_benefit_te : rec.cost_benefit}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">✓ Tested Practice</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Rythu Bharosa Kendra Support Notice ─────────────────────────── */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {isTelugu
              ? 'ఈ పద్ధతుల అమలులో సందేహాలుంటే మీ గ్రామ రైతు భరోసా కేంద్రం (RBK) వ్యవసాయ సహాయకుడిని (VAA) సంప్రదించండి.'
              : 'Assistance for pheromone traps, Trichogramma cards, and LCC tools is available at your local Rythu Bharosa Kendra (RBK).'}
          </span>
        </div>
        <span className="font-mono text-[10px] text-slate-400 shrink-0">
          AP Agriculture Extension Guide
        </span>
      </div>
    </div>
  );
}
