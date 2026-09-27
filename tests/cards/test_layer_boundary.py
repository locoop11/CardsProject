"""Guard: the generic cards package must never depend on secret_cards."""

from __future__ import annotations

import ast
from pathlib import Path


CARDS_DIR = Path(__file__).resolve().parents[2] / "cards"


def _imports_from(module: str, tree: ast.AST) -> list[str]:
    found: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name == module or alias.name.startswith(f"{module}."):
                    found.append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module and (
                node.module == module or node.module.startswith(f"{module}.")
            ):
                found.append(node.module)
    return found


def test_cards_package_does_not_import_secret_cards() -> None:
    violations: list[str] = []
    for path in CARDS_DIR.rglob("*.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for name in _imports_from("secret_cards", tree):
            violations.append(f"{path.relative_to(CARDS_DIR.parent)}: {name}")
    assert violations == [], (
        "cards/ must never import secret_cards/. Offenders:\n"
        + "\n".join(violations)
    )
