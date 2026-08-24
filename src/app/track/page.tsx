"use client";

import { useState } from "react";
import { Phone, Search, QrCode, ArrowRight, User, Calendar, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { searchAppointmentByPhone } from "@/actions/checkin";

export default function TrackLookupPage() {
  const [phone, setPhone] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setIsSearching(true);
    const res = await searchAppointmentByPhone(phone);
    if (res.appointments) {
      setResults(res.appointments);
    } else {
      setResults([]);
    }
    setHasSearched(true);
    setIsSearching(false);
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-teal-100 text-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
          <QrCode className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Find Your Appointment
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
          Enter your registered mobile number to access your live token tracker and perform check-in.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Mobile Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                placeholder="e.g. +1 (555) 234-5678 or 555"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm outline-hidden transition-all text-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSearching || !phone.trim()}
            className="w-full py-3 px-4 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            {isSearching ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search Bookings</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Search Results ({results?.length || 0})
          </h2>

          {results && results.length > 0 ? (
            results.map((apt) => (
              <Link
                key={apt.id}
                href={`/track/${apt.id}`}
                className="block bg-white p-4 rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex flex-col items-center justify-center font-black text-sm">
                      <span className="text-[9px] uppercase font-bold text-teal-600">Token</span>
                      #{String(apt.tokenNumber).padStart(2, "0")}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
                        {apt.patientName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" /> {apt.appointmentDate}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" /> {apt.slotTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full border ${
                        apt.status === "BOOKED"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : apt.status === "CHECKED_IN"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : apt.status === "IN_PROGRESS"
                          ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {apt.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-700">No appointments found</p>
              <p className="text-xs text-slate-500 mt-0.5">
                No active bookings matching this mobile number were found.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
