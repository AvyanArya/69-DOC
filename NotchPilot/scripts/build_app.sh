#!/bin/bash
# Builds NotchPilot.app (and the CLI) into dist/, ad-hoc signs it and zips it.
#
#   ./scripts/build_app.sh                 # universal (arm64 + x86_64) if possible
#   ARCHS=native ./scripts/build_app.sh    # current architecture only
#   SIGN_IDENTITY="Developer ID Application: …" ./scripts/build_app.sh
#
# Requires macOS 14+ with Xcode 15.3+ (or the matching command line tools).
set -euo pipefail

cd "$(dirname "$0")/.."
VERSION="${VERSION:-1.0.0}"
BUILD_NUMBER="${BUILD_NUMBER:-1}"
SIGN_IDENTITY="${SIGN_IDENTITY:--}"
ARCHS="${ARCHS:-universal}"
APP="dist/NotchPilot.app"

rm -rf dist
mkdir -p dist

build() {
    if [ "$ARCHS" = "universal" ]; then
        if swift build -c release --arch arm64 --arch x86_64 --product "$1" >&2; then
            echo ".build/apple/Products/Release"
            return
        fi
        echo "warning: universal build failed; building for the native architecture" >&2
    fi
    swift build -c release --product "$1" >&2
    swift build -c release --show-bin-path
}

echo "==> Building NotchPilot ($VERSION, $ARCHS)"
BIN_DIR="$(build NotchPilot)"
CLI_DIR="$(build notchpilot-cli)"

echo "==> Assembling $APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN_DIR/NotchPilot" "$APP/Contents/MacOS/NotchPilot"
cp Resources/Info.plist "$APP/Contents/Info.plist"
cp Resources/AppIcon.icns "$APP/Contents/Resources/AppIcon.icns"
plutil -replace CFBundleShortVersionString -string "$VERSION" "$APP/Contents/Info.plist"
plutil -replace CFBundleVersion -string "$BUILD_NUMBER" "$APP/Contents/Info.plist"
plutil -lint "$APP/Contents/Info.plist"
printf 'APPL????' > "$APP/Contents/PkgInfo"
cp "$CLI_DIR/notchpilot-cli" dist/notchpilot-cli

echo "==> Signing (identity: $SIGN_IDENTITY)"
if [ "$SIGN_IDENTITY" = "-" ]; then
    # Ad-hoc signature: runs locally after a Gatekeeper override; not notarised.
    codesign --force --sign - "$APP"
    codesign --force --sign - dist/notchpilot-cli
else
    codesign --force --options runtime --timestamp --entitlements Resources/NotchPilot.entitlements --sign "$SIGN_IDENTITY" "$APP"
    codesign --force --options runtime --timestamp --sign "$SIGN_IDENTITY" dist/notchpilot-cli
fi
codesign --verify --strict --verbose=2 "$APP"
lipo -info "$APP/Contents/MacOS/NotchPilot" || true

echo "==> Packaging"
ditto -c -k --keepParent "$APP" dist/NotchPilot-macOS.zip
(cd dist && zip -q notchpilot-cli-macOS.zip notchpilot-cli)
shasum -a 256 dist/*.zip
echo "Done: $APP"
