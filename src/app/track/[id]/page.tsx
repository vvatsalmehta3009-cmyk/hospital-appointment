"use client";

import { useState } from "react";
import useSWR from "swr";
import confetti from "canvas-confetti";
import {
  CheckCircle2,
  Clock,
  User,
  Stethoscope,
  MapPin,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  Share2,
  Check,
  RefreshCw,
  Info,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { getAppointmentLiveStatus, performPatientCheckIn } from "@/actions/checkin";

export default function PatientTrackerPage({
  params,
}: {
  params: { id: string };
}) {
  const appointmentId = params.id;
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInSuccessMsg, setCheckInSuccessMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // SWR for live polling every 4 seconds
  const { data, error, mutate, isValidating } = useSWR(
    `appointment-live-${appointmentId}`,
    () => getAppointmentLiveStatus(appointmentId),
    {
      refreshInterval: 4000,
      revalidateOnFocus: true,
    }
  );

  const appointment = data?.appointment;
  const doctor = data?.doctor;
  const queue = data?.queue;

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }
  };

  const handleSelfCheckIn = async () => {
    setIsCheckingIn(true);
    const res = await performPatientCheckIn(appointmentId);
    if (res.success) {
      triggerConfetti();
      setCheckInSuccessMsg("Arrival recorded! Your token is now active in the doctor's waiting queue.");
      mutate();
    }
    setIsCheckingIn(false);
  };

  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (error || (data && "error" in data && data.error)) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Appointment Not Found</h1>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          The requested booking link is invalid or has expired.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Book New Appointment
        </Link>
      </div>
    );
  }

  if (!data || !appointment) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium text-slate-600">Loading live token status...</p>
      </div>
    );
  }

  const isBooked = appointment.status === "BOOKED";
  const isCheckedIn = appointment.status === "CHECKED_IN";
  const isInProgress = appointment.status === "IN_PROGRESS";
  const isCompleted = appointment.status === "COMPLETED";
  const isSkipped = appointment.status === "SKIPPED";

  const steps = [
    { label: "Booked", done: true, active: isBooked },
    { label: "Checked In", done: !isBooked, active: isCheckedIn },
    { label: "With Doctor", done: isCompleted || isInProgress, active: isInProgress },
    { label: "Completed", done: isCompleted, active: isCompleted },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      
      {/* Top Action Bar */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Booking
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => mutate()}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-2xs cursor-pointer"
            title="Refresh Live Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? "animate-spin text-teal-600" : ""}`} />
            <span className="hidden sm:inline">Live Sync</span>
          </button>

          <button
            onClick={copyShareLink}
            className="flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-teal-100 cursor-pointer transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Link Copied!" : "Share Link"}</span>
          </button>
        </div>
      </div>

      {/* Main Token Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8 text-center relative overflow-hidden mb-6">
        
        {/* Status Badge */}
        <div className="flex justify-center mb-3">
          {isBooked && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Action Required: Check-In Upon Arrival
            </span>
          )}
          {isCheckedIn && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Checked In • Waiting in Lobby
            </span>
          )}
          {isInProgress && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 animate-bounce">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Now Inside with Doctor
            </span>
          )}
          {isCompleted && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Consultation Completed
            </span>
          )}
          {isSkipped && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
              Token Skipped (Patient Absent)
            </span>
          )}
        </div>

        <p className="text-xs uppercase font-extrabold tracking-widest text-slate-400">
          Your Session Token Number
        </p>

        {/* Big Token Number */}
        <div className="text-6xl sm:text-7xl font-black text-slate-900 my-2 tracking-tight">
          #{String(appointment.tokenNumber).padStart(2, "0")}
        </div>

        <p className="text-base font-bold text-slate-800">{appointment.patientName}</p>
        
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-1">
          <span className="font-semibold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
            {appointment.sessionName}
          </span>
          <span>•</span>
          <span>{appointment.appointmentDate}</span>
        </div>

        {/* Dynamic Stepper */}
        <div className="my-8 max-w-md mx-auto">
          <div className="grid grid-cols-4 relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
            {steps.map((step, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step.active
                      ? "bg-teal-600 text-white ring-4 ring-teal-100 scale-110 shadow-md"
                      : step.done
                      ? "bg-teal-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {step.done && !step.active ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`text-[10px] sm:text-[11px] font-semibold mt-2 ${
                    step.active
                      ? "text-teal-700 font-bold"
                      : step.done
                      ? "text-slate-800"
                      : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CHECK-IN CTA BUTTON */}
        {isBooked && (
          <div className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-teal-50 to-emerald-50 border-2 border-teal-400/60 shadow-sm text-left">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Have you arrived at the clinic?</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tap below to notify the doctor and activate your token on the waiting room board.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSelfCheckIn}
              disabled={isCheckingIn}
              className="w-full py-4 px-5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-base shadow-lg shadow-teal-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {isCheckingIn ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Checking you in...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>I Have Arrived (Check-In Now)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Checked-In confirmation */}
        {isCheckedIn && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs text-left flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-emerald-900">You are Checked In!</p>
              <p className="text-emerald-800 mt-0.5">
                {checkInSuccessMsg || "Your arrival is intimated. Please relax in the waiting lobby. Your token will be called on the TV screen."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Live Position & Doctor Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        
        {/* Waiting Position */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>Session Queue Position</span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
              <span className="text-slate-600">Currently Calling:</span>
              <strong className="text-indigo-600 font-extrabold text-sm">
                {queue?.currentlyServingToken ? `Token #${String(queue.currentlyServingToken).padStart(2, "0")}` : "Ready for next"}
              </strong>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
              <span className="text-slate-600">Patients Ahead of You:</span>
              <strong className="text-slate-900 font-bold text-sm">
                {queue?.patientsAhead !== undefined ? queue.patientsAhead : "-"}
              </strong>
            </div>

            <div className="flex justify-between items-center py-1.5 text-xs">
              <span className="text-slate-600">Est. Waiting Time:</span>
              <strong className="text-teal-700 font-bold text-sm">
                {queue?.estimatedWaitMinutes ? `~${queue.estimatedWaitMinutes} mins` : "Next in line"}
              </strong>
            </div>
          </div>
        </div>

        {/* Doctor Info */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">
            <Stethoscope className="w-4 h-4 text-teal-600" />
            <span>Consulting Physician</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
              {doctor?.avatarUrl ? (
                <img src={doctor.avatarUrl} alt={doctor.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-teal-600" />
              )}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{doctor?.name || "Dr. Sarah Jenkins"}</p>
              <p className="text-xs text-teal-700 font-medium">{doctor?.specialization}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Room 101 • OPD Desk</p>
            </div>
          </div>
        </div>
      </div>

      {/* Helpful Instructions */}
      <div className="bg-slate-100/80 rounded-2xl p-4 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Keep this tracker open on your phone. You will see real-time updates as previous consultations finish and the doctor calls your token number.
        </p>
      </div>

    </div>
  );
}
