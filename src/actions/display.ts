"use server";

import { prisma } from "@/lib/prisma";
import { format, startOfDay } from "date-fns";

export async function getDisplayBoardData() {
  try {
    const todayStart = startOfDay(new Date());

    // 1. Get active doctor
    let doctor = await prisma.doctor.findFirst({
      where: { isActiveToday: true },
    });
    if (!doctor) doctor = await prisma.doctor.findFirst();

    // 2. Get active session today
    const sessions = await prisma.clinicSession.findMany({
      where: {
        date: todayStart,
        doctorId: doctor?.id,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    const activeSession = sessions.find((s) => s.status === "OPEN" || s.status === "IN_PROGRESS") || sessions[0];

    // 3. Currently serving appointment
    const currentAppointment = await prisma.appointment.findFirst({
      where: {
        appointmentDate: todayStart,
        sessionId: activeSession?.id,
        status: "IN_PROGRESS",
      },
      include: {
        doctor: true,
        session: true,
      },
    });

    // 4. Upcoming checked-in patients in waiting lobby for this session
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: todayStart,
        sessionId: activeSession?.id,
        status: "CHECKED_IN",
      },
      orderBy: {
        tokenNumber: "asc",
      },
      take: 4,
    });

    // 5. Counts
    const completedTodayCount = await prisma.appointment.count({
      where: {
        appointmentDate: todayStart,
        sessionId: activeSession?.id,
        status: "COMPLETED",
      },
    });

    const totalWaitingCount = await prisma.appointment.count({
      where: {
        appointmentDate: todayStart,
        sessionId: activeSession?.id,
        status: "CHECKED_IN",
      },
    });

    return {
      currentDoctor: doctor
        ? {
            name: doctor.name,
            specialization: doctor.specialization,
            qualifications: doctor.qualifications,
          }
        : null,
      activeSession: activeSession
        ? {
            id: activeSession.id,
            sessionName: activeSession.sessionName,
            timing: `${activeSession.startTime} - ${activeSession.endTime}`,
          }
        : null,
      nowServing: currentAppointment
        ? {
            id: currentAppointment.id,
            tokenNumber: currentAppointment.tokenNumber,
            patientName: currentAppointment.patientName,
            sessionName: currentAppointment.session?.sessionName || "Doctor Session",
            slotTime: currentAppointment.slotTime || "Active Consultation",
            startedAt: currentAppointment.startedAt
              ? format(currentAppointment.startedAt, "hh:mm a")
              : null,
          }
        : null,
      upcomingQueue: upcomingAppointments.map((a) => ({
        id: a.id,
        tokenNumber: a.tokenNumber,
        patientName: a.patientName,
        slotTime: a.slotTime || "Lobby Queue",
      })),
      stats: {
        completedToday: completedTodayCount,
        totalWaiting: totalWaitingCount,
      },
    };
  } catch (error) {
    console.error("Error loading display board data:", error);
    return { error: "Failed to load display data." };
  }
}
