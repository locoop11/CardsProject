from __future__ import annotations

from secret_cards.actions import record_action
from secret_cards.engine.enact import enact_top_law_after_exhausted_nominees
from secret_cards.errors import InvalidNomineeError, InvalidPhaseError
from secret_cards.model import GameState, Phase


def current_president_id(state: GameState) -> str:
    """Return the player id of the current president."""
    return state.players[state.president_index].id


def eligible_chancellor_ids(state: GameState) -> list[str]:
    """
    Player ids who may be nominated as chancellor right now.

    Excludes: current president; previous chancellor when
    settings.bar_previous_chancellor; previous president when
    settings.bar_previous_president; anyone in rejected_nominee_ids.
    """
    barred: set[str] = {current_president_id(state)}
    barred.update(state.rejected_nominee_ids)

    if (
        state.settings.bar_previous_chancellor
        and state.previous_chancellor_id is not None
    ):
        barred.add(state.previous_chancellor_id)

    if (
        state.settings.bar_previous_president
        and state.previous_president_id is not None
    ):
        barred.add(state.previous_president_id)

    return [p.id for p in state.players if p.id not in barred]


def nominate_chancellor(state: GameState, nominee_id: str) -> GameState:
    """
    Nominate a chancellor and move to VOTING.

    If nobody is eligible, enacts the top LawCard instead (no soft-lock).

    Args:
        state: Must be in Phase.NOMINATION.
        nominee_id: Player id to nominate (ignored if no one is eligible).

    Returns:
        The same state object, mutated.

    Raises:
        InvalidPhaseError: If not in NOMINATION (and not already handled).
        InvalidNomineeError: If nominee_id is not in the eligible set.
    """
    if state.phase is not Phase.NOMINATION:
        raise InvalidPhaseError(
            f"nominate_chancellor requires phase={Phase.NOMINATION.value}, "
            f"got {state.phase.value}"
        )

    eligible = eligible_chancellor_ids(state)
    if not eligible:
        return enact_top_law_after_exhausted_nominees(state)

    if nominee_id not in eligible:
        raise InvalidNomineeError(
            f"Nominee {nominee_id!r} is not eligible; eligible={eligible}"
        )

    known_ids = {p.id for p in state.players}
    if nominee_id not in known_ids:
        raise InvalidNomineeError(f"Unknown player id: {nominee_id!r}")

    state.nominated_chancellor_id = nominee_id
    state.votes.clear()
    state.phase = Phase.VOTING
    record_action(
        state,
        "nominate",
        {
            "nominee_id": nominee_id,
            "president_id": current_president_id(state),
        },
    )
    return state
