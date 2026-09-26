# Branch flow

`main` is the production release branch and the repository's default branch. `staging` is the shared integration branch for testing changes before production. Changes move through topic branches:

```text
feature/<scope> ─┐
                 ├─> staging ──> main (production)
fix/<issue> ─────┘
```

- Create `feature/<scope>` from the latest `staging` for new behavior.
- Create `fix/<issue>` from the latest `staging` for a specific defect. These are short-lived branches, not one permanent `fix` branch.
- Open a pull request into `staging` after relevant tests pass. Review and test the combined result there.
- Promote a tested `staging` commit to `main` through a reviewed pull request. Do not develop directly on `main` or force-push shared branches.
- For an urgent production correction, branch from `main`, test it, promote it to `main`, then bring the same correction back into `staging`.

The GitHub default branch remains `main`. A `staging` branch alone does not establish a deployment environment; configure preview deployment separately when the target services and credentials are ready.
