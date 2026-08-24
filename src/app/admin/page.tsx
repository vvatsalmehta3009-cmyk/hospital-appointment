"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  Users,
  Clock,
  CheckCircle2,
  Phone,
  UserPlus,
  Play,
  Check,
  Sparkles,
  AlertCircle,
  Stethoscope,
  RefreshCw,
  Eye,
  Volume2,
  Lock,
  Plus,
  CalendarDays,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import {
  getAdminQueueData,
  updateAppointmentStatus,
  callNextPatient,
  createWalkInAppointment,
  createNewSession,
  toggleDoctorActiveStatus,
} from "@/actions/admin";
import {
  verifyStaffPin,
  checkStaffAuthStatus,
  logoutStaff,
} from "@/actions/auth";

export default function AdminQueueDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("WAITING");
  const [isCallingNext, setIsCallingNext] = useState(false);
  
  // Modals
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  
  // Walk-in form
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInNotes, setWalkInNotes] = useState("");
  const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState(false);

  // New Session form
  const [newSessionName, setNewSessionName] = useState("");
  const [newSessionStartTime, setNewSessionStartTime] = useState("14:00");
  const [newSessionEndTime, setNewSessionEndTime] = useState("16:00");
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check auth on load
  useEffect(() => {
    async function checkAuth() {
      const res = await checkStaffAuthStatus();
      setIsAuthenticated(res.isAuthenticated);
    }
    checkAuth();
  }, []);

  // Poll queue data only if authenticated
  const { data, error, mutate, isValidating } = useSWR(
    isAuthenticated ? ["admin-queue-data", selectedSessionId] : null,
    () => getAdminQueueData(selectedSessionId || undefined),
    {
      refreshInterval: 3500,
      revalidateOnFocus: true,
    }
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handlePinDigitPress = (digit: string) => {
    if (pinInput.length < 6) {
      const newPin = pinInput + digit;
      setPinInput(newPin);
      if (newPin.length === 4) {
        setTimeout(() => {
          verifyStaffPin(newPin).then((res) => {
            if (res.success) {
              setIsAuthenticated(true);
              setPinInput("");
            } else {
              setPinError(res.error || "Incorrect Staff PIN.");
              setPinInput("");
            }
          });
        }, 150);
      }
    }
  };

  const handlePinBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const handleLogout = async () => {
    await logoutStaff();
    setIsAuthenticated(false);
    setPinInput("");
  };

  const handleStatusChange = async (appointmentId: string, status: string) => {
    const res = await updateAppointmentStatus(appointmentId, status);
    if (res.success) {
      showToast(`Status updated to ${status}`);
      mutate();
    }
  };

  const handleCallNext = async () => {
    setIsCallingNext(true);
    const res = await callNextPatient(selectedSessionId || undefined);
    if (res.success) {
      showToast(res.message || "Next patient called!");
      mutate();
    } else if (res.error) {
      showToast(res.error);
    }
    setIsCallingNext(false);
  };

  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim() || !walkInPhone.trim()) return;

    setIsSubmittingWalkIn(true);
    const res = await createWalkInAppointment({
      sessionId: selectedSessionId || undefined,
      patientName: walkInName,
      patientPhone: walkInPhone,
      notes: walkInNotes,
    });

    if (res.success) {
      showToast(res.message || "Walk-in patient added to session queue!");
      setWalkInName("");
      setWalkInPhone("");
      setWalkInNotes("");
      setIsWalkInModalOpen(false);
      mutate();
    }
    setIsSubmittingWalkIn(false);
  };

  const handleCreateSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim() || !newSessionStartTime || !newSessionEndTime) return;

    setIsSubmittingSession(true);
    const res = await createNewSession({
      sessionName: newSessionName,
      startTime: newSessionStartTime,
      endTime: newSessionEndTime,
    });

    if (res.success) {
      showToast("New session created for today!");
      setNewSessionName("");
      setIsNewSessionModalOpen(false);
      mutate();
    }
    setIsSubmittingSession(false);
  };

  const handleDoctorSwitch = async (doctorId: string) => {
    const res = await toggleDoctorActiveStatus(doctorId);
    if (res.success) {
      showToast(`Active doctor switched to ${res.activeDoctor?.name}`);
      mutate();
    }
  };

  // 1. Loading Auth State
  if (isAuthenticated === null) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-500">Checking clinic credentials...</p>
      </div>
    );
  }

  // 2. PIN Lock Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-slate-900 text-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-900/10">
            <Lock className="w-7 h-7" />
          </div>

          <span className="text-[10px] uppercase font-extrabold tracking-widest px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Staff Access Only
          </span>

          <h2 className="text-xl font-bold text-slate-900 mt-2.5">
            Clinic Desk Verification
          </h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Enter 4-digit Staff PIN to access live session queue controls.
          </p>

          {pinError && (
            <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-center gap-1.5 animate-shake">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          {/* PIN Dots */}
          <div className="flex justify-center items-center gap-3 mb-6">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  pinInput.length > index
                    ? "bg-teal-600 border-teal-600 scale-110 shadow-xs"
                    : "border-slate-300 bg-slate-100"
                }`}
              />
            ))}
          </div>

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-2.5 mb-6 max-w-[260px] mx-auto">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePinDigitPress(num)}
                className="w-16 h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-bold text-lg border border-slate-200 transition-all flex items-center justify-center mx-auto cursor-pointer"
              >
                {num}
              </button>
            ))}
            <div className="w-16 h-12" />
            <button
              type="button"
              onClick={() => handlePinDigitPress("0")}
              className="w-16 h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-bold text-lg border border-slate-200 transition-all flex items-center justify-center mx-auto cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handlePinBackspace}
              className="w-16 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 border border-slate-200 transition-all flex items-center justify-center mx-auto cursor-pointer"
            >
              ⌫
            </button>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
            Default Staff PIN: <strong className="text-slate-800 font-mono">1234</strong>
          </div>

          <div className="mt-4">
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-700 font-semibold">
              ← Return to Patient Booking
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated Admin View
  const appointments = data?.appointments || [];
  const sessions = data?.sessions || [];
  const metrics = data?.metrics || {
    total: 0,
    waiting: 0,
    inProgress: 0,
    completed: 0,
    booked: 0,
    skipped: 0,
  };
  const activeDoctor = data?.activeDoctor;
  const currentActive = data?.currentActivePatient;
  const nextInLine = data?.nextInLinePatient;
  const selectedSession = data?.selectedSession;

  const filteredAppointments = appointments.filter((apt) => {
    if (selectedTab === "ALL") return true;
    if (selectedTab === "WAITING") return apt.status === "CHECKED_IN" || apt.status === "IN_PROGRESS";
    if (selectedTab === "BOOKED") return apt.status === "BOOKED";
    if (selectedTab === "COMPLETED") return apt.status === "COMPLETED";
    if (selectedTab === "SKIPPED") return apt.status === "SKIPPED";
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-teal-100 text-teal-800 border border-teal-200">
              Staff Desk
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {data?.displayDate || "Today"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Session Queue Management
          </h1>
        </div>

        {/* Doctor Active Switcher & Lock Desk */}
        <div className="flex items-center gap-2 sm:gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1.5 pl-2">
            <Stethoscope className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold text-slate-700 hidden sm:inline">Doctor:</span>
          </div>
          
          <select
            value={activeDoctor?.id || ""}
            onChange={(e) => handleDoctorSwitch(e.target.value)}
            className="text-xs font-semibold text-teal-900 bg-teal-50 border border-teal-200 rounded-xl px-3 py-1.5 outline-hidden focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
          >
            {data?.doctors?.map((doc: any) => (
              <option key={doc.id} value={doc.id}>
                {doc.name} {doc.id === activeDoctor?.id ? "(Active)" : ""}
              </option>
            ))}
          </select>

          <button
            onClick={() => mutate()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Refresh Live Sync"
          >
            <RefreshCw className={`w-4 h-4 ${isValidating ? "animate-spin text-teal-600" : ""}`} />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            title="Lock Desk"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lock</span>
          </button>
        </div>
      </div>

      {/* SESSION SELECTOR BAR (Today's Sessions) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1 shrink-0">
            <CalendarDays className="w-4 h-4 text-teal-600" />
            Sessions:
          </span>
          {sessions.map((s: any) => {
            const isSelected = (selectedSessionId || data?.activeSessionId) === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                <span>{s.sessionName}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isSelected ? "bg-teal-700 text-teal-100" : "bg-slate-200 text-slate-600"}`}>
                  {s.startTime} - {s.endTime}
                </span>
                <span className={`text-[10px] font-mono ${isSelected ? "text-teal-200" : "text-slate-400"}`}>
                  ({s.bookedCount}/{s.maxTokens})
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsNewSessionModalOpen(true)}
          className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Session</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Session Total</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{metrics.total}</span>
        </div>
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Waiting Lobby</span>
          <span className="text-2xl font-black text-emerald-900 mt-1 block">{metrics.waiting}</span>
        </div>
        <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 shadow-2xs">
          <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">In Consultation</span>
          <span className="text-2xl font-black text-indigo-900 mt-1 block">{metrics.inProgress}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Completed</span>
          <span className="text-2xl font-black text-slate-800 mt-1 block">{metrics.completed}</span>
        </div>
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Booked (Not Arrived)</span>
          <span className="text-2xl font-black text-amber-900 mt-1 block">{metrics.booked}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Skipped</span>
          <span className="text-2xl font-black text-slate-600 mt-1 block">{metrics.skipped}</span>
        </div>
      </div>

      {/* Main Doctor Action Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Left: Active Consultation Card (7 cols) */}
        <div className="lg:col-span-7 bg-gradient-to-br from-slate-900 to-teal-950 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                In-Consultation Room
              </span>

              <span className="text-xs text-teal-300/80">
                {selectedSession?.sessionName || "OPD Session"}
              </span>
            </div>

            {currentActive ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 my-2">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex flex-col items-center justify-center font-black shadow-inner">
                    <span className="text-[10px] text-indigo-300 font-bold uppercase">Token</span>
                    <span className="text-3xl text-white">#{String(currentActive.tokenNumber).padStart(2, "0")}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{currentActive.patientName}</h3>
                    <p className="text-xs text-teal-200 flex items-center gap-2 mt-0.5">
                      <span>{currentActive.patientPhone}</span>
                    </p>
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStatusChange(currentActive.id, "COMPLETED")}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete</span>
                  </button>

                  <button
                    onClick={() => handleStatusChange(currentActive.id, "SKIPPED")}
                    className="px-3.5 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-200 border border-rose-500/30 font-semibold text-xs transition-all cursor-pointer"
                  >
                    Skip
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-teal-200/60">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">Doctor is ready for next patient</p>
                <p className="text-xs text-teal-300/60 mt-0.5">
                  Click &quot;Call Next Patient&quot; below to pull the next checked-in token.
                </p>
              </div>
            )}
          </div>

          {/* Call Next Button Bar */}
          <div className="pt-4 mt-4 border-t border-teal-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-teal-200">
              {nextInLine ? (
                <span>
                  Next in line: <strong className="text-white">#{String(nextInLine.tokenNumber).padStart(2, "0")} ({nextInLine.patientName})</strong>
                </span>
              ) : (
                <span className="text-teal-400/60">No patients waiting in lobby</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCallNext}
              disabled={isCallingNext || !nextInLine}
              className="py-3 px-5 rounded-2xl bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-black text-sm shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {isCallingNext ? (
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-slate-950" />
                  <span>Call Next Patient</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Quick Walk-in & TV Screen Shortcuts (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Add Walk-in Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-1">
                <UserPlus className="w-5 h-5 text-teal-600" />
                <span>Issue Walk-In Token</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Assigns the next token in <strong>{selectedSession?.sessionName || "Active Session"}</strong>.
              </p>
            </div>

            <button
              onClick={() => setIsWalkInModalOpen(true)}
              className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Issue Walk-In Token</span>
            </button>
          </div>

          {/* Open TV Display */}
          <div className="bg-gradient-to-r from-indigo-50 to-teal-50 rounded-3xl p-5 border border-indigo-200/80 shadow-xs flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Waiting Room TV Screen</h4>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Launch the fullscreen live calling board.
              </p>
            </div>
            <Link
              href="/display"
              target="_blank"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all shrink-0"
            >
              Launch TV ↗
            </Link>
          </div>

        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "WAITING", label: "Waiting / Inside", count: metrics.waiting + metrics.inProgress },
              { id: "BOOKED", label: "Booked (Not Arrived)", count: metrics.booked },
              { id: "COMPLETED", label: "Completed", count: metrics.completed },
              { id: "SKIPPED", label: "Skipped", count: metrics.skipped },
              { id: "ALL", label: "All Bookings", count: metrics.total },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedTab === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
              <tr>
                <th className="px-5 py-3">Token #</th>
                <th className="px-5 py-3">Patient Name</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Session</th>
                <th className="px-5 py-3">Arrival Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Token */}
                    <td className="px-5 py-3.5 font-black text-slate-900 text-sm">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-900 font-black border border-slate-200">
                        #{String(apt.tokenNumber).padStart(2, "0")}
                      </span>
                    </td>

                    {/* Patient */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{apt.patientName}</div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Source: {apt.bookingSource === "WALK_IN" ? "Walk-In" : "Online"}
                        {apt.patientEmail ? ` • ${apt.patientEmail}` : ""}
                        {apt.notes ? ` • Note: ${apt.notes}` : ""}
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {apt.patientPhone}
                    </td>

                    {/* Session */}
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-800">{apt.sessionName}</span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                          apt.status === "IN_PROGRESS"
                            ? "bg-indigo-100 text-indigo-900 border-indigo-300 animate-pulse"
                            : apt.status === "CHECKED_IN"
                            ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                            : apt.status === "BOOKED"
                            ? "bg-amber-50 text-amber-900 border-amber-200"
                            : apt.status === "COMPLETED"
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        {apt.status === "IN_PROGRESS" && <Play className="w-3 h-3 fill-indigo-600 text-indigo-600" />}
                        {apt.status === "CHECKED_IN" && <Check className="w-3 h-3 text-emerald-600" />}
                        {apt.status.replace("_", " ")}
                      </span>
                      {apt.checkedInAt && (
                        <span className="block text-[9px] text-slate-400 mt-0.5">
                          Arrived: {apt.checkedInAt}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right space-x-1.5">
                      {apt.status === "BOOKED" && (
                        <button
                          onClick={() => handleStatusChange(apt.id, "CHECKED_IN")}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 text-xs font-bold cursor-pointer"
                        >
                          Mark Arrived
                        </button>
                      )}

                      {apt.status === "CHECKED_IN" && (
                        <button
                          onClick={() => handleStatusChange(apt.id, "IN_PROGRESS")}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold shadow-2xs cursor-pointer"
                        >
                          Start Visit
                        </button>
                      )}

                      {apt.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => handleStatusChange(apt.id, "COMPLETED")}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow-2xs cursor-pointer"
                        >
                          Finish
                        </button>
                      )}

                      {apt.status !== "COMPLETED" && apt.status !== "SKIPPED" && (
                        <button
                          onClick={() => handleStatusChange(apt.id, "SKIPPED")}
                          className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-rose-600 text-xs font-medium cursor-pointer"
                          title="Skip Patient"
                        >
                          Skip
                        </button>
                      )}

                      <Link
                        href={`/track/${apt.id}`}
                        target="_blank"
                        className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-slate-800 text-xs inline-block"
                        title="View Patient Live View"
                      >
                        <Eye className="w-3.5 h-3.5 inline" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-xs">
                    No appointments in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Walk-In Registration Modal */}
      {isWalkInModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Issue Walk-In Token</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWalkInModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWalkInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Brown"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +1 (555) 123-4567"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Symptoms / Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fever, blood pressure check"
                  value={walkInNotes}
                  onChange={(e) => setWalkInNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWalkInModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWalkIn || !walkInName.trim() || !walkInPhone.trim()}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingWalkIn ? "Assigning..." : "Assign Next Token"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Create Session Modal */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-teal-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Add Session for Today</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSessionModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSessionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Session Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Session 3 (Night OPD)"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={newSessionStartTime}
                    onChange={(e) => setNewSessionStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={newSessionEndTime}
                    onChange={(e) => setNewSessionEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900">
                <span className="font-bold block">⚡ Automatic 1-Hour Slicing</span>
                <span className="text-[11px] text-teal-800">
                  Each 1-hour window will be automatically generated with a capacity of 10 patient bookings per slot.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSession || !newSessionName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingSession ? "Creating..." : "Save Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
