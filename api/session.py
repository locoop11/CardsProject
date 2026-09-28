"""In-memory game session store for local pass-and-play."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from secret_cards.model import GameState


@dataclass
class GameSession:
    """One running game keyed by game_id."""

    game_id: str
    state: GameState


@dataclass
class SessionStore:
    """Process-local games. Sufficient for single-device / local API."""

    _games: dict[str, GameSession] = field(default_factory=dict)

    def create(self, state: GameState) -> GameSession:
        game_id = uuid.uuid4().hex[:12]
        session = GameSession(game_id=game_id, state=state)
        self._games[game_id] = session
        return session

    def get(self, game_id: str) -> GameSession | None:
        return self._games.get(game_id)

    def delete(self, game_id: str) -> None:
        self._games.pop(game_id, None)


store = SessionStore()
