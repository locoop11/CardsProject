"""Secret Cards game package — depends on cards/, never the reverse."""

from secret_cards.actions import GameAction, record_action
from secret_cards.engine.nominate import (
    eligible_chancellor_ids,
    nominate_chancellor,
)
from secret_cards.engine.start import start_game
from secret_cards.errors import InvalidNomineeError, InvalidPhaseError
from secret_cards.model import (
    Phase,
    Player,
    Role,
    Settings,
    Team,
    GameState,
    blacks_on_table,
    reds_on_table,
    team_for_role,
)
from secret_cards.roles import ROLE_DISTRIBUTION, SUPPORTED_PLAYER_COUNTS, assign_roles

__all__ = [
    "ROLE_DISTRIBUTION",
    "SUPPORTED_PLAYER_COUNTS",
    "GameAction",
    "GameState",
    "InvalidNomineeError",
    "InvalidPhaseError",
    "Phase",
    "Player",
    "Role",
    "Settings",
    "Team",
    "assign_roles",
    "blacks_on_table",
    "eligible_chancellor_ids",
    "nominate_chancellor",
    "record_action",
    "reds_on_table",
    "start_game",
    "team_for_role",
]
