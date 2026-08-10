import json
import os
from pathlib import Path
from typing import Iterator

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from groq import Groq
from pydantic import BaseModel, Field
from pypdf import PdfReader


# =========================================================
# Environment
# =========================================================

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise RuntimeError(
        "GROQ_API_KEY is missing. Add it to backend/.env"
    )

client = Groq(
    api_key=api_key
)

model = "openai/gpt-oss-120b"
AYUSH_GITHUB = "https://github.com/Ayush12177/"

AYUSH_LINKEDIN = "https://www.linkedin.com/in/ayushgupta-fsd/"


# =========================================================
# FastAPI
# =========================================================

app = FastAPI(
    title="Ayush'Ai API",
    description="AI career assistant powered by Groq",
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://hire-me-ai-ayush-ai.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# Resume Models
# =========================================================

class MatchResult(BaseModel):
    score: float
    details: dict


class Experience(BaseModel):
    company: str | None = None
    role: str | None = None
    duration: str | None = None
    description: str | None = None
    skills_used: list[str] = []


class Resume(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None

    total_experience_years: float | None = None

    skills: list[str] = []
    experiences: list[Experience] = []
    education: list[str] = []
    projects: list[str] = []
    certifications: list[str] = []

    strengths: list[str] = []
    weaknesses: list[str] = []

    
resume_schema = Resume.model_json_schema()


# =========================================================
# Chat Request
# =========================================================

class ChatRequest(BaseModel):
    question: str


# =========================================================
# Global Resume
# =========================================================

resume: Resume | None = None


# =========================================================
# PDF Extraction
# =========================================================

def read_pdf(file_path: Path) -> str:

    reader = PdfReader(file_path)

    text = ""

    for page in reader.pages:

        page_text = page.extract_text()

        if page_text:
            text += page_text + "\n"

    return text


# =========================================================
# Parse Resume
# =========================================================

def parse_resume(resume_text: str) -> Resume:

    system_prompt = f"""
You are an expert resume parser.

Extract information from the resume based on its meaning,
not only based on exact section headings.

Different resumes may use different headings.

For example:

- Experience
- Professional Experience
- Work History
- Employment
- Internships

These may all contain relevant experience.

Skills may also appear in:

- Skills section
- Work experience
- Internships
- Projects
- Education

Return ONLY valid JSON matching this schema:

{json.dumps(resume_schema, indent=2)}

Important rules:

1. Do not invent information.

2. If a value is not available, return null.

3. If a list has no information, return an empty list.

4. Include internships inside experiences.

5. Extract skills mentioned across the entire resume.

6. Extract projects mentioned across the resume.

7. Extract certifications mentioned across the resume.
"""

    user_prompt = f"""
Parse the following resume:

{resume_text}
"""

    response = client.chat.completions.create(
        model=model,

        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],

        response_format={
            "type": "json_object"
        },
    )

    raw_output = response.choices[0].message.content

    data = json.loads(raw_output)

    return Resume(**data)


# =========================================================
# Load Resume ONCE
# =========================================================

@app.on_event("startup")
def load_resume_once():

    global resume

    base_dir = Path(__file__).resolve().parent

    resume_path = base_dir / "softCopy_resume.pdf"

    if not resume_path.exists():

        print(
            f"⚠️ Resume not found: {resume_path}"
        )

        return

    print("📄 Reading resume...")

    resume_text = read_pdf(resume_path)

    if not resume_text.strip():

        print("⚠️ Resume PDF is empty.")

        return

    print("🤖 Parsing resume with Groq...")

    resume = parse_resume(resume_text)

    print("✅ Resume parsed successfully.")

    print(
        f"👤 Candidate: {resume.name}"
    )

    print(
        f"🛠️ Skills: {len(resume.skills)}"
    )

    print(
        f"📁 Projects: {len(resume.projects)}"
    )

    print(
        f"🏆 Certifications: {len(resume.certifications)}"
    )

    print(
    f"💪 Strengths: {len(resume.strengths)}"
        )

    print(
    f"⚠️ Weaknesses: {len(resume.weaknesses)}"
    )


# =========================================================
# Ask Candidate - STREAMING
# =========================================================

def ask_candidate_stream(
    question: str,
    candidate_resume: Resume,
) -> Iterator[str]:

    system_prompt = f"""
You are Ayush'Ai, the personal AI assistant for Ayush Gupta.

Your ONLY purpose is to answer questions related to Ayush
and the information available in his resume.

RESUME INFORMATION:
{candidate_resume.model_dump_json(indent=2)}

GitHub:
{AYUSH_GITHUB}

LinkedIn:
{AYUSH_LINKEDIN}


============================================================
STRICT RESPONSE RULES
============================================================

1. Answer ONLY using information available in the resume
   and the GitHub/LinkedIn links provided above.

2. NEVER invent information.

3. NEVER guess information.

4. NEVER assume information that is not present.

5. If the requested information is not available, respond
   exactly:

"I don't have enough information to answer that."


============================================================
MARKDOWN FORMATTING
============================================================

Your response MUST use Markdown only.

Allowed formatting:

- **Bold**
- *Italic*
- Headings using #
- Bullet points using -
- Numbered lists
- Markdown tables
- Code blocks when necessary


============================================================
ABSOLUTELY NO HTML
============================================================

NEVER use HTML in your response.

NEVER output HTML tags.

NEVER output HTML tags as plain text.

You MUST NOT use:

<br>
<br/>
<br />
<p>
</p>
<div>
</div>
<span>
</span>
<section>
</section>
<table>
<tr>
<td>
<ul>
<li>

Do NOT use ANY HTML tag, even if the user asks for it.


============================================================
LINE BREAK RULE
============================================================

When you need a new line, use a normal Markdown newline.

NEVER use <br> for line breaks.

WRONG:

Education <br> B.Tech CSE

CORRECT:

Education

B.Tech CSE


WRONG:

- Java <br>
- Python <br>
- React.js

CORRECT:

- Java
- Python
- React.js


============================================================
LIST RULE
============================================================

Always use Markdown lists.

WRONG:

Skills: Java <br> Python <br> React.js

CORRECT:

Skills:

- Java
- Python
- React.js


============================================================
TABLE RULE
============================================================

If you create a Markdown table, NEVER use <br> inside
table cells.

WRONG:

| Skills |
|---|
| Java <br> Python <br> React.js |

CORRECT:

| Skills |
|---|
| Java, Python, React.js |


============================================================
PROJECT ANSWER RULE
============================================================

When explaining a project, use Markdown headings and
bullet points.

Example:

## Project Overview

Explain the project.

## Technologies Used

- JavaScript
- Node.js
- Express.js
- MongoDB

## Key Features

- Feature 1
- Feature 2
- Feature 3

Never use HTML to format the answer.


============================================================
IMPORTANT FINAL CHECK
============================================================

Before returning your answer, check the response.

If you generated:

<br>
<br/>
<br />
<p>
</p>
<div>
</div>
<span>
</span>

REMOVE IT before sending the response.

Replace HTML line breaks with normal Markdown line breaks.

Your final response MUST contain ZERO HTML tags.

Your final response MUST contain ZERO <br> tags.

Your final response MUST contain ZERO HTML formatting.

Return ONLY the cleaned Markdown response.
"""

    response = client.chat.completions.create(
        model=model,
        stream=True,
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": question,
            },
        ],
    )

    for chunk in response:

        if not chunk.choices:
            continue

        delta = chunk.choices[0].delta

        content = delta.content

        if content:
            yield content

# =========================================================
# Home
# =========================================================

@app.get("/")
def home():

    return {
        "message": "Ayush'Ai is running 🚀",
        "resume_loaded": resume is not None,
    }


# =========================================================
# Resume Information Endpoint
# =========================================================

@app.get("/resume")
def get_resume():

    if resume is None:

        raise HTTPException(
            status_code=503,
            detail="Resume has not been loaded."
        )

    return resume.model_dump()


# =========================================================
# Streaming Chat API
# =========================================================

@app.post("/chat")
def chat(request: ChatRequest):

    if resume is None:

        raise HTTPException(
            status_code=503,
            detail="Resume is not loaded. Please restart the backend."
        )

    question = request.question.strip()

    if not question:

        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )


    return StreamingResponse(

        ask_candidate_stream(
            question,
            resume,
        ),

        media_type="text/plain",

        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )