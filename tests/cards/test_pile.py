from __future__ import annotations

import random

import pytest

from cards.card import Card
from cards.pile import CardPile, PileError
from cards.protocols import DeckProtocol


def _cards(*kinds: str) -> list[Card]:
    return [Card(id=f"c{i}", kind=kind) for i, kind in enumerate(kinds)]


def test_card_pile_satisfies_deck_protocol() -> None:
    pile: DeckProtocol = CardPile(cards=_cards("a", "b"))
    assert len(pile) == 2


def test_draw_takes_from_top_in_order() -> None:
    pile = CardPile(cards=_cards("red", "black", "red"))
    drawn = pile.draw(2)
    assert [c.kind for c in drawn] == ["red", "black"]
    assert [c.kind for c in pile.cards] == ["red"]
    assert len(pile) == 1


def test_draw_more_than_available_raises() -> None:
    pile = CardPile(cards=_cards("a"))
    with pytest.raises(PileError, match="only 1 remain"):
        pile.draw(2)


def test_peek_does_not_remove() -> None:
    pile = CardPile(cards=_cards("a", "b"))
    assert [c.id for c in pile.peek(1)] == ["c0"]
    assert len(pile) == 2


def test_shuffle_is_deterministic_with_seed() -> None:
    cards = _cards("a", "b", "c", "d", "e")
    pile_a = CardPile(cards=list(cards))
    pile_b = CardPile(cards=list(cards))
    pile_a.shuffle(random.Random(42))
    pile_b.shuffle(random.Random(42))
    assert [c.id for c in pile_a.cards] == [c.id for c in pile_b.cards]


def test_return_and_shuffle_restores_count() -> None:
    pile = CardPile(cards=_cards("a", "b", "c"))
    drawn = pile.draw(2)
    assert len(pile) == 1
    pile.return_and_shuffle(drawn, rng=random.Random(1))
    assert len(pile) == 3
    assert {c.id for c in pile.cards} == {"c0", "c1", "c2"}


def test_add_top_and_bottom() -> None:
    pile = CardPile(cards=_cards("mid"))
    pile.add_top([Card(id="top", kind="t")])
    pile.add_bottom([Card(id="bot", kind="b")])
    assert [c.id for c in pile.cards] == ["top", "c0", "bot"]


def test_remove_by_ids_preserves_request_order() -> None:
    pile = CardPile(cards=_cards("a", "b", "c"))
    removed = pile.remove(["c2", "c0"])
    assert [c.id for c in removed] == ["c2", "c0"]
    assert [c.id for c in pile.cards] == ["c1"]


def test_remove_missing_id_raises() -> None:
    pile = CardPile(cards=_cards("a"))
    with pytest.raises(PileError, match="not in pile"):
        pile.remove(["missing"])
