# memory.py

class ConversationMemory:
    @staticmethod
    def build(history: list = None, current_question: str = None) -> dict:
        """
        Builds conversation memory context.
        - Retains the most recent 8 exchanges (up to 16 messages).
        - Automatically summarizes older conversation into a paragraph.
        """
        if not history:
            return {
                "summary": "",
                "recent": [],
                "current_question": current_question or ""
            }

        # 1 exchange = 1 user message + 1 AI reply (2 messages)
        # 8 exchanges = 16 messages
        recent_limit = 16
        if len(history) <= recent_limit:
            recent = history
            summary = ""
        else:
            recent = history[-recent_limit:]
            older = history[:-recent_limit]

            # Programmatically summarize older conversation into a paragraph
            topics = []
            for msg in older:
                if msg.get("sender") == "user":
                    text = msg.get("text", "").lower()
                    if "isolate" in text or "quarantine" in text:
                        topics.append("host isolation steps")
                    elif "explain" in text or "why" in text or "shap" in text:
                        topics.append("ML anomaly score attribution drivers")
                    elif "mitre" in text or "cve" in text or "threat" in text:
                        topics.append("MITRE ATT&CK and Threat Intel metadata")
                    else:
                        topics.append("general security alert details")

            if topics:
                summary = "Prior to this, the analyst and Vector discussed: " + ", ".join(sorted(list(set(topics)))) + "."
            else:
                summary = "Prior general conversation regarding the alert was conducted."

        return {
            "summary": summary,
            "recent": recent,
            "current_question": current_question or ""
        }
