import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = (Path(__file__).resolve().parent / "hunt-vercel-ignore.sh").read_text()


def run(repo, *args):
    return subprocess.run(args, cwd=repo, capture_output=True, text=True, check=False)


def commit(repo, message):
    assert run(repo, "git", "add", ".").returncode == 0
    result = run(repo, "git", "commit", "-qm", message)
    assert result.returncode == 0, result.stderr


class VercelIgnoreTests(unittest.TestCase):
    def test_skips_data_and_docs_but_builds_for_frontend(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for folder in ("scripts", "data", "docs", "v2/web"):
                (root / folder).mkdir(parents=True)
            (root / "scripts/hunt-vercel-ignore.sh").write_text(SCRIPT)
            (root / "v2/web/package.json").write_text('{"name":"test"}')
            (root / "data/jobs.json").write_text("[]")
            self.assertEqual(run(root, "git", "init", "-q").returncode, 0)
            run(root, "git", "config", "user.email", "test@example.com")
            run(root, "git", "config", "user.name", "HUNT tests")
            commit(root, "baseline")
            # No parent => never silently skip deploying the first commit.
            self.assertEqual(run(root, "bash", "scripts/hunt-vercel-ignore.sh").returncode, 1)

            (root / "data/jobs.json").write_text('[{"id":1}]')
            commit(root, "radar data update")
            self.assertEqual(run(root, "bash", "scripts/hunt-vercel-ignore.sh").returncode, 0)

            (root / "docs/status.md").write_text("audit completed")
            commit(root, "docs only")
            self.assertEqual(run(root, "bash", "scripts/hunt-vercel-ignore.sh").returncode, 0)

            (root / "v2/web/package.json").write_text('{"name":"updated"}')
            commit(root, "actual frontend change")
            self.assertEqual(run(root, "bash", "scripts/hunt-vercel-ignore.sh").returncode, 1)

            (root / "scripts/hunt-vercel-ignore.sh").write_text(SCRIPT + "\n# updated\n")
            commit(root, "deployment policy change")
            self.assertEqual(run(root, "bash", "scripts/hunt-vercel-ignore.sh").returncode, 1)


if __name__ == "__main__":
    unittest.main()
