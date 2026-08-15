#!/usr/bin/env bash
# Wrapper: activate the venv and run manage.py from apps/api.
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$DIR/.venv/bin/activate"
python "$DIR/manage.py" "$@"
