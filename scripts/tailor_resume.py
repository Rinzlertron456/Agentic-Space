#!/usr/bin/env python
"""Generate tailored resume artifacts for a queued job.

This script intentionally uses only Python's standard library. It reads the
canonical DOCX source when present, builds a truthful role-specific resume body,
and writes a simple ATS-friendly DOCX plus HTML preview.
"""

from __future__ import annotations

import html
import json
import os
import re
import sqlite3
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.environ.get("JOB_AGENT_DB_PATH", ROOT / ".data" / "job_agent.sqlite"))
MASTER_DOCX = Path(
    os.environ.get(
        "MASTER_RESUME_DOCX",
        r"C:\Users\devan\Downloads\Full_Stack_AI_Developer_Resume.docx",
    )
)
OUT_DIR = Path(os.environ.get("RESUME_ARTIFACT_DIR", ROOT / "artifacts" / "resumes"))


PROFILE = {
    "name": "Sreeramula Vinayak Santhosh",
    "email": "sainath2k20@gmail.com",
    "phone": "+919177472204",
    "github": "github.com/Vinayak-Santhosh",
    "linkedin": "linkedin.com/in/Vinayak-Santhosh",
    "experience_years": "3+",
    "education": "B.Tech, CMR Institute of Technology, Hyderabad, 2018-2022, CGPA 8.40",
    "certifications": ["Wipro JavaScript L1", "Wipro ReactJS L2", "AWS Certified Cloud Practitioner"],
}


BASE_EXPERIENCE = [
    {
        "company": "Incedo Technologies Ltd., Hyderabad, India",
        "title": "Full Stack Web Developer",
        "dates": "Oct 2025 - June 2026",
        "bullets": [
            "Refactored large monolithic React components into reusable hooks and modular architecture, improving maintainability and rendering efficiency.",
            "Developed interactive analytical dashboards using React, Material UI, ECharts, AG Grid, and responsive visualization patterns.",
            "Optimized live network maps rendering thousands of geolocation markers using Leaflet, debouncing, and isolated state management.",
            "Built Human-in-the-Loop RCA systems using VectorDB-based feedback pipelines to improve AI recommendations.",
            "Designed contextual follow-up prompt systems that generated intelligent suggestion flows from user interactions.",
            "Built scalable Node.js and FastAPI microservices serving dashboard KPIs and AI endpoints.",
            "Optimized SQL workloads across millions of records, reducing dashboard latency and avoiding query timeouts.",
            "Implemented snapshot tables and cron-based aggregation pipelines for near-instant dashboard analytics.",
        ],
    },
    {
        "company": "Wipro Technologies Ltd., Hyderabad, India",
        "title": "Front End Web Developer",
        "dates": "Mar 2023 - July 2025",
        "bullets": [
            "Developed and maintained reusable React.js components for enterprise-scale applications using JavaScript and Redux Toolkit.",
            "Revamped critical UI modules including navigation systems, modals, forms, tabs, and data-driven workflows.",
            "Improved responsiveness and bundle performance through lazy loading, React Suspense, code splitting, and dynamic imports.",
            "Integrated REST APIs and asynchronous workflows with robust error handling, loading states, and fallback UI strategies.",
            "Collaborated with backend teams through Agile ceremonies, code reviews, defect resolution, and production support.",
        ],
    },
]


PROJECTS = [
    {
        "name": "ShopKart",
        "url": "shop-kart.vercel.app",
        "bullets": [
            "Developed a responsive e-commerce application using React.js and Redux Toolkit.",
            "Implemented centralized state management for cart, product filtering, and checkout workflows.",
        ],
        "stack": "React.js, Redux Toolkit, JavaScript",
    },
    {
        "name": "Multiplayer Chess Game (WebSockets)",
        "url": "chess-multiplayer.vercel.app",
        "bullets": [
            "Built a real-time multiplayer chess platform using React.js, TypeScript, Node.js, and WebSockets.",
            "Implemented custom hooks, socket-based communication, and centralized game-state management.",
        ],
        "stack": "React.js, TypeScript, Node.js, Tailwind CSS, chess.js",
    },
]


