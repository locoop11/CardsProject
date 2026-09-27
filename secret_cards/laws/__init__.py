"""Law cards and the Secret Cards law deck."""

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

__all__ = [
    "LAW_CARD_TYPE",
    "LAW_DECK_BLACK_COUNT",
    "LAW_DECK_RED_COUNT",
    "LawColor",
    "SecretCardsLawDeck",
    "is_law_card",
    "law_color",
    "make_law_card",
]
