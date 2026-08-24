"use server";

import { cookies } from "next/headers";

const DEFAULT_PIN = process.env.CLINIC_ADMIN_PIN || "1234";
const AUTH_COOKIE_NAME = "carepulse_staff_session";

export async function verifyStaffPin(pin: string) {
  try {
    const trimmed = pin.trim();

    if (trimmed === DEFAULT_PIN) {
      // Set secure session cookie valid for 8 hours (typical clinic shift)
      const cookieStore = cookies();
      cookieStore.set(AUTH_COOKIE_NAME, "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 8, // 8 hours
        path: "/",
      });

      return { success: true };
    }

    return { error: "Incorrect Clinic Staff PIN. Please try again." };
  } catch (error) {
    console.error("Error verifying staff pin:", error);
    return { error: "Authentication failed." };
  }
}

export async function checkStaffAuthStatus() {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(AUTH_COOKIE_NAME);
    return { isAuthenticated: session?.value === "authenticated" };
  } catch {
    return { isAuthenticated: false };
  }
}

export async function logoutStaff() {
  try {
    const cookieStore = cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
    return { success: true };
  } catch (error) {
    console.error("Error logging out staff:", error);
    return { error: "Failed to logout." };
  }
}
