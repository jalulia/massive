"""Exercise the Unity CSV boundary with synthetic scores outside the public report."""
import csv
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

TOOL = Path(__file__).with_name("import-momi-scores.py")
spec = importlib.util.spec_from_file_location("momi_score_import", TOOL)
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class ScoreImportTest(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.snapshot = json.loads(importer.SNAPSHOT.read_bytes())
        self.matches = []
        self.players = []
        exits = {}
        for record in self.snapshot["incomplete"]:
            key = (record["start"][:10], ["1v1", "2v2"][record["mode"]])
            exits[key] = exits.get(key, 0) + 1
        builds = iter(build for build, starts in self.snapshot["builds"].items() for _ in range(starts))
        levels = iter(level for level, group in self.snapshot["levels"].items()
                      for _ in range(group["status"].get("Completed", 0)))
        for date, day in self.snapshot["days"].items():
            for mode, starts in day["modes"].items():
                for _ in range(starts - exits.get((date, mode), 0)):
                    match_id = str(len(self.matches))
                    level = next(levels)
                    self.matches.append(dict(match_id=match_id, started_utc=date+"T18:00:00Z",
                        environment="Player", development="False", status="Completed",
                        build_id=next(builds), ruleset_version="6",
                        scoring_settings_hash=next(iter(self.snapshot["settings"])), high_score_eligible="True",
                        level=level, mode=mode, light_score_meV="9007199254741093", dark_score_meV="100"))
                    slots = [1, 3] if mode == "1v1" else [1, 2, 3, 4]
                    for slot in slots:
                        self.players.append(dict(match_id=match_id, status="Completed", level=level, mode=mode,
                            player_slot=str(slot), team_id="1" if slot < 3 else "2",
                            individual_score_meV="9007199254741001" if slot == 1 else "0"))

    def write_csv(self, name, fields, records):
        path = self.root / name
        with path.open("w", newline="", encoding="utf-8-sig") as out:
            writer = csv.DictWriter(out, fieldnames=fields)
            writer.writeheader()
            writer.writerows(records)
        return path

    def args(self):
        return (self.write_csv("matches.csv", importer.MATCH_FIELDS, self.matches),
                self.write_csv("players.csv", importer.PLAYER_FIELDS, self.players))

    def test_full_event_precision_zeros_and_order(self):
        self.matches[0]["started_utc"] = "2026-10-16T00:15:00.1234567Z"  # Still Thursday at MoMI.
        for i, changes in enumerate([{"environment": "Editor", "development": "True"},
                                     {"started_utc": "2026-10-19T04:00:00Z"}, {"status": "Abandoned"}]):
            self.matches.append(dict(self.matches[0], match_id=f"unused{i}", **changes))
        result = importer.import_scores(*self.args(), self.snapshot)
        self.assertEqual(sum(v["entries"] for v in result.values()), 490)
        for date, values in result.items():
            matches = self.snapshot["days"][date]["status"]["Completed"]
            self.assertEqual(values["teamMeV"], str(matches * 9007199254741193))
            self.assertEqual(values["playerMeV"], str(matches * 9007199254741001))
            self.assertEqual(len(values["top"]), 3)
            self.assertTrue(all(row["meV"] == "9007199254741001" for row in values["top"]))
        self.players.reverse()
        self.assertEqual(result, importer.import_scores(*self.args(), self.snapshot))

    def test_reject_incomplete_or_malformed_exports(self):
        for target, changes in [
            (self.players[0], {"individual_score_meV": "12.5"}),
            (self.players[0], {"individual_score_meV": "-1"}),
            (self.players[0], {"match_id": "orphan"}),
            (self.players[0], {"team_id": "2"}),
            (self.players[0], {"level": "unknown"}),
            (self.matches[0], {"high_score_eligible": "False"}),
            (self.matches[0], {"build_id": "other"}),
            (self.matches[0], {"scoring_settings_hash": "other"}),
            (self.matches[0], {"mode": "2v2"}),
        ]:
            old = target.copy()
            with self.subTest(changes=changes):
                target.update(changes)
                with self.assertRaises(ValueError):
                    importer.import_scores(*self.args(), self.snapshot)
            target.update(old)
        self.players.append(self.players[0])
        with self.assertRaisesRegex(ValueError, "duplicate player slot"):
            importer.import_scores(*self.args(), self.snapshot)
        self.players.pop()
        self.matches.append(self.matches[0])
        with self.assertRaisesRegex(ValueError, "duplicate match_id"):
            importer.import_scores(*self.args(), self.snapshot)

    def test_missing_slot_preserves_existing_output(self):
        self.players.pop()
        output = self.root / "scores.json"
        output.write_text("existing")
        run = subprocess.run([sys.executable, str(TOOL), *self.args(), "--output", output], capture_output=True)
        self.assertNotEqual(run.returncode, 0)
        self.assertIn(b"roster", run.stderr)
        self.assertEqual(output.read_text(), "existing")


if __name__ == "__main__":
    unittest.main()
