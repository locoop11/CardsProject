from __future__ import annotations

import random

import pytest

from cards.card import Card
from cards.protocols import DeckProtocol
from secret_cards.laws.law_card import (
    LAW_CARD_TYPE,
    LAW_DECK_BLACK_COUNT,
    LAW_DECK_RED_COUNT,
    LawColor,
    is_law_card,
    law_color,
    make_law_card,
)
from secret_cards.laws.secret_cards_law_deck import SecretCardsLawDeck


def test_make_law_card_sets_type_number_color() -> None:
    card = make_law_card(LawColor.RED, 3)
    assert card.id == "law_red_3"
    assert card.type == LAW_CARD_TYPE
    assert card.number == 3
    assert card.color == "red"
    assert is_law_card(card)
    assert law_color(card) is LawColor.RED


def test_law_color_rejects_non_law_card() -> None:
    with pytest.raises(ValueError, match="Not a LawCard"):
        law_color(Card(id="x", type="hearts", number=1, color="red"))


def test_new_standard_has_correct_composition() -> None:
    deck = SecretCardsLawDeck.new_standard(rng=random.Random(0))
    assert isinstance(deck, DeckProtocol)
    assert len(deck) == LAW_DECK_BLACK_COUNT + LAW_DECK_RED_COUNT
    assert deck.count_in_deck(LawColor.BLACK) == LAW_DECK_BLACK_COUNT
    assert deck.count_in_deck(LawColor.RED) == LAW_DECK_RED_COUNT
    assert all(is_law_card(c) for c in deck.cards)
    black_numbers = sorted(
        c.number for c in deck.cards if c.color == LawColor.BLACK.value
    )
    red_numbers = sorted(
        c.number for c in deck.cards if c.color == LawColor.RED.value
    )
    assert black_numbers == list(range(1, LAW_DECK_BLACK_COUNT + 1))
    assert red_numbers == list(range(1, LAW_DECK_RED_COUNT + 1))


def test_new_standard_shuffle_is_deterministic_with_seed() -> None:
    a = SecretCardsLawDeck.new_standard(rng=random.Random(99))
    b = SecretCardsLawDeck.new_standard(rng=random.Random(99))
    assert [c.id for c in a.cards] == [c.id for c in b.cards]


def test_draw_and_return_and_shuffle() -> None:
    deck = SecretCardsLawDeck.new_standard(rng=random.Random(1))
    drawn = deck.draw(3)
    assert len(drawn) == 3
    assert deck.remaining() == 14
    deck.return_and_shuffle(drawn, rng=random.Random(2))
    assert deck.remaining() == 17


def test_draw_top_for_auto_enact() -> None:
    deck = SecretCardsLawDeck.new_standard(rng=random.Random(3))
    top_before = deck.peek_top(1)[0]
    card = deck.draw_top_for_auto_enact()
    assert card.id == top_before.id
    assert deck.remaining() == 16


def test_count_in_deck_updates_after_draw() -> None:
    cards = [make_law_card(LawColor.BLACK, n) for n in range(1, 4)] + [
        make_law_card(LawColor.RED, n) for n in range(1, 3)
    ]
    deck = SecretCardsLawDeck(cards=cards)
    deck.draw(2)  # two black
    assert deck.count_in_deck(LawColor.BLACK) == 1
    assert deck.count_in_deck(LawColor.RED) == 2
