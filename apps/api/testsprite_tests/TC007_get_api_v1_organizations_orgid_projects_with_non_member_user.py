import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_get_org_projects_with_non_member_user():
    # Credentials for a user NOT member of the target org
    non_member_user_credentials = {
        "email": "nonmember@example.com",
        "password": "StrongPass!234"
    }

    # Login the non-member user to get JWT token
    login_resp = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        json=non_member_user_credentials,
        timeout=TIMEOUT
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json().get("token")
    assert token, "JWT token not found in login response"

    headers = {
        "Authorization": f"Bearer {token}"
    }

    # Get organizations for non-member user to identify orgs they belong to (should be empty or unrelated)
    orgs_resp = requests.get(f"{BASE_URL}/api/v1/organizations", headers=headers, timeout=TIMEOUT)
    assert orgs_resp.status_code == 200, f"Failed to list organizations: {orgs_resp.text}"
    orgs = orgs_resp.json()
    # For the test, we need an orgId where the user is not a member.
    # If user belongs to no orgs, create an org with another user and use that orgId.
    # Here we assume that this user belongs to no organizations, so pick an orgId that is known or created by another user.

    # To ensure a valid orgId existing but inaccessible to this user, login as another user and create an org
    admin_credentials = {
        "email": "admin@example.com",
        "password": "AdminPass!234"
    }
    admin_login_resp = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        json=admin_credentials,
        timeout=TIMEOUT
    )
    assert admin_login_resp.status_code == 200, f"Admin login failed: {admin_login_resp.text}"
    admin_token = admin_login_resp.json().get("token")
    assert admin_token, "Admin JWT token not found"

    admin_headers = {
        "Authorization": f"Bearer {admin_token}"
    }

    new_org_payload = {
        "name": "NonMemberTestOrg"
    }

    create_org_resp = requests.post(
        f"{BASE_URL}/api/v1/organizations",
        headers=admin_headers,
        json=new_org_payload,
        timeout=TIMEOUT
    )
    assert create_org_resp.status_code == 201, f"Failed to create organization: {create_org_resp.text}"
    org_id = create_org_resp.json().get("id")
    assert org_id, "Organization ID not returned after creation"

    try:
        # Now attempt to get projects for the org with non-member user token, expect 403 Forbidden
        projects_resp = requests.get(
            f"{BASE_URL}/api/v1/organizations/{org_id}/projects",
            headers=headers,
            timeout=TIMEOUT
        )
        assert projects_resp.status_code == 403, f"Expected 403 Forbidden, got {projects_resp.status_code}: {projects_resp.text}"
    finally:
        # Cleanup: delete the organization created by admin user
        requests.delete(
            f"{BASE_URL}/api/v1/organizations/{org_id}",
            headers=admin_headers,
            timeout=TIMEOUT
        )

test_get_org_projects_with_non_member_user()