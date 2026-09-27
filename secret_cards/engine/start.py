from __future__ import annotations

import random

from cards.table import CardTable

from secret_cards.actions import record_action
from secret_cards.laws.secret_cards_law_deck import SecretCardsLawDeck
from secret_cards.model import GameState, Phase, Player, Settings
from secret_cards.roles import SUPPORTED_PLAYER_COUNTS, assign_roles


def start_game(
    settings: Settings,
    player_names: list[str],
    rng: random.Random | None = None,
) -> GameState:
    """
    Create a new game ready for the first nomination.

    Validates player count and name list length, assigns shuffled roles,
    shuffles seat order (president is then index 0), and builds a standard
    LawCards deck.

    Args:
        settings: Pre-game settings (player_count must be supported).
        player_names: One display name per player; length must match
            settings.player_count. Blank names become "Player N".
        rng: Optional random generator for roles, seat order, and deck shuffle.

    Returns:
        A new GameState in Phase.NOMINATION with round_number 1.

    Raises:
        ValueError: If player_count is unsupported or name count mismatches.
    """
    if settings.player_count not in SUPPORTED_PLAYER_COUNTS:
        raise ValueError(
            f"Unsupported player_count={settings.player_count}; "
            f"supported={SUPPORTED_PLAYER_COUNTS}"
        )
    if len(player_names) != settings.player_count:
        raise ValueError(
            f"Expected {settings.player_count} names, got {len(player_names)}"
        )

    rng = rng if rng is not None else random.Random()

    roles = assign_roles(settings.player_count, rng=rng)
    # Normalize blank names; UI may also auto-fill before calling start_game.
    names = [
        name.strip() if name.strip() else f"Player {i + 1}"
        for i, name in enumerate(player_names)
    ]

    players = [
        Player(id=f"p{i}", name=name, role=role)
        for i, (name, role) in enumerate(zip(names, roles, strict=True))
    ]
    # Randomize who sits where, then president_index = 0 (first after shuffle).
    rng.shuffle(players)
    for i, player in enumerate(players):
        player.id = f"p{i}"

    state = GameState(
        players=players,
        settings=settings,
        phase=Phase.NOMINATION,
        round_number=1,
        president_index=0,
        nominated_chancellor_id=None,
        chancellor_id=None,
        previous_president_id=None,
        previous_chancellor_id=None,
        rejected_nominee_ids=[],
        votes={},
        law_deck=SecretCardsLawDeck.new_standard(rng=rng),
        law_table=CardTable(),
        drawn_law_cards=[],
    )
    record_action(
        state,
        "start_game",
        {
            "player_count": settings.player_count,
            "player_ids": [p.id for p in state.players],
            "player_names": [p.name for p in state.players],
        },
    )
    return state
