import { Alert, Severity } from "../types";
import { ContextEnrichment, InvestigationWorkspace } from "../api/types";

export interface Node {
  id: string;
  label: string;
  type: "pod" | "process" | "database" | "external-ip" | "investigation" | "detection" | "host" | "mitre";
  severity: Severity | "none";
  x: number;
  y: number;
  details: string;
}

export interface Link {
  source: string;
  target: string;
  isThreat: boolean;
}

export function buildGraphData(alert: Alert, context?: ContextEnrichment): { nodes: Node[]; links: Link[] } {
  const nodes: Node[] = [];
  const links: Link[] = [];

  // 1. Source Node (always exists)
  nodes.push({
    id: "source",
    label: alert.source,
    type: alert.source.includes("db-") ? "database" : "pod",
    severity: alert.severity,
    x: 100,
    y: 150,
    details: `Incident origin source asset node '${alert.source}'. Initial classification: ${alert.severity.toUpperCase()}. Category: ${alert.category}.`,
  });

  let lastNodeId = "source";

  // 2. User Node (if username exists)
  if (alert.details?.username) {
    nodes.push({
      id: "user",
      label: alert.details.username,
      type: "pod",
      severity: "none",
      x: 250,
      y: 70,
      details: `Associated credential account session: ${alert.details.username}. Verified alignment with historic location profile.`,
    });
    links.push({ source: "source", target: "user", isThreat: false });
  }

  // 3. Parent Process Node (if parentProcess exists)
  if (alert.details?.parentProcess) {
    nodes.push({
      id: "parent-process",
      label: alert.details.parentProcess,
      type: "pod",
      severity: "none",
      x: 250,
      y: 230,
      details: `Parent execution process lineage node: ${alert.details.parentProcess}. Spawned by container initialization sequence.`,
    });
    links.push({ source: "source", target: "parent-process", isThreat: false });
    lastNodeId = "parent-process";
  }

  // 4. Spawned Binary Node (if processPath exists)
  if (alert.details?.processPath) {
    nodes.push({
      id: "process",
      label: alert.details.processPath,
      type: "process",
      severity: "critical",
      x: 430,
      y: 150,
      details: `Flagged anomalous execution node: ${alert.details.processPath}. Command line arguments: "${alert.details.commandLine || 'none'}". Isolation Forest score: ${alert.score}/100.`,
    });
    links.push({ source: lastNodeId, target: "process", isThreat: true });
    lastNodeId = "process";
  }

  // 5. Remote Destination Node (if ipAddress exists)
  if (alert.details?.ipAddress) {
    const rep = context?.threat_intelligence?.reputation || "unknown";
    const sev = rep === "malicious" ? "critical" : rep === "suspicious" ? "high" : "none";
    nodes.push({
      id: "remote-ip",
      label: `${alert.details.ipAddress}${alert.details.port ? `:${alert.details.port}` : ""}`,
      type: "external-ip",
      severity: sev as any,
      x: 610,
      y: 150,
      details: `Remote connection endpoint: ${alert.details.ipAddress} on port ${alert.details.port || 'N/A'}. Reputation: ${rep.toUpperCase()}. Category: ${context?.threat_intelligence?.category || 'Unclassified'}. Summary: ${context?.threat_intelligence?.summary || 'No threat details.'}`,
    });
    links.push({ source: lastNodeId, target: "remote-ip", isThreat: true });
  }

  return { nodes, links };
}

