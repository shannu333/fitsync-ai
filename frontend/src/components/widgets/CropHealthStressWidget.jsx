import React from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Droplets, 
  Bug, 
  SunMedium, 
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

export default function CropHealthStressWidget({ data, lang = 'Telugu' }) {
  if (!data) return null;
  const isTelugu = lang === 'Telugu';

  // Stress Level styling configuration
  const getBadgeStyle = (level) => {
    switch (level?.toLowerCase()) {
      case 'low':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
          gradient: 'from-emerald-500 to-teal-600',
          icon: CheckCircle2
        };
      case 'moderate':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
          gradient: 'from-amber-500 to-orange-500',
          icon: AlertTriangle
        };
      case 'high':
        return {
          bg: 'bg-orange-50 text-orange-800 border-orange-300',
          dot: 'bg-orange-500',
          gradient: 'from-orange-500 to-red-500',
          icon: ShieldAlert
        };
      case 'very high':
      default:
        return {
          bg: 'bg-red-50 text-red-800 border-red-300',
          dot: 'bg-red-600',
          gradient: 'from-red-600 to-rose-700',
          icon: AlertTriangle
        };
    }
  };

  const badge = getBadgeStyle(data.stress_level);
  const StatusIcon = badge.icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Activity className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              {isTelugu ? "పంట ఆరోగ్యం & ఒత్తిడి ప్రమాద స్థాయి" : "Crop Health & Stress Risk Level"}
            </h3>
            <span className="text-xs text-slate-500">
              {isTelugu ? `${data.days_since_sowing} రోజుల పంట వయస్సు` : `${data.days_since_sowing} Days Since Sowing`}
            </span>
          </div>
        </div>

        {/* Stress Level Badge */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
          <span className={`w-2 h-2 rounded-full ${badge.dot} animate-pulse`}></span>
          <span>{isTelugu ? data.stress_level_te : `${data.stress_level} Stress`}</span>
        </div>
      </div>

      {/* Health Score Gauge / Bar */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            {isTelugu ? "పంట ఆరోగ్య సూచిక (Health Index)" : "Field Vitality Index"}
          </span>
          <span className="text-2xl font-black text-slate-900">
            {data.health_score}<span className="text-xs text-slate-500 font-medium">/100</span>
          </span>
        </div>

        {/* Gradient Progress Bar */}
        <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${badge.gradient} transition-all duration-700 rounded-full`}
            style={{ width: `${data.health_score}%` }}
          ></div>
        </div>

        <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1.5">
          <span>{isTelugu ? "0 - తీవ్ర ఒత్తిడి" : "0 - High Risk"}</span>
          <span className="font-semibold text-slate-700">
            {isTelugu ? data.growth_stage_te : data.growth_stage}
          </span>
          <span>{isTelugu ? "100 - సంపూర్ణ ఆరోగ్యం" : "100 - Optimal"}</span>
        </div>
      </div>

      {/* Stress Breakdown Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          {isTelugu ? "ఒత్తిడి కారకాల విశ్లేషణ" : "Stress Risk Factors Analysis"}
        </h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Water Stress */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-blue-500" />
                <span>{isTelugu ? "నీటి ఒత్తిడి" : "Moisture Stress"}</span>
              </span>
              <strong className="text-slate-900">{data.stress_breakdown.water_stress}%</strong>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-blue-500 h-full rounded-full" 
                style={{ width: `${data.stress_breakdown.water_stress}%` }}
              ></div>
            </div>
          </div>

          {/* Pest Threat */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="flex items-center gap-1">
                <Bug className="w-3.5 h-3.5 text-red-500" />
                <span>{isTelugu ? "తెగుళ్ల ముప్పు" : "Pest/Blast Threat"}</span>
              </span>
              <strong className="text-slate-900">{data.stress_breakdown.pest_blast_threat}%</strong>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-red-500 h-full rounded-full" 
                style={{ width: `${data.stress_breakdown.pest_blast_threat}%` }}
              ></div>
            </div>
          </div>

          {/* Nitrogen Deficiency */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{isTelugu ? "నత్రజని లోపం" : "Nitrogen Gap"}</span>
              </span>
              <strong className="text-slate-900">{data.stress_breakdown.nitrogen_deficiency}%</strong>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full" 
                style={{ width: `${data.stress_breakdown.nitrogen_deficiency}%` }}
              ></div>
            </div>
          </div>

          {/* Heat Stress */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="flex items-center gap-1">
                <SunMedium className="w-3.5 h-3.5 text-orange-500" />
                <span>{isTelugu ? "వేడి ఒత్తిడి" : "Heat Stress"}</span>
              </span>
              <strong className="text-slate-900">{data.stress_breakdown.heat_stress}%</strong>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-orange-500 h-full rounded-full" 
                style={{ width: `${data.stress_breakdown.heat_stress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Advisory & Recommendations */}
      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
        <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider block">
          {isTelugu ? "వ్యవసాయ సలహా & నివారణ చర్యలు" : "Actionable Agronomic Advisory"}
        </span>
        <ul className="space-y-1.5 text-xs text-emerald-900">
          {(isTelugu ? data.recommendations_te : data.recommendations).map((rec, i) => (
            <li key={i} className="flex items-start gap-2">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
