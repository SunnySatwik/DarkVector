# knowledge_pack.py

class KnowledgePack:
    @staticmethod
    def generate(context: dict) -> str:
        """
        Converts the compiled ContextBuilder dictionary into a structured natural-language
        document optimized for LLM comprehension.
        """
        sections = []
        beh = context.get("behavioral_context")

        # 1. ## Investigation Overview
        inv = context.get("investigation")
        if inv:
            inv_id = inv.get("investigation_id", "N/A")
            title = inv.get("title", "N/A")
            status = inv.get("status", "N/A")
            severity = inv.get("severity", "N/A")
            risk_score = inv.get("risk_score", 0.0)
            confidence = inv.get("confidence", 0.0)
            # Normalize confidence representation
            if confidence <= 1.0:
                confidence *= 100

            overview_text = (
                f"The active investigation {inv_id} ('{title}') is currently in the {status} stage. "
                f"It was flagged with a {severity} severity, carrying a calculated risk score of {risk_score:.1f}% "
                f"and an analysis confidence level of {confidence:.0f}%.\n"
                f"Severity: {severity}\n"
                f"Risk Score: {risk_score:.1f}%\n"
                f"Confidence: {confidence:.0f}%"
            )
        else:
            overview_text = "There is currently no active database investigation record associated with this context."

        sections.append(f"## Investigation Overview\n{overview_text}")

        # If it's a behavioral investigation
        if beh:
            # 2. ## Behavioral Detection Assessment
            primary_det = beh.get("primary_detection") or {}
            group_size = beh.get("group_size", 1)
            primary_title = primary_det.get("title", "N/A")
            primary_rule = primary_det.get("rule_id", "N/A")
            primary_severity = primary_det.get("severity", "N/A")
            primary_confidence = primary_det.get("confidence", 0)
            primary_desc = primary_det.get("description", "N/A")
            host_id = primary_det.get("host_id", "N/A")

            assessment_lines = [
                f"This investigation consists of {group_size} correlated endpoint behavioral detection(s) on host '{host_id}'. "
                f"The primary detection was triggered by rule '{primary_rule}' ('{primary_title}'), classified as {primary_severity} severity with {primary_confidence:.0f}% confidence.",
                f"Primary Detection Description: {primary_desc}",
                "\nAll associated behavioral detections:"
            ]

            for idx, d in enumerate(beh.get("detections") or [], 1):
                d_title = d.get("title", "N/A")
                d_rule = d.get("rule_id", "N/A")
                d_sev = d.get("severity", "N/A")
                d_conf = d.get("confidence", 0)
                d_guid = d.get("process_guid", "N/A")
                d_desc = d.get("description", "N/A")
                assessment_lines.append(
                    f"{idx}. '{d_title}' (Rule: {d_rule}, Severity: {d_sev}, Confidence: {d_conf:.0f}%, Process GUID: {d_guid}): {d_desc}"
                )

            sections.append(f"## Behavioral Detection Assessment\n" + "\n".join(assessment_lines))

            # 3. ## Correlation Analysis
            corr = context.get("correlation_context")
            if corr:
                num_dets = corr.get("number_of_detections", 1)
                duration = corr.get("duration", 0.0)
                first_seen = corr.get("first_seen", 0.0)
                last_seen = corr.get("last_seen", 0.0)
                corr_id = corr.get("correlation_id", "N/A")
                involved_guids = corr.get("involved_process_guids") or []

                correlation_text = (
                    f"These detections were aggregated into Correlation Group {corr_id} spanning a duration of {duration:.2f} seconds. "
                    f"The event sequence was first observed at epoch timestamp {first_seen:.2f} and last seen at {last_seen:.2f}. "
                    f"A total of {num_dets} events are linked across {len(involved_guids)} distinct processes."
                )
                sections.append(f"## Correlation Analysis\n{correlation_text}")

            # 4. ## Process Evidence
            proc_ev = context.get("process_evidence") or []
            if proc_ev:
                proc_lines = ["The following processes were involved in the execution chain:"]
                for p in proc_ev:
                    p_name = p.get("process_name") or "Unknown"
                    pid = p.get("pid") or "N/A"
                    ppid = p.get("ppid") or "N/A"
                    user = p.get("username") or "N/A"
                    cmd = p.get("cmdline") or "N/A"
                    exe = p.get("executable") or "N/A"
                    guid = p.get("process_guid") or "N/A"
                    p_info = p.get("parent_info")

                    parent_str = f" spawned by parent '{p_info}'" if p_info else ""
                    proc_lines.append(
                        f"- Process '{p_name}' (PID: {pid}, PPID: {ppid}, User: {user}){parent_str} executed command: `{cmd}` (Executable: `{exe}`). [Process GUID: {guid}]"
                    )
                sections.append(f"## Process Evidence\n" + "\n".join(proc_lines))

            # 5. ## Attack Assessment
            mitre_mappings = context.get("mitre_mappings") or []
            assessment_parts = []
            if mitre_mappings:
                assessment_parts.append(
                    "From a threat framework perspective, the correlated behaviors align with multiple MITRE ATT&CK techniques:"
                )
                for m in mitre_mappings:
                    tech_id = m.get("technique_id", "N/A")
                    tech_name = m.get("technique_name", "N/A")
                    tactic = m.get("tactic", "N/A")
                    m_desc = m.get("description", "N/A")
                    assessment_parts.append(
                        f"- Technique '{tech_name}' ({tech_id}) under tactic '{tactic}'. Alignment rationale: resembles {m_desc.lower() if m_desc != 'N/A' else 'the described technique behavior'}."
                    )
            else:
                assessment_parts.append("No official MITRE ATT&CK technique mapping has been matched to this alert activity.")

            ti = context.get("threat_intelligence") or {}
            reputation = ti.get("reputation", "N/A")
            if reputation != "N/A":
                ti_source = ti.get("source", "N/A")
                ti_desc = ti.get("description", "N/A")
                assessment_parts.append(
                    f"\nThreat intelligence queries from '{ti_source}' flag the reputation as '{reputation}'. "
                    f"The infrastructure assessment indicates: {ti_desc}."
                )

            sections.append(f"## Attack Assessment\n" + "\n".join(assessment_parts))

            # 6. ## Recommended Actions
            recs = context.get("recommendations") or []
            if recs:
                rec_lines = [
                    "Based on the observed behavioral patterns, the following response and remediation actions are recommended:"
                ]
                for idx, r in enumerate(recs, 1):
                    rec_lines.append(f"{idx}. {r}")
                sections.append(f"## Recommended Actions\n" + "\n".join(rec_lines))

            # 7. ## Evidence Summary
            evidence_summary_text = (
                f"The primary scope of evidence centers on host '{host_id}' involving {group_size} detections and {len(proc_ev)} processes. "
                f"The aggregate risk score is {risk_score:.1f}% based on behavioral rules. Entity links and paths are derived from historical endpoint process execution telemetry."
            )
            sections.append(f"## Evidence Summary\n{evidence_summary_text}")

        else:
            # Legacy alert + analysis narrative path
            # 2. ## Alert Analysis
            alert = context.get("alert") or {}
            alert_type = alert.get("type", "N/A")
            alert_category = alert.get("category", "N/A")
            source = alert.get("source", "N/A")

            details = alert.get("details", {})
            user = details.get("user") or details.get("username") or "an unknown user"
            src_ip = details.get("srcIp") or details.get("sourceIp") or details.get("ipAddress") or "N/A"
            dst_ip = details.get("dstIp") or details.get("destinationIp") or "N/A"
            process = details.get("processPath") or details.get("process") or "N/A"
            cmdline = details.get("commandLine") or details.get("command") or "N/A"

            alert_desc = (
                f"This case involves a security alert of type '{alert_type}' in the '{alert_category}' category, "
                f"originating from source host '{source}'."
            )

            details_sentences = []
            if user != "an unknown user":
                details_sentences.append(f"The activity was executed by user '{user}'.")
            else:
                details_sentences.append("The executing user could not be determined.")

            if src_ip != "N/A" or dst_ip != "N/A":
                ip_str = ""
                if src_ip != "N/A":
                    ip_str += f"source IP '{src_ip}'"
                if dst_ip != "N/A":
                    if ip_str:
                        ip_str += " and "
                    ip_str += f"destination IP '{dst_ip}'"
                details_sentences.append(f"Network parameters associated with the alert include {ip_str}.")

            if process != "N/A":
                details_sentences.append(f"The trigger process was '{process}'.")
            if cmdline != "N/A":
                details_sentences.append(f"The associated command execution was: {cmdline}.")

            other_details = []
            known_keys = {"user", "username", "srcIp", "sourceIp", "ipAddress", "dstIp", "destinationIp", "processPath", "process", "commandLine", "command"}
            for k, v in details.items():
                if k not in known_keys:
                    other_details.append(f"{k} is '{v}'")
            if other_details:
                details_sentences.append(f"Additional telemetry metrics show: {', '.join(other_details)}.")

            alert_analysis_text = f"{alert_desc} {' '.join(details_sentences)}"
            sections.append(f"## Alert Analysis\n{alert_analysis_text}")

            # 3. ## Attack Assessment
            mitre = context.get("mitre") or {}
            tech_id = mitre.get("technique_id", "N/A")
            tech_name = mitre.get("technique_name", "N/A")
            tactic = mitre.get("tactic", "N/A")
            mitre_desc = mitre.get("description", "N/A")

            ti = context.get("threat_intelligence") or {}
            reputation = ti.get("reputation", "N/A")
            ti_source = ti.get("source", "N/A")
            ti_desc = ti.get("description", "N/A")

            assessment_parts = []
            if tech_id != "N/A":
                assessment_parts.append(
                    f"From a threat framework perspective, the activity aligns with the MITRE ATT&CK technique "
                    f"'{tech_name}' ({tech_id}) under the '{tactic}' tactic. The mapping occurred because the activity "
                    f"resembles {mitre_desc.lower() if mitre_desc != 'N/A' else 'the described technique behavior'}."
                )
            else:
                assessment_parts.append("No official MITRE ATT&CK technique mapping has been matched to this alert activity.")

            if reputation != "N/A":
                assessment_parts.append(
                    f"Threat intelligence queries from '{ti_source}' flag the reputation as '{reputation}'. "
                    f"The infrastructure assessment indicates: {ti_desc}."
                )
            else:
                assessment_parts.append("Threat intelligence queries did not return reputation mappings for the associated indicators.")

            attack_assessment_text = " ".join(assessment_parts)
            sections.append(f"## Attack Assessment\n{attack_assessment_text}")

            # 4. ## Evidence Summary
            shap = context.get("shap_factors") or {}
            factors = shap.get("top_factors", [])

            graph = context.get("evidence_graph") or {}
            nodes = graph.get("nodes", [])
            links = graph.get("links", [])

            evidence_parts = []
            user_info = user if (user and user != "an unknown user") else "unidentified"
            source_info = source if source else "unknown"
            evidence_parts.append(
                f"The primary scope of evidence centers on host '{source_info}' and user '{user_info}'."
            )

            if factors:
                factor_sentences = []
                for f in factors:
                    factor_sentences.append(f"feature '{f.get('feature')}' contributing an anomaly impact of {f.get('impact', 0.0):.4f}")
                evidence_parts.append(
                    f"The anomaly score is heavily influenced by SHAP feature attributions, specifically: {', '.join(factor_sentences)}."
                )
            else:
                evidence_parts.append("No specific SHAP anomaly score feature attributions were calculated.")

            breakdown = shap.get("confidence_breakdown")
            reasons = shap.get("confidence_reasons")
            if breakdown:
                evidence_parts.append(
                    f"The analysis confidence is structured as: Model Evidence: {breakdown.get('model_evidence')}, "
                    f"Explanation Attribution Quality: {breakdown.get('explanation_evidence')}, "
                    f"Context Corroboration: {breakdown.get('contextual_evidence')}, "
                    f"Input Completeness: {breakdown.get('input_completeness')}."
                )
            if reasons:
                reasons_str = " ".join(reasons)
                evidence_parts.append(f"Evidence reliability assessment notes: {reasons_str}")

            if nodes or links:
                nodes_str = ", ".join(f"{n.get('label')} ({n.get('type')})" for n in nodes)
                links_str = ", ".join(f"{l.get('source')} -> {l.get('target')}" for l in links)
                evidence_parts.append(
                    f"The evidence relationship graph links the following entities: {nodes_str}. "
                    f"Observed behavioral paths show connection transitions: {links_str}."
                )
            else:
                evidence_parts.append("The evidence relationship graph has no recorded entity linkages.")

            evidence_summary_text = " ".join(evidence_parts)
            sections.append(f"## Evidence Summary\n{evidence_summary_text}")

        # 8. ## Investigation Timeline (Common)
        timeline = context.get("timeline") or []
        if timeline:
            first = timeline[0]
            last = timeline[-1]
            summary = [
                f"The investigation began when {first.get('actor','SYSTEM')} recorded '{first.get('title','an event')}'."
            ]
            if len(timeline) > 2:
                summary.append(
                    f"During the investigation, {len(timeline)-2} additional events were recorded documenting the progression of the case."
                )
            summary.append(
                f"The most recent activity was '{last.get('title','an event')}', recorded by {last.get('actor','SYSTEM')}."
            )
            timeline_text = " ".join(summary)
        else:
            timeline_text = "No investigation timeline has been recorded."

        sections.append(f"## Investigation Timeline\n{timeline_text}")

        # 9. ## Previous Conversation (Common if not empty)
        conv = context.get("conversation") or {}
        recent = conv.get("recent") or []
        summary_text = conv.get("summary", "None")

        if recent or (summary_text and summary_text != "None"):
            recent_str = "\n".join(
                f"{'Analyst' if r.get('sender') == 'user' else 'Vector'}: {r.get('text')}"
                for r in recent
            )
            conversation_text = (
                f"Summary of older discussions: {summary_text}\n\n"
                f"Recent exchanges:\n{recent_str or 'None'}"
            )
            sections.append(f"## Previous Conversation\n{conversation_text}")

        # Filter out any sections that are completely empty or have N/A context
        valid_sections = []
        for s in sections:
            header, content = s.split("\n", 1)
            # Only append if content has substantial text
            if content.strip() and content.strip() != "None" and content.strip() != "No investigation timeline has been recorded.":
                valid_sections.append(s)
            elif "timeline" in header.lower() or "overview" in header.lower():
                # overview and timeline should always remain present even if basic
                valid_sections.append(s)

        return "\n\n".join(valid_sections)
