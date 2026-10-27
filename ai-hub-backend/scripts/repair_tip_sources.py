"""Plan first; apply/restore only an exact, separately saved manifest."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import get_session_local
from app.services.tip_source_repair import apply_manifest, plan_repair


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["plan", "apply", "restore"])
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--start", default="2026-09-29")
    parser.add_argument("--end", default="2026-10-26")
    args = parser.parse_args()
    with get_session_local()() as db:
        if args.action == "plan":
            result = plan_repair(db, args.start, args.end)
            # Never overwrite a backup with a new baseline.
            with args.manifest.open("x") as output:
                json.dump(result, output, ensure_ascii=False, indent=2)
            print(json.dumps(result["summary"]))
        else:
            print(json.dumps(apply_manifest(db, json.loads(args.manifest.read_text()), restore=args.action == "restore")))


if __name__ == "__main__":
    main()
