import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30
# Use valid credentials for login
VALID_EMAIL = "testuser@example.com"
VALID_PASSWORD = "StrongP@ssw0rd!"


def test_get_project_secrets_with_valid_jwt():
    try:
        # Step 1: Login to get JWT token
        login_resp = requests.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"email": VALID_EMAIL, "password": VALID_PASSWORD},
            timeout=TIMEOUT,
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("token") or login_resp.json().get("jwt") or login_resp.json().get("accessToken")
        assert token, "JWT token not found in login response"

        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: Get list of organizations
        orgs_resp = requests.get(f"{BASE_URL}/api/v1/organizations", headers=headers, timeout=TIMEOUT)
        assert orgs_resp.status_code == 200, f"Fetching organizations failed: {orgs_resp.text}"
        orgs = orgs_resp.json()
        assert isinstance(orgs, list) and len(orgs) > 0, "No organizations found for the user"
        org_id = orgs[0].get("id") or orgs[0].get("_id") or orgs[0].get("orgId")
        assert org_id, "Organization ID not found"

        # Step 3: Get projects for the first organization
        projects_resp = requests.get(
            f"{BASE_URL}/api/v1/organizations/{org_id}/projects",
            headers=headers,
            timeout=TIMEOUT,
        )
        assert projects_resp.status_code == 200, f"Fetching projects failed: {projects_resp.text}"
        projects = projects_resp.json()
        assert isinstance(projects, list) and len(projects) > 0, "No projects found in the organization"
        project_id = projects[0].get("id") or projects[0].get("_id") or projects[0].get("projectId")
        assert project_id, "Project ID not found"

        # Step 4: Get secrets metadata for the project
        secrets_resp = requests.get(
            f"{BASE_URL}/api/v1/organizations/{org_id}/projects/{project_id}/secrets",
            headers=headers,
            timeout=TIMEOUT,
        )
        assert secrets_resp.status_code == 200, f"Fetching project secrets failed: {secrets_resp.text}"
        secrets = secrets_resp.json()
        assert isinstance(secrets, list), "Secrets response is not a list"

    except requests.RequestException as e:
        assert False, f"Request exception occurred: {e}"


test_get_project_secrets_with_valid_jwt()