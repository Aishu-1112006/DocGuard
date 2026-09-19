import { useState } from "react";
import { getDocumentImageUrl } from "../api.js";
import AuthenticatedImage from "./AuthenticatedImage.jsx";

export default function DocumentCard({ doc, caseId, onViewHeatmap }) {
  const [showImageModal, setShowImageModal] = useState(false);

  // Derive actual image URL from document ID or fallback blob URL
  const imgSrc = doc.image_url || doc.previewUrl || (doc.id && caseId ? getDocumentImageUrl(caseId, doc.id) : null);

  return (
    <div className="enterprise-card p-4 bg-white space-y-3 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <span className="font-bold text-blue-900 uppercase tracking-wider text-xs">
          📄 {doc.document_type.replace(/_/g, " ").toUpperCase()}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            doc.format_valid
              ? "bg-emerald-100 text-emerald-800"
              : "bg-rose-100 text-rose-800"
          }`}
        >
          {doc.format_valid ? "✓ FORMAT VALID" : "⚠️ FORMAT ERROR"}
        </span>
      </div>

      {/* Actual Uploaded Image Preview Box */}
      {imgSrc ? (
        <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-[16/9] max-h-40 flex items-center justify-center">
          <AuthenticatedImage
            src={imgSrc}
            alt={doc.document_type}
            className="w-full h-full object-contain"
          />
          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5"
          >
            <span>🔍 View Actual Document</span>
          </button>
        </div>
      ) : (
        <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded text-center text-slate-400 text-xs">
          Document Preview Processing…
        </div>
      )}

      <div className="space-y-1 text-slate-700">
        <p className="flex justify-between">
          <span className="text-slate-400">Extracted Name:</span>
          <strong className="text-slate-900">{doc.extracted_name || "—"}</strong>
        </p>
        <p className="flex justify-between">
          <span className="text-slate-400">ID / Doc Number:</span>
          <strong className="text-slate-900 font-mono">{doc.extracted_id_number || "—"}</strong>
        </p>
        <p className="flex justify-between">
          <span className="text-slate-400">Date of Birth:</span>
          <span>{doc.extracted_dob || "—"}</span>
        </p>
        {doc.extracted_nationality && (
          <p className="flex justify-between">
            <span className="text-slate-400">Nationality:</span>
            <span>{doc.extracted_nationality}</span>
          </p>
        )}
        {doc.extracted_expiry && (
          <p className="flex justify-between">
            <span className="text-slate-400">Expiry Date:</span>
            <span>{doc.extracted_expiry}</span>
          </p>
        )}
        {doc.mrz_found && (
          <p className="text-[10px] text-emerald-700 font-semibold pt-0.5">
            ✓ ICAO 9303 MRZ Read Cleanly
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <span className="text-slate-500">
          ELA Tamper: <strong>{doc.tamper_score}</strong> | OCR: <strong>{doc.ocr_confidence}%</strong>
        </span>
        {onViewHeatmap && (
          <button
            type="button"
            onClick={() => onViewHeatmap(doc.id)}
            className="text-blue-800 font-bold hover:underline"
          >
            🔍 View ELA Heatmap
          </button>
        )}
      </div>

      {doc.validation_note && (
        <p className="text-[10px] text-slate-400 italic pt-1">
          Note: {doc.validation_note}
        </p>
      )}

      {/* Full Size Image Modal */}
      {showImageModal && imgSrc && (
        <div className="fixed inset-0 bg-slate-900/80 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full p-4 space-y-3 relative shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-bold text-slate-900 text-sm">
                Actual Uploaded Document Preview — {doc.document_type.toUpperCase()}
              </h4>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>
            <div className="bg-slate-900 rounded-lg p-2 max-h-[70vh] flex items-center justify-center overflow-auto">
              <AuthenticatedImage src={imgSrc} alt="Full Document" className="max-w-full max-h-[65vh] object-contain" />
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
              <span>Document ID: {doc.id}</span>
              <button
                onClick={() => setShowImageModal(false)}
                className="btn-secondary py-1 px-3 text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}