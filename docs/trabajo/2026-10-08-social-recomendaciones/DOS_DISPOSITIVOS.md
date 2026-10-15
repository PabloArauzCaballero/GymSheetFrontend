# Protocolo de dos dispositivos simultáneos

Estado observado, no inferido: [inventario actualizado](evidencia/inventario-actual.txt). iOS tiene simuladores disponibles apagados; Android dispone de adb/emulator bajo `~/Library/Android/sdk`, pero `emulator -list-avds` no devuelve AVDs. `maestro` no está en PATH. No se iniciaron apps ni se ejecutaron recorridos en esta planificación.

## 1. Preparación H1 antes de probar funcionalidades

- Registrar SHA/diff de ambos repos y versión del motor, sin incluir trabajo ajeno en commits. Usar checkout aislado al implementar, portando de forma deliberada los cambios de entrenamiento de los que se dependa.
- Seleccionar Node 22; comprobado localmente `/opt/homebrew/opt/node@22/bin/node` → `v22.23.3`. Yarn observado 1.22.22. No cambiar globalmente Node de otros proyectos.
- Instalar/configurar Android command-line tools y una imagen compatible con host mediante SDK Manager; registrar versión/API/ABI elegida y disponibilidad. Crear AVD `GymSheet_QA_A`. No inventar un system-image package ausente del catálogo instalado.
- Usar iPhone 17 Pro disponible: `D4C28B4D-3615-4E6D-9092-C180668D5EE6`, runtime observado iOS 26.5. Registrar un segundo simulador iOS solo como diagnóstico: dos iOS no sustituyen evidencia Android.
- Preparar build de desarrollo nativa para `app.gymsheet.mobile`. Validar mapas/audio/calendario/contactos sobre el binario elegido, no suponer que Expo Go reproduce toda configuración nativa.
- PostgreSQL/Redis/API/medios/motor de QA deben estar saludables, migrados y sembrados con datos sintéticos; comprobar URL efectiva dentro del binario. Evitar mezclar API local con medios remotos de otro ambiente.

## 2. Comandos existentes de inspección

Desde el workspace, solo lectura:

```sh
/opt/homebrew/opt/node@22/bin/node --version
xcrun simctl list devices available
"$HOME/Library/Android/sdk/emulator/emulator" -list-avds
"$HOME/Library/Android/sdk/platform-tools/adb" devices -l
```

Comandos de arranque para la ejecución de H1, no ejecutados en esta entrega:

```sh
xcrun simctl boot D4C28B4D-3615-4E6D-9092-C180668D5EE6
xcrun simctl bootstatus D4C28B4D-3615-4E6D-9092-C180668D5EE6 -b
open -a Simulator
"$HOME/Library/Android/sdk/emulator/emulator" -avd GymSheet_QA_A -no-snapshot-load
```

El último comando requiere AVD creado. Ejecutar cada proceso persistente en sesión separada y registrar PID/puerto; no esperar que una cadena de shell continúe tras un servidor. Si ya está Booted no reiniciar arbitrariamente.

Puerto propuesto de API 3011 y Metro 8090, sujetos a preflight de colisiones; web E2E actual usa 3002. `adb reverse tcp:3011 tcp:3011` y `adb reverse tcp:8090 tcp:8090` pueden servir a un binario configurado para localhost; alternativamente Android usa host del emulador. Elegir una ruta consistente y comprobar `/health/live` desde cada cliente, no solo desde la terminal del Mac. HTTP de desarrollo solo en build QA; no ampliar excepciones de transporte de producción.

## 3. Orquestador por implementar

`F/scripts/qa/run-social-pair.py` es una herramienta futura de H1.S3, no existe todavía. Contrato de CLI:

```sh
python3 scripts/qa/run-social-pair.py --case H7.S3.M5
python3 scripts/qa/run-social-pair.py --phase H7
python3 scripts/qa/run-social-pair.py --journey QA-AB-01
```

Registro de casos versionado, sin ejecutar strings recibidos de una API. Cada entrada identifica precondiciones, scenario seed, driver y aserciones. Casos OPS usan procesos/read-only checks; backend usa Jest real; web Playwright; móvil Maestro o controlador equivalente validado. `--phase` exige todas las filas de fase, no solo las de UI. No puede devolver PASS si un caso no existe, hay cero tests, falta un dispositivo o falló un subprocess.

