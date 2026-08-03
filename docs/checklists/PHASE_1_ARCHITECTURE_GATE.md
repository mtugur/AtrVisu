# Phase 1 Architecture Gate

This checklist governs P1-A and the contracts consumed by later Phase 1
packages. Master Plan v3.0 remains the canonical roadmap.

| Gate | Required evidence | P1-A status | Blocking if failed | Future package owner |
| --- | --- | --- | --- | --- |
| Nine logical regions defined | Canonical readonly tuple, metadata, validation, and architecture matrix | PASS | Yes | P1-B |
| Docks remain general-purpose | Architecture and ADR-001 prohibit specialized dock identity | PASS | Yes | P1-B |
| Editor metadata contract exists | Versioned serializable `EditorDefinition` with stable ID/kind/keys | PASS | Yes | P1-B |
| Editor runtime binding remains separate | Metadata contains no component or callback; runtime binding deferred | PASS | Yes | P1-B |
| Workspace/domain invariance defined | ADR-001 and architecture list preserved domain/runtime state | PASS | Yes | P1-D |
| Projects aggregate retained | ADR-002 and unchanged IndexedDB v1 projects store | PASS | Yes | P1-D |
| UI preferences boundary defined | Versioned stable-ID-only preference contract | PASS | Yes | P1-D |
| Saved viewpoints are domain data | Architecture and ADR-002 classify viewpoints under layout/revision data | PASS | Yes | P1-D |
| Semantic token families defined | Canonical readonly design-token family tuple | PASS | Yes | P1-C |
| Technical palette policy defined | Central policy with documented allowlist direction | PASS | Yes | P1-C |
| Design-system and theme implementation ownership assigned | P1-C explicitly owns semantic tokens, light/dark/system infrastructure, palette governance, and command surfaces | PASS | Yes | P1-C |
| Property Schema is declarative and versioned | Versioned contract rejects executable content and invalid rules | PASS | Yes | P1-E |
| Inspector/BOM/report share one source | ADR-003 and export mappings use one Property Schema | PASS | Yes | P1-E/P1-G |
| Localization keys required | Contracts and validators require title/label keys | PASS | Yes | P1-C/P1-E |
| Accessibility ownership defined | Architecture assigns keyboard/focus behavior per future component | PASS | Yes | P1-C/P1-H |
| Measured 2D PDF remains an exit obligation | Architecture defines minimum measured output | PASS | Yes | P1-G |
| Existing Phase 0 authorities unchanged | No parallel registry/authority and no runtime source changes | PASS | Yes | All packages |
| No production UI/runtime/storage migration in P1-A | Changed-file scope limited to docs, contracts, validator, and tests | PASS | Yes | P1-A |
| Full validation passes | Audit, build, unit, E2E, diff check, and no-red-console gate | PASS | Yes | P1-A/P1-H |

All P1-A rows are mandatory. A future owner may add implementation evidence,
but may not weaken the decision recorded here without a focused ADR.
