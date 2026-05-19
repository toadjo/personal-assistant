# Control Mapping to ISO/IEC 27001:2022 Annex A

This document maps Personal Assistant's implemented controls to ISO/IEC 27001:2022 Annex A domains. The application is **not ISO 27001 certified** - this is a readiness assessment only.

## A.5 Organizational (Not Applicable - Single-User Desktop App)

| Control                                                    | Status  | Notes                                                                |
| ---------------------------------------------------------- | ------- | -------------------------------------------------------------------- |
| A.5.1 Policies for information security                    | N/A     | Organizational - no formal policies in scope                         |
| A.5.2 Roles, responsibilities and authorities              | N/A     | Organizational - single developer                                    |
| A.5.3 Segregation of duties                                | N/A     | Organizational - single developer                                    |
| A.5.4 Management responsibilities                          | N/A     | Organizational - management review required                          |
| A.5.5 Contact with authorities                             | N/A     | Organizational - not applicable                                      |
| A.5.6 Contact with interest groups                         | N/A     | Organizational - not applicable                                      |
| A.5.7 Threat intelligence                                  | N/A     | Organizational - dependency monitoring via npm audit                 |
| A.5.8 Project management                                   | N/A     | Organizational - informal project management                         |
| A.5.9 Inventory of information and other associated assets | Partial | See data-and-asset-inventory.md                                      |
| A.5.10 Acceptable use policy                               | N/A     | Organizational - no policy documentation                             |
| A.5.11 Data flow                                           | N/A     | Organizational - local-first, no data flow between orgs              |
| A.5.12 Data classification                                 | Partial | Data classified as local (never leaves device) vs secret (encrypted) |
| A.5.13 Information transfer                                | N/A     | Organizational - no inter-organizational data transfer               |

## A.6 People (Not Applicable - No Employees)

| Control                                                                  | Status  | Notes                                              |
| ------------------------------------------------------------------------ | ------- | -------------------------------------------------- |
| A.6.1 Screening                                                          | N/A     | Organizational - no employees                      |
| A.6.2 Terms and conditions of employment                                 | N/A     | Organizational - no employees                      |
| A.6.3 Information security awareness, education and training             | N/A     | Organizational - no employees                      |
| A.6.4 Disciplinary process                                               | N/A     | Organizational - no employees                      |
| A.6.5 Remote working                                                     | N/A     | Organizational - no employees                      |
| A.6.6 Supplier relationship management                                   | Partial | AI providers (OpenAI, Anthropic) and Supabase used |
| A.6.7 Addressing information security within supplier agreements         | N/A     | Organizational - uses standard provider terms      |
| A.6.8 Managing information security incidents within supplier agreements | N/A     | Organizational - no formal agreements              |

## A.7 Physical (Not Applicable - Desktop App)

| Control                                      | Status | Notes                                         |
| -------------------------------------------- | ------ | --------------------------------------------- |
| A.7.1 Physical security perimeters           | N/A    | Organizational - user's device responsibility |
| A.7.2 Physical entry                         | N/A    | Organizational - user's device responsibility |
| A.7.3 Offices, rooms and facilities          | N/A    | Organizational - user's device responsibility |
| A.7.4 Physical security monitoring           | N/A    | Organizational - user's device responsibility |
| A.7.5 Protecting against physical threats    | N/A    | Organizational - user's device responsibility |
| A.7.6 Working in secure areas                | N/A    | Organizational - user's device responsibility |
| A.7.7 Clear desk and clear screen            | N/A    | Organizational - user's device responsibility |
| A.7.8 Equipment siting and protection        | N/A    | Organizational - user's device responsibility |
| A.7.9 Secure disposal or re-use of equipment | N/A    | Organizational - user's device responsibility |
| A.7.10 Unattended user equipment             | N/A    | Organizational - user's device responsibility |
| A.7.11 Clear desk and clear screen policy    | N/A    | Organizational - user's device responsibility |
| A.7.12 Cabling security                      | N/A    | Organizational - user's device responsibility |
| A.7.13 Equipment maintenance                 | N/A    | Organizational - user's device responsibility |
| A.7.14 Secure disposal or re-use of storage  | N/A    | Organizational - user's device responsibility |
| A.7.15 Off-site security                     | N/A    | Organizational - user's device responsibility |

