import {
  parseUtcDate,
  formatLocalLocale,
  formatShortDateTime,
  formatLocalDateOnly,
  formatLocalTimeOnly,
  formatRelativeTime
} from "../lib/timeFormatter";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("Running Time Formatter Tests...\n");

// Test 1: UTC ISO timestamp parsing
{
  const d = parseUtcDate("2026-07-13T19:25:22Z");
  assert(d.getUTCFullYear() === 2026, "Year should be 2026");
  assert(d.getUTCMonth() === 6, "Month should be July (6)");
  assert(d.getUTCDate() === 13, "Date should be 13");
  assert(d.getUTCHours() === 19, "Hours should be 19");
  assert(d.getUTCMinutes() === 25, "Minutes should be 25");
  assert(d.getUTCSeconds() === 22, "Seconds should be 22");
  console.log("✔ Test 1 Passed: UTC ISO timestamp parsing");
}

// Test 2: ISO timestamp with timezone offset parsing
{
  const d = parseUtcDate("2026-07-13T19:25:22+05:30");
  // 19:25:22 at UTC+5:30 is 13:55:22 at UTC
  assert(d.getUTCHours() === 13, "UTC Hours should be 13");
  assert(d.getUTCMinutes() === 55, "UTC Minutes should be 55");
  console.log("✔ Test 2 Passed: Timezone-offset ISO timestamp parsing");
}

// Test 3: Naive timestamp string (treated as UTC)
{
  const d = parseUtcDate("2026-07-13T19:25:22");
  assert(d.getUTCHours() === 19, "Naive timestamp should fall back to UTC hours 19");
  console.log("✔ Test 3 Passed: Naive timestamp string treated as UTC");
}

// Test 4: Relative time durations
{
  const now = new Date();
  const threeMinsAgo = new Date(now.getTime() - 3 * 60 * 1000);
  const rel = formatRelativeTime(threeMinsAgo);
  assert(rel === "3m ago" || rel === "2m ago" || rel === "4m ago", "Should format to minutes ago relative string");
  console.log("✔ Test 4 Passed: Relative time durations");
}

// Test 5: Safe fallback for invalid timestamps
{
  const invalid = parseUtcDate("invalid-timestamp-string");
  assert(invalid instanceof Date, "Should return a fallback Date object");
  console.log("✔ Test 5 Passed: Safe fallback for invalid timestamps");
}

console.log("\nAll Time Formatter tests completed successfully!");
