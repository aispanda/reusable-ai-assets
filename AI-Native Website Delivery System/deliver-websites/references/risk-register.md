# Website delivery risk register

| Risk | Early signal | Control | Release rule |
|---|---|---|---|
| Wrong problem/site type | Feature list precedes audience/outcome | Discovery gate and primary-action test | Do not architect before outcome is named |
| Framework overreach | Runtime introduced for static content | Architecture decision and rejection tests | Prefer simpler profile unless requirement proves need |
| Hardcoded drift | Routes/nav/footer/meta maintained separately | Canonical route registry | Audit must show consistency |
| Generic social previews | All routes inherit one image/title | Per-route initial HTML and image map | Test representative routes externally |
| Broken deep links | SPA fallback serves generic shell | Pre-render/static route output or SSR | Direct fetch must return route metadata |
| Poor mobile UX | Desktop-first fixed sizes/overflow | Mobile-first layout and representative viewport QA | No critical action/content loss |
| Inaccessible interaction | Pointer-only menus/carousels/forms | Semantic controls, keyboard/focus/reduced-motion tests | WCAG 2.2 AA gate |
| Performance regression | Heavy animation/library/media | Budgets, responsive media, island/JS restraint | CWV/lab budget reviewed |
| Content bottleneck | No owner or update workflow | Content model with owner/cadence | No orphaned launch content |
| Privacy/security surprise | Analytics/forms/auth added late | Data-flow and service inventory | Review before integration activation |
| Cost creep | CMS/database/runtime without use case | Cost and operations section in decision | Named owner and budget required |
| Fragile first deploy | Untracked build context/config | Clean build, immutable revision, rollback | Deployment preflight must pass |
| Unlicensed assets | Component/image copied without record | Source and licence register | Unknown licence blocks launch |
| AI-generated error | Polished output hides false claims or broken code | Source checks, tests, human approval | AI output is draft until verified |
| Vendor lock-in | Core content/config trapped in a service | Portable source contract and export path | Exit plan required for material service |

Review the register at architecture approval, vertical slice, and release readiness. Add project-specific risks in the consuming repository, not here.
