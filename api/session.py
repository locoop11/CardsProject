"""In-memory game session store for local pass-and-play and multi-device."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from secret_cards.model import GameState


@dataclass
class GameSession:
    """One running game keyed by game_id."""

    game_id: str
    state: GameState
    # None = local pass-and-play (auth-optional API).
    # Non-None = multi-device: player_id → authenticated user_id for game lifetime.
    user_id_by_player_id: dict[str, str] | None = None

    def is_local(self) -> bool:
        """True when no seat bindings (guest / local v1 path)."""
        return self.user_id_by_player_id is None

    def bound_user_id(self, player_id: str) -> str | None:
        """User id bound to this seat, or None if local / unknown seat."""
        if self.user_id_by_player_id is None:
            return None
        return self.user_id_by_player_id.get(player_id)

    def bound_player_id(self, user_id: str) -> str | None:
        """Seat id bound to this user, or None if local / unbound."""
        if self.user_id_by_player_id is None:
            return None
        for player_id, bound_user_id in self.user_id_by_player_id.items():
            if bound_user_id == user_id:
                return player_id
        return None


@dataclass
class SessionStore:
    """Process-local games. Sufficient for single-device / local API."""

    _games: dict[str, GameSession] = field(default_factory=dict)

    def create(
        self,
        state: GameState,
        *,
        user_id_by_player_id: dict[str, str] | None = None,
    ) -> GameSession:
        game_id = uuid.uuid4().hex[:12]
        session = GameSession(
            game_id=game_id,
            state=state,
            user_id_by_player_id=user_id_by_player_id,
        )
        self._games[game_id] = session
        return session

    def get(self, game_id: str) -> GameSession | None:
        return self._games.get(game_id)

    def delete(self, game_id: str) -> None:
        self._games.pop(game_id, None)


store = SessionStore()
