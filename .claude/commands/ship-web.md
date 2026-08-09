# Ship Web

Full verification → commit → push for Fynvita web:

1. Run all quality gates (lint, types, tests, build, security)
2. If all pass: create conventional commit
3. Push to current branch
4. If on develop or feature branch: open PR to main

Abort if any gate fails. Report what failed.
