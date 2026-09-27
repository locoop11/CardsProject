from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Sequence

from cards.card import Card


class PileError(Exception):
    """Raised when a pile operation cannot be completed."""


@dataclass
class CardPile:
    """
    Basic deck / pile simulator. Implements DeckProtocol.

    Index 0 is the top of the pile. Games build on this type or on DeckProtocol;
    this class has no game-specific rules.
    """

    cards: list[Card] = field(default_factory=list)

    def shuffle(self, rng: random.Random | None = None) -> None:
        """
        Randomly reorder all cards in the pile in place.

        Args:
            rng: Optional random generator. Pass a seeded Random in tests for
                deterministic order. If omitted, uses the module-level random.

        Note:
            v1 uses Python's PRNG (Mersenne Twister) — fine for local play and
            seeded tests, but NOT cryptographically secure. FUTURE: default to
            secrets.SystemRandom for online/multiplayer fairness; keep rng
            injectable so tests stay deterministic.
        """
        shuffler = rng if rng is not None else random
        shuffler.shuffle(self.cards)

    def draw(self, n: int = 1) -> list[Card]:
        """
        Remove and return the top n cards from the pile.

        Args:
            n: How many cards to take from the top (index 0 first). Default 1.

        Returns:
            The drawn cards, in top-to-bottom order.

        Raises:
            PileError: If n is negative, or if fewer than n cards remain.
        """
        if n < 0:
            raise PileError(f"Cannot draw a negative number of cards: {n}")
        if n > len(self.cards):
            raise PileError(
                f"Cannot draw {n} cards; only {len(self.cards)} remain"
            )
        drawn = self.cards[:n]
        self.cards = self.cards[n:]
        return drawn

    def peek(self, n: int = 1) -> list[Card]:
        """
        Return the top n cards without removing them from the pile.

        Args:
            n: How many cards to look at from the top. Default 1.

        Returns:
            A new list of the top cards (pile unchanged).

        Raises:
            PileError: If n is negative, or if fewer than n cards remain.
        """
        if n < 0:
            raise PileError(f"Cannot peek a negative number of cards: {n}")
        if n > len(self.cards):
            raise PileError(
                f"Cannot peek {n} cards; only {len(self.cards)} remain"
            )
        return list(self.cards[:n])

    def add_top(self, cards: Sequence[Card]) -> None:
        """
        Place the given cards on top of the pile (first card becomes the new top).

        Args:
            cards: Cards to insert at the front of the pile, in order.
        """
        self.cards = list(cards) + self.cards

    def add_bottom(self, cards: Sequence[Card]) -> None:
        """
        Place the given cards under the bottom of the pile.

        Args:
            cards: Cards to append after the current bottom, in order.
        """
        self.cards.extend(cards)

    def return_and_shuffle(
        self, cards: Sequence[Card], rng: random.Random | None = None
    ) -> None:
        """
        Put cards back into the pile and shuffle everything together.

        Typical use: a discarded card returns to the deck before the next draw.

        Args:
            cards: Cards to return into the pile.
            rng: Optional random generator for the shuffle (see shuffle).
        """
        self.cards.extend(cards)
        self.shuffle(rng)

    def remove(self, card_ids: Sequence[int]) -> list[Card]:
        """
        Remove specific cards from the pile by id and return them.

        Args:
            card_ids: Ids of cards to take out. Result order matches this list.

        Returns:
            The removed cards, in the same order as card_ids.

        Raises:
            PileError: If any id is duplicated, or any id is not in the pile.
        """
        id_set = set(card_ids)
        if len(id_set) != len(card_ids):
            raise PileError("Duplicate card ids in remove request")
        found: list[Card] = []
        remaining: list[Card] = []
        for card in self.cards:
            if card.id in id_set:
                found.append(card)
                id_set.remove(card.id)
            else:
                remaining.append(card)
        if id_set:
            raise PileError(f"Card ids not in pile: {sorted(id_set)}")
        self.cards = remaining
        by_id = {c.id: c for c in found}
        return [by_id[i] for i in card_ids]

    def __len__(self) -> int:
        """Return how many cards are currently in the pile."""
        return len(self.cards)