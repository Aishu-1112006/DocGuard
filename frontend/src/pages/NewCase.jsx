import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCase } from "../api.js";
import AirportSelector, { INDIAN_AIRPORTS } from "../components/AirportSelector.jsx";
import BackButton from "../components/BackButton.jsx";

export default function NewCase() {
  const navigate = useNavigate();
  const [selectedAirport, setSelectedAirport] = useState(INDIAN_AIRPORTS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStartScreening = async () => {
    if (!selectedAirport) {
      setError("Please select an airport checkpoint to start screening.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await createCase({
        airport_name: selectedAirport.name,
        airport_code: selectedAirport.code,
        airport_city: selectedAirport.city,
        airport_state: selectedAirport.state
      });
      const caseId = res.data.id;
      navigate(`/case/${caseId}/workspace`);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create screening session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <div className="flex items-center justify-between">
        <BackButton />
        <span className="text-xs font-semibold text-slate-500">SIH 26188 — New Screening Session</span>
      </div>

      {/* Wizard Header */}
      <div className="enterprise-card p-6 bg-white space-y-2">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          New Passenger Identity & Document Screening Session
        </h1>
        <p className="text-xs text-slate-500">
          Step-by-step AI-assisted decision-support screening. Every step must be completed before officer verdict.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Step 1: Airport Selection */}
      <AirportSelector
        selectedAirport={selectedAirport}
        onSelectAirport={setSelectedAirport}
      />

      {/* Selected Summary & Proceed Button */}
      {selectedAirport && (
        <div className="enterprise-card p-5 bg-blue-50/50 border-blue-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-blue-950 uppercase tracking-wider">
              Selected Checkpoint:
            </p>
            <p className="text-sm font-bold text-blue-900 mt-0.5">
              {selectedAirport.name} ({selectedAirport.code})
            </p>
            <p className="text-xs text-slate-600">
              {selectedAirport.city}, {selectedAirport.state}
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartScreening}
            disabled={loading}
            className="btn-primary py-3 px-6 text-sm font-bold shadow-md"
          >
            {loading ? "Initializing Session…" : "Proceed to Document Upload →"}
          </button>
        </div>
      )}
    </div>
  );
}