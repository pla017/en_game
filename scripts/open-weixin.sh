#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_DIR="$ROOT_DIR/dist/build/mp-weixin"

find_wechat_cli() {
  local candidates=(
    "/Applications/wechatwebdevtools.app/Contents/MacOS/cli"
    "/Applications/微信开发者工具.app/Contents/MacOS/cli"
    "/Applications/WeChat DevTools.app/Contents/MacOS/cli"
    "/Applications/wechatwebdevtools.app/Contents/Resources/app.nw/bin/cli"
    "/Applications/微信开发者工具.app/Contents/Resources/app.nw/bin/cli"
    "/Applications/WeChat DevTools.app/Contents/Resources/app.nw/bin/cli"
  )

  for cli in "${candidates[@]}"; do
    if [[ -x "$cli" ]]; then
      printf '%s\n' "$cli"
      return 0
    fi
  done

  if command -v cli >/dev/null 2>&1; then
    command -v cli
    return 0
  fi

  return 1
}

cd "$ROOT_DIR"

echo "Building mp-weixin..."
npm run build:mp-weixin

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "Build output not found: $PROJECT_DIR" >&2
  exit 1
fi

WECHAT_CLI="$(find_wechat_cli || true)"

if [[ -z "$WECHAT_CLI" ]]; then
  echo "WeChat DevTools CLI not found." >&2
  echo "Open WeChat DevTools manually and import: $PROJECT_DIR" >&2
  exit 1
fi

echo "Opening WeChat DevTools..."
"$WECHAT_CLI" open --project "$ROOT_DIR"
