import pytest


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "fruit-shop-api"}


@pytest.mark.asyncio
async def test_otp_request_returns_202(client):
    response = await client.post("/auth/otp/request", json={"phone": "+919999000001"})
    assert response.status_code == 202
    assert response.content == b""


@pytest.mark.asyncio
async def test_otp_verify_issues_tokens_and_creates_user(client):
    phone = "+919999000002"
    await client.post("/auth/otp/request", json={"phone": phone})

    response = await client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "123456"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["expires_in"] == 15 * 60


@pytest.mark.asyncio
async def test_otp_verify_rejects_bad_code(client):
    phone = "+919999000003"
    await client.post("/auth/otp/request", json={"phone": phone})

    response = await client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "000000"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rotates_tokens(client):
    phone = "+919999000004"
    await client.post("/auth/otp/request", json={"phone": phone})
    verify = await client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "123456"},
    )
    old_refresh = verify.json()["refresh_token"]

    refreshed = await client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert refreshed.status_code == 200
    new_body = refreshed.json()
    assert new_body["refresh_token"] != old_refresh

    reuse = await client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert reuse.status_code == 401


@pytest.mark.asyncio
async def test_me_with_access_token(client):
    phone = "+919999000005"
    await client.post("/auth/otp/request", json={"phone": phone})
    verify = await client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "123456"},
    )
    access_token = verify.json()["access_token"]

    response = await client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200
    assert response.json()["phone"] == phone
    assert response.json()["role"] == "customer"
    assert "users:read_self" in response.json()["permissions"]


@pytest.mark.asyncio
async def test_admin_create_staff_requires_permission(client, admin_token):
    phone = "+919999000006"
    await client.post("/auth/otp/request", json={"phone": phone})
    verify = await client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "123456"},
    )
    customer_token = verify.json()["access_token"]

    denied = await client.post(
        "/users",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={
            "phone": "+919999000010",
            "email": "staff@fruitshop.example",
            "password": "password123",
            "name": "Staff User",
            "role": "staff",
        },
    )
    assert denied.status_code == 403

    created = await client.post(
        "/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "phone": "+919999000010",
            "email": "staff@fruitshop.example",
            "password": "password123",
            "name": "Staff User",
            "role": "staff",
        },
    )
    assert created.status_code == 201
    assert created.json()["role"] == "staff"
    assert "users:list" in created.json()["permissions"]

    login = await client.post(
        "/auth/login",
        json={"email": "staff@fruitshop.example", "password": "password123"},
    )
    assert login.status_code == 200
    assert login.json()["access_token"]


@pytest.mark.asyncio
async def test_customer_address_crud(client):
    phone = "+919999000007"
    await client.post("/auth/otp/request", json={"phone": phone})
    verify = await client.post(
        "/auth/otp/verify",
        json={"phone": phone, "code": "123456"},
    )
    token = verify.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    created = await client.post(
        "/users/me/addresses",
        headers=headers,
        json={
            "label": "home",
            "line1": "12 Fruit Lane",
            "city": "Mumbai",
            "state": "MH",
            "postal_code": "400001",
            "country": "IN",
            "is_default": True,
        },
    )
    assert created.status_code == 201
    address_id = created.json()["id"]

    listed = await client.get("/users/me/addresses", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    deleted = await client.delete(f"/users/me/addresses/{address_id}", headers=headers)
    assert deleted.status_code == 204
