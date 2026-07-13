/**
 * timeFormatter
 * Centralized utility to safely format timestamps in the browser's local timezone.
 */

/**
 * Safely parses a string, number, or Date into a Date object.
 * If the string lacks a timezone designator, it appends 'Z' to treat it as UTC.
 */
export function parseUtcDate(value: any): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  
  if (typeof value === "string") {
    const cleanValue = value.trim();
    // If it's a numeric string (timestamp in seconds/ms), parse as number
    if (/^\d+(\.\d+)?$/.test(cleanValue)) {
      const num = parseFloat(cleanValue);
      // If epoch is in seconds, convert to ms
      return new Date(num < 10000000000 ? num * 1000 : num);
    }
    // If the ISO string does not end with Z or a timezone offset like +HH:MM / -HH:MM,
    // append 'Z' to ensure the browser parses it as UTC instead of local time.
    if (
      cleanValue.includes("T") &&
      !cleanValue.endsWith("Z") &&
      !/[+-]\d{2}:\d{2}$/.test(cleanValue)
    ) {
      return new Date(`${cleanValue}Z`);
    }
    return new Date(cleanValue);
  }
  
  if (typeof value === "number") {
    // If epoch is in seconds, convert to ms
    return new Date(value < 10000000000 ? value * 1000 : value);
  }
  
  return new Date(value);
}

/**
 * Formats a timestamp into a local locale string.
 */
export function formatLocalLocale(value: any): string {
  try {
    const d = parseUtcDate(value);
    return d.toLocaleString();
  } catch (e) {
    return String(value);
  }
}

/**
 * Formats a timestamp into a local short date/time string.
 */
export function formatShortDateTime(value: any): string {
  try {
    const d = parseUtcDate(value);
    return d.toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return String(value);
  }
}

/**
 * Formats a timestamp into a local short date-only string.
 */
export function formatLocalDateOnly(value: any): string {
  try {
    const d = parseUtcDate(value);
    return d.toLocaleDateString();
  } catch (e) {
    return String(value);
  }
}

/**
 * Formats a timestamp into a local 2-digit time (HH:MM).
 */
export function formatLocalTimeOnly(value: any): string {
  try {
    const d = parseUtcDate(value);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return String(value);
  }
}

/**
 * Formats a timestamp into a relative duration (e.g. "3 mins ago").
 */
export function formatRelativeTime(value: any): string {
  try {
    const d = parseUtcDate(value);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 1) return "just now";
    if (diffSecs < 60) return `${diffSecs}s ago`;
    
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch (e) {
    return "unknown";
  }
}
