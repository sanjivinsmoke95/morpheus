from tests.conftest import API, login


def test_login_success_and_me(client):
    h = login(client, "officer@example.com")
    me = client.get(f"{API}/auth/me", headers=h).json()
    assert me["email"] == "officer@example.com"
    assert me["role"] == "OFFICER"


def test_login_wrong_password(client):
    r = client.post(f"{API}/auth/login", json={"email": "officer@example.com", "password": "nope"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHORIZED"  # typed error envelope


def test_me_requires_token(client):
    assert client.get(f"{API}/auth/me").status_code in (401, 403)


def test_admin_can_create_user_officer_cannot(client):
    admin = login(client, "admin@example.com")
    r = client.post(f"{API}/auth/users", headers=admin, json={
        "email": "new@example.com", "password": "password123", "full_name": "New", "role": "REVIEWER"})
    assert r.status_code == 201
    assert r.json()["role"] == "REVIEWER"

    officer = login(client, "officer@example.com")
    r2 = client.post(f"{API}/auth/users", headers=officer, json={
        "email": "x@example.com", "password": "password123", "role": "OFFICER"})
    assert r2.status_code == 403
    assert r2.json()["error"]["code"] == "FORBIDDEN"


def test_duplicate_user_conflict(client):
    admin = login(client, "admin@example.com")
    body = {"email": "dup@example.com", "password": "password123", "role": "OFFICER"}
    assert client.post(f"{API}/auth/users", headers=admin, json=body).status_code == 201
    assert client.post(f"{API}/auth/users", headers=admin, json=body).status_code == 409


def test_validation_error_envelope(client):
    r = client.post(f"{API}/auth/login", json={"email": "not-an-email"})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"
