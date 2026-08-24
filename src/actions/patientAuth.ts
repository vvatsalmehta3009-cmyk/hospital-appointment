"use server";

import { prisma } from "@/lib/prisma";

export async function registerPatient(data: {
  name: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  googleId?: string;
}) {
  try {
    const { name, phone, email, avatarUrl, googleId } = data;

    if (!name.trim() || !phone.trim()) {
      return { error: "Please provide your full name and mobile number." };
    }

    const cleanedPhone = phone.trim();
    const cleanedName = name.trim();
    const cleanedEmail = email?.trim() || null;

    const patient = await prisma.patient.upsert({
      where: { phone: cleanedPhone },
      update: {
        name: cleanedName,
        email: cleanedEmail,
        avatarUrl: avatarUrl || undefined,
        googleId: googleId || undefined,
      },
      create: {
        phone: cleanedPhone,
        name: cleanedName,
        email: cleanedEmail,
        avatarUrl: avatarUrl || null,
        googleId: googleId || null,
      },
    });

    return {
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        email: patient.email,
        avatarUrl: patient.avatarUrl,
        googleId: patient.googleId,
      },
    };
  } catch (error) {
    console.error("Error registering patient:", error);
    return { error: "Failed to save registration profile." };
  }
}

export async function connectGoogleAccount(data: {
  name: string;
  email: string;
  googleId: string;
  avatarUrl?: string;
  phone?: string;
}) {
  try {
    const { name, email, googleId, avatarUrl, phone } = data;

    if (!email.trim()) {
      return { error: "Google account email is required." };
    }

    // Check if patient exists with this email or googleId
    let existing = await prisma.patient.findFirst({
      where: {
        OR: [
          { email: email.trim() },
          { googleId: googleId.trim() },
          ...(phone ? [{ phone: phone.trim() }] : []),
        ],
      },
    });

    // If existing patient found, update with Google details
    if (existing) {
      const updated = await prisma.patient.update({
        where: { id: existing.id },
        data: {
          name: existing.name || name.trim(),
          email: email.trim(),
          googleId: googleId.trim(),
          avatarUrl: avatarUrl || existing.avatarUrl,
          phone: phone?.trim() || existing.phone,
        },
      });

      return {
        success: true,
        patient: {
          id: updated.id,
          name: updated.name,
          phone: updated.phone,
          email: updated.email,
          avatarUrl: updated.avatarUrl,
          googleId: updated.googleId,
        },
      };
    }

    // If new user and phone is provided, create
    if (phone && phone.trim()) {
      const created = await prisma.patient.create({
        data: {
          phone: phone.trim(),
          name: name.trim(),
          email: email.trim(),
          googleId: googleId.trim(),
          avatarUrl: avatarUrl || null,
        },
      });

      return {
        success: true,
        patient: {
          id: created.id,
          name: created.name,
          phone: created.phone,
          email: created.email,
          avatarUrl: created.avatarUrl,
          googleId: created.googleId,
        },
      };
    }

    // If new user without phone number, request mobile number
    return {
      success: true,
      requiresPhone: true,
      partialProfile: {
        name: name.trim(),
        email: email.trim(),
        googleId: googleId.trim(),
        avatarUrl: avatarUrl || null,
      },
    };
  } catch (error) {
    console.error("Error connecting with Google:", error);
    return { error: "Failed to connect Google account." };
  }
}

export async function lookupPatientByPhone(phone: string) {
  try {
    const cleaned = phone.trim();
    if (cleaned.length < 4) return { patient: null };

    const patient = await prisma.patient.findUnique({
      where: { phone: cleaned },
    });

    return { patient };
  } catch (error) {
    console.error("Error looking up patient:", error);
    return { patient: null };
  }
}
