# Agent knowledge index

Living documentation of **how the system works today**. Read these before planning or coding. Do not treat root plan files (`class_design.md`, `inicial_Plan.md`, `planFileUI.md`) as current truth — they are temporary sources until the Planner mines them into `plans/`.

| File / folder | Open when you need… |
|---------------|---------------------|
| `knowledge-summary.md` | Cold start — compressed overview of the whole system |
| `architecture.md` | Stack, layers, how UI talks to the engine |
| `api-contracts.md` | Exact HTTP endpoints, payloads, status codes |
| `backend-map.md` | Where Python modules live and what each owns |
| `frontend-map.md` | Screens, session state, how the UI calls the API |
| `system-patterns.md` | Conventions, layer rules, testing layout |
| `business-domain.md` | Game rules, phases, win conditions, domain terms |
| `decisions.md` | Settled design choices and tradeoffs |
| `plans/` | **Future work only** — ordered, named implementation plans (see `plans/README.md`) |

**Update rule:** Documentation Agent maintains living map files after changes land. Planner Agent writes new files under `plans/`. One topic per file; no duplication of settled truth into plans.
