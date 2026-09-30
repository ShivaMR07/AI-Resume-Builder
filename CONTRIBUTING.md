# Contributing to AI Resume Builder Platform

Thank you for your interest in contributing. This document outlines the process for proposing changes.

## Getting Started

1. Fork the repository.
2. Clone your fork locally.
3. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/short-description
   ```
4. Install dependencies for the frontend, backend, and AI service as described in the README.

## Branching Model

- `main` — stable, deployable branch.
- `feature/*` — new features or enhancements.
- `fix/*` — bug fixes.
- `docs/*` — documentation-only changes.

## Commit Messages

Use clear, descriptive commit messages, ideally following the pattern:

```
<type>: <short summary>

<optional longer description>
```

Examples: `feat: add ATS score breakdown to analysis panel`, `fix: correct email validation regex`, `docs: update API specification for export endpoint`.

## Pull Requests

Every pull request should include:

- **Problem** — what issue or requirement this addresses.
- **Solution** — a summary of the approach taken.
- **Testing** — how the change was verified (unit/integration/manual).
- **Screenshots** — for any UI changes.
- **Risks** — any known trade-offs or follow-up work needed.

Pull requests should be reviewed by at least one other contributor before merging. Do not merge if required tests are failing or if secrets/credentials are detected in the diff.

## Code Style

- Follow the existing linting/formatting configuration for each service (frontend, backend, AI service).
- Keep functions small and single-purpose.
- Add or update tests for any behavior change.
- Do not introduce new dependencies without noting the reason in the PR description.

## AI-Related Contributions

Because this platform generates and modifies resume content, any change touching prompts, the LLM orchestration layer, or the ATS scoring logic must:

- Preserve the rule that AI-generated content must be traceable to user-provided data (no fabrication).
- Preserve mandatory human review before any AI suggestion is saved.
- Include or update relevant evaluation cases in the AI test suite.
- Document the change in the corresponding section of `docs/10_GenAI_Architecture.md` if the orchestration flow changes.

## Reporting Issues

When filing an issue, please include:

- A clear description of the problem or request.
- Steps to reproduce (for bugs).
- Expected vs. actual behavior.
- Environment details (OS, Node/Python version, browser) where relevant.

## Code of Conduct

Be respectful and constructive in all discussions, reviews, and issue reports.
