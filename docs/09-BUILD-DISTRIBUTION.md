# Atlas AI — Build & Distribution

## Current reality

This repo has two separate apps:

- `atlas-desktop/`
- `atlas-mobile/`

This document focuses on what is needed to run and package the mobile app now that it has an on-device `llama.rn` mode.

## Mobile development modes

### Expo Go

Use Expo Go only for:

- navigation work
- UI work
- desktop-provider mode over LAN

Do **not** use Expo Go for local GGUF inference.

Reason:

- `llama.rn` is a native module
- Expo Go does not include it

### Development build

Use a custom dev build for on-device inference work.

Android flow:

```bash
cd atlas-mobile
npx expo prebuild --clean
npx expo run:android
npx expo start --dev-client
```

Then open the installed `Atlas AI` app on the device/emulator.

## Android requirements

- Android SDK
- emulator or physical device
- `expo-dev-client`
- JDK 21

Important:

- JDK 25/26 caused Gradle failures in this project
- use JDK 21 for Android builds
- if needed, pin Gradle with:

```properties
org.gradle.java.home=C:\\Program Files\\Java\\jdk-21
```

in `atlas-mobile/android/gradle.properties`

## Release packaging

### Android release APK

```bash
cd atlas-mobile/android
./gradlew assembleRelease
```

Expected output:

- `atlas-mobile/android/app/build/outputs/apk/release/app-release.apk`

Install with:

```bash
adb install app/build/outputs/apk/release/app-release.apk
```

### iOS

For iOS distribution, use the generated native iOS project after prebuild or EAS Build.

## Mobile app config that matters

File: `atlas-mobile/app.json`

Current important values:

- scheme: `atlas`
- iOS bundle id: `com.atlasai.app`
- Android package: `com.atlasai.app`
- `llama.rn` Expo plugin enabled
- `enableOpenCLAndHexagon: true`

## Desktop distribution note

Desktop packaging remains separate. The mobile app does not depend on desktop packaging when used in local on-device mode.
