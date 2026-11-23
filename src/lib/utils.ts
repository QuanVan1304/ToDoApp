import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

export function formatFullDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function getVietnamDateKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function isBeforeToday(date: Date | string | null): boolean {
  if (!date) return false;
  return getVietnamDateKey(date) < getVietnamDateKey(new Date());
}

export function getDaysOld(date: Date | string | null): number {
  if (!date) return 0;
  const createdKey = getVietnamDateKey(date);
  const todayKey = getVietnamDateKey(new Date());
  const createdUtc = new Date(`${createdKey}T00:00:00.000Z`).getTime();
  const todayUtc = new Date(`${todayKey}T00:00:00.000Z`).getTime();
  const diffDays = Math.floor((todayUtc - createdUtc) / 86_400_000);
  return Math.max(0, diffDays);
}

export function isVietnamEvening(startHour = 18): boolean {
  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "numeric",
    hour12: false,
  }).format(new Date());
  const hour = Number(hourStr) % 24;
  return hour >= startHour;
}
