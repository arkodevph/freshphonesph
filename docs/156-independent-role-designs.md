# Independent staff role designs

Each staff role now owns its page components and styles under
`apps/web/app/system/_role-designs/<role>/`. The existing `/system/*` URLs select
the signed-in role's view with a lazy import. There are 14 canonical staff roles
and 125 role/page combinations, including internal administrator and analytics
roles. Compatibility names resolve to their canonical business role.

For example, edit these independently:

- COO Payments: `_role-designs/coo/app/system/payments/`
- Finance Payments: `_role-designs/finance_officer/app/system/payments/`
- Role theme and dialogs: `_role-designs/<role>/workspace.css`

These are editable source files. Builds do not regenerate them or synchronize
them with another role. The existing COO page design supplies the initial
operational styling; the CEO and Handler keep their existing specialized views.
Each role also owns the feature components, CSS modules, and visual dependencies
used by its pages. The general staff shell/navigation, authentication context,
business hooks, API facade, contracts, and backend authorization remain shared.
The specialized Handler shell uses its own role components and styles; the CEO
shell uses the CEO's own style module. The dropdown scope context retains its
identity with the shell.

Keep subsequent design changes inside the intended role folder. Updating the
original feature component does not update these role views. Shared business
hooks remain in their original locations; change those when fixing behavior for
all roles. Do not copy permission rules or API mutations into a new role view.

`manifest.json` inventories the role routes and owned files. When adding a page,
update its role dispatcher and manifest, preserve the workspace policy and API
guards, and run `role-design-isolation.test.ts`. That test checks role coverage,
cross-role imports, theme selectors, compatibility roles, and unknown-role denial.

The retained COO Payments reference is
`.local/coo-system-20261110/dark-payments.png`; this is a historical project
reference, not a newly inspected external design. The contained change preserves
its composition, neutral dark surfaces, readable table density, semantic colors,
and existing motion. The rejected selection-edge and overlapping search-icon
treatments remain excluded by the current source styles. Fresh verification
logs and screenshots are retained in `.local/role-designs-20261113/`.
