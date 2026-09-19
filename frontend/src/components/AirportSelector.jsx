import { useState } from "react";

export const INDIAN_AIRPORTS = [
  { code: "MAA", name: "Chennai International Airport", city: "Chennai", state: "Tamil Nadu" },
  { code: "DEL", name: "Indira Gandhi International Airport", city: "New Delhi", state: "Delhi" },
  { code: "BOM", name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", state: "Maharashtra" },
  { code: "BLR", name: "Kempegowda International Airport", city: "Bengaluru", state: "Karnataka" },
  { code: "HYD", name: "Rajiv Gandhi International Airport", city: "Hyderabad", state: "Telangana" },
  { code: "CCU", name: "Netaji Subhas Chandra Bose International Airport", city: "Kolkata", state: "West Bengal" },
  { code: "COK", name: "Cochin International Airport", city: "Kochi", state: "Kerala" },
  { code: "AMD", name: "Sardar Vallabhbhai Patel International Airport", city: "Ahmedabad", state: "Gujarat" },
  { code: "GOI", name: "Dabolim Airport / Goa International Airport", city: "Goa", state: "Goa" },
  { code: "TRV", name: "Trivandrum International Airport", city: "Thiruvananthapuram", state: "Kerala" },
];

export default function AirportSelector({ selectedAirport, onSelectAirport }) {
  const [search, setSearch] = useState("");

  const filtered = INDIAN_AIRPORTS.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          STEP 1: SELECT DUTY AIRPORT
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Select the active international airport checkpoint for this passenger screening session.
        </p>
      </div>

      <input
        type="text"
        placeholder="🔍 Search airport by name, city or IATA code (e.g. MAA, DEL, Mumbai)..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="field-input"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
        {filtered.map((apt) => {
          const isSelected = selectedAirport?.code === apt.code;
          return (
            <button
              key={apt.code}
              type="button"
              onClick={() => onSelectAirport(apt)}
              className={`p-3.5 rounded-lg border text-left transition-all flex items-start justify-between ${
                isSelected
                  ? "border-blue-700 bg-blue-50/70 ring-2 ring-blue-200"
                  : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <div>
                <p className="text-sm font-bold text-slate-900">{apt.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {apt.city}, {apt.state}
                </p>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  isSelected ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {apt.code}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
