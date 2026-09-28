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

- Locked plan: `inicial_Plan.md`
- Class design: `class_design.md`
- Local API shapes: `docs/api.md`

## Tests

```bash
source .venv/bin/activate
pytest
```
