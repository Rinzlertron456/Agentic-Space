import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class StoreTailorTests(unittest.TestCase):
    def test_store_and_tailor_resume(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = os.environ.copy()
            env["JOB_AGENT_DB_PATH"] = str(Path(tmp) / "test.sqlite")
            env["RESUME_ARTIFACT_DIR"] = str(Path(tmp) / "resumes")
            subprocess.run([sys.executable, str(ROOT / "scripts" / "store.py"), "init"], env=env, check=True, capture_output=True)
            job = {
                "id": "job_test",
                "source": "unit",
                "title": "React Node.js Full Stack Developer",
                "company": "Example",
                "location": "Bengaluru",
                "role_family": "Full Stack Developer",
                "url": "https://example.com/jobs/1",
                "company_url": "https://example.com/careers",
                "job_id": "EX-1",
                "posted_at": "2026-06-09T00:00:00+00:00",
                "discovered_at": "2026-06-09T00:00:00+00:00",
                "fit_score": 91,
                "description": "React TypeScript Node.js REST APIs dashboards SQL optimization",
                "requirements": "React TypeScript Node.js",
                "screening_answers": [],
                "outreach_drafts": [],
                "resume_variant": "fullstack-react-node",
                "notes": ""
            }
            subprocess.run(
                [sys.executable, str(ROOT / "scripts" / "store.py"), "upsert_jobs"],
                input=json.dumps({"jobs": [job]}),
                text=True,
                env=env,
                check=True,
                capture_output=True,
            )
            result = subprocess.run(
                [sys.executable, str(ROOT / "scripts" / "tailor_resume.py"), "job_test"],
                text=True,
                env=env,
                check=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertTrue(Path(payload["tailored_resume_docx"]).exists())
            self.assertTrue(Path(payload["tailored_resume_html"]).exists())


if __name__ == "__main__":
    unittest.main()
