import React, { useState } from 'react';

const TEXT = {
  Telugu: {
    title: 'కిసాన్ SMS హెచ్చరిక చరిత్ర',
    subtitle: 'ఆటోమేటెడ్ సెన్సార్ & ఉపగ్రహ నిఘా రికార్డులు',
    totalSent: 'మొత్తం సందేశాలు',
    noAlerts: 'ఇంకా ఎటువంటి హెచ్చరిక SMSలు నమోదు కాలేదు',
    noAlertsSub: 'వాతావరణం లేదా ఉపగ్రహంలో ఒత్తిడి గుర్తించినప్పుడు ఆటోమేటిక్‌గా హెచ్చరిక వస్తుంది.',
    colDate: 'తేదీ & సమయం',
    colCategory: 'ఒత్తిడి రకం',
    colRisk: 'ప్రమాద స్థాయి',
    colStatus: 'స్థితి',
    colProvider: 'గేట్‌వే',
    colLang: 'భాష',
    colMessage: 'సందేశం సారాంశం',
    disclaimer: 'గమనిక: అన్ని హెచ్చరికలు పరిశోధనాత్మక ప్రాథమిక అంచనాలు. పంటలో చర్య తీసుకునే ముందు క్షేత్రంలో స్వయంగా ధృవీకరించుకోండి.',
    refresh: 'రిఫ్రెష్',
    statusLabels: {
      SENT: 'పంపబడింది',
      DELIVERED: 'చేరింది',
      QUEUED: 'వేచి ఉంది',
      FAILED: 'విఫలమైంది',
      SUPPRESSED: 'ఆపబడింది',
    },
    riskLabels: {
      'Low': 'తక్కువ',
      'Moderate': 'మధ్యస్థం',
      'High': 'ఎక్కువ',
      'Very High': 'తీవ్రం',
    }
  },
  English: {
    title: 'Kisan SMS Alert History',
    subtitle: 'Automated weather & satellite crop surveillance logs',
    totalSent: 'Total Messages',
    noAlerts: 'No SMS alerts recorded yet',
    noAlertsSub: 'Automated alerts are triggered when satellite or weather anomalies are detected.',
    colDate: 'Date & Time',
    colCategory: 'Stress Category',
    colRisk: 'Risk Level',
    colStatus: 'Delivery Status',
    colProvider: 'Gateway',
    colLang: 'Language',
    colMessage: 'Message Content',
    disclaimer: 'Note: All notifications are preliminary scientific estimates. Always verify ground conditions before field interventions.',
    refresh: 'Refresh',
    statusLabels: {
      SENT: 'Sent',
      DELIVERED: 'Delivered',
      QUEUED: 'Queued',
      FAILED: 'Failed',
      SUPPRESSED: 'Suppressed',
    },
    riskLabels: {
      'Low': 'Low',
      'Moderate': 'Moderate',
      'High': 'High',
      'Very High': 'Very High',
    }
  }
};

const RISK_BADGE_CLASSES = {
  'Low': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Moderate': 'bg-amber-100 text-amber-800 border-amber-200',
  'High': 'bg-orange-100 text-orange-800 border-orange-200',
  'Very High': 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_BADGE_CLASSES = {
  'SENT': 'bg-blue-100 text-blue-800 border-blue-200',
  'DELIVERED': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'QUEUED': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'FAILED': 'bg-red-100 text-red-800 border-red-200',
  'SUPPRESSED': 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function SMSHistoryPanel({ smsHistory, lang = 'Telugu', onRefresh }) {
  const t = TEXT[lang] || TEXT.English;
  const messages = smsHistory?.messages || [];
  const totalCount = smsHistory?.total_messages || messages.length;
  const [selectedMessage, setSelectedMessage] = useState(null);

  const formatTimestamp = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(lang === 'Telugu' ? 'te-IN' : 'en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📱</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base sm:text-lg">{t.title}</h3>
              <span className="bg-emerald-500/30 text-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-400/30">
                {totalCount} {t.totalSent}
              </span>
            </div>
            <p className="text-emerald-200/80 text-xs mt-0.5">{t.subtitle}</p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="self-start sm:self-auto bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 transition flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>{t.refresh}</span>
          </button>
        )}
      </div>

      {/* Body */}
      {messages.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <div className="text-4xl mb-2">📩</div>
          <p className="font-semibold text-slate-700">{t.noAlerts}</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">{t.noAlertsSub}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">{t.colDate}</th>
                <th className="py-3 px-4">{t.colCategory}</th>
                <th className="py-3 px-4">{t.colRisk}</th>
                <th className="py-3 px-4">{t.colStatus}</th>
                <th className="py-3 px-4">{t.colProvider}</th>
                <th className="py-3 px-4">{t.colLang}</th>
                <th className="py-3 px-4">{t.colMessage}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {messages.map((msg) => {
                const riskBadge = RISK_BADGE_CLASSES[msg.risk_level] || 'bg-slate-100 text-slate-700';
                const statusBadge = STATUS_BADGE_CLASSES[msg.delivery_status] || 'bg-slate-100 text-slate-700';
                const displayRisk = t.riskLabels[msg.risk_level] || msg.risk_level;
                const displayStatus = t.statusLabels[msg.delivery_status] || msg.delivery_status;

                return (
                  <tr
                    key={msg.id}
                    className="hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => setSelectedMessage(selectedMessage?.id === msg.id ? null : msg)}
                  >
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono">
                      {formatTimestamp(msg.created_at)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {msg.stress_category || 'Routine Advisory'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${riskBadge}`}>
                        {displayRisk}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                        {displayStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {msg.provider === 'simulated' ? 'SIM-AP' : msg.provider}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                        {msg.language === 'Telugu' ? 'తెలుగు' : 'English'}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-600 truncate font-mono text-[11px]">
                      {msg.message_body || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Expanded message modal / detail card */}
      {selectedMessage && (
        <div className="p-4 bg-emerald-50/50 border-t border-emerald-100 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-emerald-900">
              📋 {selectedMessage.stress_category} ({formatTimestamp(selectedMessage.created_at)})
            </span>
            <button
              onClick={() => setSelectedMessage(null)}
              className="text-slate-400 hover:text-slate-600 font-bold px-2 py-0.5 rounded"
            >
              ✕
            </button>
          </div>
          <div className="bg-white p-3 rounded-xl border border-emerald-200 font-mono text-slate-800 text-[11px] whitespace-pre-wrap leading-relaxed shadow-inner">
            {selectedMessage.message_body}
          </div>
          {selectedMessage.gateway_message_id && (
            <p className="text-[10px] text-slate-400 mt-2 font-mono">
              Gateway ID: {selectedMessage.gateway_message_id} • Status: {selectedMessage.delivery_status}
            </p>
          )}
        </div>
      )}

      {/* Ground truth disclaimer */}
      <div className="bg-slate-50 px-6 py-2.5 border-t border-slate-100 text-[11px] text-slate-400 text-center">
        {t.disclaimer}
      </div>
    </div>
  );
}
