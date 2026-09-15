#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
VERSION=3.9.11
MAVEN_DIR="$ROOT/.tools/apache-maven-$VERSION"
if [[ ! -x "$MAVEN_DIR/bin/mvn" ]]; then
  mkdir -p "$ROOT/.tools"
  ARCHIVE="$ROOT/.tools/apache-maven-$VERSION-bin.tar.gz"
  BASE="https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/$VERSION/apache-maven-$VERSION-bin.tar.gz"
  curl --fail --location --retry 2 "$BASE" -o "$ARCHIVE"
  curl --fail --location --retry 2 "$BASE.sha512" -o "$ARCHIVE.sha512"
  EXPECTED="$(tr -d '[:space:]' < "$ARCHIVE.sha512")"
  ACTUAL="$(shasum -a 512 "$ARCHIVE" | cut -d ' ' -f 1)"
  if [[ "$EXPECTED" != "$ACTUAL" ]]; then echo 'Maven checksum verification failed.' >&2; exit 1; fi
  tar -xzf "$ARCHIVE" -C "$ROOT/.tools"
fi
exec "$MAVEN_DIR/bin/mvn" --no-transfer-progress -Dmaven.repo.local="$ROOT/.tools/m2" -f "$ROOT/backend/pom.xml" "$@"
