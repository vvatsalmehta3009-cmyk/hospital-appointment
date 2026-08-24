"use server";

import { prisma } from "@/lib/prisma";
import { format, startOfDay } from "date-fns";

export async function getAppointmentLiveStatus(appointmentId: string) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: true,
        session: true,
      },
    });

    if (!appointment) {
      return { error: "Appointment not found." };
    }

    // 1. Find currently active consultation (status = IN_PROGRESS) in this session
    const currentlyServing = await prisma.appointment.findFirst({
      where: {
        sessionId: appointment.sessionId,
        status: "IN_PROGRESS",
      },
      select: {
        tokenNumber: true,
        patientName: true,
        slotTime: true,
        startedAt: true,
      },
    });

    // 2. Count checked-in patients ahead of this patient in the same session
    const checkedInAheadCount = await prisma.appointment.count({
      where: {
        sessionId: appointment.sessionId,
        status: "CHECKED_IN",
        tokenNumber: { lt: appointment.tokenNumber },
      },
    });

    // 3. Total in waiting room currently for this session
    const totalWaitingCount = await prisma.appointment.count({
      where: {
        sessionId: appointment.sessionId,
        status: "CHECKED_IN",
      },
    });

    // 4. Completed count in this session
    const completedCount = await prisma.appointment.count({
      where: {
        sessionId: appointment.sessionId,
        status: "COMPLETED",
      },
    });

    // Estimated wait time (~6-10 mins per patient ahead for 10 patients/hour pace)
    let estimatedWaitMinutes = 0;
    if (appointment.status === "CHECKED_IN" || appointment.status === "BOOKED") {
      const activeMultiplier = currentlyServing ? 1 : 0;
      estimatedWaitMinutes = (checkedInAheadCount + activeMultiplier) * 8;
    }

    return {
      appointment: {
        id: appointment.id,
        tokenNumber: appointment.tokenNumber,
        patientName: appointment.patientName,
        patientPhone: appointment.patientPhone,
        patientEmail: appointment.patientEmail,
        appointmentDate: format(appointment.appointmentDate, "EEEE, MMMM d, yyyy"),
        rawDate: appointment.appointmentDate.toISOString(),
        slotTime: appointment.slotTime || "Standard Slot",
        status: appointment.status,
        bookingSource: appointment.bookingSource,
        notes: appointment.notes,
        sessionName: appointment.session?.sessionName || "Doctor OPD Session",
        sessionTiming: appointment.session
          ? `${appointment.session.startTime} - ${appointment.session.endTime}`
          : "Today",
        checkedInAt: appointment.checkedInAt ? appointment.checkedInAt.toISOString() : null,
      },
      doctor: {
        id: appointment.doctor.id,
        name: appointment.doctor.name,
        specialization: appointment.doctor.specialization,
        avatarUrl: appointment.doctor.avatarUrl,
      },
      queue: {
        currentlyServingToken: currentlyServing?.tokenNumber || null,
        currentlyServingPatient: currentlyServing?.patientName || null,
        patientsAhead: checkedInAheadCount,
        totalWaiting: totalWaitingCount,
        completedToday: completedCount,
        estimatedWaitMinutes,
      },
    };
  } catch (error) {
    console.error("Error getting appointment live status:", error);
    return { error: "Failed to load live status." };
  }
}

export async function performPatientCheckIn(appointmentId: string) {
  try {
    const existing = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!existing) {
      return { error: "Appointment record not found." };
    }

    if (existing.status === "CANCELLED") {
      return { error: "This appointment has been cancelled." };
    }

    if (existing.status === "COMPLETED") {
      return { error: "This appointment has already been completed." };
    }

    if (existing.status === "CHECKED_IN" || existing.status === "IN_PROGRESS") {
      return { success: true, message: "Already checked in." };
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CHECKED_IN",
        checkedInAt: new Date(),
      },
    });

    return {
      success: true,
      message: "Check-in successful! Your arrival is intimated to the doctor.",
      appointment: updated,
    };
  } catch (error) {
    console.error("Error performing check-in:", error);
    return { error: "Failed to perform check-in. Please contact the front desk." };
  }
}

export async function searchAppointmentByPhone(phone: string) {
  try {
    const cleaned = phone.trim();
    if (!cleaned) return { appointments: [] };

    const appointments = await prisma.appointment.findMany({
      where: {
        patientPhone: { contains: cleaned },
      },
      include: {
        doctor: true,
        session: true,
      },
      orderBy: {
        appointmentDate: "desc",
      },
      take: 5,
    });

    return {
      appointments: appointments.map((a) => ({
        id: a.id,
        tokenNumber: a.tokenNumber,
        patientName: a.patientName,
        sessionName: a.session?.sessionName || "Doctor OPD",
        slotTime: a.slotTime || "Standard",
        appointmentDate: format(a.appointmentDate, "MMM d, yyyy"),
        status: a.status,
        doctorName: a.doctor.name,
      })),
    };
  } catch (error) {
    console.error("Error searching appointments:", error);
    return { error: "Failed to search appointments." };
  }
}
