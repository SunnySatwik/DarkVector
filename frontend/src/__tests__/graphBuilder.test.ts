import { 
  buildGraphData, 
  buildBehavioralGraphData, 
  Node, 
  Link 
} from "../lib/graphBuilder";
import { Alert } from "../types";
import { InvestigationWorkspace } from "../api/types";

// Helper function to assert condition with helpful message
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("Running Graph Builder Tests...\n");

// ---------------------------------------------------------
// Mock Data Setup
// ---------------------------------------------------------

const mockAlert: Alert = {
  id: "alert-123",
  timestamp: "2026-07-13T19:25:22Z",
  source: "host-9476",
  type: "PowerShell Encoded Command",
  severity: "high",
  score: 95,
  status: "open",
  category: "process",
  description: "Anomalous PowerShell execution",
  details: {
    processPath: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    parentProcess: "explorer.exe",
    commandLine: "powershell.exe -EncodedCommand <payload>",
    username: "administrator",
    ipAddress: "192.168.1.50",
    port: 443
  }
};

const mockBehavioralWorkspace: InvestigationWorkspace = {
  investigation: {
    investigation_id: "INV-260712-B667E6",
    alert_id: "alert-123",
    title: "PowerShell Encoded Command",
    status: "NEW",
    severity: "high",
    risk_score: 95.0,
    confidence: 0.95,
    summary: "Investigation summary details",
    created_at: "2026-07-13T19:25:00Z",
    updated_at: "2026-07-13T19:25:00Z"
  },
  alert: null,
  analysis: null,
  is_behavioral: true,
  behavioral_detections: [
    {
      id: "det-1",
      rule_id: "powershell_encoded",
      title: "PowerShell Encoded Command",
      description: "Observed base64 encoded command execution",
      severity: "high",
      confidence: 95,
      host_id: "9476a896-ecce-506c-aecf-13f671586988",
      process_guid: "proc-guid-123",
      timestamp: 1782782728,
      mitre_technique: "T1059.001",
      mitre_tactic: "Execution",
      recommendations: ["Isolate host", "Terminate process"],
      evidence: [],
      metadata: {}
    }
  ],
  primary_detection: {
    id: "det-1",
    rule_id: "powershell_encoded",
    title: "PowerShell Encoded Command",
    description: "Observed base64 encoded command execution",
    severity: "high",
    confidence: 95,
    host_id: "9476a896-ecce-506c-aecf-13f671586988",
    process_guid: "proc-guid-123",
    timestamp: 1782782728,
    mitre_technique: "T1059.001",
    mitre_tactic: "Execution",
    recommendations: ["Isolate host", "Terminate process"],
    evidence: [],
    metadata: {}
  },
  correlation: null,
  process_evidence: [
    {
      process_guid: "proc-guid-123",
      pid: 4567,
      ppid: 1234,
      process_name: "powershell.exe",
      executable: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      cmdline: "powershell.exe -EncodedCommand <payload>",
      username: "administrator",
      parent_info: null
    }
  ],
  mitre_mappings: [
    {
      technique_id: "T1059.001",
      technique_name: "PowerShell",
      tactic: "Execution",
      description: "Adversaries may use PowerShell to command and control"
    }
  ],
  recommendations: [],
  timeline: []
};

// ---------------------------------------------------------
// Test Cases
// ---------------------------------------------------------

// Test 1 & 7 & 8: Behavioral investigation with process evidence + correct types & edges
{
  const { nodes, links } = buildBehavioralGraphData(mockBehavioralWorkspace);
  
  assert(nodes.some(n => n.id === "investigation" && n.type === "investigation"), "Should contain investigation node");
  assert(nodes.some(n => n.id === "detection-det-1" && n.type === "detection"), "Should contain detection node");
  assert(nodes.some(n => n.id === "host" && n.type === "host" && n.label === "9476a896-ecce-506c-aecf-13f671586988"), "Should contain host node with Host ID");
  assert(nodes.some(n => n.id === "process-proc-guid-123" && n.type === "process" && n.label === "powershell.exe"), "Should contain process node");
  assert(nodes.some(n => n.id === "mitre-T1059.001" && n.type === "mitre" && n.label.includes("T1059.001")), "Should contain MITRE technique node");

  // Relationships
  assert(links.some(l => l.source === "investigation" && l.target === "detection-det-1"), "Should link investigation to detection");
  assert(links.some(l => l.source === "detection-det-1" && l.target === "host"), "Should link detection to host");
  assert(links.some(l => l.source === "host" && l.target === "process-proc-guid-123"), "Should link host to process");
  assert(links.some(l => l.source === "process-proc-guid-123" && l.target === "detection-det-1" && l.isThreat), "Should link process to detection as threat");
  assert(links.some(l => l.source === "detection-det-1" && l.target === "mitre-T1059.001"), "Should link detection to MITRE technique");

  // Test 9 & 10: "PowerShell Encoded Command" not classified as asset + "Pod" not fabricated
  const detectionNode = nodes.find(n => n.id === "detection-det-1")!;
  assert(detectionNode.type === "detection", "Detection node type should be 'detection' (not asset/pod)");
  
  const hostNode = nodes.find(n => n.id === "host")!;
  assert(hostNode.type === "host", "Host node type must be 'host' (not pod)");
  
  console.log("✔ Test 1, 7, 8, 9, 10 Passed: Behavioral investigation with process evidence looks correct");
}

