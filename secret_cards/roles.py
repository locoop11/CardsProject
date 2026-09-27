from __future__ import annotations

import random

from secret_cards.model import Role

# player_count -> (red_member_count, black_count_including_leader)
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

    Exactly one LEADER; remaining black seats are BLACK_MEMBER; the rest
    are RED_MEMBER. Counts come from ROLE_DISTRIBUTION.

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
    red_count, black_including_leader = ROLE_DISTRIBUTION[player_count]
    black_members = black_including_leader - 1
    roles: list[Role] = (
        [Role.RED_MEMBER] * red_count
        + [Role.BLACK_MEMBER] * black_members
        + [Role.LEADER]
    )
    assert len(roles) == player_count
    shuffler = rng if rng is not None else random
    shuffler.shuffle(roles)
    return roles
