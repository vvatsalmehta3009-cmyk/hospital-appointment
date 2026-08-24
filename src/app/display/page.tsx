"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import {
  Volume2,
  VolumeX,
  Maximize,
  Clock,
  Users,
  Stethoscope,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import { getDisplayBoardData } from "@/actions/display";

export default function WaitingRoomDisplayPage() {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDateStr, setCurrentDateStr] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const previousTokenRef = useRef<number | null>(null);

  // Digital clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
      setCurrentDateStr(
        now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric", year: "numeric" })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll TV data every 3 seconds
  const { data } = useSWR("tv-display-board", () => getDisplayBoardData(), {
    refreshInterval: 3000,
    revalidateOnFocus: true,
  });

  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (data?.nowServing?.tokenNumber) {
      if (
        previousTokenRef.current !== null &&
        previousTokenRef.current !== data.nowServing.tokenNumber
      ) {
        playChime();
      }
      previousTokenRef.current = data.nowServing.tokenNumber;
    }
  }, [data?.nowServing?.tokenNumber, soundEnabled]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const doctor = data?.currentDoctor;
  const activeSession = data?.activeSession;
  const nowServing = data?.nowServing;
  const upcomingQueue = data?.upcomingQueue || [];
  const stats = data?.stats || { completedToday: 0, totalWaiting: 0 };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden font-sans">
      
      {/* Top TV Bar */}
      <header className="flex items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-teal-500/20">
            <Stethoscope className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                CarePulse Clinic
              </h1>
              <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30">
                {activeSession?.sessionName || "Lobby TV"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-teal-300 font-medium">
              Consulting: {doctor?.name || "Dr. Sarah Jenkins, MD"} ({doctor?.specialization || "General Physician"})
            </p>
          </div>
        </div>

        {/* Live Clock & Buttons */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-mono font-black text-teal-400 tracking-wider">
              {currentTime}
            </div>
            <div className="text-xs text-slate-400 font-medium">{currentDateStr}</div>
          </div>

          <div className="flex items-center gap-2 pl-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                soundEnabled
                  ? "bg-slate-900 border-teal-500/40 text-teal-400"
                  : "bg-slate-900 border-slate-800 text-slate-500"
              }`}
              title={soundEnabled ? "Mute Announcement Chime" : "Enable Announcement Chime"}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Fullscreen Display"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Display: NOW SERVING vs UP NEXT */}
      <main className="my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Col: Giant NOW SERVING Display (7 cols) */}
        <div className="lg:col-span-7 bg-gradient-to-br from-teal-950 via-slate-900 to-slate-900 rounded-3xl p-8 sm:p-12 border-2 border-teal-500/50 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Tag */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs sm:text-sm font-black uppercase tracking-widest animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              NOW SERVING / IN CONSULTATION
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Room 101
            </span>
          </div>

          {/* Giant Center Token */}
          <div className="my-8 text-center">
            {nowServing ? (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <span className="text-xs sm:text-sm uppercase font-extrabold tracking-widest text-teal-400 block mb-1">
                  Token Number
                </span>
                <div className="text-8xl sm:text-9xl font-black tracking-tight text-white drop-shadow-[0_10px_25px_rgba(20,184,166,0.3)]">
                  #{String(nowServing.tokenNumber).padStart(2, "0")}
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-teal-100 mt-4 tracking-tight">
                  {nowServing.patientName}
                </div>
                <div className="text-sm font-semibold text-slate-400 mt-1">
                  {nowServing.sessionName}
                </div>
              </div>
            ) : (
              <div className="py-12">
                <div className="text-6xl sm:text-7xl font-black text-slate-700 my-2">
                  ---
                </div>
                <p className="text-xl font-bold text-slate-400 mt-2">
                  Doctor Ready for Next Patient
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Please wait for the next token announcement.
                </p>
              </div>
            )}
          </div>

          {/* Footer in Card */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>CarePulse OPD Consultation</span>
            <span className="text-teal-400 font-bold">Please proceed to Doctor&apos;s Room</span>
          </div>

        </div>

        {/* Right Col: UP NEXT IN WAITING ROOM (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-400" />
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                  Next In Waiting Room
                </h2>
              </div>
              <span className="text-xs font-bold text-teal-400 bg-teal-950/80 px-3 py-1 rounded-full border border-teal-800">
                {stats.totalWaiting} In Lobby
              </span>
            </div>

            {/* Upcoming Queue List */}
            <div className="space-y-3">
              {upcomingQueue.length > 0 ? (
                upcomingQueue.map((apt, idx) => (
                  <div
                    key={apt.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                      idx === 0
                        ? "bg-teal-950/40 border-teal-500/40 shadow-inner"
                        : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shadow-xs ${
                          idx === 0
                            ? "bg-teal-500 text-slate-950"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        #{String(apt.tokenNumber).padStart(2, "0")}
                      </div>
                      <div>
                        <div className="font-extrabold text-white text-base">
                          {apt.patientName}
                        </div>
                        <div className="text-xs text-slate-400">{activeSession?.sessionName}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-md ${
                          idx === 0
                            ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {idx === 0 ? "Up Next" : `In Line #${idx + 1}`}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-slate-500">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">Waiting Lobby is Clear</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Checked-in patients will appear here automatically.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-slate-800/80 text-center text-xs text-slate-500">
            Please tap check-in on your phone when you arrive at the clinic.
          </div>

        </div>

      </main>

      {/* Bottom Ticker */}
      <footer className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Completed Consultations Today: <strong className="text-white">{stats.completedToday}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <span>Average Consultation: <strong className="text-white">~12 mins</strong></span>
          </div>
        </div>

        <div className="text-slate-500 text-[11px]">
          CarePulse Live Queue System
        </div>
      </footer>

    </div>
  );
}
