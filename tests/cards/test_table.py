from __future__ import annotations

import pytest

from cards.card import Card
from cards.table import CardTable, TableError


def _law(card_id: int, color: str, number: int = 1) -> Card:
    return Card(id=card_id, type="law", number=number, color=color)


def test_play_appends_cards_in_order() -> None:
    table = CardTable()
    a = _law(1, "red")
    b = _law(2, "black")
    table.play(a)
    table.play(b)
    assert [c.id for c in table.cards] == [1, 2]
    assert len(table) == 2


def test_play_duplicate_id_raises() -> None:
    table = CardTable()
    table.play(_law(1, "red"))
    with pytest.raises(TableError, match="already on table"):
        table.play(_law(1, "black"))


def test_clear_empties_table_and_returns_cards() -> None:
    table = CardTable()
    table.play(_law(1, "red"))
    table.play(_law(2, "black"))
    removed = table.clear()
    assert [c.id for c in removed] == [1, 2]
    assert len(table) == 0


def test_contains_by_id() -> None:
    table = CardTable()
    table.play(_law(1, "red"))
    assert 1 in table
    assert 999 not in table
