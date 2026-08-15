import { AppError } from "../lib/errors";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):(?:00|30)$/;

export function validateOpeningHours(open: unknown, close: unknown): { open: string; close: string } {
  if (typeof open !== "string" || typeof close !== "string" || !TIME_PATTERN.test(open) || !TIME_PATTERN.test(close) || open >= close) {
    throw new AppError(400, "invalid_opening_hours", "Opening hours must use increasing 30-minute HH:MM values.");
  }
  return { open, close };
}

export function validateBookingTime(date: unknown, start: unknown, end: unknown): {
  date: string;
  start: string;
  end: string;
  slots: string[];
} {
  if (typeof date !== "string" || !DATE_PATTERN.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) {
    throw new AppError(400, "invalid_date", "Reservation date must use YYYY-MM-DD.");
  }
  if (typeof start !== "string" || typeof end !== "string" || !TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) {
    throw new AppError(400, "invalid_time", "Reservation times must use 30-minute HH:MM slots.");
  }
  const toMinutes = (value: string): number => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const fromMinutes = (value: number): string => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (endMinutes <= startMinutes || endMinutes - startMinutes > 6 * 60) {
    throw new AppError(400, "invalid_duration", "Reservation must last between 30 minutes and 6 hours.");
  }
  const slots: string[] = [];
  for (let minute = startMinutes; minute < endMinutes; minute += 30) slots.push(`${date}T${fromMinutes(minute)}`);
  return { date, start, end, slots };
}