Variables: `QA_ANDROID_SERIAL`, `QA_IOS_UDID`, `QA_API_BASE_URL`, `QA_WEB_BASE_URL`, `QA_RUN_ID`, credenciales A/B mediante entorno privado; no guardarlas en manifest. Para Maestro verificar flags con la versión instalada; conservar .yaml por ID y subflows de login existentes sin volcar contraseñas. Si no está disponible, instalarlo o documentar ejecución manual equivalente; no marcar automatización PASS.

El orquestador usa barreras observables: A envía → esperar ID persistido → B recibe → B acepta → consultar estado en ambos. Timeout bounded registra expected/actual; no usar sleeps fijos para aparentar sincronía. Los actores deben estar conectados a la vez durante la interacción, aunque la automatización alterne comandos.

## 4. Matriz de parejas

| Caso | Actor A | Actor B | Propósito |
|---|---|---|---|
| QA-AB-01 | Android | iOS | Recorrido completo con gimnasios distintos. |
| QA-AB-02 | iOS | Android | Invertir quién envía/acepta y ejerce permisos. |
| QA-AB-03 | Android | Web | Persistencia, chat, mapa, reacciones y agenda. |
| QA-AB-04 | iOS | Web | Audio, historias, exportación calendario y recibos. |
| QA-AB-05 | Web contexto A | Web contexto B | Concurrencia reproducible y negativos de API. |
| QA-AB-06 | Android/iOS | Web con misma cuenta A | Cambios de preferencias y sincronización multidispositivo, manteniendo B independiente. |
| QA-AB-07 | Android A | iOS B | Desconectar/bloquear mientras chat abierto y upload en curso. |
| QA-AB-08 | iOS A | Android B | Mapa remoto, permisos denegados, pérdida de red y recuperación. |

## 5. Secuencia completa A↔B

1. Manifest y escenario fresh; A/B distintos gyms, C sin conexión, E menor.
2. A elige Ahora no y entrena; luego activa social. B completa perfil. Verificar E rechazado en UI/API.
3. A elige mujeres, B hombres; filtros y mapas encuentran perfiles esperados, nunca E/K opt-out en mapa.
4. A explora ciudad remota; BD confirma ubicación propia intacta. Abrir un gimnasio registrado y uno externo real en corrida de cobertura.
5. Volver a zona A/B; A envía conectar, B recibe y acepta. Abrir perfil desde reel y verificar mismo estado.
6. Texto/foto/audio/sticker; reiniciar ambos clientes y comprobar persistencia. C no entra por ID.
7. Configurar visto para esta/varias/todas; leer con visto apagado; reactivar; verificar m1 oculto y m2 visible. Probar edición/borrado límites con reloj de test controlado.
8. A publica historia para B; C no la ve; B reacciona/responde y A recibe en chat.
9. A publica reel de 90 s; B guarda/repostea/comenta. Guardado privado y repost en Conexiones sin duplicado.
10. A invita a entrenar; B contrapropone, A acepta revisión actual. Ver agendas, exportar opcionalmente, completar A con peso distinto a B y comprobar XP individual.
11. A desconecta: chat y archivos inaccesibles para ambos, encuentros futuros cancelados, entrenamientos históricos intactos.
12. Reconectar crea chat vacío. Bloquear impide mapa, perfil, stories, reels y solicitudes. Desbloquear no reconecta.

## 6. Evidencia por corrida

Guardar bajo `evidencia/runs/<runId>/`: manifest, logs sanitizados, versión de fixtures, comandos+exit codes, resultados API/BD, capturas de ambos actores en la misma interacción, grabación, trace web, revisión visual doble y defectos. Capturas de autenticación ocultan secretos. `simctl io <udid> screenshot <path>` y `adb -s <serial> exec-out screencap -p` son mecanismos disponibles de captura; seleccionar serial explícito.

Al cerrar, detener solo procesos creados por esa corrida si corresponde; no detener servicios ajenos. No borrar dispositivos del usuario. La evidencia de performance separa contención del host y tiempo de servidor; la presión de recursos no justifica sustituir el recorrido simultáneo por secuencial.
