# Native Linux Setup

This is the simple deployment path: one checkout, one server process, no Docker,
and no split dispatch/game node setup. After .NET is installed, Linux can run it
directly from source just like Windows.

## Debian 12/13

Install the server dependencies once:

```bash
sudo apt-get update
sudo apt-get install -y git
git clone --recurse-submodules <repo-url> March7thHoney
cd March7thHoney
bash scripts/setup-debian.sh
```

The project targets .NET 10. On Debian 12 and 13, Microsoft's supported package
feed provides `dotnet-sdk-10.0` for x64 and Arm64.

## Run

Start the server directly from the checkout:

```bash
dotnet run --project Program/Program.csproj
```

Linux paths are case-sensitive, so `Program` works and `program` does not. You
can also use the root launcher:

```bash
bash Start.sh
```

The app writes `Config.json` on first launch if it does not exist. Keep the
single-server settings like this unless you deliberately split services later:

```json
{
  "ServerOption": {
    "ServerConfig": {
      "RunDispatch": true,
      "RunGateway": true,
      "Regions": []
    }
  }
}
```

## Run Under systemd

Install a service from the checkout:

```bash
sudo bash scripts/install-systemd-service.sh
sudo systemctl start march7thhoney
```

Useful commands:

```bash
journalctl -u march7thhoney -f
sudo systemctl restart march7thhoney
sudo systemctl stop march7thhoney
```

For an interactive command console, run `bash scripts/run-server.sh` inside
`tmux` or `screen` instead of systemd.

## Update

From the checkout:

```bash
git pull --ff-only
git submodule update --init --recursive
dotnet run --project Program/Program.csproj
```

If you use systemd, the helper script can stop the service, pull, build, and
start it again:

```bash
bash scripts/update-server.sh --restart
```

## Network

Expose the HTTP dispatch/gateway port from `Config.json`:

```json
"HttpServer": {
  "BindAddress": "0.0.0.0",
  "PublicAddress": "hsr.hoyotoon.com",
  "Port": 21000,
  "UseSSL": false
}
```

Expose the UDP game port from `Config.json`:

```json
"GameServer": {
  "BindAddress": "0.0.0.0",
  "PublicAddress": "hsr.hoyotoon.com",
  "Port": 23300
}
```

If a reverse proxy terminates HTTPS, keep `UseSSL` false in the app and proxy to
`http://127.0.0.1:21000`. UDP game traffic still needs its own forwarding rule.
