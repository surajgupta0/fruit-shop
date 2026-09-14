import pytest

from app.modules.auth.security import hash_token


@pytest.mark.asyncio
async def test_logout_revokes_refresh_token(client):
    phone = "+919999000020"
    await client.post("/auth/otp/request", json={"phone": phone})
    verify = await client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "123456"},
    )
    refresh = verify.json()["refresh_token"]

    logged_out = await client.post("/auth/logout", json={"refresh_token": refresh})
    assert logged_out.status_code == 204

    reuse = await client.post("/auth/refresh", json={"refresh_token": refresh})
    assert reuse.status_code == 401


@pytest.mark.asyncio
async def test_logout_all_sessions_requires_auth(client):
    denied = await client.post("/auth/logout", json={"all_sessions": True})
    assert denied.status_code == 401


@pytest.mark.asyncio
async def test_logout_all_sessions(client):
    phone = "+919999000021"
    await client.post("/auth/otp/request", json={"phone": phone})
    first = await client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "123456"},
    )
    await client.post("/auth/otp/request", json={"phone": phone})
    second = await client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "123456"},
    )
    access = first.json()["access_token"]
    refresh_a = first.json()["refresh_token"]
    refresh_b = second.json()["refresh_token"]

    logged_out = await client.post(
        "/auth/logout",
        headers={"Authorization": f"Bearer {access}"},
        json={"all_sessions": True},
    )
    assert logged_out.status_code == 204

    assert (await client.post("/auth/refresh", json={"refresh_token": refresh_a})).status_code == 401
    assert (await client.post("/auth/refresh", json={"refresh_token": refresh_b})).status_code == 401


@pytest.mark.asyncio
async def test_password_forgot_always_202(client):
    response = await client.post(
        "/auth/password/forgot",
        json={"email": "nobody@fruitshop.example"},
    )
    assert response.status_code == 202


@pytest.mark.asyncio
async def test_password_reset_flow(client, admin_token, monkeypatch):
    captured: dict[str, str] = {}

    async def _capture(*, to: str, reset_token: str, settings):
        captured["to"] = to
        captured["token"] = reset_token

    monkeypatch.setattr(
        "app.modules.auth.service.send_password_reset_email",
        _capture,
    )

    forgot = await client.post(
        "/auth/password/forgot",
        json={"email": "admin@fruitshop.example"},
    )
    assert forgot.status_code == 202
    assert captured["to"] == "admin@fruitshop.example"
    assert "token" in captured

    reset = await client.post(
        "/auth/password/reset",
        json={"token": captured["token"], "new_password": "brand-new-pass-99"},
    )
    assert reset.status_code == 204

    old_login = await client.post(
        "/auth/login",
        json={"email": "admin@fruitshop.example", "password": "adminpass123"},
    )
    assert old_login.status_code == 401

    new_login = await client.post(
        "/auth/login",
        json={"email": "admin@fruitshop.example", "password": "brand-new-pass-99"},
    )
    assert new_login.status_code == 200
    assert new_login.json()["access_token"]


@pytest.mark.asyncio
async def test_password_reset_rejects_bad_token(client):
    response = await client.post(
        "/auth/password/reset",
        json={"token": "not-a-real-reset-token-value", "new_password": "something1"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_password_reset_token_hash_stored(client, admin_token, session_factory, monkeypatch):
    captured: dict[str, str] = {}

    async def _capture(*, to: str, reset_token: str, settings):
        captured["token"] = reset_token

    monkeypatch.setattr(
        "app.modules.auth.service.send_password_reset_email",
        _capture,
    )

    await client.post(
        "/auth/password/forgot",
        json={"email": "admin@fruitshop.example"},
    )

    from sqlalchemy import select

    from app.modules.auth.models import PasswordResetToken

    async with session_factory() as session:
        row = (
            await session.execute(
                select(PasswordResetToken).order_by(PasswordResetToken.expires_at.desc())
            )
        ).scalar_one()
        assert row.token_hash == hash_token(captured["token"])
        assert row.consumed is False


@pytest.mark.asyncio
async def test_sms_send_invoked_when_static_otp_disabled(client, monkeypatch):
    called: dict[str, str] = {}

    async def _fake_sms(*, phone: str, code: str, settings):
        called["phone"] = phone
        called["code"] = code

    monkeypatch.setattr("app.modules.auth.service.send_otp_notification", _fake_sms)

    class _Settings:
        ENVIRONMENT = "test"
        OTP_TTL_MINUTES = 5
        OTP_LENGTH = 6
        OTP_STATIC_CODE = ""
        SMS_PROVIDER = "log"

        @property
        def static_otp_code(self):
            return None

        @property
        def use_static_otp(self):
            return False

    from app.modules.auth import service as auth_service

    original = auth_service.request_otp

    async def _request(phone, settings, session):
        return await original(phone, _Settings(), session)

    monkeypatch.setattr(auth_service, "request_otp", _request)

    phone = "+919999000022"
    response = await client.post("/auth/otp/request", json={"phone": phone})
    assert response.status_code == 202
    assert called["phone"] == phone
    assert len(called["code"]) == 6


@pytest.mark.asyncio
async def test_twilio_provider_posts_message(monkeypatch):
    from app.core.config import Settings
    from app.modules.auth import notifications

    class _Resp:
        status_code = 201
        text = "ok"

    class _Client:
        def __init__(self, *args, **kwargs):
            self.posted = None

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, url, data=None, auth=None):
            self.posted = {"url": url, "data": data, "auth": auth}
            _Client.last = self.posted
            return _Resp()

    monkeypatch.setattr(notifications.httpx, "AsyncClient", _Client)

    settings = Settings(
        SMS_PROVIDER="twilio",
        TWILIO_ACCOUNT_SID="ACtest",
        TWILIO_AUTH_TOKEN="token",
        TWILIO_FROM_NUMBER="+15005550006",
        OTP_TTL_MINUTES=5,
    )
    await notifications.send_otp_notification(
        phone="+919999000099",
        code="654321",
        settings=settings,
    )
    assert _Client.last["data"]["To"] == "+919999000099"
    assert "654321" in _Client.last["data"]["Body"]
    assert _Client.last["auth"] == ("ACtest", "token")
