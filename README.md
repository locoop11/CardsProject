# Secret Cards

Python game engine + React pass-and-play UI.

## Quick start

```bash
# Engine API (from repo root)
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.app:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open the Vite URL (usually http://localhost:5173). API calls are proxied to port 8000.

## Docs

- **Agent / living system context:** `ai-context/` (start with `ai-context/README.md`)
- **Future work plans:** `ai-context/plans/`
- Human API sketch (may lag): `docs/api.md` — prefer `ai-context/api-contracts.md`
- Legacy root plans (`inicial_Plan.md`, `class_design.md`, `planFileUI.md`) are historical sources only; do not treat as current truth

## Tests

```bash
source .venv/bin/activate
pytest
```