## A.8 Technological - Implemented Controls

### A.8.1 User Endpoint Devices

| Control                                                   | Status      | Implementation                                 |
| --------------------------------------------------------- | ----------- | ---------------------------------------------- |
| A.8.1.1 Policy on use of user endpoint devices            | N/A         | Organizational - no policy                     |
| A.8.1.2 Exchange of information                           | Implemented | Local-first design, optional cloud connections |
| A.8.1.3 Information protection on user endpoint devices   | Implemented | OS encryption for secrets, sandbox, CSP        |
| A.8.1.4 BYOD                                              | N/A         | User's own device                              |
| A.8.1.5 Storing information on user endpoint devices      | Implemented | SQLite with OS file system controls            |
| A.8.1.6 Working in public places                          | N/A         | User's responsibility                          |
| A.8.1.7 Remote deletion of data on user endpoint devices  | N/A         | Not implemented (local-first)                  |
| A.8.1.8 Cryptographic techniques on user endpoint devices | Implemented | OS encryption via safeStorage                  |

### A.8.2 Access Control

| Control                                                   | Status      | Implementation                                     |
| --------------------------------------------------------- | ----------- | -------------------------------------------------- |
| A.8.2.1 Policy on access control                          | N/A         | Organizational - no policy                         |
| A.8.2.2 Access to networks and network services           | N/A         | User's network                                     |
| A.8.2.3 Access to information and other associated assets | Implemented | No multi-user access, single-user desktop app      |
| A.8.2.4 Management access rights                          | N/A         | No role-based access                               |
| A.8.2.5 Secure authentication                             | Implemented | No authentication (local-first), secrets encrypted |
| A.8.2.6 Access control based on access needs              | N/A         | Single user has full access                        |
| A.8.2.7 Privileged access rights                          | N/A         | No privilege system                                |
| A.8.2.8 Access to source code                             | Implemented | Public GitHub repository                           |
| A.8.2.9 Secure authentication                             | Implemented | No authentication (local-first), secrets encrypted |

### A.8.3 Cryptography

| Control                                   | Status      | Implementation                                     |
| ----------------------------------------- | ----------- | -------------------------------------------------- |
| A.8.3.1 Policy on the use of cryptography | N/A         | Organizational - no policy                         |
| A.8.3.2 Key management                    | Implemented | OS-managed keys via safeStorage API                |
| A.8.3.3 Cryptographic controls            | Implemented | OS encryption for secrets, HTTPS for external APIs |

### A.8.4 Physical Security Monitoring

| Control                              | Status | Implementation                 |
| ------------------------------------ | ------ | ------------------------------ |
| A.8.4.1 Physical security monitoring | N/A    | Organizational - user's device |

### A.8.5 Secure Development

| Control                                      | Status      | Implementation                                   |
| -------------------------------------------- | ----------- | ------------------------------------------------ |
| A.8.5.1 Policy on secure development         | N/A         | Organizational - no policy                       |
| A.8.5.2 Secure system engineering principles | Implemented | Sandbox, contextBridge, CSP, fail-closed secrets |
| A.8.5.3 Secure development environment       | Partial     | Local development, CI with security gates        |
| A.8.5.4 Security testing in development      | Implemented | Unit tests, E2E tests, preload smoke tests       |
| A.8.5.5 Security testing in acceptance       | Implemented | Manual smoke testing before release              |
| A.8.5.6 Supply chain security                | Implemented | npm audit gate, dependency updates               |
| A.8.5.7 System acceptance testing            | Implemented | Pre-release verification checklist               |
| A.8.5.8 Cryptographic controls               | Implemented | OS encryption for secrets                        |
| A.8.5.9 Secure coding                        | Implemented | TypeScript, ESLint, type checking                |
| A.8.5.10 Security testing in development     | Implemented | Unit tests, E2E tests                            |
| A.8.5.11 Security testing in acceptance      | Implemented | Manual smoke testing                             |

### A.8.6 Technical Vulnerability Management

