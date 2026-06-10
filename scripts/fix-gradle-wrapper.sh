#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
ANDROID_DIR="$ROOT_DIR/android"
GRADLE_VER="8.14.3"
TMP_DIR=$(mktemp -d)

echo "Downloading Gradle $GRADLE_VER..."
curl -sSLo "$TMP_DIR/gradle.zip" "https://services.gradle.org/distributions/gradle-${GRADLE_VER}-bin.zip"
echo "Extracting wrapper jar from distribution..."
unzip -q "$TMP_DIR/gradle.zip" "gradle-${GRADLE_VER}/lib/gradle-wrapper.jar" -d "$TMP_DIR"

SRC_JAR="$TMP_DIR/gradle-${GRADLE_VER}/lib/gradle-wrapper.jar"
DEST_JAR="$ANDROID_DIR/gradle/wrapper/gradle-wrapper.jar"

if [ -f "$SRC_JAR" ]; then
  mkdir -p "$(dirname "$DEST_JAR")"
  cp -f "$SRC_JAR" "$DEST_JAR"
  echo "Replaced $DEST_JAR"
else
  echo "Failed to extract gradle-wrapper.jar"
  exit 1
fi

echo "Updating gradle-wrapper.properties to use binary distribution"
cat > "$ANDROID_DIR/gradle/wrapper/gradle-wrapper.properties" <<EOF
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-${GRADLE_VER}-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
EOF

echo "Done. You can now run: cd android && ./gradlew assembleDebug"
