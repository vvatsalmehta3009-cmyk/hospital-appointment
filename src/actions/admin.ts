"use server";

import { prisma } from "@/lib/prisma";
import { format, startOfDay } from "date-fns";

export async function getAdminQueueData(sessionId?: string) {
  try {
    const todayStart = startOfDay(new Date());

    // 1. Get Doctors
    const doctors = await prisma.doctor.findMany({
      orderBy: { name: "asc" },
    });

    const activeDoctor = doctors.find((d) => d.isActiveToday) || doctors[0];

    // 2. Get Today's Sessions for active doctor
    const sessions = await prisma.clinicSession.findMany({
      where: {
        date: todayStart,
        doctorId: activeDoctor?.id,
      },
      include: {
        appointments: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    let selectedSession = sessions.find((s) => s.id === sessionId);
    if (!selectedSession && sessions.length > 0) {
      selectedSession = sessions.find((s) => s.status !== "COMPLETED") || sessions[0];
    }

    const appointmentWhere: any = {
      appointmentDate: todayStart,
    };
    if (selectedSession) {
      appointmentWhere.sessionId = selectedSession.id;
    }

    const appointments = await prisma.appointment.findMany({
      where: appointmentWhere,
      include: {
        doctor: true,
        session: true,
      },
      orderBy: [
        { tokenNumber: "asc" },
      ],
    });

    // 3. Compute Metrics
    const totalCount = appointments.length;
    const checkedInCount = appointments.filter((a) => a.status === "CHECKED_IN").length;
    const inProgressCount = appointments.filter((a) => a.status === "IN_PROGRESS").length;
    const completedCount = appointments.filter((a) => a.status === "COMPLETED").length;
    const bookedCount = appointments.filter((a) => a.status === "BOOKED").length;
    const skippedCount = appointments.filter((a) => a.status === "SKIPPED").length;

    const currentActivePatient = appointments.find((a) => a.status === "IN_PROGRESS") || null;
    const nextInLinePatient = appointments.find((a) => a.status === "CHECKED_IN") || null;

    return {
      selectedDate: format(todayStart, "yyyy-MM-dd"),
      displayDate: format(todayStart, "EEEE, MMMM d, yyyy"),
      doctors,
      activeDoctor,
      sessions: sessions.map((s) => ({
        id: s.id,
        sessionName: s.sessionName,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        bookedCount: s.appointments.length,
      })),
      activeSessionId: selectedSession?.id || null,
      selectedSession: selectedSession ? {
        id: selectedSession.id,
        sessionName: selectedSession.sessionName,
        startTime: selectedSession.startTime,
        endTime: selectedSession.endTime,
      } : null,
      currentActivePatient,
      nextInLinePatient,
      metrics: {
        total: totalCount,
        waiting: checkedInCount,
        inProgress: inProgressCount,
        completed: completedCount,
        booked: bookedCount,
        skipped: skippedCount,
      },
      appointments: appointments.map((a) => ({
        id: a.id,
        tokenNumber: a.tokenNumber,
        patientName: a.patientName,
        patientPhone: a.patientPhone,
        patientEmail: a.patientEmail,
        sessionName: a.session?.sessionName || "General",
        slotTime: a.slotTime || "Standard Slot",
        status: a.status,
        bookingSource: a.bookingSource,
        notes: a.notes,
        checkedInAt: a.checkedInAt ? format(a.checkedInAt, "hh:mm a") : null,
        startedAt: a.startedAt ? format(a.startedAt, "hh:mm a") : null,
        completedAt: a.completedAt ? format(a.completedAt, "hh:mm a") : null,
        doctorName: a.doctor.name,
      })),
    };
  } catch (error) {
    console.error("Error fetching admin queue data:", error);
    return { error: "Failed to load admin queue data." };
  }
}

export async function createNewSession(data: {
  sessionName: string;
  startTime: string; // "09:00"
  endTime: string;   // "12:00"
}) {
  try {
    const todayStart = startOfDay(new Date());

    let doctor = await prisma.doctor.findFirst({
      where: { isActiveToday: true },
    });
    if (!doctor) doctor = await prisma.doctor.findFirst();
    if (!doctor) return { error: "No active doctor found." };

    const session = await prisma.clinicSession.create({
      data: {
        sessionName: data.sessionName.trim(),
        date: todayStart,
        startTime: data.startTime.trim(),
        endTime: data.endTime.trim(),
        status: "OPEN",
        doctorId: doctor.id,
      },
    });

    return { success: true, session };
  } catch (error) {
    console.error("Error creating session:", error);
    return { error: "Failed to create session." };
  }
}

export async function updateAppointmentStatus(appointmentId: string, newStatus: string) {
  try {
    const existing = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!existing) {
      return { error: "Appointment not found." };
    }

    const updatePayload: any = { status: newStatus };

    if (newStatus === "CHECKED_IN" && !existing.checkedInAt) {
      updatePayload.checkedInAt = new Date();
    } else if (newStatus === "IN_PROGRESS") {
      updatePayload.startedAt = new Date();
      await prisma.appointment.updateMany({
        where: {
          sessionId: existing.sessionId,
          status: "IN_PROGRESS",
          id: { not: appointmentId },
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    } else if (newStatus === "COMPLETED") {
      updatePayload.completedAt = new Date();
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: updatePayload,
    });

    return { success: true, appointment: updated };
  } catch (error) {
    console.error("Error updating appointment status:", error);
    return { error: "Failed to update appointment status." };
  }
}

export async function callNextPatient(sessionId?: string) {
  try {
    const todayStart = startOfDay(new Date());

    let doctor = await prisma.doctor.findFirst({
      where: { isActiveToday: true },
    });
    if (!doctor) doctor = await prisma.doctor.findFirst();
    if (!doctor) return { error: "No doctor found." };

    const whereQuery: any = {
      doctorId: doctor.id,
      appointmentDate: todayStart,
      status: "CHECKED_IN",
    };
    if (sessionId) {
      whereQuery.sessionId = sessionId;
    }

    const nextPatient = await prisma.appointment.findFirst({
      where: whereQuery,
      orderBy: {
        tokenNumber: "asc",
      },
    });

    if (!nextPatient) {
      return { error: "No checked-in patients waiting in this queue." };
    }

    await prisma.appointment.updateMany({
      where: {
        doctorId: doctor.id,
        sessionId: nextPatient.sessionId,
        status: "IN_PROGRESS",
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    const updated = await prisma.appointment.update({
      where: { id: nextPatient.id },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });

    return {
      success: true,
      message: `Now Calling Token #${String(updated.tokenNumber).padStart(2, "0")}: ${updated.patientName}`,
      appointment: updated,
    };
  } catch (error) {
    console.error("Error calling next patient:", error);
    return { error: "Failed to call next patient." };
  }
}

export async function createWalkInAppointment(data: {
  sessionId?: string;
  slotTime?: string;
  patientName: string;
  patientPhone: string;
  notes?: string;
}) {
  try {
    const todayStart = startOfDay(new Date());

    let doctor = await prisma.doctor.findFirst({
      where: { isActiveToday: true },
    });
    if (!doctor) doctor = await prisma.doctor.findFirst();
    if (!doctor) return { error: "No active doctor available." };

    let session = null;
    if (data.sessionId) {
      session = await prisma.clinicSession.findUnique({ where: { id: data.sessionId } });
    }
    if (!session) {
      session = await prisma.clinicSession.findFirst({
        where: { date: todayStart, doctorId: doctor.id },
      });
    }

    const latestAppointment = await prisma.appointment.findFirst({
      where: {
        sessionId: session ? session.id : undefined,
        appointmentDate: todayStart,
      },
      orderBy: { tokenNumber: "desc" },
    });

    const nextTokenNumber = latestAppointment ? latestAppointment.tokenNumber + 1 : 1;
    const now = new Date();
    const currentSlot = data.slotTime || `Walk-in (${format(now, "hh:mm a")})`;

    const appointment = await prisma.appointment.create({
      data: {
        tokenNumber: nextTokenNumber,
        patientName: data.patientName.trim(),
        patientPhone: data.patientPhone.trim(),
        appointmentDate: todayStart,
        slotTime: currentSlot,
        status: "CHECKED_IN",
        bookingSource: "WALK_IN",
        checkedInAt: now,
        notes: data.notes?.trim() || null,
        sessionId: session?.id || null,
        doctorId: doctor.id,
      },
    });

    return {
      success: true,
      appointment,
      message: `Walk-in registered! Assigned Token #${String(appointment.tokenNumber).padStart(2, "0")}`,
    };
  } catch (error) {
    console.error("Error registering walk-in:", error);
    return { error: "Failed to register walk-in patient." };
  }
}

export async function toggleDoctorActiveStatus(doctorId: string) {
  try {
    await prisma.doctor.updateMany({
      data: { isActiveToday: false },
    });

    const activated = await prisma.doctor.update({
      where: { id: doctorId },
      data: { isActiveToday: true },
    });

    return { success: true, activeDoctor: activated };
  } catch (error) {
    console.error("Error toggling active doctor:", error);
    return { error: "Failed to switch active doctor." };
  }
}
