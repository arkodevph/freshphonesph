# COO workspace component system

Scope: every COO route and its dropdowns, fields, tables, buttons and dialogs.
Continue the established Ember dashboard study documented in `135-sidebar-black-coo.md`.
The reference is the retained authored November 10 frame, not a current live banking product.
The established black canvas, compact neutral navigation and meaningful chart colors control this pass.

The new role attribute on the system shell scopes the shared operational stylesheet.
Light mode uses white panels on a quiet neutral canvas; dark mode uses black with
slightly lifted neutral panels. Green identifies primary actions. Error, warning,
verification and pending colors retain their semantic roles.

## Component relationships

- Fields and dropdown triggers share a 42px desktop height, 9px corner radius,
  13px reading size, neutral boundary and independent visible focus outline.
  Touch controls and options are at least 44px tall. Textareas retain their own height.
- Dropdown options use quiet selected/active surfaces with the existing checkmark,
  keyboard navigation, typeahead, search and dismissal behavior.
- Explicit primary-action attributes connect existing feature buttons to the shared
  visual treatment. Destructive actions retain their existing semantics.
- Tables use 12px medium-weight headers, 13px tabular body text, aligned padding,
  row separators, hover feedback and sticky headers in existing scroll containers.
- Native dialogs retain their sizes, behavior and focus handling, with shared neutral
  surfaces and a dimmed backdrop. Module-specific task and monitor material tokens
  now resolve through the COO palette.

## Rejected illustration

The user rejected the stacked floating record cards on November 10 as generic.
Controlling supplied crop: `/tmp/codex-clipboard-ebW680.png`, visually inspected.
Do not revive that illustration as COO dashboard polish. The replacement is an
integrated payment-record ledger using actual verified and pending record counts.
Its segmented rail compares those two counts only; it is not a payment-completion
rate and does not include rejected/other statuses. Unknown data remains a skeleton
or unavailable state. Zero records produce an empty rail.

Verification and remaining gaps are recorded below after inspection of the rebuilt
localhost preview. User acceptance remains separate.
