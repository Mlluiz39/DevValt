import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_post_api_v1_organizations_with_valid_payload():
    login_url = f"{BASE_URL}/api/v1/auth/login"
    org_url = f"{BASE_URL}/api/v1/organizations"
    # Valid user credentials (should exist in the system for the test to succeed)
    credentials = {
        "email": "testuser@example.com",
        "password": "StrongPassword123!"
    }
    # Organization payload as per API expectations (minimal valid payload)
    org_payload = {
        "name": "Test Organization from TC005"
    }
    token = None
    created_org_id = None

    try:
        # Authenticate to get JWT token
        response = requests.post(login_url, json=credentials, timeout=TIMEOUT)
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json().get("token")
        assert token is not None, "JWT token not found in login response"

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Create organization with valid payload
        resp = requests.post(org_url, json=org_payload, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Expected 201 Created, got {resp.status_code}: {resp.text}"
        resp_json = resp.json()
        created_org_id = resp_json.get("id")
        assert created_org_id is not None, "Organization ID not returned in response"

    finally:
        # Cleanup: delete the organization if created
        if token and created_org_id:
            del_url = f"{org_url}/{created_org_id}"
            try:
                requests.delete(del_url, headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)
            except Exception:
                pass

test_post_api_v1_organizations_with_valid_payload()