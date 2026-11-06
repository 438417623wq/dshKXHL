#!/bin/sh
# 装/卸 dsh-remote-link。用法：sh scripts/install.sh [--dry-run|--uninstall]
exec node "$(dirname "$0")/install.mjs" "$@"
