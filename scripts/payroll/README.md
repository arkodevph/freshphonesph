# Payroll workflow workbooks

Provisional spreadsheet workflow for checklist #13. The client’s existing format
can be mapped later; current assumptions are recorded in the workbooks and in
[the workflow guide](../../docs/80-payroll-spreadsheet-workflow.md).

The generated files contain a blank template and a separately labeled fictional
worked example. No actual employee or payment data belongs in this directory.

## Generate

Use an isolated Python environment, keeping dependencies outside the application:

```bash
python3 -m venv .local/payroll-tools
.local/payroll-tools/bin/pip install -r scripts/payroll/requirements.txt
.local/payroll-tools/bin/python scripts/payroll/build_workbooks.py
```

Outputs:

- `docs/templates/payroll-workflow-template.xlsx`
- `docs/templates/payroll-workflow-example.xlsx`

Pass `--output-dir /path/to/folder` to write review copies elsewhere. The earlier
`payroll-workflow-draft.xlsx` is retained as a historical draft for existing links.

## Verify

LibreOffice (`libreoffice` or `soffice`) must be installed for real formula
recalculation. The verifier creates its own profile and synthetic workbook copies;
it does not read company payroll or the application database.

```bash
.local/payroll-tools/bin/python scripts/payroll/verify_workbooks.py
```

Use `--work-dir /path/to/scratch` for an alternate output directory. The default
is ignored `.local/payroll-v1/qa`. Results include formula-error scans, expected
numeric/state results, worked-example preview caches and artifact hashes.

The formulas use common spreadsheet functions. Actual Microsoft Excel and Google
Sheets import/runtime checks remain separate from the executed LibreOffice checks.
