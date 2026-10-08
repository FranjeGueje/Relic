#!/bin/bash
# Gets the interface: Relic does not carry one of its own, it uses rakun's web, which is the
# vendor/rakun submodule. rakun's history is heavy (hundreds of MB), so only the commit that is
# pinned is fetched (shallow, no file contents until needed) and only the folders that are used.
#
# Usage: scripts/init-ui.sh        (once after cloning, and after a pull that moves the pointer)
set -euo pipefail

cd "$(dirname "$0")/.."

git submodule update --init --depth 1 --filter=blob:none vendor/rakun
git -C vendor/rakun sparse-checkout set --cone web src/common

echo "Interface ready: vendor/rakun at $(git -C vendor/rakun describe --tags --always)"
