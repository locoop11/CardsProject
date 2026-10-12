"""In-memory room store. No HTTP / auth rules."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class SeatClaim:
    user_id: str
    display_name: str


@dataclass
class Room:
    """Lobby until host starts a game (game_id set later)."""

    room_id: str
    join_code: str
    host_user_id: str
    player_count: int
    # seat_index → claim; missing / None = empty
    seats: dict[int, SeatClaim | None] = field(default_factory=dict)
    member_user_ids: set[str] = field(default_factory=set)
    game_id: str | None = None

    def __post_init__(self) -> None:
        if not self.seats:
            self.seats = {i: None for i in range(self.player_count)}
        if self.host_user_id not in self.member_user_ids:
            self.member_user_ids = set(self.member_user_ids) | {self.host_user_id}


@dataclass
class RoomStore:
    """Process-local rooms keyed by room_id and join_code."""

    _rooms: dict[str, Room] = field(default_factory=dict)
    _by_code: dict[str, str] = field(default_factory=dict)

    def add(self, room: Room) -> Room:
        self._rooms[room.room_id] = room
        self._by_code[room.join_code] = room.room_id
        return room

    def get(self, room_id: str) -> Room | None:
        return self._rooms.get(room_id)

    def get_by_code(self, join_code: str) -> Room | None:
        room_id = self._by_code.get(join_code)
        if room_id is None:
            return None
        return self._rooms.get(room_id)

    def code_taken(self, join_code: str) -> bool:
        return join_code in self._by_code

    def clear(self) -> None:
        self._rooms.clear()
        self._by_code.clear()


store = RoomStore()
