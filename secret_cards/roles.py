from __future__ import annotations

import random

from secret_cards.model import Role

# player_count -> (communist_count, fascist_count_including_hitler)
ROLE_DISTRIBUTION: dict[int, tuple[int, int]] = {
    5: (3, 2),
    6: (4, 2),
    7: (4, 3),
    8: (5, 3),
    9: (5, 4),
    10: (6, 4),
}

SUPPORTED_PLAYER_COUNTS: tuple[int, ...] = tuple(ROLE_DISTRIBUTION.keys())


def assign_roles(
    player_count: int, rng: random.Random | None = None
) -> list[Role]:
    """
    Build a shuffled list of roles for the given player count.

    Exactly one HITLER; remaining fascist seats are FASCIST; the rest are
    COMMUNIST. Counts come from ROLE_DISTRIBUTION.

    Args:
        player_count: Must be in SUPPORTED_PLAYER_COUNTS.
        rng: Optional random generator for shuffling (seeded in tests).

    Returns:
        A list of exactly player_count Role values, shuffled.

    Raises:
        ValueError: If player_count is not supported.
    """
    if player_count not in ROLE_DISTRIBUTION:
        raise ValueError(
            f"Unsupported player_count={player_count}; "
            f"supported={SUPPORTED_PLAYER_COUNTS}"
        )
    communist_count, fascist_including_hitler = ROLE_DISTRIBUTION[player_count]
    fascist_members = fascist_including_hitler - 1
    roles: list[Role] = (
        [Role.COMMUNIST] * communist_count
        + [Role.FASCIST] * fascist_members
        + [Role.HITLER]
    )
    assert len(roles) == player_count
    shuffler = rng if rng is not None else random
    shuffler.shuffle(roles)
    return roles
