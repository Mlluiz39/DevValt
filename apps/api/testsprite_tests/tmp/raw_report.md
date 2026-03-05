
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** api
- **Date:** 2026-03-05
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 post api v1 auth login with valid credentials
- **Test Code:** [TC001_post_api_v1_auth_login_with_valid_credentials.py](./TC001_post_api_v1_auth_login_with_valid_credentials.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 27, in <module>
  File "<string>", line 21, in test_post_api_v1_auth_login_with_valid_credentials
AssertionError: Expected status code 200, got 401

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/05db17cc-0d90-46f0-b731-712742ef9486/51528e95-c210-4fa2-b800-e8775093ca93
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 post api v1 auth register with valid email and password
- **Test Code:** [TC002_post_api_v1_auth_register_with_valid_email_and_password.py](./TC002_post_api_v1_auth_register_with_valid_email_and_password.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 37, in <module>
  File "<string>", line 26, in test_post_api_v1_auth_register_with_valid_email_and_password
AssertionError: Expected status code 201 but got 429

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/05db17cc-0d90-46f0-b731-712742ef9486/e6e25169-55a6-41a0-83ef-451aa3721992
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 get api v1 users me with valid jwt token
- **Test Code:** [TC003_get_api_v1_users_me_with_valid_jwt_token.py](./TC003_get_api_v1_users_me_with_valid_jwt_token.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 45, in <module>
  File "<string>", line 22, in test_get_api_v1_users_me_with_valid_jwt_token
AssertionError: Login failed: {"success":false,"error":{"message":"Invalid email or password","code":"INVALID_CREDENTIALS","stack":"AppError: Invalid email or password\n    at Function.unauthorized (/home/mlluiz/Development/gitHub/DevValt/apps/api/src/common/errors/app.error.ts:25:12)\n    at AuthService.login (/home/mlluiz/Development/gitHub/DevValt/apps/api/src/modules/auth/auth.service.ts:170:22)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at AuthController.login (/home/mlluiz/Development/gitHub/DevValt/apps/api/src/modules/auth/auth.controller.ts:64:22)"}}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/05db17cc-0d90-46f0-b731-712742ef9486/0e8948fc-776c-459f-99d7-74f5bde846aa
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 get api v1 organizations with valid jwt token
- **Test Code:** [TC004_get_api_v1_organizations_with_valid_jwt_token.py](./TC004_get_api_v1_organizations_with_valid_jwt_token.py)
- **Test Error:** Traceback (most recent call last):
  File "<string>", line 25, in test_get_api_v1_organizations_with_valid_jwt_token
  File "/var/task/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 401 Client Error: Unauthorized for url: http://localhost:3001/api/v1/auth/login

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 62, in <module>
  File "<string>", line 27, in test_get_api_v1_organizations_with_valid_jwt_token
AssertionError: Login request failed: 401 Client Error: Unauthorized for url: http://localhost:3001/api/v1/auth/login

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/05db17cc-0d90-46f0-b731-712742ef9486/c5571667-0430-4e2a-8140-b2bf52f3101a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 post api v1 organizations with valid payload
- **Test Code:** [TC005_post_api_v1_organizations_with_valid_payload.py](./TC005_post_api_v1_organizations_with_valid_payload.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 49, in <module>
  File "<string>", line 24, in test_post_api_v1_organizations_with_valid_payload
AssertionError: Login failed: {"success":false,"error":{"message":"Invalid email or password","code":"INVALID_CREDENTIALS","stack":"AppError: Invalid email or password\n    at Function.unauthorized (/home/mlluiz/Development/gitHub/DevValt/apps/api/src/common/errors/app.error.ts:25:12)\n    at AuthService.login (/home/mlluiz/Development/gitHub/DevValt/apps/api/src/modules/auth/auth.service.ts:170:22)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at AuthController.login (/home/mlluiz/Development/gitHub/DevValt/apps/api/src/modules/auth/auth.controller.ts:64:22)"}}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/05db17cc-0d90-46f0-b731-712742ef9486/cb649f7c-6c2f-4841-af6a-723087e3826d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 get api v1 organizations orgid projects with valid membership
- **Test Code:** [TC006_get_api_v1_organizations_orgid_projects_with_valid_membership.py](./TC006_get_api_v1_organizations_orgid_projects_with_valid_membership.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 63, in <module>
  File "<string>", line 29, in test_get_projects_with_valid_membership
AssertionError: Login failed: {"success":false,"error":"Too many authentication attempts. Account temporarily restricted.","retryAfter":900}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/05db17cc-0d90-46f0-b731-712742ef9486/c55717ba-f2f2-4d2b-ba65-e8f1e3e715b2
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 get api v1 organizations orgid projects with non member user
- **Test Code:** [TC007_get_api_v1_organizations_orgid_projects_with_non_member_user.py](./TC007_get_api_v1_organizations_orgid_projects_with_non_member_user.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 83, in <module>
  File "<string>", line 19, in test_get_org_projects_with_non_member_user
AssertionError: Login failed: {"success":false,"error":{"message":"Invalid email or password","code":"INVALID_CREDENTIALS","stack":"AppError: Invalid email or password\n    at Function.unauthorized (/home/mlluiz/Development/gitHub/DevValt/apps/api/src/common/errors/app.error.ts:25:12)\n    at AuthService.login (/home/mlluiz/Development/gitHub/DevValt/apps/api/src/modules/auth/auth.service.ts:170:22)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at AuthController.login (/home/mlluiz/Development/gitHub/DevValt/apps/api/src/modules/auth/auth.controller.ts:64:22)"}}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/05db17cc-0d90-46f0-b731-712742ef9486/b30760a0-7351-496e-b599-b7629ad0a3a9
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 get api v1 organizations orgid projects with non existent orgid
- **Test Code:** [TC008_get_api_v1_organizations_orgid_projects_with_non_existent_orgid.py](./TC008_get_api_v1_organizations_orgid_projects_with_non_existent_orgid.py)
- **Test Error:** Traceback (most recent call last):
  File "<string>", line 18, in test_get_projects_with_non_existent_orgid
  File "/var/task/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 401 Client Error: Unauthorized for url: http://localhost:3001/api/v1/auth/login

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 37, in <module>
  File "<string>", line 20, in test_get_projects_with_non_existent_orgid
AssertionError: Login request failed: 401 Client Error: Unauthorized for url: http://localhost:3001/api/v1/auth/login

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/05db17cc-0d90-46f0-b731-712742ef9486/86e41b3e-afd5-42c6-83c6-9708b0bfc23b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 get api v1 organizations orgid projects projectid secrets with valid jwt token
- **Test Code:** [TC009_get_api_v1_organizations_orgid_projects_projectid_secrets_with_valid_jwt_token.py](./TC009_get_api_v1_organizations_orgid_projects_projectid_secrets_with_valid_jwt_token.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 58, in <module>
  File "<string>", line 18, in test_get_project_secrets_with_valid_jwt
AssertionError: Login failed: {"success":false,"error":{"message":"Account locked due to too many failed attempts. Try again in 30 minutes.","code":"ACCOUNT_LOCKED","stack":"AppError: Account locked due to too many failed attempts. Try again in 30 minutes.\n    at AuthService.login (/home/mlluiz/Development/gitHub/DevValt/apps/api/src/modules/auth/auth.service.ts:133:13)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at AuthController.login (/home/mlluiz/Development/gitHub/DevValt/apps/api/src/modules/auth/auth.controller.ts:64:22)"}}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/05db17cc-0d90-46f0-b731-712742ef9486/12823061-236f-4b6e-a69b-99ce3fd9f530
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 get api v1 organizations orgid audit with admin or owner role
- **Test Code:** [TC010_get_api_v1_organizations_orgid_audit_with_admin_or_owner_role.py](./TC010_get_api_v1_organizations_orgid_audit_with_admin_or_owner_role.py)
- **Test Error:** Traceback (most recent call last):
  File "<string>", line 17, in test_get_organization_audit_with_admin_or_owner_role
AssertionError: Login failed: {"success":false,"error":"Too many authentication attempts. Account temporarily restricted.","retryAfter":900}

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 81, in <module>
  File "<string>", line 21, in test_get_organization_audit_with_admin_or_owner_role
AssertionError: Failed to login for test: Login failed: {"success":false,"error":"Too many authentication attempts. Account temporarily restricted.","retryAfter":900}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/05db17cc-0d90-46f0-b731-712742ef9486/f5291320-6b98-4d7b-bda7-3a84af7ace21
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **0.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---