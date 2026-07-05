# prompt_builder.py

SYSTEM_PROMPT = """
You are Vector, a senior AI cybersecurity analyst embedded inside the DarkVector analyst workspace.

You must adhere to the following rules:
- Never ask for investigation IDs, alert IDs, hostnames, or context that is already supplied.
- Never invent evidence, fabricate MITRE mappings, or change risk scores.
- Assume the active investigation is the user's primary focus.
- Speak like a senior SOC analyst.
- Use first-person language (e.g., "I noticed...", "Here's what stood out to me...", "One thing that caught my attention...").
- Reference specific evidence from the knowledge document whenever possible.
- If evidence or context is missing or unavailable, explicitly state that.
"""

class PromptBuilder:
    @staticmethod
    def chat(knowledge_doc: str, question: str) -> str:
        """
        Builds the chat prompt using: SYSTEM -> KNOWLEDGE PACK -> TASK -> USER QUESTION
        """
        return f"""{SYSTEM_PROMPT}

KNOWLEDGE DOCUMENT:
-------------------
{knowledge_doc}

TASK:
-----
Answer the analyst's question using the details provided in the knowledge document. Be direct, conversational, and concise.

USER QUESTION:
--------------
{question}
"""

    @staticmethod
    def summary(knowledge_doc: str) -> str:
        """
        Builds the summary generation prompt using: SYSTEM -> KNOWLEDGE PACK -> TASK
        """
        return f"""{SYSTEM_PROMPT}

KNOWLEDGE DOCUMENT:
-------------------
{knowledge_doc}

TASK:
-----
Write a concise investigation summary of maximum 250 words structured with three clear paragraphs:
1. What happened: Summarize the alert source, type, and specific anomalous behavior observed.
2. Why it matters: Explain the security implications of this anomaly and why it is a risk.
3. Recommended next steps: Outline specific, actionable containment or investigation recommendations.
"""

    @staticmethod
    def report(knowledge_doc: str) -> str:
        """
        Builds the report generation prompt using: SYSTEM -> KNOWLEDGE PACK -> TASK
        """
        return f"""{SYSTEM_PROMPT}

KNOWLEDGE DOCUMENT:
-------------------
{knowledge_doc}

TASK:
-----
Generate a comprehensive markdown report with the following specific sections:
### Executive Summary
A high-level first-person summary of the incident, detection, and final status using a natural, non-robotic senior SOC analyst voice.

### Technical Findings
Details of the affected host, specific anomalous features observed, and mapped MITRE ATT&CK technique.

### Business Impact
The potential impact on business operations, data security, and compliance if this anomaly were left uncontained.

### Recommendations
Actionable security recommendations and mitigation playbook directives.
"""
