"""HTTP routes for skin catalog, ownership, and Hitler/role equip."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from api.auth.deps import require_user
from api.auth.service import UserRecord
from api.schemas import (
    EquipOut,
    EquipRequest,
    SeatEquipOut,
    SeatEquipsOut,
    SkinMeOut,
    SkinPackOut,
)
from api.skins.service import (
    EquipSummary,
    SkinForbiddenError,
    SkinInputError,
    SkinNotFoundError,
    SkinPackRecord,
    catalog_active_packs,
    equip,
    profile_for_user,
    seat_equips_for_game,
)

router = APIRouter(prefix="/api/skins", tags=["skins"])


def _pack_out(pack: SkinPackRecord) -> SkinPackOut:
    return SkinPackOut(
        id=pack.id,
        code=pack.code,
        title=pack.title,
        description=pack.description,
    )


def _equip_out(summary: EquipSummary) -> EquipOut:
    return EquipOut(
        hitler_pack_id=summary.hitler_pack_id,
        role_pack_id=summary.role_pack_id,
        hitler_pack_code=summary.hitler_pack_code,
        role_pack_code=summary.role_pack_code,
    )


@router.get("/packs", response_model=list[SkinPackOut])
def list_packs() -> list[SkinPackOut]:
    """Active catalog. Session optional — this is not an ownership list."""
    return [_pack_out(pack) for pack in catalog_active_packs()]


@router.get("/me", response_model=SkinMeOut)
def skins_me(user: UserRecord = Depends(require_user)) -> SkinMeOut:
    profile = profile_for_user(user.id)
    return SkinMeOut(
        owned_packs=[_pack_out(pack) for pack in profile.owned_packs],
        equip=_equip_out(profile.equip),
    )


@router.patch("/equip", response_model=EquipOut)
def equip_route(
    body: EquipRequest,
    user: UserRecord = Depends(require_user),
) -> EquipOut:
    try:
        summary = equip(
            user.id,
            hitler_pack_id=body.hitler_pack_id,
            role_pack_id=body.role_pack_id,
        )
    except SkinInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SkinForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return _equip_out(summary)


@router.get("/games/{game_id}/seats", response_model=SeatEquipsOut)
def game_seat_equips(
    game_id: str,
    user: UserRecord = Depends(require_user),
) -> SeatEquipsOut:
    try:
        seats = seat_equips_for_game(game_id, user.id)
    except SkinInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SkinForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except SkinNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return SeatEquipsOut(
        seats=[
            SeatEquipOut(
                player_id=seat.player_id,
                hitler_pack_id=seat.hitler_pack_id,
                hitler_pack_code=seat.hitler_pack_code,
                role_pack_id=seat.role_pack_id,
                role_pack_code=seat.role_pack_code,
            )
            for seat in seats
        ]
    )
