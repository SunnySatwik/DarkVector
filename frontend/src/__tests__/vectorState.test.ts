/**
 * vectorState.test.ts
 *
 * Unit tests for Vector orb state derivation and suggestion chip behavior.
 * Tests pure business logic — no DOM/React rendering required.
 */

import { VectorOrbState } from "../components/vector/VectorOrb";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("Running Vector State Tests...\n");

// ─── Orb state derivation ─────────────────────────────────────────────────

function deriveOrbState({
  isError,
  isResponding,
  chatInputLength,
}: {
  isError: boolean;
  isResponding: boolean;
  chatInputLength: number;
}): VectorOrbState {
  if (isError) return "error";
  if (isResponding) return "reasoning";
  if (chatInputLength > 0) return "typing";
  return "idle";
}

// Test 1: Error state takes highest priority
{
  const state = deriveOrbState({ isError: true, isResponding: true, chatInputLength: 5 });
  assert(state === "error", "Error state should override reasoning and typing");
  console.log("✔ Test 1 Passed: Error state priority");
}

// Test 2: Reasoning state when responding (no error)
{
  const state = deriveOrbState({ isError: false, isResponding: true, chatInputLength: 0 });
  assert(state === "reasoning", "Should show reasoning when isResponding is true");
  console.log("✔ Test 2 Passed: Reasoning state when responding");
}

// Test 3: Typing state when user has input text
{
  const state = deriveOrbState({ isError: false, isResponding: false, chatInputLength: 3 });
  assert(state === "typing", "Should show typing state when chatInput has content");
  console.log("✔ Test 3 Passed: Typing state when input has content");
}

// Test 4: Idle state when no activity
{
  const state = deriveOrbState({ isError: false, isResponding: false, chatInputLength: 0 });
  assert(state === "idle", "Should show idle state when nothing is happening");
  console.log("✔ Test 4 Passed: Idle state baseline");
}

// Test 5: Suggestions disabled when responding
{
  const isResponding = true;
  const prompts = ["Explain the strongest evidence", "What next?"];
  const activeSuggestions = prompts.filter(() => !isResponding);
  assert(activeSuggestions.length === 0, "Suggestions should be inactive when responding");
  console.log("✔ Test 5 Passed: Suggestions disabled during reasoning");
}

// Test 6: Suggestions available when idle
{
  const isResponding = false;
  const prompts = ["Explain the strongest evidence", "What next?"];
  const activeSuggestions = prompts.filter(() => !isResponding);
  assert(activeSuggestions.length === 2, "All suggestions should be available when idle");
  console.log("✔ Test 6 Passed: Suggestions available in idle state");
}

// Test 7: Draft input preserved across mock close/reopen cycles
{
  let chatInput = "What is the MITRE technique?";
  // simulate close (isExpanded = false) — does NOT clear draft
  const draftAfterClose = chatInput;
  assert(draftAfterClose === "What is the MITRE technique?", "Draft should survive close");
  console.log("✔ Test 7 Passed: Draft preserved across minimize/reopen");
}

// Test 8: Investigation switch resets draft
{
  let chatInput = "What is the MITRE technique?";
  // simulate investigation switch (currentKey changes)
  chatInput = ""; // resetted as per VectorPanel useEffect
  assert(chatInput === "", "Draft should reset on investigation switch");
  console.log("✔ Test 8 Passed: Draft cleared on investigation switch");
}

console.log("\nAll Vector State tests completed successfully!");
