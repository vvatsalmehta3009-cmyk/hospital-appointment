import { parse, addMinutes, format, isBefore, isAfter, isEqual } from "date-fns";

export interface Slot {
  time: string; // e.g. "09:00 AM"
  available: boolean;
  session: "MORNING" | "EVENING";
}

/**
 * Generates 15-minute slots between startTime and endTime (e.g. "09:00" to "13:00")
 */
function generateTimeSlots(
  startTimeStr: string,
  endTimeStr: string,
  slotDurationMin: number,
  session: "MORNING" | "EVENING",
  bookedTimes: Set<string>,
  isToday: boolean,
  currentHourMinStr?: string
): Slot[] {
  const slots: Slot[] = [];
  const baseDate = new Date();

  let current = parse(startTimeStr, "HH:mm", baseDate);
  const end = parse(endTimeStr, "HH:mm", baseDate);

  while (isBefore(current, end)) {
    const slotTimeFormatted = format(current, "hh:mm a"); // "09:00 AM"
    const slot24h = format(current, "HH:mm");

    // If booking for today, filter out past slots
    let isPast = false;
    if (isToday && currentHourMinStr) {
      isPast = slot24h <= currentHourMinStr;
    }

    const isBooked = bookedTimes.has(slotTimeFormatted);

    slots.push({
      time: slotTimeFormatted,
      available: !isBooked && !isPast,
      session,
    });

    current = addMinutes(current, slotDurationMin);
  }

  return slots;
}

export function calculateAvailableSlots(params: {
  morningStart?: string;
  morningEnd?: string;
  eveningStart?: string | null;
  eveningEnd?: string | null;
  slotDurationMin?: number;
  bookedSlotTimes: string[];
  selectedDate: Date;
}): { morning: Slot[]; evening: Slot[]; totalAvailable: number } {
  const {
    morningStart = "09:00",
    morningEnd = "13:00",
    eveningStart,
    eveningEnd,
    slotDurationMin = 15,
    bookedSlotTimes,
    selectedDate,
  } = params;

  const bookedSet = new Set(bookedSlotTimes);

  const now = new Date();
  const isToday =
    selectedDate.getFullYear() === now.getFullYear() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getDate() === now.getDate();

  const currentHourMin = format(now, "HH:mm");

  const morning = generateTimeSlots(
    morningStart,
    morningEnd,
    slotDurationMin,
    "MORNING",
    bookedSet,
    isToday,
    currentHourMin
  );

  let evening: Slot[] = [];
  if (eveningStart && eveningEnd) {
    evening = generateTimeSlots(
      eveningStart,
      eveningEnd,
      slotDurationMin,
      "EVENING",
      bookedSet,
      isToday,
      currentHourMin
    );
  }

  const totalAvailable =
    morning.filter((s) => s.available).length +
    evening.filter((s) => s.available).length;

  return { morning, evening, totalAvailable };
}
