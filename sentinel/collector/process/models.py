from dataclasses import dataclass

@dataclass(frozen=True)
class ProcessSnapshot:
    """
    Lightweight, immutable state snapshot of a single running process.
    """
    pid: int
    ppid: int
    name: str
    cmdline: list[str]
    exe: str | None
    username: str | None
    cwd: str | None
    create_time: float

    def to_dict(self) -> dict:
        """
        Convert snapshot state to a telemetry payload dictionary.
        """
        return {
            "pid": self.pid,
            "ppid": self.ppid,
            "process_name": self.name,
            "exe": self.exe,
            "cmdline": self.cmdline,
            "username": self.username,
            "cwd": self.cwd,
            "create_time": self.create_time,
        }
