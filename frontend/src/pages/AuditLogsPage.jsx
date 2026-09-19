import { useEffect, useState } from "react";
import { getAuditLogs } from "../api.js";
import BackButton from "../components/BackButton.jsx";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLogs(100)
      .then((res) => setLogs(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <BackButton />
        <span className="text-xs font-semibold text-slate-500">SIH 26188 — System Security Audit Trail</span>
      </div>

      <div className="enterprise-card p-6 bg-white space-y-2">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          System Security & Activity Audit Trail
        </h1>
        <p className="text-xs text-slate-500">
          Immutable event audit logs tracking officer actions, logins, case screening events, and re-appeal decisions.
        </p>
      </div>

      <div className="enterprise-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider flex justify-between">
          <span>System Audit Events</span>
          <span>Total: {logs.length}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading audit trail…</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No audit events recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor / Username</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Screening Case ID</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">#{log.id}</td>
                    <td className="p-3 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="p-3 font-bold text-blue-900">{log.actor}</td>
                    <td className="p-3 font-semibold">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800">
                        {log.role || "OFFICER"}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800">{log.action}</td>
                    <td className="p-3 font-mono text-slate-600">{log.case_id ? `#${log.case_id.slice(0, 8)}` : "—"}</td>
                    <td className="p-3 text-slate-600 max-w-xs truncate">{log.detail || "—"}</td>
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
