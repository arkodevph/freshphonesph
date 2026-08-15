"""Task business logic (M6)."""
from django.utils import timezone

from .models import Task


def submit_task(task: Task) -> Task:
    """Employee submits a task. Records the exact time and the objective late flag.

    late_flag is a FACT (submitted after deadline?), never an HR action (§8).
    """
    now = timezone.now()
    task.status = Task.Status.SUBMITTED
    task.submission_timestamp = now
    task.late_flag = now > task.deadline
    task.save(update_fields=["status", "submission_timestamp", "late_flag", "updated_at"])
    return task
