#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIGURATION="${M7H_CONFIGURATION:-Release}"
PROJECT="$ROOT_DIR/Program/Program.csproj"
APP_ARGS=()

while [ "$#" -gt 0 ]; do
  case "$1" in
    -c|--configuration)
      if [ "$#" -lt 2 ]; then
        echo "$1 requires Debug or Release"
        exit 1
      fi
      CONFIGURATION="$2"
      shift 2
      ;;
    -h|--help)
      cat <<EOF
Usage: bash scripts/run-server.sh [--configuration Release|Debug] [-- app args]

Runs one local March7thHoney server directly from this git checkout.
EOF
      exit 0
      ;;
    --)
      shift
      APP_ARGS+=("$@")
      break
      ;;
    *)
      APP_ARGS+=("$1")
      shift
      ;;
  esac
done

if ! command -v dotnet >/dev/null 2>&1; then
  echo "dotnet was not found. On Debian, run: bash scripts/setup-debian.sh"
  exit 1
fi

cd "$ROOT_DIR"
mkdir -p Config/Database Config/Logs

exec dotnet run --project "$PROJECT" -c "$CONFIGURATION" -- "${APP_ARGS[@]}"
