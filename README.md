# AmarHR APP

Expo (SDK 54) / React Native app for AmarHR.

```bash
npm install
npm start
```

| | |
|---|---|
| Expo slug / owner | `amarhr-app` / `amarhr` |
| EAS project id | `d9685003-ec99-4a9e-b32d-0b8b9ed0986f` |
| Android package | `mn.amarhr.app` |
| iOS bundle id | `com.amarhr.app` (Apple team `2FQYWVB4D9`) |
| Version / versionCode | `4.0.0` / `70` |
| Runtime version policy | `appVersion` — OTAs only reach binaries with the same `version` |

## Prerequisites

- **Node 24.x**, npm
- **eas-cli ≥ 16.28.0** (`eas.json` pins this): `npm i -g eas-cli && eas login`
- **Android**: JDK 17, Android SDK + platform tools (`adb`)
- **iOS** (macOS only): Xcode + CocoaPods

## Files that are NOT in git

Three files are gitignored and must be placed by hand on a fresh clone. Without them the install or build fails.

### `.npmrc` — private npm registry

`@hugeicons-pro/*` comes from a paid registry; `npm install` fails with 404/401 without it:

```
@hugeicons-pro:registry=https://npm.hugeicons.com/
//npm.hugeicons.com/:_authToken=<TOKEN>
```

Token from the HugeIcons Pro account, or copy `.npmrc` from another dev machine.

### `google-services.json` — Firebase (push notifications)

- Firebase console → project **`amarhr-6837f`** → Project settings → Your apps → Android app **`mn.amarhr.app`** → *Download google-services.json*
- Put it at the **repo root** — `app.json` references it as `android.googleServicesFile: "./google-services.json"`
- Android only. No `GoogleService-Info.plist` in this project; iOS push goes through Expo's APNs key stored in EAS.

### `upload.keystore` — Android release signing

The keystore lives in **EAS credentials** (expo.dev → project `amarhr-app` → Credentials → Android → Keystore). It is the Play Store upload key — **never regenerate it**, or Play will reject the AAB.

```bash
eas credentials -p android          # → production → Keystore → Download
```

Save it at the **repo root** as `upload.keystore`. Alias `upload`; store/key password is hardcoded in [plugins/withAndroidReleaseSigning.js](plugins/withAndroidReleaseSigning.js).

> That password is committed in plaintext inside the config plugin. It works, but it belongs in an EAS secret / env var.

## Bump the version before every store build

Edit [app.json](app.json):

- `expo.version` — user-facing version, **and** the OTA runtime version (`runtimeVersion.policy: "appVersion"`). Bumping it cuts off OTA delivery to older binaries, so bump only for a real store release.
- `expo.android.versionCode` — must increase for every Play Store upload.

`eas.json` sets `cli.appVersionSource: "remote"` and `production.autoIncrement: true`, so **EAS cloud builds auto-increment the build number server-side** (`eas build:version:get -p android` to check). Local gradle builds increment nothing — set `versionCode` yourself.

## Android build

### EAS cloud build (Play Store release)

```bash
eas build --profile production --platform android
eas submit --profile production --platform android
```

Produces an AAB signed with the keystore held in EAS credentials. Channel `production` is baked in from `eas.json`, so the binary picks up OTAs published to the `production` branch.

Same pipeline on your own machine: `eas build --profile production --platform android --local`.

### Bare gradle build

Prebuild regenerates `android/` (gitignored — always disposable):

```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew bundleRelease     # AAB → app/build/outputs/bundle/release/
./gradlew assembleRelease                 # APK → app/build/outputs/apk/release/
adb install -r app/build/outputs/apk/release/app-release.apk
```

Signing comes from the [withAndroidReleaseSigning](plugins/withAndroidReleaseSigning.js) config plugin: during prebuild it injects a `signingConfigs.release` block pointing at `../../upload.keystore` and switches `buildTypes.release` off the debug key. So `upload.keystore` **must be at the repo root before you prebuild**, or gradle can't find the store file.

[build_android.js.sample](build_android.js.sample) does the same patching against an already-generated `android/app/build.gradle` and then runs `bundleRelease` — a fallback for when you can't re-prebuild. Copy it to `scripts/build_android.js` to use it.

`.easignore` excludes `/android`, `/ios` and `upload.keystore` from the EAS upload — cloud builds always prebuild fresh and sign with EAS-managed credentials, so local native folders never leak into them.

## iOS build

```bash
eas build --profile production --platform ios     # cloud, EAS-managed certs & profiles
eas submit --profile production --platform ios
```

Credentials (distribution cert, provisioning profile, APNs key) are managed by EAS under Apple team `2FQYWVB4D9` — inspect with `eas credentials -p ios`.

Local Xcode build:

```bash
npx expo prebuild --platform ios --clean
cd ios && pod install
open AmarHR.xcworkspace     # then Product → Archive
```

## Build profiles

| Profile | What it gives you |
|---|---|
| `development` | dev client, internal distribution, channel `development` |
| `preview` | release-mode internal build (APK/ad-hoc), channel `preview` |
| `production` | store build, auto-incremented, channel `production` |

```bash
eas build --profile preview --platform android
```

For JS/asset-only releases (OTA) see [eas_update_test.md](eas_update_test.md).

## Troubleshooting

- **`npm install` 401/404 on `@hugeicons-pro/*`** — missing or expired `.npmrc` token.
- **Gradle: `Keystore file ... upload.keystore not found`** — keystore wasn't at repo root when prebuild ran. Put it there, re-run `npx expo prebuild --platform android --clean`.
- **`[withAndroidReleaseSigning] signingConfigs block not found`** — the plugin parses a stock Expo `build.gradle`; if an Expo/RN upgrade reshapes it, update the plugin's regexes.
- **Play Console rejects the upload key** — build was signed with the debug key. Confirm the release block took: `grep -A5 "signingConfigs" android/app/build.gradle`.
- **Push notifications dead in release** — `google-services.json` was missing at prebuild time, so the app has no FCM sender id.
