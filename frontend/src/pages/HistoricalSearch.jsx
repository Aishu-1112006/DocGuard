import { useEffect, useState } from "react";
import { searchHistorical } from "../api.js";
import BackButton from "../components/BackButton.jsx";

export default function HistoricalSearch() {
  const [query, setQuery] = useState("");
  const [docType, setDocType] = useState("");
  const [risk, setRisk] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await searchHistorical(query, docType, risk, 50);
      setRecords(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <BackButton />
        <span className="text-xs font-semibold text-slate-500">SIH 26188 — Historical Intelligence</span>
      </div>

      {/* Header */}
      <div className="enterprise-card p-6 bg-white space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏛️</span>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Historical Border Intelligence Reference Database
          </h1>
        </div>
        <p className="text-xs text-slate-500">
          Query the 5,000-row historical screening reference dataset. This reference database is kept strictly separate from personal officer operational cases.
        </p>
      </div>

      {/* Search Filters */}
      <form onSubmit={handleSearch} className="enterprise-card p-5 bg-white space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="field-label">Search Query (Doc Number, Name, Country)</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. P9876543, Ramesh, IND, USA..."
              className="field-input text-xs"
            />
          </div>

          <div>
            <label className="field-label">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="field-input text-xs"
            >
              <option value="">All Document Types</option>
              <option value="passport">Passport</option>
              <option value="visa">Visa</option>
              <option value="national_id">National ID</option>
              <option value="driving_license">Driving Licence</option>
            </select>
          </div>

          <div>
            <label className="field-label">Risk Level Filter</label>
            <select
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              className="field-input text-xs"
            >
              <option value="">All Risk Levels</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary py-2 px-5 text-xs font-bold">
          {loading ? "Searching Dataset…" : "🔍 Query Historical Intelligence"}
        </button>
      </form>

      {/* Results Table */}
      <div className="enterprise-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider flex justify-between">
          <span>Search Results</span>
          <span>Showing {records.length} records</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Searching reference records…</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No matching historical records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Record ID</th>
                  <th className="p-3">Doc Number</th>
                  <th className="p-3">Passenger Name</th>
                  <th className="p-3">Country</th>
                  <th className="p-3">Doc Type</th>
                  <th className="p-3">Risk Level</th>
                  <th className="p-3">Tamper Flag</th>
                  <th className="p-3">Prior Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">#{r.record_id || r.id}</td>
                    <td className="p-3 font-mono text-blue-900 font-semibold">{r.document_number || "—"}</td>
                    <td className="p-3 font-semibold text-slate-800">{r.full_name || "—"}</td>
                    <td className="p-3 text-slate-600">{r.country || "—"}</td>
                    <td className="p-3 uppercase text-[10px] font-bold text-slate-500">{r.document_type || "—"}</td>
                    <td className="p-3 font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        r.risk_level === "High" ? "bg-rose-100 text-rose-800" : (r.risk_level === "Medium" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")
                      }`}>
                        {r.risk_level}
                      </span>
                    </td>
                    <td className="p-3">
                      {r.tamper_flag ? (
                        <span className="text-rose-700 font-bold">⚠️ TAMPERED</span>
                      ) : (
                        <span className="text-slate-400">Normal</span>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{r.verification_result || "Cleared"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
