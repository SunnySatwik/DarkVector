import psutil
from .models import ProcessSnapshot


class ProcessSnapshotCollector:
    """
    Enumerates and captures snapshots of all running processes using psutil.
    """

    @staticmethod
    def collect() -> dict[int, ProcessSnapshot]:
        """
        Scan every running process and return a dict of ProcessSnapshot keyed by PID.
        Gracefully falls back to default values on AccessDenied or NoSuchProcess errors.
        """
        snapshots = {}

        # Capture essential attributes in one pass for speed (sub-200ms)
        attrs = ["pid", "ppid", "name", "exe", "cmdline", "username", "cwd", "create_time"]
        for proc in psutil.process_iter(attrs=attrs):
            try:
                info = proc.info
                pid = info.get("pid")
                if pid is None:
                    continue

                def _safe_get(key: str, default: any) -> any:
                    val = info.get(key)
                    if val is None or isinstance(
                        val, (psutil.AccessDenied, psutil.NoSuchProcess, psutil.ZombieProcess)
                    ):
                        return default
                    return val

                snapshots[pid] = ProcessSnapshot(
                    pid=pid,
                    ppid=_safe_get("ppid", 0),
                    name=_safe_get("name", "Unknown"),
                    exe=_safe_get("exe", None),
                    cmdline=_safe_get("cmdline", []),
                    username=_safe_get("username", None),
                    cwd=_safe_get("cwd", None),
                    create_time=_safe_get("create_time", 0.0),
                )
            except Exception:
                continue

        return snapshots
