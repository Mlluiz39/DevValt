import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

# Credentials of a user with ADMIN or OWNER role
ADMIN_OWNER_CREDENTIALS = {
    "email": "admin@example.com",
    "password": "StrongAdminPass123!"
}

def test_get_organization_audit_with_admin_or_owner_role():
    # 1. Login as admin/owner user to obtain JWT token
    login_url = f"{BASE_URL}/api/v1/auth/login"
    try:
        login_resp = requests.post(login_url, json=ADMIN_OWNER_CREDENTIALS, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        assert token, "No token returned on login"
    except Exception as e:
        raise AssertionError(f"Failed to login for test: {e}")

    headers = {
        "Authorization": f"Bearer {token}"
    }

    org_id = None
    created_org_id = None

    try:
        # 2. Get organizations for user to find an org where user has ADMIN or OWNER role
        orgs_url = f"{BASE_URL}/api/v1/organizations"
        orgs_resp = requests.get(orgs_url, headers=headers, timeout=TIMEOUT)
        assert orgs_resp.status_code == 200, f"Failed to list organizations: {orgs_resp.text}"
        organizations = orgs_resp.json()
        assert isinstance(organizations, list), "Organizations response is not a list"

        # Find an org where user is ADMIN or OWNER based on audit permission assumption
        # If no org exists, create one to test against
        for org in organizations:
            if isinstance(org, dict) and "id" in org:
                org_id = org["id"]
                break

        if not org_id:
            # Create organization as fallback (to ensure we have orgId)
            create_org_url = f"{BASE_URL}/api/v1/organizations"
            new_org_payload = {
                "name": "Test Organization for Audit Logs"
            }
            create_resp = requests.post(create_org_url, headers=headers, json=new_org_payload, timeout=TIMEOUT)
            assert create_resp.status_code == 201, f"Failed to create organization: {create_resp.text}"
            created_org_id = create_resp.json().get("id")
            assert created_org_id, "Created organization ID missing"
            org_id = created_org_id

        # 3. Call the GET audit endpoint with orgId
        audit_url = f"{BASE_URL}/api/v1/organizations/{org_id}/audit"
        audit_resp = requests.get(audit_url, headers=headers, timeout=TIMEOUT)
        assert audit_resp.status_code == 200, f"Audit log retrieval failed: {audit_resp.text}"

        audit_data = audit_resp.json()
        # Validate pagination structure presence (typical keys: items, total, page, pageSize)
        assert isinstance(audit_data, dict), "Audit response should be a dictionary"
        assert "items" in audit_data and isinstance(audit_data["items"], list), "Audit items missing or not a list"
        assert "total" in audit_data, "Audit total count missing"
        assert "page" in audit_data, "Audit page info missing"
        assert "pageSize" in audit_data, "Audit pageSize info missing"

    finally:
        # Cleanup if organization was created by this test
        if created_org_id:
            delete_org_url = f"{BASE_URL}/api/v1/organizations/{created_org_id}"
            try:
                del_resp = requests.delete(delete_org_url, headers=headers, timeout=TIMEOUT)
                # Deletion may return 204 No Content on success
                assert del_resp.status_code in (204, 200), f"Failed to delete created organization: {del_resp.text}"
            except Exception:
                pass

test_get_organization_audit_with_admin_or_owner_role()
