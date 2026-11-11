# Clients controls and motion

November 11, 2026. User screenshot `/tmp/codex-clipboard-dJzOp1.png` exposes the
remaining native Status dropdown and asks for details across dropdowns, motion
and calendars. This corrects the earlier pass's native-disclosure choice; the
standing iOS spring preference applies to these controls too.

## Reference and scope

Keep the accepted Clients composition from [142](142-clients-directory-refinement.md).
Primary controls: existing shared workspace Select/WorkspacePopover and DateInput.
Calendar visual re-opened through OpenCLI: [Mantine DatePickerInput](https://mantine.dev/dates/date-picker-input/),
UI version shown 9.8.0, inspected November 11. Compact anchored month header,
weekday grid and quiet surface; adapt to existing black workspace and 324px calendar.
Primary motion study remains [Justin Builds](https://www.instagram.com/p/De5oNXKteqU/),
inspected November 6; retained scoped lesson: immediate response, preserve position
and velocity when reversing, settle immediately with reduced motion. No Mantine
package installed. Negative example is the user's mixed native Status menu and
abrupt disclosures in the supplied screenshot.

Retained captures and checks:
`/home/nami/.agent-reach/design-references/clients-controls-20261111/`.
Mantine header/grid structure inspected; original visual geometry is estimated,
not a pixel measurement. Calendar code already existed from the shared calendar
work; reuse it rather than introducing another picker.

## Coverage

- Clients Status filter; advanced handler/agent dropdowns; create-client Batch;
  release-update Status; record-detail selectors; calendar Month selector.
- Filter Joined from/to dates now use DateInput, matching create-client Joined,
  release Collection date and record-detail date fields already migrated.
- FormSelect retains native required/disabled validation and names while the visible
  control uses the shared keyboard listbox, searchable where useful.
- Select now uses the existing velocity-preserving WorkspacePopover spring, including
  exit; replaces fixed-duration CSS motion without changing value/keyboard logic.
- AnimatedDisclosure preserves native details/summary semantics while animating
  measured content height and opacity. Closing content becomes inert immediately;
  focus returns to summary when necessary. At rest overflow is visible so child
  dropdowns are not clipped. Used for More filters, Records and COO action forms.
- Shared consumers of Select, record filters, assignment filters, record details and
  COO action disclosures inherit these fixes. The user subsequently extends the request to all COO dropdowns and expanding
  sections; follow [144](144-coo-shared-controls-rollout.md) for the 71-selector and
  20-disclosure rollout, which supersedes this initial Clients-only scope.

## Verification

Build and TypeScript passed; 24 existing calendar, membership-calendar, record-filter,
record-edit and role-workspace tests passed. Live COO verification on build
`2BRzURYuBg-fZDPByv1OE`: menu reversal retains the same panel/current opacity,
settles at 1; closing content immediately inert. Keyboard ArrowDown/Enter selects
Active with focus retained, Escape closes; outside dismissal checked after event
listener attachment. Disclosure height reverses and settles to auto/visible overflow.

Calendar: 42 day buttons; focus selected day; 12 custom month options; month Escape
closes its menu while retaining calendar; October 20 selection updates date input
and restores trigger focus. Nested calendar opens above record-edit modal; Escape
leaves record dialog open. Native required Batch validation blocks incomplete form,
focuses the combobox and exposes its error; selecting a batch clears it and makes
the draft valid. No submit performed. Reduced motion settles menu transform/opacity
and disclosure height without waiting for animation.

Mobile 390/320: document equals viewport; visible calendar fits within viewport
(x46/right370 and x12/right308, top12/bottom435 in 844px height). Earlier zero-bound
measurement came from programmatically opening a date field inside collapsed More
filters; corrected test opens the real visible field first. Initial outside/invalid
samples were synchronous before React effects/render committed; follow-up checked
the committed state. These were automation corrections, not product passes.

Final caret spring and mobile single-column creation field polish awaiting final
build/source proof and reinspection. Retain verification.json and followup.log plus
status-menu/calendar/calendar-month/required-validation/nested-calendar captures.
No record write, commit, push or production deployment performed. Other browsers,
assistive technology and user acceptance remain open.
