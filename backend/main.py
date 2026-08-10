import json
import os
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Iterator

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from groq import Groq
from pydantic import BaseModel, Field
from pypdf import PdfReader


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    print("WARNING: GROQ_API_KEY is missing")

client = Groq(api_key=api_key) if api_key else None

MODEL = "openai/gpt-oss-120b"


# =========================================================
# RESUME MODELS
# =========================================================

class Experience(BaseModel):
    company: str | None = None
    role: str | None = None
    duration: str | None = None
    description: str | None = None
    skills_used: list[str] = Field(default_factory=list)


class Resume(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None

    total_experience_years: float | None = None

    skills: list[str] = Field(default_factory=list)
    experiences: list[Experience] = Field(default_factory=list)
    education: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)

    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)


resume_schema = Resume.model_json_schema()

resume: Resume | None = None


# =========================================================
# REQUEST MODEL
# =========================================================

class ChatRequest(BaseModel):
    question: str


# =========================================================
# PDF READER
# =========================================================

def read_pdf(file_path: Path) -> str:

    reader = PdfReader(str(file_path))

    text = ""

    for page in reader.pages:
        page_text = page.extract_text()

        if page_text:
            text += page_text + "\n"

    return text


# =========================================================
# PARSE RESUME
# =========================================================

def parse_resume(resume_text: str) -> Resume:

    if client is None:
        raise RuntimeError("GROQ_API_KEY is missing")

    system_prompt = f"""
You are an expert resume parser.

Extract information from the resume based ONLY on information
actually present in the resume.

Return ONLY valid JSON matching this schema:

{json.dumps(resume_schema, indent=2)}

Rules:

1. Never invent information.

2. If information is unavailable, use null.

3. If a list has no information, return [].

4. Include internships inside experiences.

5. Extract skills from the complete resume.

6. Extract projects from the complete resume.

7. Extract certifications from the complete resume.

8. Extract strengths only if they are explicitly mentioned
   or clearly stated in the resume.

9. Extract weaknesses only if they are explicitly mentioned
   or clearly stated in the resume.

10. Do not infer strengths or weaknesses from technologies.

11. Do not create experience that does not exist.
"""

    user_prompt = f"""
Parse this resume:

{resume_text}
"""

    response = client.chat.completions.create(
        model=MODEL,
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
# LOAD RESUME
# =========================================================

def load_resume_once():

    global resume

    try:

        base_dir = Path(__file__).resolve().parent

        resume_path = base_dir / "softCopy_resume.pdf"

        print("===================================")
        print("Starting resume loading...")
        print("Resume path:", resume_path)
        print("===================================")

        if not resume_path.exists():

            print("ERROR: softCopy_resume.pdf not found")

            return

        resume_text = read_pdf(resume_path)

        if not resume_text.strip():

            print("ERROR: Resume PDF is empty")

            return

        print("Resume extracted successfully")

        resume = parse_resume(resume_text)

        print("Resume parsed successfully")

        print("Candidate:", resume.name)
        print("Skills:", len(resume.skills))
        print("Projects:", len(resume.projects))
        print("Certifications:", len(resume.certifications))
        print("Strengths:", len(resume.strengths))
        print("Weaknesses:", len(resume.weaknesses))

    except Exception as error:

        print("===================================")
        print("RESUME LOADING ERROR")
        print(error)
        print("===================================")

        resume = None


# =========================================================
# STARTUP
# =========================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    print("Starting Ayush'Ai backend...")

    load_resume_once()

    print("Ayush'Ai backend started")

    yield

    print("Ayush'Ai backend stopped")


# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="Ayush'Ai API",
    version="1.0.0",
    lifespan=lifespan,
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://hiremeai-sand.vercel.app/",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return {
        "message": "Ayush'Ai backend is running 🚀",
        "resume_loaded": resume is not None,
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():

    return {
        "status": "ok",
        "resume_loaded": resume is not None,
        "groq_configured": client is not None,
    }


# =========================================================
# RESUME API
# =========================================================

@app.get("/resume")
def get_resume():

    if resume is None:

        raise HTTPException(
            status_code=503,
            detail="Resume is not loaded"
        )

    return resume.model_dump()


# =========================================================
# STREAM AI RESPONSE
# =========================================================

def ask_candidate_stream(
    question: str,
    candidate_resume: Resume,
) -> Iterator[str]:

    if client is None:

        yield "Ayush'Ai backend is not configured correctly."

        return

    system_prompt = f"""
You are Ayush'Ai, the personal AI assistant for Ayush Gupta.

Your ONLY purpose is to answer questions related to Ayush
and his professional profile.

Candidate information:

{candidate_resume.model_dump_json(indent=2)}

Rules:

1. Answer ONLY using the candidate information provided.

2. Never hallucinate.

3. Never invent information.

4. Never assume information that is not provided.

5. If the requested information is unavailable, respond exactly:

"I don't have enough information to answer that."

6. You may explain technologies that appear in Ayush's skills.

7. Do not claim Ayush has experience with a technology unless
that technology appears in his resume.

8. Keep answers professional and concise.

9. Use Markdown.

10. Never use HTML.

11. Never output HTML tags such as <br>, <div>, <p>, <table>,
or similar tags.

12. Use Markdown bullets instead of HTML.

13. Do not answer unrelated general questions.

14. Do not invent:
- companies
- internships
- job titles
- salary
- experience
- projects
- certifications
- achievements
- grades
- CGPA
- contact information
- GitHub information
- LinkedIn information

15. If a question is unrelated to Ayush's profile,
respond exactly:

"I don't have enough information to answer that."
"""

    response = client.chat.completions.create(

        model=MODEL,

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
# CHAT API
# =========================================================

@app.post("/chat")
def chat(request: ChatRequest):

    if resume is None:

        raise HTTPException(
            status_code=503,
            detail="Resume is not loaded. Check Render logs."
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
            resume
        ),

        media_type="text/plain; charset=utf-8",

        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )