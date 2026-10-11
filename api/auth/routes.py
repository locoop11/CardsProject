"""HTTP routes for local account authentication."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from api.auth.deps import require_user, session_token_from_request
from api.auth.service import (
    SESSION_COOKIE_NAME,
    SESSION_TTL,
    AuthFailedError,
    AuthInputError,
    DuplicateUserError,
    UserRecord,
    login,
    logout,
    register,
    update_profile,
)
from api.schemas import (
    LoginRequest,
    RegisterRequest,
    UpdateProfileRequest,
    UserOut,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_out(user: UserRecord) -> UserOut:
    return UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        display_name=user.display_name,
        card_skin=user.card_skin,
    )


def _set_session_cookie(response: Response, request: Request, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=request.url.scheme == "https",
        max_age=int(SESSION_TTL.total_seconds()),
        path="/",
    )


def _clear_session_cookie(response: Response, request: Request) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
        secure=request.url.scheme == "https",
    )


@router.post("/register", response_model=UserOut, status_code=201)
def register_route(
    body: RegisterRequest,
    request: Request,
    response: Response,
) -> UserOut:
    try:
        user, token = register(
            password=body.password,
            username=body.username,
            email=body.email,
            display_name=body.display_name,
        )
    except AuthInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except DuplicateUserError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    _set_session_cookie(response, request, token)
    return _user_out(user)


@router.post("/login", response_model=UserOut)
def login_route(
    body: LoginRequest,
    request: Request,
    response: Response,
) -> UserOut:
    try:
        user, token = login(
            password=body.password,
            username=body.username,
            email=body.email,
        )
    except AuthFailedError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    _set_session_cookie(response, request, token)
    return _user_out(user)


@router.post("/logout", status_code=204)
def logout_route(
    request: Request,
    response: Response,
    _user: UserRecord = Depends(require_user),
) -> Response:
    token = session_token_from_request(request)
    if token:
        logout(token)
    _clear_session_cookie(response, request)
    return Response(status_code=204)


@router.get("/me", response_model=UserOut)
def me_route(user: UserRecord = Depends(require_user)) -> UserOut:
    return _user_out(user)


@router.patch("/me", response_model=UserOut)
def update_me_route(
    body: UpdateProfileRequest,
    user: UserRecord = Depends(require_user),
) -> UserOut:
    try:
        updated = update_profile(
            user.id,
            display_name=body.display_name,
            card_skin=body.card_skin,
        )
    except AuthInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except AuthFailedError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    return _user_out(updated)
