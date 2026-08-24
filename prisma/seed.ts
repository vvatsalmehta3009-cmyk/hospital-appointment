import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Clinic Database for Hourly Slots & Full-Day Open Booking...");

  await prisma.appointment.deleteMany();
  await prisma.clinicSession.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();

  // 1. Doctor
  const doctor1 = await prisma.doctor.create({
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

  console.log(`✅ Created Doctor: ${doctor1.name}`);

  // 2. Demo Patients
  await prisma.patient.createMany({
    data: [
      {
        phone: "+1 (555) 234-5678",
        name: "Alice Cooper",
        email: "alice@example.com",
      },
      {
        phone: "+1 (555) 456-7890",
        name: "Emma Watson",
        email: "emma.watson@gmail.com",
      },
      {
        phone: "+1 (555) 123-4567",
        name: "Alex Rivera",
        email: "alex.rivera@gmail.com",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
      },
    ],
  });

  console.log("✅ Created Registered Patient Profiles");

  // 3. Today's Sessions (e.g. 3-hour Morning and 3-hour Evening)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const session1 = await prisma.clinicSession.create({
    data: {
      sessionName: "Session 1: Morning OPD (3 Hours)",
      date: today,
      startTime: "09:00",
      endTime: "12:00",
      status: "OPEN",
      doctorId: doctor1.id,
    },
  });

  const session2 = await prisma.clinicSession.create({
    data: {
      sessionName: "Session 2: Evening OPD (3 Hours)",
      date: today,
      startTime: "16:00",
      endTime: "19:00",
      status: "OPEN",
      doctorId: doctor1.id,
    },
  });

  console.log(`✅ Created 3-Hour Sessions: ${session1.sessionName} & ${session2.sessionName}`);

  // 4. Sample Appointments distributed across 1-hour slots
  const sampleAppointments = [
    // Session 1 - Slot 1: 09:00 AM - 10:00 AM
    {
      tokenNumber: 1,
      patientName: "Alice Cooper",
      patientPhone: "+1 (555) 234-5678",
      patientEmail: "alice@example.com",
      appointmentDate: today,
      slotTime: "09:00 AM - 10:00 AM",
      status: "COMPLETED",
      bookingSource: "ONLINE",
      checkedInAt: new Date(Date.now() - 1000 * 60 * 50),
      startedAt: new Date(Date.now() - 1000 * 60 * 45),
      completedAt: new Date(Date.now() - 1000 * 60 * 30),
      doctorId: doctor1.id,
      sessionId: session1.id,
    },
    {
      tokenNumber: 2,
      patientName: "Robert Downey",
      patientPhone: "+1 (555) 345-6789",
      appointmentDate: today,
      slotTime: "09:00 AM - 10:00 AM",
      status: "COMPLETED",
      bookingSource: "WALK_IN",
      checkedInAt: new Date(Date.now() - 1000 * 60 * 35),
      startedAt: new Date(Date.now() - 1000 * 60 * 30),
      completedAt: new Date(Date.now() - 1000 * 60 * 15),
      doctorId: doctor1.id,
      sessionId: session1.id,
    },
    // Session 1 - Slot 2: 10:00 AM - 11:00 AM
    {
      tokenNumber: 3,
      patientName: "Emma Watson",
      patientPhone: "+1 (555) 456-7890",
      patientEmail: "emma.watson@gmail.com",
      appointmentDate: today,
      slotTime: "10:00 AM - 11:00 AM",
      status: "IN_PROGRESS",
      bookingSource: "ONLINE",
      checkedInAt: new Date(Date.now() - 1000 * 60 * 20),
      startedAt: new Date(Date.now() - 1000 * 60 * 10),
      doctorId: doctor1.id,
      sessionId: session1.id,
    },
    {
      tokenNumber: 4,
      patientName: "Michael Chang",
      patientPhone: "+1 (555) 567-8901",
      appointmentDate: today,
      slotTime: "10:00 AM - 11:00 AM",
      status: "CHECKED_IN",
      bookingSource: "ONLINE",
      checkedInAt: new Date(Date.now() - 1000 * 60 * 5),
      doctorId: doctor1.id,
      sessionId: session1.id,
    },
    // Session 1 - Slot 3: 11:00 AM - 12:00 PM
    {
      tokenNumber: 5,
      patientName: "Sophia Martinez",
      patientPhone: "+1 (555) 678-9012",
      appointmentDate: today,
      slotTime: "11:00 AM - 12:00 PM",
      status: "BOOKED",
      bookingSource: "ONLINE",
      doctorId: doctor1.id,
      sessionId: session1.id,
    },
  ];

  for (const apt of sampleAppointments) {
    await prisma.appointment.create({ data: apt });
  }

  console.log(`✅ Seeded ${sampleAppointments.length} sample appointments with 1-hour slots.`);
  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
