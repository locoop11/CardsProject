"""Unit checks for frontend Option A card-skin resolve path rules.

Mirrors the documented default-pack rules in cardAssets.ts / plans/01:
Hitler = AS; laws exclude AS (black ace → AC); party uses dedicated law files.
"""

from __future__ import annotations

from pathlib import Path

import pytest

FRONTEND = Path(__file__).resolve().parents[2] / "frontend"
CARD_ASSETS = FRONTEND / "src" / "cardAssets.ts"
PARTY_DIR = FRONTEND / "public" / "cards" / "party"
DEFAULT_DIR = FRONTEND / "public" / "cards" / "default"


def _card_assets_source() -> str:
    return CARD_ASSETS.read_text(encoding="utf-8")


def test_default_and_party_packs_registered() -> None:
    src = _card_assets_source()
    assert "CardSkinId = 'default' | 'party'" in src
    assert "resolveHitler" in src
    assert "resolveRole" in src
    assert "resolveLaw" in src


def test_default_law_excludes_ace_of_spades() -> None:
    src = _card_assets_source()
    assert "forLaw" in src
    assert "Ace of Spades" in src or "AS reserved" in src
    assert "suit = 'C'" in src


def test_party_pack_assets_exist() -> None:
    required = [
        "hitler.png",
        "role-fascist.png",
        "role-communist.png",
        "law-fascist.png",
        "law-communist.png",
        "back.png",
        "back-fascist.png",
        "back-communist.png",
    ]
    missing = [name for name in required if not (PARTY_DIR / name).is_file()]
    assert missing == [], f"missing party assets: {missing}"


def test_default_hitler_asset_is_as() -> None:
    assert (DEFAULT_DIR / "AS.png").is_file()
    assert (DEFAULT_DIR / "AC.png").is_file()
    assert (DEFAULT_DIR / "back.png").is_file()


@pytest.mark.parametrize(
    "needle",
    [
        "lawFascistFile: 'law-fascist.png'",
        "lawCommunistFile: 'law-communist.png'",
        "hitlerFile: 'hitler.png'",
        "roleFascistFile: 'role-fascist.png'",
        "roleCommunistFile: 'role-communist.png'",
    ],
)
def test_party_catalog_registration(needle: str) -> None:
    assert needle in _card_assets_source()
