"""Scheduled workflows must not drop a day when GitHub starts them hours late.

GitHub delayed the daily schedules by 4-12 hours in 2026-08/09. The Berlin-hour
gates then skipped both collection runs of a night (2026-08-06, 08-27 and 08-28
were never collected) or both morning newsletter runs (7 of 20 days). These
tests run the real "Determine period" step of each workflow under bash with a
fake `date`, at trigger times seen in production.
"""

import os
import stat
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

WORKFLOWS = Path(__file__).resolve().parents[2] / ".github" / "workflows"
COLLECT = "daily-collect.yml"
NEWSLETTER = "daily-newsletter.yml"

# Stand-in for GNU date covering the forms the gate steps use:
# `date +FORMAT` and `date -d "yesterday" +FORMAT`, in the zone given by TZ.
FAKE_DATE = """#!{python}
import os
import sys
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

now = datetime.fromisoformat(os.environ["FAKE_NOW_UTC"]).replace(tzinfo=timezone.utc)
now = now.astimezone(ZoneInfo(os.environ.get("TZ", "UTC")))
args = sys.argv[1:]
if args[:2] == ["-d", "yesterday"]:
    now -= timedelta(days=1)
    args = args[2:]
print(now.strftime(args[0][1:]))
"""


def _determine_period_script(workflow):
    config = yaml.safe_load((WORKFLOWS / workflow).read_text())
    for job in config["jobs"].values():
        for step in job["steps"]:
            if step.get("name") == "Determine period":
                return step["run"]
    raise AssertionError(f"no 'Determine period' step in {workflow}")


def _run_determine_period(tmp_path, workflow, now_utc, event="schedule", schedule="", period_input=""):
    script = (
        _determine_period_script(workflow)
        .replace("${{ github.event_name }}", event)
        .replace("${{ github.event.schedule }}", schedule)
        .replace("${{ github.event.inputs.period_id }}", period_input)
    )
    assert "${{" not in script, "the step uses a GitHub expression this test does not provide"

    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    fake_date = bin_dir / "date"
    fake_date.write_text(FAKE_DATE.replace("{python}", sys.executable))
    fake_date.chmod(fake_date.stat().st_mode | stat.S_IEXEC)
    github_output = tmp_path / "github_output"
    github_output.write_text("")

    env = dict(
        os.environ,
        PATH=f"{bin_dir}{os.pathsep}{os.environ['PATH']}",
        FAKE_NOW_UTC=now_utc,
        GITHUB_OUTPUT=str(github_output),
    )
    subprocess.run(
        ["bash", "--noprofile", "--norc", "-eo", "pipefail", "-c", script],
        env=env, check=True, capture_output=True, text=True,
    )
    return dict(line.split("=", 1) for line in github_output.read_text().splitlines() if "=" in line)


@pytest.mark.parametrize(
    "now_utc, schedule, expected_period",
    [
        ("2026-09-13T21:30:00", "7 21 * * *", "2026-09-13"),  # 23:30 Berlin (CEST), on time
        ("2026-09-13T22:58:00", "7 21 * * *", "2026-09-13"),  # 00:58 Berlin, after midnight
        ("2026-08-07T01:01:00", "7 21 * * *", "2026-08-06"),  # 03:01 Berlin: 2026-08-06 was never collected
        ("2026-08-28T05:18:00", "7 21 * * *", "2026-08-27"),  # 07:18 Berlin: 2026-08-27 was never collected
        ("2026-08-29T03:37:00", "7 22 * * *", "2026-08-28"),  # 05:37 Berlin: 2026-08-28 was never collected
        ("2026-12-01T22:07:00", "7 22 * * *", "2026-12-01"),  # 23:07 Berlin (CET), on time
        ("2026-12-02T03:00:00", "7 22 * * *", "2026-12-01"),  # 04:00 Berlin (CET), late
    ],
)
def test_collection_targets_the_intended_day_however_late_the_run_starts(
    tmp_path, now_utc, schedule, expected_period
):
    outputs = _run_determine_period(tmp_path, COLLECT, now_utc, schedule=schedule)
    assert outputs == {"PERIOD": expected_period, "SKIP": "false"}


def test_manual_collection_uses_the_requested_period(tmp_path):
    outputs = _run_determine_period(
        tmp_path, COLLECT, "2026-09-14T10:00:00", event="workflow_dispatch", period_input="2026-09-08"
    )
    assert outputs == {"PERIOD": "2026-09-08", "SKIP": "false"}


@pytest.mark.parametrize(
    "now_utc, expected_period",
    [
        ("2026-09-12T08:35:00", "2026-09-11"),  # 10:35 Berlin
        ("2026-09-13T09:27:00", "2026-09-12"),  # 11:27 Berlin: this edition was skipped
        ("2026-08-27T15:09:00", "2026-08-26"),  # 17:09 Berlin: this edition was skipped
        ("2026-12-02T05:07:00", "2026-12-01"),  # 06:07 Berlin (CET)
    ],
)
def test_newsletter_sends_yesterdays_edition_when_the_run_starts_late(tmp_path, now_utc, expected_period):
    outputs = _run_determine_period(tmp_path, NEWSLETTER, now_utc)
    assert outputs == {"PERIOD": expected_period, "SKIP": "false"}


@pytest.mark.parametrize(
    "now_utc",
    [
        "2026-09-14T02:07:00",  # 04:07 Berlin: the night's collection may still be running
        "2026-09-14T20:30:00",  # 22:30 Berlin: too late in the evening for readers
    ],
)
def test_newsletter_never_sends_at_night(tmp_path, now_utc):
    assert _run_determine_period(tmp_path, NEWSLETTER, now_utc) == {"SKIP": "true"}
