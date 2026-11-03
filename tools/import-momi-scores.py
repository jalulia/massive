"""Build the MoMI score supplement from Unity's matches.csv and players.csv."""
import argparse
import csv
import json
import os
import re
import tempfile
from collections import Counter
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

SNAPSHOT = Path(__file__).resolve().parents[1] / "Stats/v03/snapshot.json"
VENUE = ZoneInfo("America/New_York")
SLOTS = {"1v1": 2, "2v2": 4}
MATCH_FIELDS = ("match_id", "started_utc", "environment", "development", "status", "build_id",
                "scoring_settings_hash", "ruleset_version", "high_score_eligible", "level", "mode",
                "light_score_meV", "dark_score_meV")
PLAYER_FIELDS = ("match_id", "level", "mode", "status", "player_slot", "team_id", "individual_score_meV")


def rows(path, fields):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream, strict=True)
        headers = reader.fieldnames or []
        missing = set(fields) - set(headers)
        if missing or len(headers) != len(set(headers)):
            raise ValueError(f"{path.name}: invalid headers; missing {sorted(missing)} or duplicate columns")
        for row in reader:
            if None in row or any(row[field] is None for field in fields):
                raise ValueError(f"{path.name}:{reader.line_num}: malformed CSV row")
            yield row


def score(raw):
    if not re.fullmatch(r"[0-9]+", raw) or int(raw) > 2**63 - 1:
        raise ValueError(f"Invalid meV score: {raw!r}")
    return int(raw)


def local_date(timestamp):
    stamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    if stamp.tzinfo is None:
        raise ValueError(f"Start time is missing its UTC offset: {timestamp!r}")
    return stamp.astimezone(VENUE).date().isoformat()


def import_scores(matches_path, players_path, snapshot):
    days = sorted(snapshot["days"])
    # The snapshot's daily modes include starts that ended in inactivity.
    expected = Counter({(date, mode): count for date, day in snapshot["days"].items()
                        for mode, count in day["modes"].items()})
    for exit_record in snapshot["incomplete"]:
        mode = {0: "1v1", 1: "2v2"}[exit_record["mode"]]
        expected[local_date(exit_record["start"]), mode] -= 1

    ids = set()
    completed = {}
    counts = Counter()
    stage_counts = Counter()
    build_counts = Counter()
    team_totals = Counter()
    entries = {date: [] for date in days}
    for row in rows(matches_path, MATCH_FIELDS):
        match = row["match_id"]
        if not match or match in ids:
            raise ValueError(f"Missing or duplicate match_id in {matches_path.name}: {match!r}")
        ids.add(match)
        if row["environment"] != "Player" or row["development"] != "False" or row["status"] != "Completed":
            continue
        date = local_date(row["started_utc"])
        if date not in entries:
            continue
        if (row["build_id"] not in snapshot["builds"] or row["ruleset_version"] not in snapshot["rulesets"]
                or row["scoring_settings_hash"] not in snapshot["settings"] or row["high_score_eligible"] != "True"):
            raise ValueError(f"Completed match {match} does not match the event build or scoring rules")
        level, mode = row["level"], row["mode"]
        if level not in snapshot["levels"] or mode not in SLOTS:
            raise ValueError(f"Unknown event level or mode in match {match}")
        completed[match] = (date, level, mode)
        counts[date, mode] += 1
        stage_counts[level] += 1
        build_counts[row["build_id"]] += 1
        team_totals[date] += score(row["light_score_meV"]) + score(row["dark_score_meV"])

    if counts != expected:
        raise ValueError("Completed matches by date and mode do not reconcile with Matt's snapshot")
    if any(count > snapshot["builds"][build] for build, count in build_counts.items()):
        raise ValueError("Completed matches exceed the recorded starts for a cabinet build")
    if stage_counts != Counter({k: v["status"].get("Completed", 0) for k, v in snapshot["levels"].items()}):
        raise ValueError("Completed matches by level do not reconcile with Matt's snapshot")
    for date in days:
        if sum(counts[date, mode] for mode in SLOTS) != snapshot["days"][date]["status"]["Completed"]:
            raise ValueError(f"Completed match count differs from the snapshot on {date}")

    rosters = {match: {} for match in completed}
    for row in rows(players_path, PLAYER_FIELDS):
        match = row["match_id"]
        if match not in ids:
            raise ValueError(f"Player row has no corresponding match: {match!r}")
        if match not in completed:
            continue
        date, level, mode = completed[match]
        if (row["status"], row["level"], row["mode"]) != ("Completed", level, mode):
            raise ValueError(f"Player row disagrees with match {match}")
        slot, team = row["player_slot"], row["team_id"]
        if slot not in {"1", "2", "3", "4"} or team not in {"1", "2"} or slot in rosters[match]:
            raise ValueError(f"Invalid or duplicate player slot in match {match}: {slot!r}")
        rosters[match][slot] = team
        entries[date].append((score(row["individual_score_meV"]), level, mode))

    for match, roster in rosters.items():
        per_team = SLOTS[completed[match][2]] // 2
        if Counter(roster.values()) != {"1": per_team, "2": per_team}:
            raise ValueError(f"Missing or unbalanced roster in completed match {match}")

    output = {}
    for date, performances in entries.items():
        top = sorted(performances, key=lambda p: (-p[0], p[1], p[2]))[:3]
        output[date] = {
            "teamMeV": str(team_totals[date]),
            "playerMeV": str(sum(value for value, _, _ in performances)),
            "entries": len(performances),
            "top": [{"meV": str(value), "level": level, "mode": mode} for value, level, mode in top],
        }
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("matches", type=Path)
    parser.add_argument("players", type=Path)
    parser.add_argument("--output", required=True, type=Path, help="destination for the derived score JSON")
    args = parser.parse_args()
    try:
        if args.output.resolve() in {args.matches.resolve(), args.players.resolve(), SNAPSHOT.resolve()}:
            raise ValueError("Choose a separate output file")
        result = import_scores(args.matches, args.players, json.loads(SNAPSHOT.read_bytes()))
        with tempfile.NamedTemporaryFile(dir=args.output.parent, mode="w", encoding="utf-8", delete=False) as out:
            path = Path(out.name)
            try:
                json.dump(result, out, indent=2)
                out.write("\n")
                out.close()
                os.replace(path, args.output)
            finally:
                path.unlink(missing_ok=True)
    except (OSError, ValueError, csv.Error) as error:
        parser.exit(1, f"Score import failed: {error}\n")
    print(f"Wrote {len(result)} days and {sum(day['entries'] for day in result.values())} player entries to {args.output}")


if __name__ == "__main__":
    main()
