

# AI Resume Builder Platform

An AI-powered resume-building workspace that converts a user's career information — education, skills, experience, and projects — into a professional, ATS-friendly, customizable, and explainable resume tailored to a specific job.

This is a **content-assistance system, not an autonomous content generator**. The user's own data is the single source of truth, and every AI-generated or AI-modified suggestion must be reviewed and explicitly accepted by the user before it becomes part of the saved resume.

---

## Table of Contents

- [Problem](#problem)
- [Solution](#solution)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Core Workflow](#core-workflow)
- [AI Integration](#ai-integration)
- [Product Principles](#product-principles)
- [Documentation](#documentation)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Problem

Job seekers often struggle to translate their career history into a professional, ATS-compatible resume tailored to a specific job. Resumes go stale, achievements are hard to phrase professionally, and most people don't know which keywords Applicant Tracking Systems (ATS) actually look for. Re-tailoring a resume for every application is slow and repetitive.

## Solution

The AI Resume Builder Platform centralizes a user's career profile and uses AI to:

- Generate and improve resume content from the user's own data (never fabricated).
- Analyze a target job description and extract required skills, keywords, and qualifications.
- Compare the resume against the job description to identify matches and gaps.
- Score ATS compatibility and provide actionable, explainable suggestions.
- Let the user customize, preview, and export a polished, tailored PDF resume.

## Key Features

| Feature | Priority |
|---|---|
| User profile / information entry | Must |
| Resume creation from profile | Must |
| Resume templates | Must |
| AI content generation | Must |
| AI resume improvement | Must |
| Job description analysis | Must |
| Resume-job matching | Must |
| ATS compatibility analysis | Must |
| Resume customization | Must |
| Resume preview | Must |
| PDF export | Must |
| Resume version management | Should |
| Dashboard | Should |
| Cover letter generation | Could |
| Job application tracking | Could |
| Notifications | Could |

## Architecture

```
Job Seeker
    |
    v
React + Tailwind Workspace
    |
    v
Node.js / Express API  ---->  MongoDB (profiles, resumes, versions, AI results)
    |                  ---->  Document/Export Storage (PDFs, uploaded JD files)
    |                  ---->  PDF Export Engine
    v
Python AI / Data Service
    |-- Job Description Parser
    |-- ATS Scoring Engine (rule-based + LLM-assisted)
    |-- LangChain Orchestrator --> LLM API / Model
    |
    v
Logs / Metrics
```

The Python AI/data service is kept separate from the core Node API because language-generation, keyword-extraction, and orchestration workloads have different runtime characteristics from standard CRUD operations.

## Tech Stack

- **Frontend:** React, Tailwind CSS, Axios
- **Backend/API:** Node.js, Express
- **AI/Data Service:** Python
- **LLM Orchestration:** LangChain
- **Database:** MongoDB
- **Document Generation:** PDF rendering engine
- **Evaluation/Prompt Tooling (optional):** Streamlit

## Repository Structure

```
ai-resume-builder-platform/
├── docs/                     # Full project documentation (BRD, PRD, HLD, LLD, etc.)
├── frontend/                 # React application
├── backend/                  # Node.js / Express API
├── ai-service/                # Python AI/data service (JD parsing, matching, ATS, LLM orchestration)
├── templates/                 # Resume template layouts
├── data/                      # Sample/synthetic data for development and testing
├── tests/                     # Unit, integration, and end-to-end tests
├── infrastructure/             # Deployment/container configuration
├── scripts/                    # Utility and setup scripts
├── .github/workflows/           # CI/CD pipelines
├── .env.example
├── .gitignore
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (LTS version)
- Python 3.10+
- MongoDB (local instance or connection string to a hosted cluster)
- An API key/credential for your chosen LLM provider

### Setup

```bash
# Clone the repository
git clone https://github.com/<your-username>/ai-resume-builder-platform.git
cd ai-resume-builder-platform

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install AI service dependencies
cd ../ai-service
pip install -r requirements.txt
```

Copy `.env.example` to `.env` in each service directory and fill in the required values (see [Environment Variables](#environment-variables)).

### Running Locally

```bash
# Start the backend API
cd backend
npm run dev

# Start the AI service
cd ai-service
python app/main.py

# Start the frontend
cd frontend
npm start
```

## Environment Variables

See `.env.example` for the full list. Never commit real secrets to the repository.

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `LLM_API_KEY` | API key for the chosen LLM provider |
| `LLM_PROVIDER` | Provider identifier (e.g., openai, anthropic) |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `STORAGE_BUCKET` | Storage location for exported PDFs and uploaded job descriptions |
| `NODE_ENV` | `development` / `staging` / `production` |
| `PORT` | Backend API port |

## Core Workflow

```
Dashboard
   -> Create Profile
   -> Enter Education / Skills / Experience / Projects
   -> Create Resume
   -> Select Template
   -> AI Content Generation / Improvement
   -> Add Job Description
   -> Job Description Analysis
   -> Resume <-> Job Matching
   -> ATS Analysis
   -> Customize Resume
   -> Preview
   -> Save Resume Version
   -> Export PDF
```

## AI Integration

| AI Task | Purpose | Approach |
|---|---|---|
| Content Generation | Turn raw profile facts into resume content | LLM via LangChain, grounded strictly in user data |
| Content Improvement | Rewrite/strengthen existing resume text | LLM via LangChain |
| Job Description Analysis | Extract skills, keywords, qualifications from a JD | LLM or NLP extraction |
| Resume-Job Matching | Compare resume vs. JD | Rule-based comparison logic |
| ATS Scoring | Score structure/keyword compatibility | Hybrid: rule-based checks + LLM-assisted suggestions |

**Non-negotiable rule:** AI must never fabricate experience, skills, education, or achievements. Every AI suggestion includes an explanation and must be explicitly accepted by the user before being saved.

## Product Principles

- User data before AI generation.
- AI assists; the user remains in control.
- No fabricated experience, skills, qualifications, or achievements.
- Every AI suggestion should be editable.
- AI recommendations should be explainable.
- ATS optimization should not compromise readability.
- Resume content should remain truthful to the user's information.
- User data and resumes should be protected.
- Clear uncertainty should be shown when AI cannot confidently make a recommendation.
- Every generated resume should be previewable before export.

## Documentation

Full project documentation is available in the [`docs/`](./docs) folder, including:

- Business Requirements Document (BRD)
- Product Requirements Document (PRD)
- UX Requirements
- Technical Requirements Document (TRD)
- High-Level Design (HLD)
- Low-Level Design (LLD)
- Database Design
- API Specification
- Generative AI Architecture
- Security Design
- Testing Strategy
- CI/CD
- Observability
- Deployment Architecture
- Cost Analysis
- Roadmap
- Architecture Decision Records (ADRs)
- Traceability Matrix

## Testing

```bash
# Backend tests
cd backend
npm test

# AI service tests
cd ai-service
pytest

# Frontend tests
cd frontend
npm test
```

Testing covers unit, integration, API, end-to-end, security, and AI content-quality evaluation (checking for zero fabricated claims and measuring keyword-coverage / ATS-score improvement after tailoring).

## Roadmap

| Phase | Weeks | Deliverables |
|---|---|---|
| Research | 1 | Problem validation |
| Requirements | 2 | BRD, PRD, UX |
| Architecture | 3 | TRD, HLD, DB design |
| Backend/Data foundation | 4-5 | APIs, DB, profile/resume pipeline |
| AI content generation | 6-7 | LangChain/LLM workflow, grounding, guardrails |
| JD analysis & ATS scoring | 8 | JD extraction, matching engine, ATS scoring |
| Frontend | 9 | Resume workspace, AI assistant panel, preview |
| Integration | 10 | End-to-end integration, PDF export |
| Testing | 11 | Functional, security, AI evaluation |
| Deployment | 12 | Deployment, monitoring, documentation, demo |

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting a pull request.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

## Disclaimer

This is a student/prototype project built for a Generative AI track. It is a decision-support and content-assistance tool. It does not guarantee job placement, ATS outcomes, or hiring decisions, and must not be used to submit fabricated or unverified information on a user's behalf.
