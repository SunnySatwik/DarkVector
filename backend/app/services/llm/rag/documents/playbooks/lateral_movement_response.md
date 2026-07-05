---
id: playbook-lateral-movement
title: Lateral Movement Response Playbook
category: playbooks
tags:
  - lateral-movement
  - credential-dumping
  - smb
  - pass-the-hash
  - containment
  - response
summary: Step-by-step SOC response playbook for detected lateral movement activity.
authority: internal
source: DarkVector SOC Playbooks
---

# Lateral Movement Response Playbook

## Scope

This playbook applies when any of the following MITRE techniques are detected:

- **T1021** — Remote Services (SMB, RDP, WinRM)
- **T1550** — Use Alternate Authentication Material (Pass-the-Hash, Pass-the-Ticket)
- **T1075** — Pass the Hash
- **T1076** — Remote Desktop Protocol

## Severity Tiers

| Condition | Severity |
|-----------|----------|
| Single internal hop detected | MEDIUM |
| Hop chain spanning 3+ hosts | HIGH |
| Domain controller reached | CRITICAL |
| Credential dump evidence | CRITICAL |

## Phase 1 — Identification (0–15 min)

1. Confirm the alert source host and destination host.
2. Pull the last 24h of authentication logs for both hosts (Event IDs 4624, 4625, 4648, 4776).
3. Identify the account(s) used. Check if the account is a service account, privileged account, or standard user.
4. Determine whether the authentication method was NTLM, Kerberos, or certificate-based.
5. Check for concurrent alerts involving the same account.

## Phase 2 — Containment (15–45 min)

1. **Isolate** the source host at the network layer (VLAN quarantine or firewall rule).
2. **Disable** the compromised credential in Active Directory immediately.
3. **Block** the destination host from outbound connections if Domain Controller access was detected.
4. **Reset** krbtgt account password (twice) if Kerberos tickets were potentially stolen (Golden Ticket risk).
5. Notify senior analyst and CISO if hop chain reaches Domain Controller.

## Phase 3 — Investigation (45–120 min)

1. Pull full process tree from the source host around the time of the alert.
2. Identify the parent process that initiated the lateral movement tool (e.g. `psexec.exe`, `wmic.exe`, `mstsc.exe`).
3. Review prefetch files and Shimcache for lateral movement tooling.
4. Check `C:\Windows\Temp` and user profile directories for dropped binaries.
5. Search SIEM for the compromised account across all hosts in the last 7 days.

## Phase 4 — Eradication

1. Remove all persistence mechanisms identified (scheduled tasks, registry run keys, services).
2. Re-image source host if malware was confirmed.
3. Force password reset for all accounts on the hop chain.
4. Audit privileged group memberships; revoke unnecessary permissions.

## Phase 5 — Recovery and Lessons Learned

1. Re-enable isolated hosts after clean bill of health.
2. Document the full attack path in the investigation report.
3. Submit IOCs (hashes, IP addresses, account names) to threat intelligence platform.
4. Update detection rules to catch the specific technique variant used.

## References

- https://attack.mitre.org/tactics/TA0008/
- https://www.microsoft.com/en-us/security/blog/2022/01/25/microsoft-research-on-lateral-movement/
