---
id: T1059
title: Command and Scripting Interpreter
category: mitre
tags:
  - powershell
  - execution
  - scripting
  - interpreter
  - living-off-the-land
summary: Adversaries abuse command and script interpreters to execute malicious commands, scripts, or binaries.
authority: official
source: MITRE ATT&CK
---

# Command and Scripting Interpreter

## Overview

Adversaries may abuse command and script interpreters to execute commands, scripts, or binaries. These interfaces and languages provide ways of interacting with computer systems and are a common feature across many different platforms.

Most systems come with some built-in command-line interface and scripting capabilities. For example, macOS and Linux distributions include some flavor of Unix Shell while Windows installations include the Windows Command Shell and PowerShell.

## Sub-Techniques

| ID | Name |
|----|------|
| T1059.001 | PowerShell |
| T1059.003 | Windows Command Shell |
| T1059.005 | Visual Basic |
| T1059.006 | Python |
| T1059.007 | JavaScript |

## T1059.001 — PowerShell

PowerShell is a powerful interactive command-line interface and scripting environment included in the Windows operating system. Adversaries can use PowerShell to perform a number of actions, including discovery of information and execution of code.

### Common Indicators

- `powershell.exe` spawned from unexpected parent processes (e.g. `winword.exe`, `outlook.exe`)
- `-EncodedCommand` or `-enc` flags in command line
- `-WindowStyle Hidden` or `-NonInteractive` flags
- `Invoke-Expression` (`IEX`) or `Invoke-WebRequest` (`IWR`) calls
- Base64-encoded payloads in command arguments
- `DownloadString`, `DownloadFile`, `WebClient` usage

### Detection

Monitor PowerShell execution and command arguments. Enable PowerShell script block logging (Event ID 4104) and module logging. Alert on:

- Encoded command execution
- Network connection initiation from `powershell.exe`
- Spawning of child processes from PowerShell

### Mitigations

- **M1038** — Execution Prevention: Use application control to prevent execution of unknown or unsigned scripts.
- **M1042** — Disable or Remove Feature: Disable the WinRM service if not required.
- **M1045** — Code Signing: Enforce PowerShell execution policy to require signed scripts.

## References

- https://attack.mitre.org/techniques/T1059/
- https://docs.microsoft.com/en-us/powershell/scripting/overview
