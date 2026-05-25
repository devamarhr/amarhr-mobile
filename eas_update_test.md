# Testing EAS Update

End-to-end recipe to verify that an OTA published via `eas update` actually reaches the phone.

## Prerequisites

- `eas-cli` installed and logged in: `npm install -g eas-cli && eas login`
- Phone connected over `adb` — confirm with `adb devices` (device serial is referenced as `<DEVICE_SERIAL>` below).
- A binary on the phone whose AndroidManifest embeds the channel header. Verify with:
  ```bash
  grep -E "channel|REQUEST_HEADERS" \
    android/app/src/main/AndroidManifest.xml \
    android/app/src/main/res/values/strings.xml
  ```
  You should see a meta-data line containing `{"expo-channel-name":"production"}`. The exact name depends on the expo-updates version:
  - Expo SDK 54+ writes it inline as `expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY` directly in AndroidManifest.xml (no `strings.xml` entry — that's normal).
  - Older Expo SDKs wrote `expo.modules.updates.EXPO_UPDATES_REQUEST_HEADERS` pointing at `@string/expo_updates_request_headers` in strings.xml.

  Either form is fine — as long as `{"expo-channel-name":"production"}` is somewhere in those files, the device can route to the EAS branch. If neither file mentions a channel, the OTA will never arrive.

## 1. Make sure the installed binary has the channel embedded

Two ways to get there:

**A. Via `app.json` + local gradle build** (works because `app.json` now declares `updates.requestHeaders`):
```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
adb -s <DEVICE_SERIAL> install -r app/build/outputs/apk/release/app-release.apk
```

**B. Via EAS** (channel comes from `eas.json` profile automatically):
```bash
eas build --profile production --platform android --local
# or remote build: eas build --profile production --platform android
adb -s <DEVICE_SERIAL> install -r path/to/build.apk
```

## 2. Cold-launch once to establish the baseline

```bash
adb -s <DEVICE_SERIAL> shell am force-stop mn.amarhr.app
adb -s <DEVICE_SERIAL> shell monkey -p mn.amarhr.app -c android.intent.category.LAUNCHER 1
```

This boots the embedded JS bundle. The change you're testing won't be visible yet.

## 3. Publish the OTA

```bash
eas update --branch production --message "test: verify OTA pipeline"
```

EAS prints the update group ID and a dashboard URL on success.

## 4. Cold-launch again and watch for the update

```bash
adb -s <DEVICE_SERIAL> logcat -c
adb -s <DEVICE_SERIAL> shell am force-stop mn.amarhr.app
adb -s <DEVICE_SERIAL> logcat '*:I' | grep -iE "expo[-_]updates|EXUpdates" &
adb -s <DEVICE_SERIAL> shell monkey -p mn.amarhr.app -c android.intent.category.LAUNCHER 1
```

Look for log lines like `Checking for update`, `Update available`, `Update downloaded`.

Because `useUpdateGate()` in [app/_layout.tsx](app/_layout.tsx) explicitly runs `checkForUpdateAsync` → `fetchUpdateAsync` → `reloadAsync`, the new bundle should apply on this **same** cold launch:

1. Loader shows (logo + "Шинэчилж байна...").
2. New bundle downloads.
3. App reloads.
4. Boots into the updated bundle — your visible change (e.g. "Test Update") should now appear.

If `useUpdateGate` is ever changed to skip the explicit reload, you'd need a *second* cold launch to apply.

## Common gotchas if the update doesn't apply

- **Wrong channel/branch**: confirm `eas channel:view production` lists the branch you published to.
- **Runtime version mismatch**: `eas update:list --branch production --json | jq '.[] | {runtimeVersion, createdAt, message}'` — must equal the device's runtime version (currently `4.0.0`, sourced from `app.json` `version` via `runtimeVersion.policy: "appVersion"`).
- **Updates module disabled in manifest**: `grep ENABLED android/app/src/main/AndroidManifest.xml` — must be `"true"`.
- **Network / VPN blocking u.expo.dev**: `adb -s <DEVICE_SERIAL> shell ping -c 2 u.expo.dev`.
- **Warm-launch instead of cold**: `expo-updates` only checks on cold start (`CHECK_ON_LAUNCH=ALWAYS`). Always `force-stop` before relaunching.
- **Stale cached update**: clear app data — `adb -s <DEVICE_SERIAL> shell pm clear mn.amarhr.app` — then relaunch.
- **Locally-built APK without channel header**: see step 1.

## Viewing crash logs with `adb logcat`

If the app crashes during/after an OTA, capture the JS exception and native stack trace:

```bash
# Clear the buffer, force-stop the app, then start streaming only error-level logs
adb -s <DEVICE_SERIAL> logcat -c
adb -s <DEVICE_SERIAL> shell am force-stop mn.amarhr.app
adb -s <DEVICE_SERIAL> logcat '*:E' | grep -E "AndroidRuntime|JavascriptException|FATAL|mn\.amarhr|ReactNative|expo[-_]updates"
```

Then launch the app from the phone (or via `adb shell monkey -p mn.amarhr.app -c android.intent.category.LAUNCHER 1`) and watch the stream.

Other useful variations:

```bash
# Dump the entire buffer once instead of streaming (good for post-mortem)
adb -s <DEVICE_SERIAL> logcat -d '*:E' | grep -E "AndroidRuntime|JavascriptException|FATAL|mn\.amarhr"

# Watch only this app's process (PID-scoped) — quieter
adb -s <DEVICE_SERIAL> logcat --pid=$(adb -s <DEVICE_SERIAL> shell pidof mn.amarhr.app)

# Just the Java/native FATAL EXCEPTION blocks
adb -s <DEVICE_SERIAL> logcat -d AndroidRuntime:E *:S

# Save a full capture to a file for sharing
adb -s <DEVICE_SERIAL> logcat -d > crash.log

# Read from the dedicated "crash" ring buffer (retains past crashes even after a reboot
# or logcat -c). Best for post-mortem when the crash already happened.
adb -s <DEVICE_SERIAL> logcat -b crash -d

# Same, but filtered to this app
adb -s <DEVICE_SERIAL> logcat -b crash -d | grep -E "mn\.amarhr|AndroidRuntime|JavascriptException"
```

The release-build crash that triggered this whole workflow looked like:
```
FATAL EXCEPTION: expo-updates-error-recovery
com.facebook.react.common.JavascriptException: TypeError: Cannot read property 'globalIsAllAnimationsDisabled' of undefined
```
That `expo-updates-error-recovery` thread name is misleading — it's the thread that *catches* JS exceptions during the OTA window, not the source of the bug. Always read the `JavascriptException` line below it for the real cause.

## Useful EAS commands

```bash
eas update:list --branch production         # see what was published
eas update:view <update-group-id>           # details for a specific update
eas channel:view production                 # confirm branch wired to channel
eas channel:edit production --branch main   # repoint channel to a different branch (rollback)
eas update:republish --group <id>           # republish an older update group
```
