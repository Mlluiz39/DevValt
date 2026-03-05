import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30
USER_EMAIL = "testuser@example.com"
USER_PASSWORD = "StrongPassw0rd!"
HEADERS = {"Content-Type": "application/json"}


def test_get_projects_with_valid_membership():
    session = requests.Session()
    try:
        # Register user first (ignore if already exists)
        reg_resp = session.post(
            f"{BASE_URL}/api/v1/auth/register",
            json={"email": USER_EMAIL, "password": USER_PASSWORD},
            timeout=TIMEOUT,
            headers=HEADERS,
        )
        # We do not assert registration to avoid failure if user exists

        # Login to get JWT token
        login_resp = session.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"email": USER_EMAIL, "password": USER_PASSWORD},
            timeout=TIMEOUT,
            headers=HEADERS,
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        assert token, "JWT token not found in login response"

        auth_headers = {"Authorization": f"Bearer {token}"}

        # Get current user's profile to get memberships and orgId
        user_resp = session.get(
            f"{BASE_URL}/api/v1/users/me", headers=auth_headers, timeout=TIMEOUT
        )
        assert user_resp.status_code == 200, f"Get user profile failed: {user_resp.text}"
        user_data = user_resp.json()
        memberships = user_data.get("memberships") or user_data.get("organizations") or []
        assert memberships, "User has no organization memberships"

        # Use first orgId where user is a member
        org_id = memberships[0].get("orgId") or memberships[0].get("id") or memberships[0]
        assert org_id, "orgId not found in memberships"

        # Call GET /api/v1/organizations/:orgId/projects
        projects_resp = session.get(
            f"{BASE_URL}/api/v1/organizations/{org_id}/projects",
            headers=auth_headers,
            timeout=TIMEOUT,
        )
        assert projects_resp.status_code == 200, f"Get projects failed: {projects_resp.text}"

        projects = projects_resp.json()
        assert isinstance(projects, list), "Projects response is not a list"

    finally:
        session.close()


test_get_projects_with_valid_membership()