SKILLS = {
    "Frontend": [
        "React.js",
        "Next.js",
        "TypeScript",
        "JavaScript",
        "Redux Toolkit",
        "React Query",
        "Material UI",
        "Tailwind CSS",
        "ECharts",
        "AG Grid",
        "Leaflet",
    ],
    "Backend": ["Node.js", "Express.js", "Python", "FastAPI", "REST APIs", "Microservices Architecture"],
    "Testing": ["Vitest", "Jest", "React Testing Library", "Mocha"],
    "Databases": ["MySQL", "MongoDB", "SingleStore", "SQL Optimization", "ColumnStore/RowStore"],
    "DevOps": ["Git", "GitLab CI/CD", "Docker", "Kubernetes", "ArgoCD"],
    "AI / GenAI": ["LLM Integrations", "RAG Pipelines", "Vector Databases", "AI Chatbots", "Prompt Engineering", "MCP"],
}


ROLE_KEYWORDS = {
    "react-frontend": ["React", "TypeScript", "frontend", "UI", "dashboard", "performance", "Redux", "Next.js"],
    "nodejs-backend": ["Node.js", "Express", "REST API", "microservices", "SQL", "FastAPI", "backend"],
    "ai-enabled-fullstack": ["LLM", "RAG", "VectorDB", "AI", "chatbot", "FastAPI", "prompt", "HITL"],
    "fullstack-react-node": ["React", "Node.js", "TypeScript", "microservices", "SQL", "dashboard", "REST API"],
}


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def extract_docx_text(path: Path) -> str:
    if not path.exists():
        return ""
    try:
        with zipfile.ZipFile(path) as zf:
            xml = zf.read("word/document.xml").decode("utf-8", "replace")
    except Exception:
        return ""
    text = "\n".join(html.unescape(t) for t in re.findall(r"<w:t[^>]*>(.*?)</w:t>", xml))
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def load_job(job_id: str) -> dict[str, Any]:
    with connect() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if row is None:
        raise SystemExit(f"job not found: {job_id}")
    job = dict(row)
    for field in ("screening_answers", "outreach_drafts"):
        try:
            job[field] = json.loads(job[field])
        except Exception:
            job[field] = []
    return job


def choose_variant(job: dict[str, Any]) -> str:
    text = " ".join([job.get("title", ""), job.get("role_family", ""), job.get("description", ""), job.get("requirements", "")]).lower()
    if any(k.lower() in text for k in ROLE_KEYWORDS["ai-enabled-fullstack"]):
        return "ai-enabled-fullstack"
    if "node" in text and "react" not in text:
        return "nodejs-backend"
    if any(k in text for k in ["frontend", "front-end", "react", "ui developer"]):
        return "react-frontend"
    return "fullstack-react-node"


def keywords_from_job(job: dict[str, Any]) -> list[str]:
    text = f"{job.get('title','')} {job.get('description','')} {job.get('requirements','')}"
    canonical = []
    for values in SKILLS.values():
        canonical.extend(values)
    found = []
    low = text.lower()
    for keyword in canonical:
        if keyword.lower() in low and keyword not in found:
            found.append(keyword)
    return found[:14]


def summary_for(job: dict[str, Any], variant: str, keywords: list[str]) -> str:
    title = job.get("title", "software engineering role")
    keyword_text = ", ".join(keywords[:6]) if keywords else "React, Node.js, TypeScript, REST APIs, dashboards, and SQL optimization"
    if variant == "react-frontend":
        focus = "frontend engineering, reusable UI systems, dashboard performance, API integrations, and responsive enterprise applications"
    elif variant == "nodejs-backend":
        focus = "Node.js services, REST APIs, microservices, SQL optimization, and production-grade full-stack delivery"
    elif variant == "ai-enabled-fullstack":
        focus = "full-stack product engineering with LLM integrations, RAG workflows, VectorDB feedback loops, and AI-enabled dashboards"
    else:
        focus = "React, Node.js, TypeScript, enterprise dashboards, API integrations, and scalable web application delivery"
    return (
        f"Full Stack Software Engineer with {PROFILE['experience_years']} years of experience aligned to {title}. "
        f"Strong background in {focus}. Hands-on with {keyword_text}, automated testing, CI/CD, and Agile delivery."
    )


