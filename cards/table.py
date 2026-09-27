from __future__ import annotations

from dataclasses import dataclass, field

from cards.card import Card


class TableError(Exception):
    """Raised when a table operation cannot be completed."""


@dataclass
class CardTable:
    """
    Public face-up area for played / enacted cards.

    Cards placed here stay on the table; this class does not return them
    to a deck. Game code decides when (if ever) to clear the table.
    """

    cards: list[Card] = field(default_factory=list)

    def play(self, card: Card) -> None:
        """
        Place a card face-up on the table.

        Args:
            card: The card to add. Typically drawn from a deck or hand first;
                CardTable does not remove it from elsewhere.

        Raises:
            TableError: If a card with the same id is already on the table.
        """
        if any(existing.id == card.id for existing in self.cards):
            raise TableError(f"Card already on table: {card.id}")
        self.cards.append(card)

    def clear(self) -> list[Card]:
        """
        Remove all cards from the table and return them.

        Returns:
            The cards that were on the table, in the order they were played.
            The table is empty afterward.
        """
        removed = list(self.cards)
        self.cards.clear()
        return removed

    def __len__(self) -> int:
        """Return how many cards are currently on the table."""
        return len(self.cards)

    def __contains__(self, card_id: int) -> bool:
        """Return True if a card with this id is on the table."""
        return any(card.id == card_id for card in self.cards)
