#!/usr/bin/env bash
# Upload a fresh APK to the VDS so /download serves it.
#
# Atomically replaces /opt/gymquest/public/gymquest.apk: scp's to a
# .new sidecar file on the remote, then mv's into place. The mv is
# atomic on the same filesystem, so any in-flight res.download()
# streams keep serving the old file descriptor cleanly.
#
# Usage:
#   scripts/upload-apk.sh path/to/build.apk
#   scripts/upload-apk.sh path/to/build.apk user@host
#
# Defaults:
#   Target: root@194.67.102.76
#   Remote path: /opt/gymquest/public/gymquest.apk

set -euo pipefail

APK="${1:-}"
TARGET="${2:-root@194.67.102.76}"
REMOTE_DIR="/opt/gymquest/public"
REMOTE_FINAL="$REMOTE_DIR/gymquest.apk"
REMOTE_STAGING="$REMOTE_DIR/gymquest.apk.new"

if [[ -z "$APK" ]]; then
  echo "usage: $0 <local-apk-path> [user@host]" >&2
  exit 2
fi

if [[ ! -f "$APK" ]]; then
  echo "error: APK not found at $APK" >&2
  exit 1
fi

SIZE=$(stat -c%s "$APK" 2>/dev/null || stat -f%z "$APK")
echo "Uploading $APK ($SIZE bytes) to $TARGET:$REMOTE_FINAL (via $REMOTE_STAGING)"

ssh "$TARGET" "mkdir -p $REMOTE_DIR"
scp "$APK" "$TARGET:$REMOTE_STAGING"
ssh "$TARGET" "mv $REMOTE_STAGING $REMOTE_FINAL && chmod 644 $REMOTE_FINAL && ls -lh $REMOTE_FINAL"

echo "Done. Verify with: curl -I https://gymquest.ru/download"
