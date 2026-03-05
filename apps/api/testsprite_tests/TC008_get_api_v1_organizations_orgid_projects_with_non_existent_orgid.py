import requests

BASE_URL = "http://localhost:3001"
LOGIN_ENDPOINT = f"{BASE_URL}/api/v1/auth/login"
ORG_PROJECTS_ENDPOINT_TEMPLATE = f"{BASE_URL}/api/v1/organizations/{{org_id}}/projects"
TIMEOUT = 30

# Replace with valid credentials for the test user
VALID_USER_CREDENTIALS = {
    "email": "testuser@example.com",
    "password": "StrongPassword123!"
}

def test_get_projects_with_non_existent_orgid():
    # Authenticate and obtain JWT token
    try:
        login_resp = requests.post(LOGIN_ENDPOINT, json=VALID_USER_CREDENTIALS, timeout=TIMEOUT)
        login_resp.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"
    login_data = login_resp.json()
    assert "token" in login_data and isinstance(login_data["token"], str) and login_data["token"], "JWT token missing in login response"
    jwt_token = login_data["token"]

    # Use a non-existent org ID (UUID format)
    non_existent_org_id = "00000000-0000-0000-0000-000000000000"

    headers = {"Authorization": f"Bearer {jwt_token}"}

    try:
        resp = requests.get(ORG_PROJECTS_ENDPOINT_TEMPLATE.format(org_id=non_existent_org_id), headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"GET projects request failed: {e}"

    assert resp.status_code == 404, f"Expected 404 Not Found, got {resp.status_code}"

test_get_projects_with_non_existent_orgid()