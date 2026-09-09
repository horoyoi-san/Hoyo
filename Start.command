#!/bin/sh
# March7thHoney launcher for macOS (double-clickable in Finder or run from terminal)
cd "$(dirname "$0")" || exit 1
exec dotnet run --project Program -c Debug
