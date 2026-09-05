# PostHog Self-driving setup report

## Summary

PostHog Self-driving is configured for Polaris. Session Replay was already enabled; Error Tracking and Support were enabled, and health, error, support, GitHub Issues, and built-in scout findings now have routes into the inbox.

Fresh scout configurations and the two Replay Vision monitors will begin producing findings as relevant data arrives, usually within about 30 minutes: https://us.posthog.com/project/594134/inbox

## AI data processing

Approved by the wizard before setup.

## GitHub

| Item | Status |
| --- | --- |
| GitHub App | Already connected |
| Repository | `manojharpalani/polaris` |
| GitHub Issues warehouse source | Connected by this setup — source `01a06e3d-f719-0000-1916-ed5042f5d74b`; first sync started |
| Synced table | `issues` only; additional GitHub tables can be enabled later in PostHog if needed |

## Products enabled

| Product | Result | Web SDK check |
| --- | --- | --- |
| Session Replay | Already enabled | Clean: the `posthog-js` initialization does not disable recording |
| Error Tracking | Enabled | Clean: client exception capture is enabled |
| Support (Conversations) | Enabled | An inbound support channel is still required before tickets exist |

## Signal sources

| source_product | source_type | Action |
| --- | --- | --- |
| `signals_scout` | `cross_source_issue` | Left at the platform default: enabled without a config row |
| `health_checks` | `health_issue` | Enabled — `01a06e38-5a76-7a65-8688-bf89ce10851d` |
| `error_tracking` | `issue_created` | Enabled — `01a06e38-5a07-7626-8eeb-6dec76c5137c` |
| `error_tracking` | `issue_reopened` | Enabled — `01a06e38-5a2a-72b9-93e0-fa0bb7b8b9b8` |
| `error_tracking` | `issue_spiking` | Enabled — `01a06e38-5a10-7067-b7ce-45f81b9376b2` |
| `conversations` | `ticket` | Enabled — `01a06e38-5a77-7f8c-b688-506b34bd6d64` |
| `github` | `issue` | Enabled — `01a06e3e-04a7-7d2e-8ec5-cbfbd02b5436` |
| `session_replay` | retired session-analysis source | Deliberately skipped; coverage is provided by Replay Vision scanners |
| `replay_vision` | source config | Deliberately skipped; each scanner self-authorizes with `emits_signals: true` |

## Connected tools

| Tool | Result |
| --- | --- |
| GitHub Issues | Connected by this setup; the responder is enabled and the warehouse source is syncing `issues` |
| All other offered tools | Not used in this setup |

## Scout troop

Five daily, emitting scouts are active. The verified budget is **100 runs/day**; **0** had been used and **100** remained at setup time. PostHog’s current banner notes that scouts are in early access and additional capacity can be requested at `team-self-driving@posthog.com`.

| Enabled scout | What it watches |
| --- | --- |
| `signals-scout-general` | Cross-product correlations and otherwise-unclaimed surfaces |
| `signals-scout-product-analytics` | Saved behavioral flows for conversion and engagement regressions |
| `signals-scout-web-analytics` | Acquisition, landing-page health, and traffic changes |
| `signals-scout-data-warehouse` | Clerk and GitHub warehouse imports for failure, staleness, and volume cliffs |
| `signals-scout-health-checks` | Actionable PostHog configuration-health findings |

The remaining 22 scouts are disabled to keep the troop selective. Error tracking and session replay are intentionally covered by their native responder and Replay Vision scanners respectively. The other disabled scouts have no confirmed active product surface in this project: AI observability, anomaly detection, APM, conversations operations, CSP violations, customer analytics, data pipelines, experiments, feature flags, inbox validation, insight alerts, logs, MCP tool calls, observability gaps, replay vision trend analysis, revenue analytics, skills store, surveys, tasks, and web vitals. They can be enabled later from the inbox if those surfaces become important.

## Custom scouts

No custom scout was created. A dedicated architecture-generation reliability scout was proposed because it could watch whether generation requests receive completed diagrams and detect a core-flow volume collapse that a conversion-rate watcher would not necessarily catch. The selection also included **“None — keep the built-in troop”**, so no custom scout was created.

The considered drill-down and export surfaces were not proposed separately: their present telemetry does not establish a reliable success/failure pair. If a future custom scout becomes noisy, set `emit: false` on its scout configuration to change it to dry-run mode.

## Replay Vision scanners

A scanner is an LLM that watches individual session recordings on a schedule and pushes significant visible defects into the inbox. These are the only items in this setup that spend Replay Vision quota. Findings carry half weight and require independent corroboration before promotion into an inbox report.

| Scanner | Status | Query scope | Sampling | Current estimate |
| --- | --- | --- | --- | --- |
| Polaris architecture generation breakage | Created | Recordings on Polaris’s single-page architecture-generation flow (`/`), including requirements entry, diagram generation, expansion, and export | 50% | 0 observations / 0 credits per month currently |
| Polaris architecture workflow frustration | Created | Recordings containing a rage-click event only; no URL filter | 100% | 0 observations / 0 credits per month currently |

No session recordings were present during setup, so both scanners are armed and will begin scanning when recordings arrive. The dedicated estimate/quota endpoints were unavailable on this deployment; the created scanner records report a current zero-credit estimate because there is no matching recording volume yet.

## Follow-ups

- [ ] Connect an inbound Support channel (email, inbox, or Slack) in PostHog so the enabled Support responder can receive tickets.
- [ ] Review the existing Clerk warehouse source permissions. Its `api_keys`, organization, and organization-permission schemas report access errors; the enabled data-warehouse scout will also watch import health.
- [ ] If needed later, enable one of the currently disabled specialized scouts from the Self-driving inbox.

## What happens next

The scout coordinator picks up fresh configurations within roughly 30 minutes. Each run draws from the daily project budget, findings cluster into reports in the Self-driving inbox, and immediately actionable reports can progress to coding tasks.

## Files created or modified

| Path | Change |
| --- | --- |
| `posthog-self-driving-report.md` | Created this setup report |
| `.claude/skills/replay-vision-scanners-core/` | Installed shared scanner mechanics |
| `.claude/skills/replay-vision-scanner-broken-experiences/` | Installed breakage-monitor brief |
| `.claude/skills/replay-vision-scanner-user-frustration/` | Installed frustration-monitor brief |

No application source files were modified.
