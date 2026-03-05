import requests

BASE_URL = "http://localhost:3001"
LOGIN_ENDPOINT = "/api/v1/auth/login"
USER_ME_ENDPOINT = "/api/v1/users/me"

# Use valid credentials to obtain JWT token
VALID_USER_EMAIL = "testuser@example.com"
VALID_USER_PASSWORD = "StrongPassword123!"

def test_get_api_v1_users_me_with_valid_jwt_token():
    login_url = BASE_URL + LOGIN_ENDPOINT
    user_me_url = BASE_URL + USER_ME_ENDPOINT

    try:
        # Step 1: Authenticate to get JWT token
        login_payload = {
            "email": VALID_USER_EMAIL,
            "password": VALID_USER_PASSWORD
        }
        login_resp = requests.post(login_url, json=login_payload, timeout=30)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_json = login_resp.json()
        assert "token" in login_json, "JWT token missing in login response"
        token = login_json["token"]

        # Step 2: Use JWT token to access /api/v1/users/me
        headers = {
            "Authorization": f"Bearer {token}"
        }
        user_me_resp = requests.get(user_me_url, headers=headers, timeout=30)
        assert user_me_resp.status_code == 200, f"Expected 200 OK, got {user_me_resp.status_code}: {user_me_resp.text}"
        user_me_json = user_me_resp.json()

        # Validate user profile fields exist
        assert "id" in user_me_json, "User profile id missing"
        assert "email" in user_me_json, "User profile email missing"
        assert "organizationMemberships" in user_me_json, "User organizationMemberships missing"
        # organizationMemberships should be a list
        assert isinstance(user_me_json["organizationMemberships"], list), "organizationMemberships is not a list"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_api_v1_users_me_with_valid_jwt_token()