/**
 * vectorComposer.test.ts
 *
 * Unit tests for VectorComposer business logic.
 * Tests pure functions — no DOM rendering.
 */

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("Running Vector Composer Tests...\n");

// ─── Auto-grow row calculation ────────────────────────────────────────────

function calculateRows(text: string, lineHeight = 22, maxRows = 6): number {
  const lines = text.split("\n").length;
  // Estimate rows needed
  const estimated = Math.min(maxRows, Math.max(1, lines));
  return estimated;
}

// Test 1: Single-line text = 1 row
{
  const rows = calculateRows("What is the MITRE technique?");
  assert(rows === 1, "Single-line input should result in 1 row");
  console.log("✔ Test 1 Passed: Single-line text = 1 row");
}

// Test 2: Multi-line text grows rows
{
  const text = "Line one\nLine two\nLine three";
  const rows = calculateRows(text);
  assert(rows === 3, "3 newlines should result in 3 rows");
  console.log("✔ Test 2 Passed: Multi-line text grows rows");
}

// Test 3: Row count capped at maxRows
{
  const text = Array(10).fill("line").join("\n");
  const rows = calculateRows(text);
  assert(rows === 6, "Row count should be capped at maxRows=6");
  console.log("✔ Test 3 Passed: Row count capped at maximum");
}

// Test 4: Empty text = 1 row (minimum)
{
  const rows = calculateRows("");
  assert(rows === 1, "Empty text should still show minimum 1 row");
  console.log("✔ Test 4 Passed: Empty text minimum row");
}

// ─── Send disabled state ─────────────────────────────────────────────────

function canSend(isResponding: boolean, value: string): boolean {
  return !isResponding && value.trim().length > 0;
}

// Test 5: Cannot send while responding
{
  assert(!canSend(true, "hello"), "Should not be able to send while responding");
  console.log("✔ Test 5 Passed: Send disabled during reasoning");
}

// Test 6: Cannot send with empty/whitespace input
{
  assert(!canSend(false, "   "), "Should not be able to send with whitespace-only input");
  assert(!canSend(false, ""), "Should not be able to send empty input");
  console.log("✔ Test 6 Passed: Send disabled for empty/whitespace input");
}

// Test 7: Can send when idle with content
{
  assert(canSend(false, "Why is this high severity?"), "Should allow sending when idle with content");
  console.log("✔ Test 7 Passed: Send enabled when idle with content");
}

// ─── Keyboard shortcut: Enter submits, Shift+Enter is newline ────────────

function simulateKeyDown(
  key: string,
  shiftKey: boolean,
  isResponding: boolean,
  value: string
): "submit" | "newline" | "none" {
  if (key === "Enter" && !shiftKey) {
    if (!isResponding && value.trim()) return "submit";
    return "none";
  }
  if (key === "Enter" && shiftKey) return "newline";
  return "none";
}

// Test 8: Enter submits
{
  const action = simulateKeyDown("Enter", false, false, "Hello");
  assert(action === "submit", "Enter should submit when not responding");
  console.log("✔ Test 8 Passed: Enter key submits message");
}

// Test 9: Shift+Enter inserts newline
{
  const action = simulateKeyDown("Enter", true, false, "Hello");
  assert(action === "newline", "Shift+Enter should insert newline, not submit");
  console.log("✔ Test 9 Passed: Shift+Enter inserts newline");
}

// Test 10: Enter does not submit when responding
{
  const action = simulateKeyDown("Enter", false, true, "Hello");
  assert(action === "none", "Enter should not submit while Vector is responding");
  console.log("✔ Test 10 Passed: Enter blocked while responding");
}

console.log("\nAll Vector Composer tests completed successfully!");
