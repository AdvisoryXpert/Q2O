#!/usr/bin/env bash
set -euo pipefail

DAYS="${DAYS:-365}"
CN="${CN:-localhost}"
HOSTS=( "localhost" "q2o.local" "api.q2o.local" )
IPS=( "127.0.0.1" )

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CERT_DIR="$REPO_ROOT/certs"
CONF_FILE="$CERT_DIR/openssl.cnf"
KEY_FILE="$CERT_DIR/q2o-key.pem"
CRT_FILE="$CERT_DIR/q2o-cert.pem"

if ! command -v openssl >/dev/null 2>&1; then
  echo "❌ OpenSSL not found. On Windows, run this task from Git Bash terminal; on Ubuntu/macOS, install openssl."
  exit 1
fi

mkdir -p "$CERT_DIR"

{
  echo "[req]"
  echo "distinguished_name = req_distinguished_name"
  echo "x509_extensions = v3_req"
  echo "prompt = no"
  echo
  echo "[req_distinguished_name]"
  echo "CN = $CN"
  echo
  echo "[v3_req]"
  echo "subjectAltName = @alt_names"
  echo
  echo "[alt_names]"
  i=1; for h in "${HOSTS[@]}"; do echo "DNS.$i = $h"; i=$((i+1)); done
  j=1; for ip in "${IPS[@]}"; do echo "IP.$j  = $ip"; j=$((j+1)); done
} > "$CONF_FILE"

echo "🔧 Generating self-signed cert (SANs: ${HOSTS[*]} ${IPS[*]}) ..."
openssl req -x509 -nodes -days "$DAYS" -newkey rsa:2048 \
  -keyout "$KEY_FILE" -out "$CRT_FILE" \
  -config "$CONF_FILE" -extensions v3_req >/dev/null 2>&1

echo "✅ Created:"
echo "   $KEY_FILE"
echo "   $CRT_FILE"
