# iOS simulator build — 2026-10-09

- Device: iPhone 17 Pro, UUID `D4C28B4D-3615-4E6D-9092-C180668D5EE6`, iOS 26.5.
- Xcode: 27.0 (`27A266a`).
- `xcrun simctl boot <UUID>` and `xcrun simctl bootstatus <UUID> -b`: PASS; boot completed headlessly.
- `xcodebuild -workspace ios/GymSheet.xcworkspace -scheme GymSheet -configuration Debug -destination 'id=<UUID>' -derivedDataPath ios/build/DerivedData-social-qa CODE_SIGNING_ALLOWED=YES build`: exit 0, `** BUILD SUCCEEDED **`.
- `xcrun simctl install <UUID> ios/build/DerivedData-social-qa/Build/Products/Debug-iphonesimulator/GymSheet.app`: exit 0.
- `xcrun simctl launch --terminate-running-process <UUID> app.gymsheet.mobile`: launched; screenshot showed the GymSheet login screen. The app's first launch before Metro showed React Native's missing-script redbox; after Metro started and the app relaunched, the login screen rendered.
- The app bundle had an empty explicit entitlements dictionary. No shared Keychain access group is configured; this smoke test does not prove credential persistence across app restarts or devices.

`yarn expo run:ios --device <UUID>` stalled while invoking `osascript -e 'id of app "Simulator"'`. `Simulator.app` was not found inside `/Applications/Xcode.app`, `/Applications`, `/Library/Developer`, or `/Users/josejeremias/Applications`; the device can still run headlessly with `simctl`. Android and the two-user acceptance runner remain unavailable, so H1.S1.M4 stays EN CURSO.

DerivedData for this attempt is isolated at `apps/mobile/ios/build/DerivedData-social-qa`; it was retained for incremental validation. No existing DerivedData, Pods, or user caches were removed.

## Revalidación de pantalla — 2026-10-09, 05:14 UTC

- `df -h /`: 5.3 GiB disponibles antes de iniciar; no se ejecutó otra compilación.
- `xcrun simctl boot D4C28B4D-3615-4E6D-9092-C180668D5EE6`, `bootstatus ... -b`: PASS; iPhone 17 Pro reporta `Booted`.
- Primera reapertura sin Metro: captura local mostró el redbox `No script URL provided`; no se contó como PASS.
- `PATH=/opt/homebrew/opt/node@22/bin:$PATH yarn workspace @gymsheet/mobile start --localhost --port 8081`: Metro inició; bundling iOS 2,390 módulos completado en 7,292 ms.
- `xcrun simctl launch ... app.gymsheet.mobile`: PASS; la captura [ios-login-metro-2026-10-09.png](ios-login-metro-2026-10-09.png) muestra la pantalla de acceso.
- Esto acredita arranque visual con Metro local, no autenticación, persistencia SecureStore ni recorrido social. Metro queda ejecutándose para continuar la inspección local.