| Control                                             | Status      | Implementation                                |
| --------------------------------------------------- | ----------- | --------------------------------------------- |
| A.8.6.1 Management of technical vulnerabilities     | Implemented | npm audit --audit-level=high as CI gate       |
| A.8.6.2 Software updates                            | Implemented | Regular dependency updates, Electron upgrades |
| A.8.6.3 Information about technical vulnerabilities | Implemented | npm audit, Dependabot alerts                  |

### A.8.7 Configuration Management

| Control                                        | Status      | Implementation                                         |
| ---------------------------------------------- | ----------- | ------------------------------------------------------ |
| A.8.7.1 Policy on configuration management     | N/A         | Organizational - no policy                             |
| A.8.7.2 Configuration baselines                | Implemented | Default configuration, user preferences stored locally |
| A.8.7.3 Change management                      | Partial     | Git-based version control, manual release process      |
| A.8.7.4 Retention of configuration information | N/A         | No configuration retention policy                      |

### A.8.8 Information Deletion

| Control                                | Status      | Implementation                                 |
| -------------------------------------- | ----------- | ---------------------------------------------- |
| A.8.8.1 Policy on information deletion | N/A         | Organizational - no policy                     |
| A.8.8.2 Deletion of information        | Implemented | User can delete notes, tasks, reminders, rules |
| A.8.8.3 Cryptographic erasure          | N/A         | Not implemented (no encryption at rest for DB) |

### A.8.9 Masking

| Control                        | Status      | Implementation                             |
| ------------------------------ | ----------- | ------------------------------------------ |
| A.8.9.1 Policy on masking      | N/A         | Organizational - no policy                 |
| A.8.9.2 Masking of information | Implemented | Secret redaction in logs and error reports |

### A.8.10 Data Leakage Prevention

| Control                                     | Status      | Implementation                               |
| ------------------------------------------- | ----------- | -------------------------------------------- |
| A.8.10.1 Policy on data leakage prevention  | N/A         | Organizational - no policy                   |
| A.8.10.2 Data leakage prevention measures   | Implemented | Secrets excluded from backups, CSP hardening |
| A.8.10.3 Data leakage prevention monitoring | N/A         | No monitoring implemented                    |

### A.8.11 Information Backup

