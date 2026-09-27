from __future__ import annotations

import random
from typing import Sequence

from cards.card import Card
from cards.pile import CardPile

from secret_cards.laws.law_card import (
    LAW_DECK_BLACK_COUNT,
    LAW_DECK_RED_COUNT,
    LawColor,
    law_color,
    make_law_card,
)


class SecretCardsLawDeck(CardPile):
    """
    Law draw pile for Secret Cards. Implements DeckProtocol via CardPile.

    Standard composition: 11 black + 6 red LawCards. Owns the draw pile only;
    enacted laws live on a CardTable on GameState. No presidents, votes, or
    win logic here.
    """

    BLACK_COUNT = LAW_DECK_BLACK_COUNT
    RED_COUNT = LAW_DECK_RED_COUNT

    @classmethod
    def new_standard(
        cls, rng: random.Random | None = None
    ) -> SecretCardsLawDeck:
        """
        Create a full standard LawCards deck and shuffle it.

        Args:
            rng: Optional random generator for the initial shuffle. Pass a
                seeded Random in tests for a deterministic order.

        Returns:
            A SecretCardsLawDeck with 11 black and 6 red LawCards, shuffled.
        """
        cards: list[Card] = [
            make_law_card(LawColor.BLACK, n)
            for n in range(1, cls.BLACK_COUNT + 1)
        ] + [
            make_law_card(LawColor.RED, n)
            for n in range(1, cls.RED_COUNT + 1)
        ]
        deck = cls(cards=cards)
        deck.shuffle(rng)
        return deck

    def remaining(self) -> int:
        """Return how many LawCards are still in the draw pile."""
        return len(self)

    def count_in_deck(self, color: LawColor) -> int:
        """
        Count LawCards of the given color still in the draw pile.

        Args:
            color: Red or black.

        Returns:
            Number of matching cards remaining in this deck.
        """
        return sum(1 for card in self.cards if law_color(card) == color)

    def peek_top(self, n: int = 1) -> list[Card]:
        """
        Look at the top n LawCards without drawing them.

        Args:
            n: How many cards to peek. Default 1.

        Returns:
            The top cards (pile unchanged). Same behavior as peek.
        """
        return self.peek(n)

    def draw_top_for_auto_enact(self) -> Card:
        """
        Draw exactly one LawCard from the top for the rejected-all path.

        Returns:
            The single top LawCard, removed from the deck.

        Raises:
            PileError: If the deck is empty.
        """
        return self.draw(1)[0]

    # Inherited with clear law-deck meaning; docstrings for API clarity.

    def shuffle(self, rng: random.Random | None = None) -> None:
        """Randomly reorder all LawCards remaining in this draw pile."""
        super().shuffle(rng)

    def draw(self, n: int = 1) -> list[Card]:
        """
        Remove and return the top n LawCards from this draw pile.

        Args:
            n: How many cards to take. Default 1.

        Returns:
            The drawn LawCards, top first.
        """
        return super().draw(n)

    def return_and_shuffle(
        self, cards: Sequence[Card], rng: random.Random | None = None
    ) -> None:
        """
        Return LawCards to this draw pile and shuffle (e.g. president discard).

        Args:
            cards: LawCards going back into the deck.
            rng: Optional random generator for the shuffle.
        """
        super().return_and_shuffle(cards, rng)
