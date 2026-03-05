import requests

def test_post_api_v1_auth_login_with_valid_credentials():
    base_url = "http://localhost:3001"
    url = f"{base_url}/api/v1/auth/login"
    headers = {
        "Content-Type": "application/json"
    }

    # Provide valid credentials (these should match a valid user in test environment)
    payload = {
        "email": "validuser@example.com",
        "password": "ValidPassword123!"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
    json_response = response.json()
    # The response should contain a JWT token
    assert "token" in json_response, "Response JSON does not contain 'token'"
    assert isinstance(json_response["token"], str) and len(json_response["token"]) > 0, "Token is empty or not a string"

test_post_api_v1_auth_login_with_valid_credentials()