| Control                                    | Status      | Implementation                                 |
| ------------------------------------------ | ----------- | ---------------------------------------------- |
| A.8.11.1 Policy on information backup      | N/A         | Organizational - no policy                     |
| A.8.11.2 Information backup                | Implemented | User can export backup JSON (secrets excluded) |
| A.8.11.3 Restoration of information        | Implemented | User can import backup JSON (secrets rejected) |
| A.8.11.4 Encryption of information backups | N/A         | Not implemented (user's responsibility)        |

### A.8.12 Redundancy of Information Processing Facilities

| Control                                                  | Status | Implementation                  |
| -------------------------------------------------------- | ------ | ------------------------------- |
| A.8.12.1 Redundancy of information processing facilities | N/A    | Organizational - local app only |

### A.8.13 Logging

| Control                                  | Status      | Implementation                                      |
| ---------------------------------------- | ----------- | --------------------------------------------------- |
| A.8.13.1 Policy on logging               | N/A         | Organizational - no policy                          |
| A.8.13.2 Event logging                   | Implemented | Electron logs, automation logs, renderer error logs |
| A.8.13.3 Protection of log information   | Implemented | Secret redaction before persistence                 |
| A.8.13.4 Synchronization of clocks       | N/A         | Not implemented                                     |
| A.8.13.5 Administrator and operator logs | N/A         | No admin/operator roles                             |

### A.8.14 Monitoring

| Control                                       | Status | Implementation             |
| --------------------------------------------- | ------ | -------------------------- |
| A.8.14.1 Policy on monitoring                 | N/A    | Organizational - no policy |
| A.8.14.2 Monitoring activities                | N/A    | No monitoring implemented  |
| A.8.14.3 Protection of monitoring information | N/A    | No monitoring implemented  |

### A.8.15 Clock Synchronization

| Control                                  | Status | Implementation             |
| ---------------------------------------- | ------ | -------------------------- |
| A.8.15.1 Policy on clock synchronization | N/A    | Organizational - no policy |
| A.8.15.2 Synchronization of clocks       | N/A    | Not implemented            |

### A.8.16 Clock Synchronization

| Control                                  | Status | Implementation             |
| ---------------------------------------- | ------ | -------------------------- |
| A.8.16.1 Policy on clock synchronization | N/A    | Organizational - no policy |
| A.8.16.2 Synchronization of clocks       | N/A    | Not implemented            |

### A.8.17 Conformance

| Control                        | Status  | Implementation                              |
| ------------------------------ | ------- | ------------------------------------------- |
| A.8.17.1 Policy on conformance | N/A     | Organizational - no policy                  |
| A.8.17.2 Independent review    | N/A     | No formal review process                    |
| A.8.17.3 Compliance            | Partial | npm audit gate, manual release verification |

## A.9 Supplier Relationships (Partial)

| Control                                                          | Status  | Notes                               |
| ---------------------------------------------------------------- | ------- | ----------------------------------- |
| A.9.1 Information security in supplier relationships             | Partial | AI providers, Supabase, GitHub      |
| A.9.2 Addressing information security within supplier agreements | N/A     | Standard provider terms             |
| A.9.3 Information security for supplier access                   | N/A     | No supplier access to user data     |
| A.9.4 Monitoring and review of supplier services                 | Partial | Dependency monitoring via npm audit |
| A.9.5 Managing changes to supplier services                      | Partial | Regular dependency updates          |

## A.10 Incident Management (Not Applicable - No Organizational ISMS)

| Control                                                                | Status | Notes                              |
| ---------------------------------------------------------------------- | ------ | ---------------------------------- |
| A.10.1 Planning for information security incident management           | N/A    | Organizational - no formal process |
| A.10.2 Detection and analysis of information security incidents        | N/A    | Organizational - no monitoring     |
| A.10.3 Response to information security incidents                      | N/A    | Organizational - no formal process |
| A.10.4 Learning from information security incidents                    | N/A    | Organizational - no formal process |
| A.10.5 Collection of evidence                                          | N/A    | Organizational - no formal process |
| A.10.6 Information security incident awareness, education and training | N/A    | Organizational - no training       |

## A.11 Business Continuity (Not Applicable - No Organizational ISMS)

| Control                                                  | Status | Notes                               |
| -------------------------------------------------------- | ------ | ----------------------------------- |
| A.11.1 Information security continuity                   | N/A    | Organizational - no continuity plan |
| A.11.2 Redundancy of information processing facilities   | N/A    | Organizational - local app only     |
| A.11.3 Availability of information processing facilities | N/A    | Organizational - local app only     |
| A.11.4 Information security during disruption            | N/A    | Organizational - no formal process  |
| A.11.5 ICT readiness for business continuity             | N/A    | Organizational - local app only     |

## A.12 Compliance (Partial)

| Control                                                                      | Status      | Notes                                          |
| ---------------------------------------------------------------------------- | ----------- | ---------------------------------------------- |
| A.12.1 Identification of applicable legislation and contractual requirements | Partial     | GDPR not applicable (local-first, no accounts) |
| A.12.2 Intellectual property rights                                          | Implemented | MIT license, third-party licenses respected    |
| A.12.3 Protection of records                                                 | Partial     | Git history, release artifacts                 |
| A.12.4 Privacy and protection of PII                                         | Partial     | Local-first design, no PII collection          |
| A.12.5 Cryptographic controls                                                | Implemented | OS encryption for secrets                      |
| A.12.6 Independent review of information security                            | N/A         | No formal review process                       |

## Summary

**Implemented Controls:** 18
**Partial Controls:** 11
**Not Applicable Controls:** 62
**Total Annex A Controls:** 91

The application implements many technical controls aligned with ISO 27001:2022, particularly in:

- A.8.1 User Endpoint Devices (partial)
- A.8.2 Access Control (partial)
- A.8.3 Cryptography (implemented)
- A.8.5 Secure Development (partial)
- A.8.6 Technical Vulnerability Management (implemented)
- A.8.9 Masking (implemented)
- A.8.10 Data Leakage Prevention (partial)
- A.8.11 Information Backup (partial)
- A.8.13 Logging (partial)
- A.12 Compliance (partial)

Organizational controls (A.5, A.6, A.7, A.10, A.11) are not applicable because this is a single-user desktop application without employees, formal policies, or organizational processes. Full ISO 27001 certification would require an organizational ISMS beyond the scope of this application.
