# Atlas AI — Troubleshooting

## Mobile local-model issues

### “llama.rn is not available in the installed app build”

Cause:

- you are running Expo Go, or
- the installed dev/release build was created before the native dependency changes

Fix:

```bash
cd atlas-mobile
npx expo prebuild --clean
npx expo run:android
npx expo start --dev-client
```

Then open the installed `Atlas AI` app, not Expo Go.

### “Cannot read property 'install' of null”

Cause:

- the native `llama.rn` module is not available in the running app build

Fix:

- rebuild and reinstall the mobile app as a dev build or release build
- do not test local provider mode in Expo Go

### Model loads but chat says it is unsupported

Cause:

- the selected file is an embedding model, reranker model, or `mmproj` file

Examples of unsupported classes:

- `Qwen3-Embedding-0.6B-Q8_0.gguf`
- reranker GGUFs
- `mmproj` projector files

Fix:

- use a chat/instruct GGUF instead

## Mobile build issues

### Expo Go opens fine but local mode does not work

Expected.

Expo Go is only useful for:

- UI iteration
- desktop provider mode

Use a development build or release build for local inference.

### No development build is installed

Cause:

- `expo-dev-client` is installed in the project, but the device does not yet have your app binary installed

Fix:

```bash
cd atlas-mobile
npx expo prebuild --clean
npx expo run:android
```

### Android Gradle build fails with Java 25 or Java 26 errors

Cause:

- Gradle is using a too-new JDK

Fix:

- use JDK 21
- ensure `JAVA_HOME` and Gradle both point at JDK 21
- if needed, add to `atlas-mobile/android/gradle.properties`:

```properties
org.gradle.java.home=C:\\Program Files\\Java\\jdk-21
```

### Emulator shows `device offline`

Fix:

```bash
adb kill-server
adb start-server
adb devices
```

If still offline:

- cold boot the emulator
- or delete and recreate the AVD

### `android.package` or URI scheme errors from Expo

Ensure `atlas-mobile/app.json` includes:

- `scheme`
- `ios.bundleIdentifier`
- `android.package`
- `expo-dev-client` in dependencies

## Desktop provider issues

### Mobile cannot connect to desktop

Checklist:

1. Desktop app is running
2. Fastify is listening on port `3001`
3. Phone and desktop are on the same LAN
4. Firewall is not blocking port `3001`
5. The mobile app has the correct desktop IP and port

### Desktop mode works in Expo Go, local mode does not

Expected. The providers have different runtime requirements.
