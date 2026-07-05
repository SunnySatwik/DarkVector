from .models import ProcessSnapshot


class ProcessDiffEngine:
    """
    Diff engine that compares two process snapshot dictionaries purely by PID.
    """

    @staticmethod
    def diff(
        previous_snapshot: dict[int, ProcessSnapshot],
        current_snapshot: dict[int, ProcessSnapshot],
    ) -> tuple[list[ProcessSnapshot], list[ProcessSnapshot]]:
        """
        Compare snapshots.

        Returns:
            (started_processes, terminated_processes)
        """
        prev_pids = set(previous_snapshot.keys())
        curr_pids = set(current_snapshot.keys())

        # PID in current but not in previous -> Process started
        started_pids = curr_pids - prev_pids
        started_processes = [current_snapshot[pid] for pid in started_pids]

        # PID in previous but not in current -> Process terminated
        terminated_pids = prev_pids - curr_pids
        terminated_processes = [previous_snapshot[pid] for pid in terminated_pids]

        return started_processes, terminated_processes
