"use server";

import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, format, parse, addHours, isBefore, isAfter } from "date-fns";

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
    const todayEnd = endOfDay(new Date());

    // 1. Get or Auto-Create Active Doctor if database is new
    let doctor = await prisma.doctor.findFirst({
      where: { isActiveToday: true },
    });
    if (!doctor) doctor = await prisma.doctor.findFirst();

    if (!doctor) {
      doctor = await prisma.doctor.create({
        data: {
          name: "Dr. Sarah Jenkins, MD",
          specialization: "Family Medicine & General Health",
          qualifications: "MBBS, MD (Internal Medicine), FACP",
          experienceYears: 14,
          avatarUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300",
          isActiveToday: true,
          consultationFee: 25,
        },
      });
    }

    // 2. Fetch all sessions for today (using range for timezone resilience)
    let sessions = await prisma.clinicSession.findMany({
      where: {
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
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

    // 3. Self-Healing: If it's a new day or no sessions exist for today, auto-create today's sessions!
    if (sessions.length === 0) {
      const s1 = await prisma.clinicSession.create({
        data: {
          sessionName: "Session 1: Morning OPD (3 Hours)",
          date: todayStart,
          startTime: "09:00",
          endTime: "12:00",
          status: "OPEN",
          doctorId: doctor.id,
        },
        include: {
          appointments: true,
        },
      });

      const s2 = await prisma.clinicSession.create({
        data: {
          sessionName: "Session 2: Evening OPD (3 Hours)",
          date: todayStart,
          startTime: "16:00",
          endTime: "19:00",
          status: "OPEN",
          doctorId: doctor.id,
        },
        include: {
          appointments: true,
        },
      });

      sessions = [s1, s2];
    }

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
        const effectiveEnd = isAfter(currentHourEnd, endDateTime) ? endDateTime : currentHourEnd;

        const slotStartFormatted = format(currentHourStart, "hh:mm a");
        const slotEndFormatted = format(effectiveEnd, "hh:mm a");
        const slotDisplay = `${slotStartFormatted} - ${slotEndFormatted}`;
        const slotKey = `${format(currentHourStart, "HH:mm")}-${format(effectiveEnd, "HH:mm")}`;

        const slotAppointments = (session.appointments || []).filter((apt) => apt.slotTime === slotDisplay);
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
      const totalBooked = (session.appointments || []).length;

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
  } catch (error: any) {
    console.error("Error fetching today's sessions:", error);
    return { error: error?.message || "Failed to load clinic sessions from database." };
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
  slotTime: string;
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

    const latestApt = await prisma.appointment.findFirst({
      where: { sessionId: session.id },
      orderBy: { tokenNumber: "desc" },
    });

    const nextToken = latestApt ? latestApt.tokenNumber + 1 : 1;

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
  } catch (error: any) {
    console.error("Error booking hourly slot appointment:", error);
    return { error: error?.message || "Failed to book appointment. Please try again." };
  }
}
