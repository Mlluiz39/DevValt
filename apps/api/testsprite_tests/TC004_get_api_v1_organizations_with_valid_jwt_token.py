import requests

BASE_URL = "http://localhost:3001"
LOGIN_ENDPOINT = "/api/v1/auth/login"
ORGANIZATIONS_ENDPOINT = "/api/v1/organizations"
TIMEOUT = 30

def test_get_api_v1_organizations_with_valid_jwt_token():
    login_payload = {
        "email": "testuser@example.com",
        "password": "StrongPassword123!"
    }
    headers = {
        "Content-Type": "application/json"
    }

    # Authenticate the user to get a valid JWT token
    try:
        login_response = requests.post(
            url=BASE_URL + LOGIN_ENDPOINT,
            json=login_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        login_response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    data = login_response.json()
    token = data.get("token") or data.get("jwt") or data.get("accessToken")
    assert token, "JWT token not found in login response"

    auth_headers = {
        "Authorization": f"Bearer {token}"
    }

    # Call GET /api/v1/organizations with the valid JWT token
    try:
        response = requests.get(
            url=BASE_URL + ORGANIZATIONS_ENDPOINT,
            headers=auth_headers,
            timeout=TIMEOUT
        )
        response.raise_for_status()
    except requests.HTTPError as http_err:
        assert False, f"HTTP error occurred: {http_err}"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    resp_json = response.json()
    assert isinstance(resp_json, list), "Response is not an array of organizations"

    # Optionally, verify structure of organizations if possible
    # For example, if organization objects have an 'id' field
    if resp_json:
        first_org = resp_json[0]
        assert isinstance(first_org, dict), "Organization item is not an object"
        assert "id" in first_org, "Organization object missing 'id' field"

test_get_api_v1_organizations_with_valid_jwt_token()