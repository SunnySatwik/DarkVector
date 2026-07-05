from enum import Enum


class AgentStatus(str, Enum):
    CONNECTED = "connected"
    OFFLINE = "offline"
    UNKNOWN = "unknown"