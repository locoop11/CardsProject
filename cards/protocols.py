from __future__ import annotations

import random
from typing import Protocol, Sequence, runtime_checkable

from cards.card import Card


@runtime_checkable
class DeckProtocol(Protocol):
    """
    Interface for any draw pile.

    Implemented by the basic CardPile and by game-specific decks
    (e.g. SecretCardsLawDeck). Callers that only need draw/shuffle/return
    should depend on this protocol, not on a concrete class.
    """

    def shuffle(self, rng: random.Random | None = None) -> None:
        """Randomly reorder all cards in the deck in place."""
        ...

    def draw(self, n: int = 1) -> list[Card]:
        """Remove and return the top n cards from the deck."""
        ...

    def return_and_shuffle(
        self, cards: Sequence[Card], rng: random.Random | None = None
    ) -> None:
        """Put cards back into the deck and shuffle the whole deck."""
        ...

    def __len__(self) -> int:
        """Return how many cards remain in the deck."""
        ...
