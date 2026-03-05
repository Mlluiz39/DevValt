import requests
import uuid

BASE_URL = "http://localhost:3001"
REGISTER_ENDPOINT = "/api/v1/auth/register"
TIMEOUT = 30

def test_post_api_v1_auth_register_with_valid_email_and_password():
    url = BASE_URL + REGISTER_ENDPOINT
    # Generate unique email to avoid conflicts
    unique_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": unique_email,
        "password": "Str0ngP@ssw0rd!"
    }
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to register endpoint failed: {e}"

    # Assert HTTP status 201 Created
    assert response.status_code == 201, f"Expected status code 201 but got {response.status_code}"

    try:
        response_data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Assert response contains user id (assuming key 'id' is used for user id)
    assert "id" in response_data, "Response JSON does not contain 'id' field"
    assert isinstance(response_data["id"], (str, int)), "'id' should be a string or integer"

test_post_api_v1_auth_register_with_valid_email_and_password()
