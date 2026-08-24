"use client";

import { useState } from "react";
import { Phone, Check, ArrowRight, ShieldCheck, User } from "lucide-react";
import { connectGoogleAccount } from "@/actions/patientAuth";

interface GoogleConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (patient: any) => void;
}

export function GoogleConnectModal({
  isOpen,
  onClose,
  onSuccess,
}: GoogleConnectModalProps) {
  const [step, setStep] = useState<"SELECT_ACCOUNT" | "ENTER_PHONE">("SELECT_ACCOUNT");
  const [selectedGoogleUser, setSelectedGoogleUser] = useState<{
    name: string;
    email: string;
    avatarUrl: string;
    googleId: string;
  } | null>(null);
  
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Demo Google accounts for quick 1-click test during pitch demos
  const demoAccounts = [
    {
      name: "Alex Rivera",
      email: "alex.rivera@gmail.com",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
      googleId: "google-alex-101",
    },
    {
      name: "Sophia Chen",
      email: "sophia.chen@gmail.com",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150",
      googleId: "google-sophia-102",
    },
  ];

  if (!isOpen) return null;

  const handleSelectAccount = async (account: {
    name: string;
    email: string;
    avatarUrl?: string;
    googleId: string;
  }) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSelectedGoogleUser({
      name: account.name,
      email: account.email,
      avatarUrl: account.avatarUrl || "",
      googleId: account.googleId,
    });

    const res = await connectGoogleAccount({
      name: account.name,
      email: account.email,
      googleId: account.googleId,
      avatarUrl: account.avatarUrl,
    });

    if (res.requiresPhone) {
      setStep("ENTER_PHONE");
    } else if (res.patient) {
      onSuccess(res.patient);
      onClose();
    } else if (res.error) {
      setErrorMessage(res.error);
    }
    setIsLoading(false);
  };

  const handleCustomGoogleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customEmail.trim()) return;

    handleSelectAccount({
      name: customName,
      email: customEmail,
      googleId: `google-custom-${Date.now()}`,
    });
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim() || !selectedGoogleUser) return;

    setIsLoading(true);
    setErrorMessage(null);

    const res = await connectGoogleAccount({
      name: selectedGoogleUser.name,
      email: selectedGoogleUser.email,
      googleId: selectedGoogleUser.googleId,
      avatarUrl: selectedGoogleUser.avatarUrl,
      phone: phoneInput.trim(),
    });

    if (res.patient) {
      onSuccess(res.patient);
      onClose();
    } else {
      setErrorMessage(res.error || "Failed to link mobile number.");
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            {/* Google G Logo */}
            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shadow-2xs">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Connect with Google</h3>
              <p className="text-[11px] text-slate-500">Sign in to prefill and book in 1-click</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {errorMessage}
          </div>
        )}

        {/* STEP 1: SELECT OR ENTER GOOGLE ACCOUNT */}
        {step === "SELECT_ACCOUNT" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 font-medium">
              Choose an account to connect with CarePulse Clinic:
            </p>

            {/* Demo Accounts List */}
            <div className="space-y-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.googleId}
                  onClick={() => handleSelectAccount(account)}
                  disabled={isLoading}
                  className="w-full p-3 rounded-2xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 transition-all flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={account.avatarUrl}
                      alt={account.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-teal-700">
                        {account.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {account.email}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>

            {/* Custom Google Account Section */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Or enter your Google details:
              </span>

              <form onSubmit={handleCustomGoogleConnect} className="space-y-2.5">
                <input
                  type="text"
                  required
                  placeholder="Your Full Name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-hidden focus:border-teal-500"
                />
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-hidden focus:border-teal-500"
                />
                <button
                  type="submit"
                  disabled={isLoading || !customName || !customEmail}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Continue with this Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* STEP 2: LINK MOBILE NUMBER FOR TOKENS */}
        {step === "ENTER_PHONE" && selectedGoogleUser && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 flex items-center gap-3">
              {selectedGoogleUser.avatarUrl ? (
                <img
                  src={selectedGoogleUser.avatarUrl}
                  alt={selectedGoogleUser.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                  {selectedGoogleUser.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-bold text-xs text-slate-900">{selectedGoogleUser.name}</p>
                <p className="text-[11px] text-teal-800 font-mono">{selectedGoogleUser.email}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Please enter your <strong>Mobile Number</strong> to link your Google account for live clinic token announcements:
            </p>

            <form onSubmit={handlePhoneSubmit} className="space-y-3">
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  autoFocus
                  placeholder="e.g. +1 (555) 234-5678"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 text-sm outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !phoneInput.trim()}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Complete Registration & Save</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Your data is stored securely for instant 1-click bookings</span>
        </div>

      </div>
    </div>
  );
}
