from __future__ import annotations

import pytest

from cards.card import Card
from cards.table import CardTable, TableError


def _law(card_id: str, color: str, number: int = 1) -> Card:
    return Card(id=card_id, type="law", number=number, color=color)


def test_play_appends_cards_in_order() -> None:
    table = CardTable()
    a = _law("a", "red")
    b = _law("b", "black")
    table.play(a)
    table.play(b)
    assert [c.id for c in table.cards] == ["a", "b"]
    assert len(table) == 2


def test_play_duplicate_id_raises() -> None:
    table = CardTable()
    table.play(_law("a", "red"))
    with pytest.raises(TableError, match="already on table"):
        table.play(_law("a", "black"))


def test_clear_empties_table_and_returns_cards() -> None:
    table = CardTable()
    table.play(_law("a", "red"))
    table.play(_law("b", "black"))
    removed = table.clear()
    assert [c.id for c in removed] == ["a", "b"]
    assert len(table) == 0


def test_contains_by_id() -> None:
    table = CardTable()
    table.play(_law("a", "red"))
    assert "a" in table
    assert "missing" not in table
