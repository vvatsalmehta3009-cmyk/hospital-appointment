"use server";

import { prisma } from "@/lib/prisma";
import { startOfDay, format, parse, addHours, isBefore, isAfter } from "date-fns";

export interface HourlySlot {
  slotKey: string;           // e.g. "09:00-10:00"
  slotDisplay: string;       // e.g. "09:00 AM - 10:00 AM"
  startTime: string;         // "09:00"
  endTime: string;           // "10:00"
  maxTokens: number;         // 10
  tokensBooked: number;      // e.g. 3
  tokensRemaining: number;   // e.g. 7
  isFull: boolean;
  isPast: boolean;
  canBook: boolean;
  statusText: string;
}

export interface SessionWithSlots {
  id: string;
  sessionName: string;
  startTime: string;
  endTime: string;
  startTimeFormatted: string;
  endTimeFormatted: string;
  durationHours: number;
  totalSessionBooked: number;
  totalSessionCapacity: number;
  slots: HourlySlot[];
}

export async function getTodaySessions() {
  try {
    const todayStart = startOfDay(new Date());

    // 1. Active Doctor
    let doctor = await prisma.doctor.findFirst({
      where: { isActiveToday: true },
    });
    if (!doctor) doctor = await prisma.doctor.findFirst();

    if (!doctor) {
      return { error: "No active doctor found." };
    }

    // 2. Fetch all sessions for today
    const sessions = await prisma.clinicSession.findMany({
      where: {
        date: todayStart,
        doctorId: doctor.id,
      },
      include: {
        appointments: {
          where: {
            status: { not: "CANCELLED" },
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    const now = new Date();
    const currentDateBase = new Date();

    const formattedSessions: SessionWithSlots[] = sessions.map((session) => {
      const startDateTime = parse(session.startTime, "HH:mm", currentDateBase);
      const endDateTime = parse(session.endTime, "HH:mm", currentDateBase);

      const startTimeFormatted = format(startDateTime, "hh:mm a");
      const endTimeFormatted = format(endDateTime, "hh:mm a");

      // Generate 1-hour slots
      const slots: HourlySlot[] = [];
      let currentHourStart = startDateTime;

      while (isBefore(currentHourStart, endDateTime)) {
        const currentHourEnd = addHours(currentHourStart, 1);
        
        // Prevent overshoot beyond session endTime
        const effectiveEnd = isAfter(currentHourEnd, endDateTime) ? endDateTime : currentHourEnd;

        const slotStartFormatted = format(currentHourStart, "hh:mm a");
        const slotEndFormatted = format(effectiveEnd, "hh:mm a");
        const slotDisplay = `${slotStartFormatted} - ${slotEndFormatted}`;
        const slotKey = `${format(currentHourStart, "HH:mm")}-${format(effectiveEnd, "HH:mm")}`;

        // Count appointments booked for this specific 1-hour slot
        const slotAppointments = session.appointments.filter((apt) => apt.slotTime === slotDisplay);
        const tokensBooked = slotAppointments.length;
        const maxTokens = 10; // Exactly 10 bookings per 1-hour slot
        const tokensRemaining = Math.max(0, maxTokens - tokensBooked);

        const isPast = isAfter(now, effectiveEnd);
        const isFull = tokensRemaining <= 0;
        const canBook = !isPast && !isFull;

        let statusText = "Open for Booking";
        if (isPast) {
          statusText = "Slot Concluded";
        } else if (isFull) {
          statusText = "Slot Full (10/10)";
        } else {
          statusText = `${tokensRemaining} slots left`;
        }

        slots.push({
          slotKey,
          slotDisplay,
          startTime: format(currentHourStart, "HH:mm"),
          endTime: format(effectiveEnd, "HH:mm"),
          maxTokens,
          tokensBooked,
          tokensRemaining,
          isFull,
          isPast,
          canBook,
          statusText,
        });

        currentHourStart = currentHourEnd;
      }

      const totalCapacity = slots.length * 10;
      const totalBooked = session.appointments.length;

      return {
        id: session.id,
        sessionName: session.sessionName,
        startTime: session.startTime,
        endTime: session.endTime,
        startTimeFormatted,
        endTimeFormatted,
        durationHours: slots.length,
        totalSessionBooked: totalBooked,
        totalSessionCapacity: totalCapacity,
        slots,
      };
    });

    return {
      doctor,
      todayFormatted: format(now, "EEEE, MMMM d, yyyy"),
      currentTimeFormatted: format(now, "hh:mm a"),
      sessions: formattedSessions,
    };
  } catch (error) {
    console.error("Error fetching today's sessions:", error);
    return { error: "Failed to load clinic sessions." };
  }
}

export async function lookupPatientProfile(identifier: string) {
  try {
    const clean = identifier.trim();
    if (clean.length < 3) return { profile: null };

    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { phone: { contains: clean } },
          { email: { contains: clean } },
        ],
      },
    });

    return { profile: patient };
  } catch (error) {
    console.error("Error looking up profile:", error);
    return { profile: null };
  }
}

export async function bookSessionAppointment(data: {
  sessionId: string;
  slotTime: string; // e.g. "09:00 AM - 10:00 AM"
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  notes?: string;
}) {
  try {
    const { sessionId, slotTime, patientName, patientPhone, patientEmail, notes } = data;

    if (!sessionId || !slotTime || !patientName.trim() || !patientPhone.trim()) {
      return { error: "Please select a 1-hour slot and provide your details." };
    }

    const session = await prisma.clinicSession.findUnique({
      where: { id: sessionId },
      include: {
        doctor: true,
      },
    });

    if (!session) {
      return { error: "Selected clinic session does not exist." };
    }

    // Check slot capacity (max 10 bookings per 1-hour slot)
    const slotCount = await prisma.appointment.count({
      where: {
        sessionId: session.id,
        slotTime: slotTime,
        status: { not: "CANCELLED" },
      },
    });

    if (slotCount >= 10) {
      return {
        error: `Slot (${slotTime}) has reached its maximum limit of 10 patients. Please pick another 1-hour slot.`,
      };
    }

    // Check duplicate active booking for this phone in the same slot
    const existing = await prisma.appointment.findFirst({
      where: {
        sessionId: session.id,
        slotTime: slotTime,
        patientPhone: patientPhone.trim(),
        status: { in: ["BOOKED", "CHECKED_IN", "IN_PROGRESS"] },
      },
    });

    if (existing) {
      return {
        error: `You already have an active booking (Token #${existing.tokenNumber}) in this 1-hour slot.`,
        existingAppointmentId: existing.id,
      };
    }

    // Upsert patient profile for future 1-click booking
    try {
      await prisma.patient.upsert({
        where: { phone: patientPhone.trim() },
        update: {
          name: patientName.trim(),
          email: patientEmail?.trim() || null,
        },
        create: {
          phone: patientPhone.trim(),
          name: patientName.trim(),
          email: patientEmail?.trim() || null,
        },
      });
    } catch {
      // ignore
    }

    // Find next sequential token in this session
    const latestApt = await prisma.appointment.findFirst({
      where: { sessionId: session.id },
      orderBy: { tokenNumber: "desc" },
    });

    const nextToken = latestApt ? latestApt.tokenNumber + 1 : 1;

    // Create the appointment with slotTime
    const appointment = await prisma.appointment.create({
      data: {
        tokenNumber: nextToken,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientEmail: patientEmail?.trim() || null,
        appointmentDate: session.date,
        slotTime: slotTime,
        status: "BOOKED",
        bookingSource: "ONLINE",
        notes: notes?.trim() || null,
        sessionId: session.id,
        doctorId: session.doctorId,
      },
      include: {
        session: true,
        doctor: true,
      },
    });

    return {
      success: true,
      appointment: {
        id: appointment.id,
        tokenNumber: appointment.tokenNumber,
        patientName: appointment.patientName,
        sessionName: appointment.session?.sessionName || "Doctor OPD",
        slotTime: appointment.slotTime || slotTime,
        doctorName: appointment.doctor.name,
      },
    };
  } catch (error) {
    console.error("Error booking hourly slot appointment:", error);
    return { error: "Failed to book appointment. Please try again." };
  }
}