// Test 2: Behavioral investigation with no process evidence
{
  const noProcessWorkspace: InvestigationWorkspace = {
    ...mockBehavioralWorkspace,
    process_evidence: [],
  };
  const { nodes, links } = buildBehavioralGraphData(noProcessWorkspace);
  
  assert(!nodes.some(n => n.type === "process"), "Should contain no process nodes");
  assert(nodes.some(n => n.type === "host"), "Should still contain host node");
  assert(nodes.some(n => n.type === "detection"), "Should still contain detection node");
  console.log("✔ Test 2 Passed: Behavioral investigation with no process evidence handled");
}

// Test 4: Missing MITRE mapping
{
  const noMitreWorkspace: InvestigationWorkspace = {
    ...mockBehavioralWorkspace,
    mitre_mappings: [],
  };
  const { nodes } = buildBehavioralGraphData(noMitreWorkspace);
  assert(!nodes.some(n => n.type === "mitre"), "Should contain no MITRE nodes");
  console.log("✔ Test 4 Passed: Missing MITRE mapping handled");
}

// Test 5: Missing host
{
  const noHostWorkspace: InvestigationWorkspace = {
    ...mockBehavioralWorkspace,
    primary_detection: {
      ...mockBehavioralWorkspace.primary_detection!,
      host_id: ""
    },
    behavioral_detections: [
      {
        ...mockBehavioralWorkspace.behavioral_detections[0],
        host_id: ""
      }
    ]
  };
  const { nodes } = buildBehavioralGraphData(noHostWorkspace);
  const hostNode = nodes.find(n => n.id === "host")!;
  assert(hostNode.label === "unknown-host", "Should fall back to unknown-host label");
  console.log("✔ Test 5 Passed: Missing host handled safely");
}

// Test 6: Duplicate evidence does not create duplicate nodes
{
  const duplicateWorkspace: InvestigationWorkspace = {
    ...mockBehavioralWorkspace,
    process_evidence: [
      mockBehavioralWorkspace.process_evidence[0],
      mockBehavioralWorkspace.process_evidence[0] // duplicate
    ],
    mitre_mappings: [
      mockBehavioralWorkspace.mitre_mappings[0],
      mockBehavioralWorkspace.mitre_mappings[0] // duplicate
    ]
  };
  const { nodes } = buildBehavioralGraphData(duplicateWorkspace);
  
  const processNodes = nodes.filter(n => n.type === "process");
  assert(processNodes.length === 1, "Duplicate process evidence should result in exactly 1 process node");
  
  const mitreNodes = nodes.filter(n => n.type === "mitre");
  assert(mitreNodes.length === 1, "Duplicate mitre mappings should result in exactly 1 mitre node");
  
  console.log("✔ Test 6 Passed: Duplicate evidence deduplication works");
}

// Test 11: Entity inspector details verification
{
  const { nodes } = buildBehavioralGraphData(mockBehavioralWorkspace);
  
  const hostNode = nodes.find(n => n.id === "host")!;
  assert(hostNode.details.includes("Host ID:"), "Host details must contain Host ID");
  assert(!hostNode.details.includes("Pod"), "Host details must not fabricate Pod classification");

  const procNode = nodes.find(n => n.id === "process-proc-guid-123")!;
  assert(procNode.details.includes("PID: 4567"), "Process details must contain PID");
  assert(procNode.details.includes("Command line:"), "Process details must contain Command line");

  const detNode = nodes.find(n => n.id === "detection-det-1")!;
  assert(detNode.details.includes("Confidence: 95%"), "Detection details must contain confidence");

  const mitreNode = nodes.find(n => n.id === "mitre-T1059.001")!;
  assert(mitreNode.details.includes("Tactic: Execution"), "MITRE details must contain tactic");
  
  console.log("✔ Test 11 Passed: Entity inspector details correctly formatted");
}

// Test 13: Legacy alert graph behavior remains functional
{
  const { nodes, links } = buildGraphData(mockAlert);
  
  assert(nodes.some(n => n.id === "source" && n.label === "host-9476"), "Should contain source node");
  assert(nodes.some(n => n.id === "user" && n.label === "administrator"), "Should contain user node");
  assert(nodes.some(n => n.id === "parent-process" && n.label === "explorer.exe"), "Should contain parent-process node");
  assert(nodes.some(n => n.id === "process" && n.label === mockAlert.details.processPath), "Should contain process node");
  assert(nodes.some(n => n.id === "remote-ip" && n.label.startsWith("192.168.1.50")), "Should contain remote-ip node");
  
  assert(links.some(l => l.source === "source" && l.target === "user"), "Should link source to user");
  assert(links.some(l => l.source === "source" && l.target === "parent-process"), "Should link source to parent-process");
  assert(links.some(l => l.source === "parent-process" && l.target === "process"), "Should link parent to spawned process");
  
  console.log("✔ Test 13 Passed: Legacy alert graph builder works perfectly");
}

console.log("\nAll Graph Builder tests completed successfully!");
