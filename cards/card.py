from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Card:
    """
    Generic physical card instance. No game rules live here.

    Attributes:
        id: Unique id for this card instance within a deck (stable for the game).
        kind: Opaque type string defined by the consuming game
            (e.g. "law_red", "law_black", or later other games' kinds).
        meta: Optional free-form metadata for future games; unused by pile logic.
    """

    id: str
    kind: str
    meta: dict = field(default_factory=dict)
