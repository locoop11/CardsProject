from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Card:
    """
    Generic physical card instance. No game rules live here.

    Attributes:
        id: Unique integer id for this card instance within a deck.
        type: Card type defined by the consuming game (e.g. "law", "hearts").
        number: Face / index number on the card (meaning is game-defined).
        color: Color label defined by the consuming game (e.g. "red", "black").
        meta: Optional free-form metadata for future games; unused by pile logic.
    """

    id: int
    type: str
    number: int
    color: str
    meta: dict = field(default_factory=dict)
