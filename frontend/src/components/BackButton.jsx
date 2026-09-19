import { useNavigate } from "react-router-dom";

export default function BackButton({ to, label = "Back", className = "" }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm " + className}
    >
      <span className="text-sm leading-none">←</span>
      <span>{label}</span>
    </button>
  );
}
