#!/usr/bin/env bash
set -euo pipefail

if [ ! -f /etc/os-release ]; then
  echo "This script expects a Debian-style /etc/os-release file."
  exit 1
fi

# shellcheck disable=SC1091
. /etc/os-release

if [ "${ID:-}" != "debian" ]; then
  echo "This helper is for Debian 12/13. Detected: ${PRETTY_NAME:-unknown Linux}."
  echo "Install .NET 10 SDK with your distro's supported method, then use scripts/run-server.sh."
  exit 1
fi

case "${VERSION_ID:-}" in
  12|13) ;;
  *)
    echo "Debian ${VERSION_ID:-unknown} is not supported by this helper."
    echo "Use Debian 12/13 or install .NET 10 manually from Microsoft Learn."
    exit 1
    ;;
esac

case "$(uname -m)" in
  x86_64|amd64|aarch64|arm64) ;;
  *)
    echo ".NET 10 packages from the Microsoft Debian feed support x64 and Arm64."
    echo "Detected unsupported architecture: $(uname -m)"
    exit 1
    ;;
esac

if [ "$(id -u)" -eq 0 ]; then
  SUDO=()
else
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo is required unless you run this script as root."
    exit 1
  fi
  SUDO=(sudo)
fi

echo "Installing base packages..."
"${SUDO[@]}" apt-get update
"${SUDO[@]}" apt-get install -y ca-certificates git gpg tmux wget

if dotnet --list-sdks 2>/dev/null | grep -q '^10\.'; then
  echo ".NET 10 SDK is already installed."
else
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  package_file="$tmp_dir/packages-microsoft-prod.deb"
  echo "Adding Microsoft package feed for Debian ${VERSION_ID}..."
  wget -q "https://packages.microsoft.com/config/debian/${VERSION_ID}/packages-microsoft-prod.deb" -O "$package_file"
  "${SUDO[@]}" dpkg -i "$package_file"

  echo "Installing .NET 10 SDK..."
  "${SUDO[@]}" apt-get update
  "${SUDO[@]}" apt-get install -y dotnet-sdk-10.0
fi

echo
dotnet --info
echo
echo "Debian setup complete. From the repo directory, start the server with:"
echo "  bash scripts/run-server.sh"
