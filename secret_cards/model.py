from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

from cards.card import Card
from cards.table import CardTable

from secret_cards.laws.law_card import LawColor, law_color
from secret_cards.laws.secret_cards_law_deck import SecretCardsLawDeck


class Team(str, Enum):
    """Winning / affiliation side."""

    RED = "red"
    BLACK = "black"


class Role(str, Enum):
    """Secret role assigned once at game start."""

    RED_MEMBER = "red_member"
    BLACK_MEMBER = "black_member"
    LEADER = "leader"  # team = BLACK


class Phase(str, Enum):
    """Current step of the round / game."""

    NOMINATION = "nomination"
    VOTING = "voting"
    LEGISLATIVE_PRESIDENT = "legislative_president"
    LEGISLATIVE_CHANCELLOR = "legislative_chancellor"
    GAME_OVER = "game_over"


@dataclass
class Player:
    """One seated player. Role never changes after assignment."""

    id: str
    name: str
    role: Role
    is_alive: bool = True  # unused in v1; reserved for future eliminations


@dataclass
class Settings:
    """
    Pre-game and future-toggle settings.

    v1 mainly uses player_count; other fields exist so later UI can toggle
    behavior without a schema rewrite.
    """

    player_count: int
    bar_previous_chancellor: bool = True
    bar_previous_president: bool = False
    clear_term_limits_on_auto_enact: bool = True
    voting_window_seconds: int = 5


@dataclass
class GameState:
    """
    Mutable full-game snapshot.

    Engine functions update this object in place and append to action_log.
    """

    players: list[Player]
    settings: Settings
    phase: Phase
    round_number: int
    president_index: int
    nominated_chancellor_id: Optional[str]
    chancellor_id: Optional[str]
    previous_president_id: Optional[str]
    previous_chancellor_id: Optional[str]
    rejected_nominee_ids: list[str]
    votes: dict[str, bool]
    law_deck: SecretCardsLawDeck
    law_table: CardTable
    drawn_law_cards: list[Card]
    winner: Optional[Team] = None
    win_reason: Optional[str] = None
    result: Optional[dict[str, Any]] = None
    # list[GameAction]; typed loosely here to avoid a model↔actions cycle.
    action_log: list[Any] = field(default_factory=list)


def team_for_role(role: Role) -> Team:
    """
    Map a role to its team.

    Red members are Red; black members and the Leader are Black.
    """
    if role is Role.RED_MEMBER:
        return Team.RED
    return Team.BLACK


def reds_on_table(state: GameState) -> int:
    """Count red LawCards currently on the table."""
    return sum(
        1 for card in state.law_table.cards if law_color(card) is LawColor.RED
    )


def blacks_on_table(state: GameState) -> int:
    """Count black LawCards currently on the table."""
    return sum(
        1
        for card in state.law_table.cards
        if law_color(card) is LawColor.BLACK
    )
