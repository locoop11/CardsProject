from __future__ import annotations

from secret_cards.actions import record_action
from secret_cards.engine.enact import enact_top_law_after_exhausted_nominees
from secret_cards.engine.nominate import eligible_chancellor_ids
from secret_cards.engine.win import apply_win, check_win_condition
from secret_cards.errors import (
    InvalidPhaseError,
    UnknownPlayerError,
    VoteAlreadyCastError,
)
from secret_cards.model import GameState, Phase


def cast_vote(state: GameState, player_id: str, vote: bool) -> GameState:
    """
    Record one player's Ja (True) or Nein (False). Votes cannot be changed.

    Args:
        state: Must be in Phase.VOTING.
        player_id: Voting player.
        vote: True for Ja, False for Nein.

    Returns:
        The same state object, mutated.

    Raises:
        InvalidPhaseError: If not in VOTING.
        UnknownPlayerError: If player_id is not in the game.
        VoteAlreadyCastError: If this player already voted.
    """
    if state.phase is not Phase.VOTING:
        raise InvalidPhaseError(
            f"cast_vote requires phase={Phase.VOTING.value}, "
            f"got {state.phase.value}"
        )

    known_ids = {p.id for p in state.players}
    if player_id not in known_ids:
        raise UnknownPlayerError(f"Unknown player id: {player_id!r}")

    if player_id in state.votes:
        raise VoteAlreadyCastError(
            f"Player {player_id!r} already voted; votes cannot change"
        )

    state.votes[player_id] = vote
    record_action(
        state,
        "cast_vote",
        {"player_id": player_id, "vote": vote},
    )
    return state


def resolve_votes(state: GameState) -> GameState:
    """
    Resolve the election after the voting window ends.

    Players who did not vote count as Nein. Approved only on a strict Ja
    majority (ja_count > nein_count).

    On approve: set chancellor, Hitler-elected win check, else draw 3 LawCards
    and enter LEGISLATIVE_PRESIDENT.

    On reject: add nominee to rejected_nominee_ids, return to NOMINATION with
    the same president; if no eligible nominees remain, top-of-deck enact.

    Args:
        state: Must be in Phase.VOTING with a nominated chancellor.

    Returns:
        The same state object, mutated.
    """
    if state.phase is not Phase.VOTING:
        raise InvalidPhaseError(
            f"resolve_votes requires phase={Phase.VOTING.value}, "
            f"got {state.phase.value}"
        )
    if state.nominated_chancellor_id is None:
        raise InvalidPhaseError("resolve_votes requires a nominated chancellor")

    # Missing votes count as Nein
    for player in state.players:
        if player.id not in state.votes:
            state.votes[player.id] = False

    ja_count = sum(1 for v in state.votes.values() if v)
    nein_count = len(state.votes) - ja_count
    approved = ja_count > nein_count

    record_action(
        state,
        "resolve_votes",
        {
            "approved": approved,
            "ja_count": ja_count,
            "nein_count": nein_count,
            "votes": dict(state.votes),
            "nominee_id": state.nominated_chancellor_id,
        },
    )

    if approved:
        return _resolve_approved(state)
    return _resolve_rejected(state)


def _resolve_approved(state: GameState) -> GameState:
    state.chancellor_id = state.nominated_chancellor_id
    win = check_win_condition(state, trigger="election")
    if win is not None:
        return apply_win(state, win[0], win[1])

    state.drawn_law_cards = state.law_deck.draw(3)
    state.phase = Phase.LEGISLATIVE_PRESIDENT
    record_action(
        state,
        "draw_laws",
        {"card_ids": [c.id for c in state.drawn_law_cards]},
    )
    return state


def _resolve_rejected(state: GameState) -> GameState:
    nominee_id = state.nominated_chancellor_id
    assert nominee_id is not None
    if nominee_id not in state.rejected_nominee_ids:
        state.rejected_nominee_ids.append(nominee_id)
    state.nominated_chancellor_id = None
    state.chancellor_id = None
    state.votes.clear()
    state.phase = Phase.NOMINATION

    if not eligible_chancellor_ids(state):
        return enact_top_law_after_exhausted_nominees(state)
    return state
