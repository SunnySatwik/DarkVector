---
id: owasp-a01-broken-access
title: OWASP A01:2021 — Broken Access Control
category: owasp
tags:
  - access-control
  - authorization
  - privilege-escalation
  - idor
  - web-security
  - owasp-top-10
summary: Broken Access Control is the top web application security risk; it allows attackers to act outside their intended permissions.
authority: official
source: OWASP Top 10 2021
---

# OWASP A01:2021 — Broken Access Control

## Overview

Access control enforces policy such that users cannot act outside their intended permissions. Failures typically lead to unauthorized information disclosure, modification, or destruction of all data or performing a business function outside the user's limits.

Broken Access Control moved up from the fifth position to become the most serious web application security risk in 2021, with 94% of applications tested having some form of broken access control.

## Common Weakness Enumerations (CWEs)

- **CWE-200** — Exposure of Sensitive Information to an Unauthorized Actor
- **CWE-201** — Insertion of Sensitive Information Into Sent Data
- **CWE-352** — Cross-Site Request Forgery (CSRF)

## Attack Scenarios

### Scenario 1 — Insecure Direct Object References (IDOR)

The application uses unverified data in a SQL call that is accessing account information:

```sql
pstmt.setString(1, request.getParameter("acct"));
ResultSet results = pstmt.executeQuery();
```

An attacker simply modifies the `acct` parameter in the browser to send whatever account number they want. If not properly verified, the attacker can access any user's account.

### Scenario 2 — Forced Browsing

An attacker forces the browser to target URLs that require authentication:

```
https://example.com/app/getappInfo
https://example.com/app/admin_getappInfo
```

If an unauthenticated user can access the admin page, this is a flaw.

### Scenario 3 — API Parameter Tampering

```http
POST /api/user/profile
{
  "userId": "12345",
  "role": "admin"   ← attacker injects this
}
```

If the server accepts and applies this without server-side role validation, privilege escalation occurs.

## Prevention

Access control is only effective when enforced in trusted server-side code or server-less API.

1. **Deny by default** — Except for public resources, deny access by default.
2. **Centralize access control** — Implement access control mechanisms once and re-use them throughout the application.
3. **Model access controls** — Enforce record ownership; don't accept that a user can create, read, update, or delete any record.
4. **Disable directory listing** — Ensure file metadata (backups) are not present within web roots.
5. **Log access failures** — Log access control failures and alert admins when appropriate.
6. **Rate limit API access** — Rate limit API and controller access to minimize the harm from automated attack tooling.
7. **Invalidate JWT tokens** — Stateful session identifiers should be invalidated on the server after logout.

## Detection Indicators

- Repeated 403 errors followed by successful 200 responses on the same resource
- Requests containing modified object IDs (`userId`, `orderId`, `accountId`)
- Privilege escalation patterns in audit logs
- Requests from non-admin accounts accessing `/admin/` paths

## Mapping to MITRE ATT&CK

| OWASP Pattern | MITRE Technique |
|---------------|-----------------|
| IDOR | T1078 Valid Accounts |
| Forced Browsing | T1190 Exploit Public-Facing Application |
| Parameter Tampering | T1548 Abuse Elevation Control Mechanism |

## References

- https://owasp.org/Top10/A01_2021-Broken_Access_Control/
- https://cwe.mitre.org/data/definitions/200.html
