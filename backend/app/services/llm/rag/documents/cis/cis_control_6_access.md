---
id: cis-control-6
title: CIS Control 6 — Access Control Management
category: cis
tags:
  - access-control
  - least-privilege
  - mfa
  - credentials
  - identity
  - iam
summary: CIS Control 6 defines best practices for managing access to assets and services using formal processes.
authority: official
source: CIS Controls v8
---

# CIS Control 6 — Access Control Management

## Overview

Use processes and tools to create, assign, manage, and revoke access credentials and privileges for user, administrator, and service accounts for enterprise assets and software.

## Why This Control Matters

Access control failures are consistently among the top root causes of data breaches. Overprivileged accounts, stale credentials, and absent multi-factor authentication significantly increase the blast radius of any successful intrusion.

## Safeguards

### 6.1 — Establish an Access Granting Process

Establish and follow a process, preferably automated, for granting access to enterprise assets upon new hire, rights grant, or role change of a user.

**Implementation:**
- Integrate access provisioning with HR onboarding workflows.
- Require manager approval for privileged access requests.
- Log all access grants with justification.

### 6.2 — Establish an Access Revoking Process

Establish and follow a process, preferably automated, for revoking access to enterprise assets, through disabling accounts immediately upon termination, rights revocation, or role change of a user.

**Implementation:**
- Trigger automatic account disable within 4 hours of HR termination record.
- Audit stale accounts (>90 days inactive) monthly.

### 6.3 — Require MFA for Externally-Exposed Applications

Require all externally-exposed enterprise or third-party applications to enforce MFA, where supported.

**Implementation:**
- Enforce MFA on all SSO-integrated applications.
- Enforce MFA on all remote access portals (VPN, Citrix, Jump Hosts).
- Alert on any MFA bypass or downgrade attempt.

### 6.4 — Require MFA for Remote Network Access

Require MFA for remote network access.

### 6.5 — Require MFA for Administrative Access

Require MFA for all administrative access, including but not limited to network infrastructure, operating systems, hypervisors, and cloud administration.

### 6.6 — Establish and Maintain an Inventory of Authentication and Authorization Systems

Maintain an inventory of authentication and authorization systems, including those hosted on-site or at a remote service provider.

### 6.7 — Centralize Access Control

Centralize access control for all enterprise assets through a directory service or SSO provider, where supported.

**Implementation:**
- Enforce all authentication through Active Directory or Azure AD.
- Eliminate local accounts wherever possible.
- Use Privileged Access Workstations (PAWs) for administrative tasks.

### 6.8 — Define and Maintain Role-Based Access Control

Define and maintain role-based access control (RBAC), through determining and documenting the access rights necessary for each role within the enterprise to successfully carry out its assigned duties.

## Mapping to MITRE ATT&CK

| CIS Safeguard | Mitigates |
|---------------|-----------|
| 6.3 MFA | T1078 Valid Accounts |
| 6.4 Remote MFA | T1133 External Remote Services |
| 6.5 Admin MFA | T1078.002 Domain Accounts |
| 6.2 Revocation | T1078.004 Cloud Accounts |

## References

- https://www.cisecurity.org/controls/access-control-management
- https://attack.mitre.org/mitigations/M1032/