def rank_bullets(bullets: list[str], keywords: list[str]) -> list[str]:
    low_keywords = [k.lower().split()[0] for k in keywords]

    def score(bullet: str) -> int:
        low = bullet.lower()
        return sum(1 for k in low_keywords if k and k in low)

    return sorted(bullets, key=score, reverse=True)


def build_resume(job: dict[str, Any]) -> dict[str, Any]:
    variant = choose_variant(job)
    keywords = keywords_from_job(job)
    role_keywords = ROLE_KEYWORDS.get(variant, [])
    all_keywords = list(dict.fromkeys(keywords + role_keywords))
    summary = summary_for(job, variant, all_keywords)
    experience = []
    for entry in BASE_EXPERIENCE:
        experience.append({**entry, "bullets": rank_bullets(entry["bullets"], all_keywords)})
    skill_lines = []
    for group, values in SKILLS.items():
        preferred = [v for v in values if v in all_keywords]
        rest = [v for v in values if v not in preferred]
        skill_lines.append((group, preferred + rest))
    return {
        "variant": variant,
        "target_title": job.get("title"),
        "target_company": job.get("company"),
        "summary": summary,
        "experience": experience,
        "projects": PROJECTS,
        "skills": skill_lines,
        "keywords": all_keywords,
        "source_master_found": MASTER_DOCX.exists(),
        "source_master_excerpt": extract_docx_text(MASTER_DOCX)[:500],
    }


def xml_escape(value: str) -> str:
    return html.escape(value, quote=True)


def paragraph(text: str, bold: bool = False) -> str:
    text = xml_escape(text)
    run_props = "<w:rPr><w:b/></w:rPr>" if bold else ""
    return f"<w:p><w:r>{run_props}<w:t>{text}</w:t></w:r></w:p>"


def bullet(text: str) -> str:
    return paragraph(f"- {text}")


def make_docx(resume: dict[str, Any], out_path: Path) -> None:
    lines = [
        paragraph(PROFILE["name"], True),
        paragraph(f"{PROFILE['email']} | {PROFILE['phone']} | {PROFILE['github']} | {PROFILE['linkedin']}"),
        paragraph("Professional Summary", True),
        paragraph(resume["summary"]),
        paragraph("Work Experience", True),
    ]
    for entry in resume["experience"]:
        lines.append(paragraph(f"{entry['company']} | {entry['title']} | {entry['dates']}", True))
        for item in entry["bullets"]:
            lines.append(bullet(item))
    lines.append(paragraph("Projects", True))
    for project in resume["projects"]:
        lines.append(paragraph(f"{project['name']} - {project['url']}", True))
        for item in project["bullets"]:
            lines.append(bullet(item))
        lines.append(paragraph(f"Tech Stack: {project['stack']}"))
    lines.append(paragraph("Skills", True))
    for group, values in resume["skills"]:
        lines.append(paragraph(f"{group}: {', '.join(values)}"))
    lines.append(paragraph("Education", True))
    lines.append(paragraph(PROFILE["education"]))
    lines.append(paragraph("Certifications", True))
    for cert in PROFILE["certifications"]:
        lines.append(bullet(cert))

    document_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {body}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>
  </w:body>
</w:document>
""".format(body="\n".join(lines))
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
"""
    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/document.xml", document_xml)


