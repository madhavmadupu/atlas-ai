# Atlas AI — Troubleshooting

## Mobile: provider confusion

### Expo Go works, local GGUF does not

Expected.

- Expo Go can only run JS and the native modules bundled into the Expo Go app.
- `llama.rn` is not bundled into Expo Go.

Fix: use a dev build or release build for the `local` provider.

```bash
cd atlas-mobile
npx expo prebuild --clean
npx expo run:android
npx expo start --dev-client
```

### “llama.rn is not available in the installed app build”

Cause:

- you’re running Expo Go, or
- you installed an old dev build before adding/updating `llama.rn`

Fix: rebuild and reinstall the dev build (same commands as above).

## Mobile: model selection

### Model loads but chat says it is unsupported

Cause: the file is not a chat/instruct generation GGUF.

Common unsupported classes:

- embedding GGUFs (example: `Qwen3-Embedding-0.6B-Q8_0.gguf`)
- reranker GGUFs
- `mmproj` projector files

Fix: pick a chat/instruct GGUF.

## Mobile: bundler issues

### `TypeError: dependencies is not iterable` (Metro)

This is a Metro transform failure (often caused by a transformer/plugin mismatch).

Checklist:

1. Clear Metro cache:
   - `cd atlas-mobile && npx expo start --clear`
2. Reinstall node modules:
   - delete `atlas-mobile/node_modules`
   - `cd atlas-mobile && npm install`
3. If it still fails, isolate NativeWind:
   - temporarily disable NativeWind wrapping in `atlas-mobile/metro.config.cjs:1`
   - verify Metro can bundle without it

If disabling NativeWind fixes it, the issue is in the CSS interop transformer chain.

## Mobile: Android build issues

### Gradle fails with Java 25/26

Cause: the Android toolchain is not compatible with too-new JDKs on this setup.

Fix: use JDK 21 and ensure both `JAVA_HOME` and `PATH` resolve to it before building.

### Emulator shows `device offline`

Fix:

```bash
adb kill-server
adb start-server
adb devices
```

If it remains offline: cold boot the emulator or recreate the AVD.

## Desktop: mobile cannot connect

Checklist:

1. Desktop app is running.
2. Fastify is listening on port `3001`.
3. Phone and desktop are on the same LAN.
4. Firewall is not blocking `:3001`.
5. Mobile Settings → provider is `desktop` and IP/port is correct.

## Related docs

- Mobile: `docs/07-MOBILE-APP.md`
- Server: `docs/03-FASTIFY-API-SERVER.md`
- Build: `docs/09-BUILD-DISTRIBUTION.md`
