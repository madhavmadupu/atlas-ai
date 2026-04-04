# Atlas AI — Build & Distribution

This repo has two apps with different build pipelines:

- `atlas-desktop/` (Electron)
- `atlas-mobile/` (Expo + React Native)

This doc focuses on mobile because local GGUF inference requires native builds.

## Mobile dev modes

### Expo Go (fast iteration)

Use Expo Go for:

- navigation/layout/styling
- the mobile `desktop` provider (LAN)

Do not use Expo Go for:

- mobile `local` provider (GGUF) — requires `llama.rn` (native module)

Command:

```bash
cd atlas-mobile
npx expo start --clear
```

### Development build (required for local GGUF)

Use a dev build when you need:

- `llama.rn` on-device inference
- anything that touches native modules/plugins

Android:

```bash
cd atlas-mobile
npx expo prebuild --clean
npx expo run:android
npx expo start --dev-client
```

### Release build (standalone, no dev server)

Release builds should run without Metro/dev server.

If an installed APK prompts you to “connect to development server”, you installed a debug/dev build (or you’re launching via dev-client). Build and install `assembleRelease` instead.

Android APK:

```bash
cd atlas-mobile/android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

Output:

- `atlas-mobile/android/app/build/outputs/apk/release/app-release.apk`

Install:

```bash
adb install -r app/build/outputs/apk/release/app-release.apk
```

Android App Bundle (Play Store):

```bash
cd atlas-mobile/android
./gradlew bundleRelease -PreactNativeArchitectures=arm64-v8a
```

Output:

- `atlas-mobile/android/app/build/outputs/bundle/release/app-release.aab`

### Windows note

On Windows, use `gradlew.bat`:

```powershell
cd atlas-mobile\\android
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
```

## Android requirements

- Android SDK / emulator or phone
- JDK 21 (this repo has repeatedly failed with JDK 25/26)

## iOS note

Local on-device inference on iOS also requires a native build (not Expo Go). Use EAS or the generated iOS project after `expo prebuild`.

## Desktop build notes

Desktop packaging is separate from mobile.

At runtime, the desktop app is responsible for:

- running Fastify on `:3001`
- making it LAN reachable (`0.0.0.0`)
- running/connecting to Ollama (`:11434`)

See:

- `docs/02-ELECTRON-DESKTOP.md`
- `docs/03-FASTIFY-API-SERVER.md`
