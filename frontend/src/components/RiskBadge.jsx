export default function RiskBadge({ score, category }) {
  if (score === null || score === undefined) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        Pending Analysis
      </span>
    );
  }

  const cat = (category || "").toUpperCase();
  let colorStyle = "bg-emerald-50 text-emerald-800 border-emerald-200";
  let dotColor = "bg-emerald-500";
  let label = "LOW RISK";

  if (cat === "HIGH" || score >= 67) {
    colorStyle = "bg-rose-50 text-rose-800 border-rose-200 font-semibold";
    dotColor = "bg-rose-600";
    label = "HIGH RISK";
  } else if (cat === "MEDIUM" || score >= 34) {
    colorStyle = "bg-amber-50 text-amber-800 border-amber-200 font-semibold";
    dotColor = "bg-amber-500";
    label = "MEDIUM RISK";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${colorStyle}`}>
      <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
      <span>{label}</span>
      <span className="opacity-75 font-normal">({score.toFixed(1)})</span>
    </span>
  );
}