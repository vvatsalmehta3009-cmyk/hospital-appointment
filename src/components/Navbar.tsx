"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stethoscope, QrCode } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  // Hide top navigation on fullscreen TV display mode
  if (pathname === "/display") {
    return null;
  }

  // Strictly patient-facing links only (Zero staff/admin links visible to patients)
  const patientNavLinks = [
    { href: "/", label: "Book Appointment", icon: Stethoscope },
    { href: "/track", label: "Check-in & Status", icon: QrCode },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20 group-hover:scale-105 transition-transform">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-slate-900 tracking-tight">CarePulse</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                Clinic
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">Family & General Outpatient Clinic</p>
          </div>
        </Link>

        {/* Patient Navigation Only */}
        <nav className="flex items-center gap-2">
          {patientNavLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                  isActive
                    ? "bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-teal-600" : ""}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
