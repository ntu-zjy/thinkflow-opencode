#!/bin/sh
set -e

# 将环境变量中的 API key 写入 OpenCode auth.json
AUTH_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/opencode"
mkdir -p "$AUTH_DIR"

cat > "$AUTH_DIR/auth.json" <<EOF
{
  "openrouter": {
    "type": "api",
    "key": "${OPENROUTER_API_KEY}"
  }
}
EOF

exec "$@"