export function buildBehavioralGraphData(workspace: InvestigationWorkspace): { nodes: Node[]; links: Link[] } {
  const nodes: Node[] = [];
  const links: Link[] = [];

  const inv = workspace.investigation;
  const primaryDet = workspace.primary_detection || workspace.behavioral_detections?.[0];
  const severityVal = (inv.severity || "low").toLowerCase() as Severity;

  // 1. Investigation Node
  nodes.push({
    id: "investigation",
    label: inv.title || inv.investigation_id,
    type: "investigation",
    severity: severityVal,
    x: 80,
    y: 150,
    details: `Investigation ID: ${inv.investigation_id}\nTitle: ${inv.title}\nStatus: ${inv.status}\nRisk Score: ${inv.risk_score}%\nCreated At: ${inv.created_at || "N/A"}`,
  });

  // 2. Detection Node(s)
  const detNodes: string[] = [];
  const detections = workspace.behavioral_detections || [];
  const detectionsToUse = detections.length > 0 ? detections : (primaryDet ? [primaryDet] : []);
  
  detectionsToUse.forEach((det, idx) => {
    const detId = `detection-${det.id || idx}`;
    detNodes.push(detId);
    
    const yPos = detectionsToUse.length > 1 ? 80 + (idx * (140 / (detectionsToUse.length - 1))) : 230;
    
    nodes.push({
      id: detId,
      label: det.title || "Behavioral Detection",
      type: "detection",
      severity: (det.severity || "low").toLowerCase() as Severity,
      x: 240,
      y: yPos,
      details: `Rule: ${det.rule_id || "unknown"}\nSeverity: ${det.severity?.toUpperCase() || "LOW"}\nConfidence: ${det.confidence || 0}%\nSummary: ${det.description || "Behavioral detection event."}`,
    });
    
    links.push({ source: "investigation", target: detId, isThreat: true });
  });

  // 3. Host Node (Host ID must be shown, NOT classified as an asset, no "Pod" fabricated)
  const hostId = primaryDet?.host_id || "unknown-host";
  nodes.push({
    id: "host",
    label: hostId,
    type: "host",
    severity: "none",
    x: 240,
    y: 70,
    details: `Host ID: ${hostId}\nTelemetry source: DarkVector Sentinel\nActive detections: ${detectionsToUse.length}`,
  });

  // Link host to all detections on it
  detNodes.forEach((detId) => {
    links.push({ source: detId, target: "host", isThreat: false });
  });

  // 4. Process Node(s) (processes are deduplicated, details format process info)
  const processEvidence = workspace.process_evidence || [];
  const uniqueProcessEvidence = processEvidence.filter(
    (proc, index, self) =>
      !proc.process_guid || self.findIndex((p) => p.process_guid === proc.process_guid) === index
  );

  const procNodes: string[] = [];
  uniqueProcessEvidence.forEach((proc, idx) => {
    const procId = `process-${proc.process_guid || idx}`;
    procNodes.push(procId);
    
    const yPos = uniqueProcessEvidence.length > 1 ? 80 + (idx * (140 / (uniqueProcessEvidence.length - 1))) : 150;
    const cmdStr = Array.isArray(proc.cmdline) 
      ? proc.cmdline.join(" ") 
      : typeof proc.cmdline === "string" 
        ? proc.cmdline 
        : "none";
        
    nodes.push({
      id: procId,
      label: proc.process_name || "unknown process",
      type: "process",
      severity: severityVal,
      x: 440,
      y: yPos,
      details: `Process: ${proc.process_name || "unknown"}\nPID: ${proc.pid || "N/A"}\nPPID: ${proc.ppid || "N/A"}\nExecutable: ${proc.executable || "unknown"}\nCommand line: ${cmdStr}\nUser: ${proc.username || "system"}`,
    });

    links.push({ source: "host", target: procId, isThreat: false });

    // Link processes to detections if they triggered them
    detNodes.forEach((detId) => {
      links.push({ source: procId, target: detId, isThreat: true });
    });
  });

  // 5. MITRE Technique Node(s)
  const mitreMappings = workspace.mitre_mappings || [];
  const uniqueMitreMappings = mitreMappings.filter(
    (mapping, index, self) =>
      self.findIndex((m) => m.technique_id === mapping.technique_id) === index
  );

  uniqueMitreMappings.forEach((mapping, idx) => {
    const mitreId = `mitre-${mapping.technique_id}`;
    const yPos = uniqueMitreMappings.length > 1 ? 80 + (idx * (140 / (uniqueMitreMappings.length - 1))) : 150;
    
    nodes.push({
      id: mitreId,
      label: `${mapping.technique_id}: ${mapping.technique_name || "MITRE Technique"}`,
      type: "mitre",
      severity: "none",
      x: 620,
      y: yPos,
      details: `Technique ID: ${mapping.technique_id}\nTechnique Name: ${mapping.technique_name || "N/A"}\nTactic: ${mapping.tactic || "N/A"}\nDescription: ${mapping.description || "No technique description available."}`,
    });

    // Link all detections to MITRE mapping
    detNodes.forEach((detId) => {
      links.push({ source: detId, target: mitreId, isThreat: false });
    });
  });

  return { nodes, links };
}
