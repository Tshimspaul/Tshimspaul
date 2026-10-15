from celery import shared_task

from . import services


@shared_task(name="jobs.run_job")
def run_job(job_id: int) -> None:
    services.execute(job_id)
