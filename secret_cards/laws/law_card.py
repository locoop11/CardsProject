from __future__ import annotations

from enum import Enum

from cards.card import Card

LAW_DECK_BLACK_COUNT = 11
LAW_DECK_RED_COUNT = 6
LAW_CARD_TYPE = "law"


class LawColor(str, Enum):
    """Color of a Secret Cards LawCard."""

    RED = "red"
    BLACK = "black"


def make_law_card(color: LawColor, number: int, card_id: int) -> Card:
    """
    Build a LawCard as a generic Card with type, number, color, and int id.

    Args:
        color: Red or black law.
        number: Face number on this LawCard (1-based within that color).
        card_id: Unique integer id for this physical card instance.

    Returns:
        A Card with type "law", the given number, color, and id.
    """
    return Card(
        id=card_id,
        type=LAW_CARD_TYPE,
        number=number,
        color=color.value,
    )


def is_law_card(card: Card) -> bool:
    """Return True if this Card is a LawCard (type is law)."""
    return card.type == LAW_CARD_TYPE


def law_color(card: Card) -> LawColor:
    """
    Return the LawColor of a LawCard.

    Raises:
        ValueError: If the card is not a LawCard.
    """
    if not is_law_card(card):
        raise ValueError(
            f"Not a LawCard: type={card.type!r} id={card.id!r}"
        )
    return LawColor(card.color)
