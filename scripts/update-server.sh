#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIGURATION="${M7H_CONFIGURATION:-Release}"
SERVICE_NAME="${M7H_SERVICE_NAME:-march7thhoney}"
BUILD=1
RESTART_MODE="auto"

usage() {
  cat <<EOF
Usage: bash scripts/update-server.sh [options]

Options:
  --configuration Debug|Release  Build configuration. Default: Release
  --service NAME                 systemd service name. Default: march7thhoney
  --restart                      Restart the service after updating
  --no-restart                   Do not stop/start systemd
  --no-build                     Skip restore/build after git pull
  -h, --help                     Show this help
EOF
}

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
    --service)
      if [ "$#" -lt 2 ]; then
        echo "--service requires a name"
        exit 1
      fi
      SERVICE_NAME="$2"
      shift 2
      ;;
    --restart)
      RESTART_MODE="always"
      shift
      ;;
    --no-restart)
      RESTART_MODE="never"
      shift
      ;;
    --no-build)
      BUILD=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if ! command -v git >/dev/null 2>&1; then
  echo "git was not found."
  exit 1
fi

if ! command -v dotnet >/dev/null 2>&1; then
  echo "dotnet was not found. On Debian, run: bash scripts/setup-debian.sh"
  exit 1
fi

cd "$ROOT_DIR"

service_active=0
service_known=0
if command -v systemctl >/dev/null 2>&1 && systemctl cat "${SERVICE_NAME}.service" >/dev/null 2>&1; then
  service_known=1
  if systemctl is-active --quiet "${SERVICE_NAME}.service"; then
    service_active=1
  fi
fi

should_restart=0
if [ "$RESTART_MODE" = "always" ]; then
  should_restart=1
elif [ "$RESTART_MODE" = "auto" ] && [ "$service_active" -eq 1 ]; then
  should_restart=1
fi

service_stopped=0
restart_stopped_service() {
  if [ "$service_stopped" -eq 1 ]; then
    echo "Restarting ${SERVICE_NAME}.service..."
    sudo systemctl start "${SERVICE_NAME}.service" || true
  fi
}

if [ "$should_restart" -eq 1 ] && [ "$service_known" -eq 1 ] && [ "$service_active" -eq 1 ]; then
  echo "Stopping ${SERVICE_NAME}.service before updating..."
  sudo systemctl stop "${SERVICE_NAME}.service"
  service_stopped=1
  trap restart_stopped_service EXIT
fi

echo "Pulling latest code..."
git pull --ff-only
git submodule update --init --recursive

if [ "$BUILD" -eq 1 ]; then
  echo "Restoring and building..."
  dotnet restore "$ROOT_DIR/Program/Program.csproj"
  dotnet build "$ROOT_DIR/Program/Program.csproj" -c "$CONFIGURATION" --no-restore
fi

if [ "$should_restart" -eq 1 ] && [ "$service_known" -eq 1 ]; then
  echo "Starting ${SERVICE_NAME}.service..."
  sudo systemctl start "${SERVICE_NAME}.service"
  service_stopped=0
elif [ "$RESTART_MODE" = "always" ] && [ "$service_known" -eq 0 ]; then
  echo "Service ${SERVICE_NAME}.service was not found; update complete without restart."
else
  echo "Update complete."
fi
