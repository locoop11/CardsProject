"""Secret Cards game package — depends on cards/, never the reverse."""

from secret_cards.actions import GameAction, record_action
from secret_cards.engine.legislative import chancellor_enact, president_discard
from secret_cards.engine.nominate import (
    eligible_chancellor_ids,
    nominate_chancellor,
)
from secret_cards.engine.start import start_game
from secret_cards.engine.vote import cast_vote, resolve_votes
from secret_cards.errors import (
    InvalidCardChoiceError,
    InvalidNomineeError,
    InvalidPhaseError,
    UnknownPlayerError,
    VoteAlreadyCastError,
)
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
    "InvalidCardChoiceError",
    "InvalidNomineeError",
    "InvalidPhaseError",
    "Phase",
    "Player",
    "Role",
    "Settings",
    "Team",
    "UnknownPlayerError",
    "VoteAlreadyCastError",
    "assign_roles",
    "blacks_on_table",
    "cast_vote",
    "chancellor_enact",
    "eligible_chancellor_ids",
    "nominate_chancellor",
    "president_discard",
    "record_action",
    "reds_on_table",
    "resolve_votes",
    "start_game",
    "team_for_role",
]
