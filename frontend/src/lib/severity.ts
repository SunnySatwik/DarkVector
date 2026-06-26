/**
 * Severity utilities
 *
 * Single source of truth for Severity → CSS class mappings.
 * Import from this module instead of copy-pasting switch statements.
 */

import type { Severity } from "../types";

/** Returns Tailwind classes for a severity badge (background + text + border). */
export function severityBadgeClass(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "bg-red-500/10 text-red-400 border border-red-500/20";
    case "high":
      return "bg-orange-500/10 text-orange-400 border border-orange-500/20";
    case "medium":
      return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
    default:
      return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
  }
}

/** Returns a Tailwind dot background color for a severity level. */
export function severityDotClass(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "medium":
      return "bg-yellow-500";
    default:
      return "bg-blue-400";
  }
}

/** Returns a Tailwind border-color class for a severity level. */
export function severityBorderClass(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "border-red-500/20";
    case "high":
      return "border-orange-500/20";
    case "medium":
      return "border-yellow-500/20";
    default:
      return "border-blue-500/20";
  }
}

/**
 * Maps a Severity string to the Badge variant expected by the DesignSystem `Badge` component.
 */
export function severityBadgeVariant(
  severity: Severity
): "critical" | "high" | "medium" | "low" {
  return severity as "critical" | "high" | "medium" | "low";
}
