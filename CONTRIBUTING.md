# Contributing to Data Cube AI

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Frontend

```bash
cd ai-information-hub
cp .env.example .env.local    # Add your API keys
npm install
npm run dev                   # http://localhost:3000
```

### Backend

```bash
cd ai-hub-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # Add your API keys

python -m scripts.init_db --migrate-all
uvicorn app.main:app --reload # http://localhost:8000/docs
```

## Making Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run the checks:
   - **Frontend**: `cd ai-information-hub && npx tsc --noEmit`
   - **Backend**: `cd ai-hub-backend && ruff check`
5. Commit: `git commit -m 'Add my feature'`
6. Push: `git push origin feature/my-feature`
7. Open a Pull Request

## Code Style

- **Frontend**: TypeScript, Tailwind CSS classes, Shadcn/ui components
- **Backend**: Python 3.11+, type hints, Ruff formatter
- Keep PRs focused on a single change

## Good First Issues

Look for issues labeled [`good first issue`](https://github.com/Rswcf/DataCube-AI-Space/labels/good%20first%20issue) — these are specifically chosen to be approachable for new contributors.

## Project Structure

| Directory | What's there |
|-----------|-------------|
| `ai-information-hub/` | Next.js frontend |
| `ai-hub-backend/` | FastAPI backend |
| `ai-information-hub/components/` | React components |
| `ai-hub-backend/app/services/` | Business logic (collector, LLM processor) |
| `ai-hub-backend/alembic/` | Database migrations |
| `docs/` | Translated READMEs |

## Questions?

Open a [Discussion](https://github.com/Rswcf/DataCube-AI-Space/discussions) or file an [Issue](https://github.com/Rswcf/DataCube-AI-Space/issues).
