#!/usr/bin/env bash
# Standalone build with official Android SDK tools; does not need Gradle or Maven.
set -euo pipefail
cd "$(dirname "$0")/.."
SDK_DIR="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$PWD/work/android-sdk}}"
BUILD_TOOLS="${BUILD_TOOLS_DIR:-$SDK_DIR/build-tools/35.0.0}"
if [[ ! -d "$BUILD_TOOLS" && -d "$SDK_DIR/build-tools/android-15" ]]; then BUILD_TOOLS="$SDK_DIR/build-tools/android-15"; fi
ANDROID_JAR="$SDK_DIR/platforms/android-35/android.jar"
ECJ_PATH="${ECJ_JAR:-$PWD/work/ecj.jar}"
BUILD_DIR="$PWD/work/build"
SIGN_DIR="${DEGUSTATION_SIGN_DIR:-$PWD/work/signing}"
[[ -f "$ANDROID_JAR" ]] || { echo 'Install Android platform 35 and build-tools 35.0.0; set ANDROID_HOME.'; exit 1; }
mkdir -p "$BUILD_DIR/gen" "$BUILD_DIR/classes" "$BUILD_DIR/dex" output "$SIGN_DIR"
python3 - "$BUILD_DIR/AndroidManifest.xml" <<'PYBUILD'
import sys,xml.etree.ElementTree as E
E.register_namespace('android','http://schemas.android.com/apk/res/android')
a='{http://schemas.android.com/apk/res/android}'
r=E.parse('app/src/main/AndroidManifest.xml').getroot()
r.set('package','ru.ffactsui.degustation');r.set(a+'versionCode','1');r.set(a+'versionName','1.0.0')
E.SubElement(r,'uses-sdk',{a+'minSdkVersion':'26',a+'targetSdkVersion':'35'})
E.ElementTree(r).write(sys.argv[1],encoding='utf-8',xml_declaration=True)
PYBUILD
"$BUILD_TOOLS/aapt" package -f -m -M "$BUILD_DIR/AndroidManifest.xml" -S app/src/main/res -A app/src/main/assets -I "$ANDROID_JAR" -J "$BUILD_DIR/gen" -F "$BUILD_DIR/resources.apk"
mapfile -t JAVA_SOURCES < <(find app/src/main/java "$BUILD_DIR/gen" -name '*.java')
if command -v javac >/dev/null; then javac -source 8 -target 8 -bootclasspath "$ANDROID_JAR:$BUILD_TOOLS/core-lambda-stubs.jar" -encoding UTF-8 -d "$BUILD_DIR/classes" "${JAVA_SOURCES[@]}";
elif [[ -f "$ECJ_PATH" ]]; then java -jar "$ECJ_PATH" -source 1.8 -target 1.8 -bootclasspath "$ANDROID_JAR:$BUILD_TOOLS/core-lambda-stubs.jar" -encoding UTF-8 -d "$BUILD_DIR/classes" "${JAVA_SOURCES[@]}";
else echo 'A JDK or ECJ_JAR is required.'; exit 1; fi
(cd "$BUILD_DIR/classes" && zip -q -r "$BUILD_DIR/classes.jar" .)
"$BUILD_TOOLS/d8" --lib "$ANDROID_JAR" --min-api 26 --output "$BUILD_DIR/dex" "$BUILD_DIR/classes.jar"
cp "$BUILD_DIR/resources.apk" "$BUILD_DIR/unsigned.apk"
(cd "$BUILD_DIR/dex" && zip -q "$BUILD_DIR/unsigned.apk" classes.dex)
"$BUILD_TOOLS/zipalign" -f 4 "$BUILD_DIR/unsigned.apk" "$BUILD_DIR/aligned.apk"
if [[ ! -f "$SIGN_DIR/degustation.jks" ]]; then
    umask 077
    python3 - "$SIGN_DIR/password.txt" <<'PY'
import secrets,sys
with open(sys.argv[1],'w') as f:f.write(secrets.token_urlsafe(32))
PY
    keytool -genkeypair -keystore "$SIGN_DIR/degustation.jks" -alias degustation -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Degustation, OU=Android, O=ffactsui-rgb' -storepass:file "$SIGN_DIR/password.txt" -keypass:file "$SIGN_DIR/password.txt" >/dev/null 2>&1
fi
"$BUILD_TOOLS/apksigner" sign --ks "$SIGN_DIR/degustation.jks" --ks-key-alias degustation --ks-pass "file:$SIGN_DIR/password.txt" --out output/Degustation-1.0.0.apk "$BUILD_DIR/aligned.apk"
"$BUILD_TOOLS/apksigner" verify --verbose output/Degustation-1.0.0.apk
"$BUILD_TOOLS/zipalign" -c 4 output/Degustation-1.0.0.apk
sha256sum output/Degustation-1.0.0.apk > output/SHA256SUMS.txt
echo 'APK: output/Degustation-1.0.0.apk'
