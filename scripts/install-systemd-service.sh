#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="${M7H_SERVICE_NAME:-march7thhoney}"
CONFIGURATION="${M7H_CONFIGURATION:-Release}"

if [ "$(id -u)" -eq 0 ]; then
  SERVICE_USER="${SUDO_USER:-root}"
else
  SERVICE_USER="$(id -un)"
fi

usage() {
  cat <<EOF
Usage: sudo bash scripts/install-systemd-service.sh [options]

Options:
  --user USER                    Linux user that runs the server. Default: current sudo user
  --service NAME                 systemd service name. Default: march7thhoney
  --configuration Debug|Release  Build configuration. Default: Release
  -h, --help                     Show this help
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --user)
      if [ "$#" -lt 2 ]; then
        echo "--user requires a Linux user"
        exit 1
      fi
      SERVICE_USER="$2"
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
    -c|--configuration)
      if [ "$#" -lt 2 ]; then
        echo "$1 requires Debug or Release"
        exit 1
      fi
      CONFIGURATION="$2"
      shift 2
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

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script with sudo so it can write /etc/systemd/system/${SERVICE_NAME}.service"
  exit 1
fi

if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  echo "Linux user '$SERVICE_USER' does not exist."
  exit 1
fi

if ! command -v dotnet >/dev/null 2>&1; then
  echo "dotnet was not found. Run scripts/setup-debian.sh first."
  exit 1
fi

mkdir -p "$ROOT_DIR/Config/Database" "$ROOT_DIR/Config/Logs"
chown -R "$SERVICE_USER:$SERVICE_USER" "$ROOT_DIR/Config"

BASH_BIN="$(command -v bash)"
UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
RUN_SCRIPT="${ROOT_DIR}/scripts/run-server.sh"

cat > "$UNIT_PATH" <<EOF
[Unit]
Description=March7thHoney server
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=${SERVICE_USER}
WorkingDirectory=${ROOT_DIR}
Environment=DOTNET_ENVIRONMENT=Production
Environment=M7H_CONFIGURATION=${CONFIGURATION}
ExecStart=${BASH_BIN} ${RUN_SCRIPT}
Restart=on-failure
RestartSec=5
KillSignal=SIGINT
TimeoutStopSec=45
LimitNOFILE=1048576
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"

echo "Installed ${UNIT_PATH}"
echo
echo "Start it now:"
echo "  sudo systemctl start ${SERVICE_NAME}"
echo
echo "Logs:"
echo "  journalctl -u ${SERVICE_NAME} -f"
