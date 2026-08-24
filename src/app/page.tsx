"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  RefreshCw,
  Zap,
  Info,
  CalendarDays,
  UserCheck,
  LogOut,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import {
  getTodaySessions,
  bookSessionAppointment,
  lookupPatientProfile,
  SessionWithSlots,
  HourlySlot,
} from "@/actions/appointments";
import { GoogleConnectModal } from "@/components/GoogleConnectModal";
import { PatientRegisterModal } from "@/components/PatientRegisterModal";

const LOCAL_STORAGE_PROFILE_KEY = "carepulse_patient_profile";

export default function BookingPage() {
  const [sessions, setSessions] = useState<SessionWithSlots[]>([]);
  const [doctor, setDoctor] = useState<any>(null);
  const [todayFormatted, setTodayFormatted] = useState<string>("");

  // Selected session and hourly slot
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSlotDisplay, setSelectedSlotDisplay] = useState<string | null>(null);

  // Registered patient state
  const [registeredPatient, setRegisteredPatient] = useState<{
    id?: string;
    name: string;
    phone: string;
    email?: string;
    avatarUrl?: string;
    googleId?: string;
  } | null>(null);

  // Form inputs
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Modals
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [existingBookingId, setExistingBookingId] = useState<string | null>(null);
  const [suggestedName, setSuggestedName] = useState<string | null>(null);
  const [bookingSuccessData, setBookingSuccessData] = useState<{
    id: string;
    tokenNumber: number;
    patientName: string;
    sessionName: string;
    slotTime: string;
    doctorName: string;
  } | null>(null);

  // Load saved profile on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name && parsed.phone) {
          setRegisteredPatient(parsed);
          setPatientName(parsed.name);
          setPatientPhone(parsed.phone);
          if (parsed.email) setPatientEmail(parsed.email);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const loadSessionsData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await getTodaySessions();

    if (result.error) {
      setErrorMessage(result.error);
    } else {
      setDoctor(result.doctor || null);
      setTodayFormatted(result.todayFormatted || "");
      const sessionList = result.sessions || [];
      setSessions(sessionList);

      // Default select first available slot if not selected
      if (!selectedSlotDisplay && sessionList.length > 0) {
        for (const sess of sessionList) {
          const firstOpenSlot = sess.slots.find((s) => s.canBook);
          if (firstOpenSlot) {
            setSelectedSessionId(sess.id);
            setSelectedSlotDisplay(firstOpenSlot.slotDisplay);
            break;
          }
        }
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadSessionsData();
    const interval = setInterval(loadSessionsData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAuthSuccess = (patient: any) => {
    const profile = {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      email: patient.email || "",
      avatarUrl: patient.avatarUrl || "",
      googleId: patient.googleId || "",
    };

    setRegisteredPatient(profile);
    setPatientName(profile.name);
    setPatientPhone(profile.phone);
    setPatientEmail(profile.email || "");

    try {
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  };

  const handleSignOut = () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
      setRegisteredPatient(null);
      setPatientName("");
      setPatientPhone("");
      setPatientEmail("");
    } catch {
      // ignore
    }
  };

  const handleEmailOrPhoneBlur = async (identifier: string) => {
    if (!identifier.trim() || registeredPatient) return;
    const res = await lookupPatientProfile(identifier);
    if (res.profile) {
      setSuggestedName(res.profile.name);
      if (!patientName) setPatientName(res.profile.name);
      if (!patientPhone && res.profile.phone) setPatientPhone(res.profile.phone);
      if (!patientEmail && res.profile.email) setPatientEmail(res.profile.email);
    }
  };

  const handleSlotSelect = (sessionId: string, slotDisplay: string) => {
    setSelectedSessionId(sessionId);
    setSelectedSlotDisplay(slotDisplay);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !selectedSlotDisplay) {
      setErrorMessage("Please select a 1-hour time slot.");
      return;
    }
    if (!patientName.trim() || !patientPhone.trim()) {
      setErrorMessage("Please provide both your full name and mobile number.");
      return;
    }

    setErrorMessage(null);
    setExistingBookingId(null);

    startTransition(async () => {
      const response = await bookSessionAppointment({
        sessionId: selectedSessionId,
        slotTime: selectedSlotDisplay,
        patientName,
        patientPhone,
        patientEmail,
        notes,
      });

      if (response.error) {
        setErrorMessage(response.error);
        if (response.existingAppointmentId) {
          setExistingBookingId(response.existingAppointmentId);
        }
      } else if (response.appointment) {
        if (!registeredPatient) {
          const profile = {
            name: patientName.trim(),
            phone: patientPhone.trim(),
            email: patientEmail.trim(),
          };
          setRegisteredPatient(profile);
          try {
            localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
          } catch {
            // ignore
          }
        }

        setBookingSuccessData(response.appointment);
        loadSessionsData();
      }
    });
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      
      {/* 1. Header Banner: Doctor & Today's Schedule */}
      <div className="bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-teal-700/60 border border-teal-500/30 flex items-center justify-center text-white overflow-hidden shadow-inner shrink-0">
              {doctor?.avatarUrl ? (
                <img
                  src={doctor.avatarUrl}
                  alt={doctor.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Stethoscope className="w-8 h-8 text-teal-300" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Doctor on Duty Today
                </span>
                <span className="text-xs text-teal-200/80 hidden sm:inline">Open Full-Day Booking</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {doctor ? doctor.name : "Dr. Sarah Jenkins, MD"}
              </h1>
              <p className="text-teal-200 text-sm font-medium">
                {doctor ? doctor.specialization : "Family Medicine & General Health"}
              </p>
              <div className="flex items-center gap-2 text-teal-300/80 text-xs mt-1">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>{todayFormatted || "Today's Schedule"}</span>
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-teal-950/70 p-3.5 sm:p-4 rounded-2xl border border-teal-700/40 flex items-center gap-4">
            <div>
              <span className="text-[11px] text-teal-300 uppercase tracking-wider block font-medium">Consultation</span>
              <span className="text-xl font-black text-white">${doctor?.consultationFee || 25}</span>
            </div>
            <div className="border-l border-teal-800/80 pl-4">
              <span className="text-[11px] text-teal-300 uppercase tracking-wider block font-medium">Hourly Capacity</span>
              <span className="text-sm font-bold text-emerald-300">10 Patients / Hour</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Patient Registration / Google Connect Bar */}
      {registeredPatient ? (
        <div className="bg-white rounded-2xl p-4 border border-teal-200 shadow-xs mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {registeredPatient.avatarUrl ? (
              <img
                src={registeredPatient.avatarUrl}
                alt={registeredPatient.name}
                className="w-10 h-10 rounded-full object-cover border border-teal-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm">
                {registeredPatient.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">
                  {registeredPatient.name}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  <UserCheck className="w-3 h-3" /> Registered Patient
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {registeredPatient.phone} {registeredPatient.email ? `• ${registeredPatient.email}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-teal-700 font-medium hidden md:inline">
              ✓ Details prefilled for 1-click booking
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-slate-400 hover:text-slate-700 font-semibold px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Switch Profile</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-teal-50 via-indigo-50/50 to-white rounded-2xl p-4 border border-teal-200 shadow-xs mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Register Once for 1-Click Fast Booking
              </h3>
              <p className="text-xs text-slate-500">
                Connect your Google account or mobile number to prefill all details automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsGoogleModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Connect Google</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Grid: Sessions with 1-Hour Slots & Booking Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Today's Sessions & Hourly Slots (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600" />
                <span>Today&apos;s Sessions & 1-Hour Slots</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All sessions open for full-day booking. Maximum <strong>10 patients per 1-hour slot</strong>.
              </p>
            </div>

            <button
              onClick={loadSessionsData}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              title="Refresh slots"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-teal-600" : ""}`} />
            </button>
          </div>

          {/* Session Groups */}
          {isLoading && sessions.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-semibold">Loading today&apos;s sessions and slots...</p>
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-6">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs"
                >
                  {/* Session Title Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                        <h3 className="font-extrabold text-slate-900 text-base">
                          {session.sessionName}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {session.startTimeFormatted} - {session.endTimeFormatted} ({session.durationHours} Hours Session)
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                        {session.totalSessionBooked} / {session.totalSessionCapacity} Booked
                      </span>
                    </div>
                  </div>

                  {/* 1-Hour Slots Grid for this session */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Select Your Preferred 1-Hour Slot:
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {session.slots.map((slot) => {
                        const isSelected =
                          selectedSessionId === session.id &&
                          selectedSlotDisplay === slot.slotDisplay;
                        const isCanBook = slot.canBook;

                        return (
                          <button
                            key={slot.slotKey}
                            type="button"
                            disabled={!isCanBook}
                            onClick={() => handleSlotSelect(session.id, slot.slotDisplay)}
                            className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20 scale-[1.02]"
                                : isCanBook
                                ? "bg-slate-50/70 hover:bg-teal-50/60 hover:border-teal-300 text-slate-900 border-slate-200"
                                : "bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-extrabold text-xs sm:text-sm">
                                {slot.slotDisplay}
                              </span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-white shrink-0" />
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-slate-200/40">
                              <span className={isSelected ? "text-teal-100 font-medium" : "text-slate-500"}>
                                {slot.tokensBooked}/10 Booked
                              </span>
                              <span
                                className={`font-bold ${
                                  isSelected
                                    ? "text-white"
                                    : slot.isFull
                                    ? "text-rose-600 font-bold"
                                    : slot.isPast
                                    ? "text-slate-400"
                                    : "text-teal-700"
                                }`}
                              >
                                {slot.statusText}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-slate-500">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-700">No sessions scheduled for today</p>
              <p className="text-xs text-slate-500 mt-0.5">Please check back when the doctor opens the next session.</p>
            </div>
          )}

          {/* Info Card */}
          <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/70 text-xs text-teal-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Hourly Booking Advantage:</strong> Each 1-hour slot is capped at 10 patients so you experience minimal waiting. If a slot is full, simply select the next 1-hour slot in the same session.
            </p>
          </div>
        </div>

        {/* Right Column: 1-Click Fast Booking Form (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm sticky top-20">
            
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-teal-600" />
                <span>Patient Booking</span>
              </h2>

              {registeredPatient && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                  <Zap className="w-3 h-3 fill-teal-600 text-teal-600" /> 1-Click Fast
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mb-5">
              {registeredPatient
                ? "Your details are prefilled. Just tap book below."
                : "Enter your mobile number to prefill or book."}
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-1.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
                {existingBookingId && (
                  <Link
                    href={`/track/${existingBookingId}`}
                    className="ml-6 text-teal-700 font-bold underline hover:text-teal-900 text-xs"
                  >
                    → Open Your Active Token Tracker
                  </Link>
                )}
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              
              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +1 (555) 234-5678"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    onBlur={(e) => handleEmailOrPhoneBlur(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900"
                  />
                </div>
              </div>

              {/* Patient Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Patient Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alice Cooper"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900"
                  />
                </div>
                {suggestedName && !registeredPatient && (
                  <p className="text-[11px] text-teal-700 mt-1 font-medium">
                    ✓ Recognized returning patient: <strong>{suggestedName}</strong>
                  </p>
                )}
              </div>

              {/* Email (Optional) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="e.g. alice@example.com"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    onBlur={(e) => handleEmailOrPhoneBlur(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900"
                  />
                </div>
              </div>

              {/* Symptoms / Notes (Optional) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Symptoms / Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cough, routine checkup"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900"
                />
              </div>

              {/* Selected Slot Summary Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Session:</span>
                  <strong className="text-slate-900 font-bold">
                    {selectedSession?.sessionName || "None selected"}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>1-Hour Slot:</span>
                  <strong className={selectedSlotDisplay ? "text-teal-700 font-black text-sm" : "text-amber-600"}>
                    {selectedSlotDisplay || "Please pick a slot"}
                  </strong>
                </div>
              </div>

              {/* 1-Click Submit Button */}
              <button
                type="submit"
                disabled={isPending || !selectedSessionId || !selectedSlotDisplay}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Allocating Token...</span>
                  </>
                ) : selectedSlotDisplay ? (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Confirm Booking & Get Token</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <span>Select a 1-hour slot</span>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Instant token allocation & arrival check-in enabled</span>
              </div>
            </form>
          </div>
        </div>

      </div>

      {/* 4. Booking Success Modal */}
      {bookingSuccessData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="text-xs uppercase font-bold tracking-wider text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              Token Confirmed
            </span>

            <h3 className="text-2xl font-bold text-slate-900 mt-3">
              You&apos;re All Set, {bookingSuccessData.patientName}!
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {bookingSuccessData.sessionName}
            </p>

            {/* Giant Token Box */}
            <div className="my-6 p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-teal-300 text-center shadow-inner">
              <span className="text-[11px] uppercase tracking-widest font-extrabold text-teal-800">
                Your Token Number
              </span>
              <div className="text-5xl font-black text-teal-900 my-1 tracking-tight">
                #{String(bookingSuccessData.tokenNumber).padStart(2, "0")}
              </div>
              <div className="text-xs font-bold text-teal-700 mt-1">
                Slot: {bookingSuccessData.slotTime}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 mb-6">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Arrival Check-In:
              </p>
              <p className="mt-1 text-amber-800/90 text-[11px] leading-relaxed">
                When you arrive at the clinic during your 1-hour slot, tap <em>&quot;I have arrived (Check-In)&quot;</em> on your live tracker.
              </p>
            </div>

            <div className="space-y-2.5">
              <Link
                href={`/track/${bookingSuccessData.id}`}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 text-sm"
              >
                <span>Open Live Tracker & Check-In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={() => setBookingSuccessData(null)}
                className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Connect Modal */}
      <GoogleConnectModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Patient Register Modal */}
      <PatientRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onOpenGoogleModal={() => setIsGoogleModalOpen(true)}
      />

    </div>
  );
}
