import React from "react";

export default function RiskScoreOverview({ caseData }) {
  const score = caseData.risk_score != null ? Math.round(caseData.risk_score) : 0;
  
  // Dynamic calculation of Risk Level from actual backend score
  let level = "LOW RISK";
  let theme = {
    bg: "bg-emerald-50/80",
    border: "border-emerald-200",
    text: "text-emerald-900",
    indicator: "bg-emerald-500",
    ring: "ring-emerald-400/30"
  };

  if (score >= 67) {
    level = "HIGH RISK";
    theme = {
      bg: "bg-rose-50/80",
      border: "border-rose-200",
      text: "text-rose-900",
      indicator: "bg-rose-600",
      ring: "ring-rose-400/30"
    };
  } else if (score >= 34) {
    level = "MEDIUM RISK";
    theme = {
      bg: "bg-amber-50/80",
      border: "border-amber-200",
      text: "text-amber-900",
      indicator: "bg-amber-500",
      ring: "ring-amber-400/30"
    };
  }

  const comps = caseData.risk_components || {};
  const mismatches = caseData.mismatches || [];

  const getCompDetail = (key, rawVal, name, weight, evidenceText, okExplain, errExplain) => {
    if (rawVal === null || rawVal === undefined) {
      return {
        name,
        valueStr: "N/A",
        level: "NOT CONFIGURED",
        badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
        evidence: "Integration / Credentials Not Configured",
        explanation: "External API or credential is not configured. (Evidence Not Available)",
        weight
      };
    }

    const val = typeof rawVal === "number" ? rawVal : 0;
    let compLevel = "LOW RISK";
    let badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200";

    if (val >= 67) {
      compLevel = "HIGH RISK";
      badgeClass = "bg-rose-100 text-rose-800 border-rose-200 font-bold";
    } else if (val >= 34) {
      compLevel = "MEDIUM RISK";
      badgeClass = "bg-amber-100 text-amber-800 border-amber-200 font-bold";
    }

    const valStr = `${val.toFixed(1)} / 100`;
    const explanation = val > 20 ? errExplain : okExplain;

    return {
      name,
      valueStr: valStr,
      level: compLevel,
      badgeClass,
      evidence: evidenceText,
      explanation,
      weight
    };
  };

  const primaryDoc = caseData.documents && caseData.documents.length > 0 ? caseData.documents[0] : null;
  const tamperVal = comps.tamper ?? (primaryDoc ? primaryDoc.tamper_score : 0);
  const templateVal = comps.template_mismatch ?? (primaryDoc && primaryDoc.template_score ? (100 - primaryDoc.template_score) : 0);
  const formatVal = comps.invalid_format ?? (primaryDoc && !primaryDoc.format_valid ? 100 : 0);
  const faceVal = comps.face_mismatch ?? (caseData.face_match_score != null ? Math.max(0, 100 - caseData.face_match_score) : null);
  const crossVal = comps.cross_doc_mismatch ?? (caseData.cross_doc_match === false ? 100 : 0);
  const sandboxVal = comps.sandbox_mismatch ?? (caseData.sandbox_status === "MISMATCH" ? 100 : (caseData.sandbox_status === "NOT_CONFIGURED" ? null : 0));

  const componentList = [
    getCompDetail(
      "tamper",
      tamperVal,
      "DOCUMENT TAMPERING",
      "25%",
      `ELA tamper signal: ${tamperVal?.toFixed(1) || 0}`,
      "No suspicious Error Level Analysis (ELA) compression anomaly detected.",
      "Forensic ELA analysis detected a compression anomaly signal on the document."
    ),
    getCompDetail(
      "template_mismatch",
      templateVal,
      "TEMPLATE MISMATCH",
      "15%",
      `Template similarity: ${primaryDoc ? primaryDoc.template_score : 100}%`,
      "Document layout matches standard official issuing authority template.",
      "Document visual layout or font structure deviates from template standard."
    ),
    getCompDetail(
      "invalid_format",
      formatVal,
      "FORMAT / SYNTAX",
      "15%",
      formatVal > 0 ? "Checksum / Date Format Validation Failed" : "All fields passed format validation rules",
      "All extracted fields passed format validation and checksum verification.",
      "Checksum digits, date rules, or document ID format failed validation."
    ),
    getCompDetail(
      "face_mismatch",
      faceVal,
      "FACE MISMATCH",
      "20%",
      caseData.face_match_score != null ? `Live face similarity: ${caseData.face_match_score}%` : "Live camera selfie not captured yet",
      "Live passenger face matches document photo with high confidence.",
      "Live passenger face shows moderate to high discrepancy from document portrait."
    ),
    getCompDetail(
      "cross_doc_mismatch",
      crossVal,
      "CROSS-DOCUMENT",
      "15%",
      caseData.cross_doc_match === false ? "Field Mismatch across presented documents" : "All presented documents are consistent",
      "All fields match consistently across all presented identity documents.",
      "Field mismatch (e.g. Name/DOB difference) detected across presented documents."
    ),
    getCompDetail(
      "sandbox_mismatch",
      sandboxVal,
      "SANDBOX REGISTRY",
      "10%",
      caseData.sandbox_status ? `Status: ${caseData.sandbox_status}` : "Credentials Not Configured",
      "External government registry verification confirmed document validity.",
      "Document details mismatched or not found in external government registry."
    ),
  ];

  return (
    <div className="space-y-6">
      {/* 1. Big Prominent Overall Risk Display */}
      <div className={`enterprise-card p-6 ${theme.bg} border ${theme.border} rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm`}>
        <div className="flex items-center gap-6">
          <div className={`w-28 h-28 rounded-2xl bg-white border-2 ${theme.border} flex flex-col items-center justify-center shadow-md ${theme.ring} ring-4`}>
            <span className={`text-4xl font-black ${theme.text} tracking-tight`}>{score}</span>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">/ 100</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${theme.indicator} animate-pulse`}></span>
              <h2 className={`text-xl font-black tracking-tight uppercase ${theme.text}`}>
                ● {level}
              </h2>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Calculated via Multi-Evidence Risk Fusion Engine grounded in empirical biometric & forensic signals.
            </p>
            <p className="text-[11px] text-slate-500">
              Threshold Reference: 0–33 LOW • 34–66 MEDIUM • 67–100 HIGH
            </p>
          </div>
        </div>

        <div className="bg-white/80 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 max-w-xs space-y-1">
          <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">Screening Recommendation:</p>
          <p className="font-semibold text-slate-800">
            {score >= 67 ? "⚠️ ESCALATE — Secondary Officer Review Mandatory" : score >= 34 ? "🔍 SECONDARY REVIEW — Verify Biometrics & Documents" : "✓ CLEAR — All Primary Evidence Checks Passed"}
          </p>
        </div>
      </div>

      {/* 2. "Why Was This Score Given?" Section */}
      <div className="enterprise-card p-5 bg-white space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between">
          <span>🔍 Why Was This Score Given? (Evidence Rationale)</span>
          <span className="text-[10px] text-slate-400 font-normal">Evidence Grounded Explanation</span>
        </h3>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed font-medium">
          {score >= 67 ? (
            <span>Overall risk score is <strong>{score}/100 (HIGH RISK)</strong> because one or more primary verification signals (such as document tamper artifacts, forgery indicators, or biometric mismatch) produced strong risk contributions.</span>
          ) : score >= 34 ? (
            <span>Overall risk score is <strong>{score}/100 (MEDIUM RISK)</strong> because moderate biometric similarity variance or image compression signals were identified, warranting secondary officer review.</span>
          ) : (
            <span>Overall risk score is <strong>{score}/100 (LOW RISK)</strong> because presented identity documents passed format/syntax rules and cross-document checks with clean biometric matching.</span>
          )}
        </div>

        {mismatches.length > 0 ? (
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-bold text-slate-700 uppercase">Strongest Evidence Risk Contributors:</p>
            {mismatches.map((item, idx) => (
              <div key={idx} className="bg-amber-50/90 border border-amber-200 rounded-lg p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-amber-950 text-xs">⚠️ {idx + 1}. {item.what}</h4>
                  <span className="font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded text-[10px]">
                    {item.impact}
                  </span>
                </div>
                <p className="text-slate-800 font-medium"><strong>Why:</strong> {item.why}</p>
                <p className="text-slate-600 text-[11px]"><strong>Evidence Signal:</strong> {item.evidence}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 font-medium">
            ✓ No critical risk mismatches identified across presented identity data.
          </div>
        )}
      </div>

      {/* 3. Component Cards showing Value, Meaning, Evidence, and Explanation */}
      <div className="enterprise-card p-5 bg-white space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex justify-between items-center">
          <span>Risk Score Component Contributions</span>
          <span className="text-[10px] font-mono text-slate-500">6 Component Fusion Model</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {componentList.map((comp, idx) => (
            <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">{comp.name}</span>
                  <span className="text-lg font-black text-slate-900 mt-0.5 block">{comp.valueStr}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${comp.badgeClass}`}>
                  {comp.level}
                </span>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-200/60 text-[11px]">
                <p className="text-slate-700"><strong>Evidence:</strong> {comp.evidence}</p>
                <p className="text-slate-500 italic">"{comp.explanation}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Risk Score Formula Breakdown Table */}
      <div className="enterprise-card p-5 bg-white space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Risk Score Calculation Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-2.5">Component</th>
                <th className="p-2.5">Weight</th>
                <th className="p-2.5">Component Value</th>
                <th className="p-2.5">Evaluated Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {componentList.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold text-slate-800">{c.name}</td>
                  <td className="p-2.5 font-mono text-slate-600">{c.weight}</td>
                  <td className="p-2.5 font-mono font-bold text-blue-900">{c.valueStr}</td>
                  <td className="p-2.5 font-semibold text-slate-700">{c.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