def make_html(resume: dict[str, Any], out_path: Path) -> None:
    sections = [
        f"<h1>{html.escape(PROFILE['name'])}</h1>",
        f"<p>{html.escape(PROFILE['email'])} | {html.escape(PROFILE['phone'])} | {html.escape(PROFILE['github'])} | {html.escape(PROFILE['linkedin'])}</p>",
        "<h2>Professional Summary</h2>",
        f"<p>{html.escape(resume['summary'])}</p>",
        "<h2>Work Experience</h2>",
    ]
    for entry in resume["experience"]:
        sections.append(f"<h3>{html.escape(entry['company'])} | {html.escape(entry['title'])} | {html.escape(entry['dates'])}</h3>")
        sections.append("<ul>" + "".join(f"<li>{html.escape(item)}</li>" for item in entry["bullets"]) + "</ul>")
    sections.append("<h2>Projects</h2>")
    for project in resume["projects"]:
        sections.append(f"<h3>{html.escape(project['name'])} - {html.escape(project['url'])}</h3>")
        sections.append("<ul>" + "".join(f"<li>{html.escape(item)}</li>" for item in project["bullets"]) + "</ul>")
        sections.append(f"<p><strong>Tech Stack:</strong> {html.escape(project['stack'])}</p>")
    sections.append("<h2>Skills</h2>")
    for group, values in resume["skills"]:
        sections.append(f"<p><strong>{html.escape(group)}:</strong> {html.escape(', '.join(values))}</p>")
    sections.append("<h2>Education</h2>")
    sections.append(f"<p>{html.escape(PROFILE['education'])}</p>")
    sections.append("<h2>Certifications</h2>")
    sections.append("<ul>" + "".join(f"<li>{html.escape(cert)}</li>" for cert in PROFILE["certifications"]) + "</ul>")
    out_path.write_text(
        "<!doctype html><html><head><meta charset='utf-8'><title>Tailored Resume</title>"
        "<style>body{font-family:Arial,sans-serif;max-width:850px;margin:32px auto;line-height:1.45;color:#172033}"
        "h1{font-size:28px;margin-bottom:4px}h2{border-bottom:1px solid #d6dbe6;padding-bottom:4px;margin-top:24px}"
        "h3{font-size:16px;margin-bottom:4px}li{margin-bottom:4px}</style></head><body>"
        + "\n".join(sections)
        + "</body></html>",
        encoding="utf-8",
    )


def update_db(job_id: str, docx: Path, html_path: Path, variant: str) -> None:
    with connect() as conn:
        conn.execute(
            """
            UPDATE jobs
            SET tailored_resume_docx = ?, tailored_resume_html = ?, resume_variant = ?,
                status = CASE WHEN status = 'queued' THEN 'drafted' ELSE status END
            WHERE id = ?
            """,
            (str(docx), str(html_path), variant, job_id),
        )
        conn.execute(
            "INSERT INTO activities(ts, job_id, action, detail) VALUES (?, ?, 'resume_tailored', ?)",
            (
                datetime.now(timezone.utc).isoformat(timespec="seconds"),
                job_id,
                f"Generated {docx.name} and {html_path.name}",
            ),
        )
        conn.commit()


def safe_slug(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9]+", "-", value).strip("-").lower()
    return value[:80] or "job"


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: tailor_resume.py <job-id>", file=sys.stderr)
        return 2
    job_id = sys.argv[1]
    job = load_job(job_id)
    resume = build_resume(job)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    slug = safe_slug(f"{job.get('company')} {job.get('title')} {resume['variant']} {stamp}")
    docx = OUT_DIR / f"{slug}.docx"
    html_path = OUT_DIR / f"{slug}.html"
    make_docx(resume, docx)
    make_html(resume, html_path)
    update_db(job_id, docx, html_path, resume["variant"])
    print(
        json.dumps(
            {
                "job_id": job_id,
                "variant": resume["variant"],
                "tailored_resume_docx": str(docx),
                "tailored_resume_html": str(html_path),
                "keywords": resume["keywords"],
                "source_master_found": resume["source_master_found"],
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
