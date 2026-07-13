import { computeTargetId, CompactInvestigation } from "../lib/graphSelector";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("Running UI Transitions & Selection Tests...\n");

const mockInvestigations: CompactInvestigation[] = [
  { investigation_id: "INV-1", status: "RESOLVED" },
  { investigation_id: "INV-2", status: "INVESTIGATING" },
  { investigation_id: "INV-3", status: "NEW" },
];

// Test 1: Explicit selection
{
  const target = computeTargetId({
    selectedInvestigationId: "INV-2",
    investigations: mockInvestigations,
  });
  assert(target === "INV-2", "Should respect selectedInvestigationId first");
  console.log("✔ Test 1 Passed: Explicit selection respected");
}

// Test 2: Active investigation fallback from routing
{
  const target = computeTargetId({
    activeInvestigationId: "INV-3",
    investigations: mockInvestigations,
  });
  assert(target === "INV-3", "Should respect activeInvestigationId when no explicit selection exists");
  console.log("✔ Test 2 Passed: Active investigation routing respected");
}

// Test 3: Stored selection fallback
{
  const target = computeTargetId({
    storedSelectedId: "INV-1",
    investigations: mockInvestigations,
  });
  assert(target === "INV-1", "Should restore stored selection from localStorage if valid");
  console.log("✔ Test 3 Passed: Stored selection restored");
}

// Test 4: Default newest active fallback
{
  const target = computeTargetId({
    investigations: mockInvestigations,
  });
  // INV-2 is the first active investigation in mockInvestigations list
  assert(target === "INV-2", "Should default to the newest active investigation");
  console.log("✔ Test 4 Passed: Default newest active fallback works");
}

// Test 5: Default newest overall if no active exists
{
  const closedInvestigations: CompactInvestigation[] = [
    { investigation_id: "INV-10", status: "RESOLVED" },
    { investigation_id: "INV-20", status: "DISMISSED" },
  ];
  const target = computeTargetId({
    investigations: closedInvestigations,
  });
  assert(target === "INV-10", "Should fall back to newest overall if no active exists");
  console.log("✔ Test 5 Passed: Default newest overall fallback works");
}

// Test 6: Empty state when no investigations exist
{
  const target = computeTargetId({
    investigations: [],
  });
  assert(target === undefined, "Should return undefined if investigations array is empty");
  console.log("✔ Test 6 Passed: Empty state handled cleanly");
}

console.log("\nAll UI Transitions & Selection tests completed successfully!");
