const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const MARKER = '# @gymsheet/path-spaces-fix';

/**
 * Hace que la compilación de iOS sobreviva a un espacio en la ruta del proyecto.
 *
 * Este repositorio vive bajo «Mantra Core Technologies», y tres fases de build
 * generadas —dos por Expo/Sentry y una por React Native— invocan un script
 * pasando su ruta **sin comillas**. Con la ruta expandida, el shell la parte por
 * el espacio y arranca un ejecutable que no existe:
 *
 *   ❌  Script '[CP-User] Generate Specs' failed
 *   /bin/sh: /Users/josejeremias/Desktop/Mantra: No such file or directory
 *
 * No es un fallo de configuración de esta app: las plantillas la generan así, y
 * sólo se manifiesta cuando la ruta tiene espacios. Como la carpeta del cliente
 * no va a dejar de llamarse así, el arreglo tiene que viajar con el proyecto.
 *
 * Las tres fases y por qué hay dos mecanismos distintos:
 *
 * 1. `[CP-User] Generate Specs`, en el proyecto **Pods**. Ese proyecto todavía
 *    no existe cuando corren los mods de `withDangerousMod` —lo crea `pod
 *    install`, después—, así que el parche se inyecta en el `post_install` del
 *    `Podfile`, que es el único punto que se ejecuta con el proyecto ya en
 *    memoria. Mismo recurso que usa `with-fmt-consteval-fix`.
 * 2. «Bundle React Native code and images» y «Upload Debug Symbols to Sentry»,
 *    en el proyecto de **la app**. Usan sustitución por backticks sin comillar y
 *    se reescriben a `"$( … )"`, que anida bien y es lo que POSIX recomienda.
 *
 * Las dos se parchean también desde el `post_install`, aunque el proyecto de la
 * app sí se alcanza con `withXcodeProject`. Se intentó por ahí primero y **no
 * sobrevive**: esas dos fases las escribe el plugin de `@sentry/react-native`,
 * y da igual el orden en la lista de `app.json` — el parche se aplicaba y
 * Sentry lo sobrescribía después con sus backticks de siempre. El prebuild
 * terminaba «bien» y el proyecto salía sin parchear, que es la forma más
 * silenciosa de que esto vuelva a romperse.
 *
 * `pod install` corre después de todos los mods, así que es el único punto
 * desde el que se llega el último con seguridad. De paso, hacerlo todo en un
 * sitio evita que el arreglo viva en dos mecanismos distintos.
 *
 * Vive en un config plugin y no en `ios/` porque `ios/` lo regenera
 * `expo prebuild` y cualquier edición a mano allí la borra la siguiente pasada
 * — que es exactamente cómo este fallo volvería sin avisar.
 */

function withPodsCodegenPhaseQuoted(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      const contents = fs.readFileSync(podfile, 'utf8');
      if (contents.includes(MARKER)) return config;

      const hook = /react_native_post_install\([\s\S]*?\n\s*\)\n/;
      const match = contents.match(hook);
      if (!match) {
        throw new Error(
          '[with-path-spaces-fix] No se encontró `react_native_post_install` en el Podfile ' +
            'generado. La plantilla cambió de forma; actualiza este plugin en vez de saltártelo: ' +
            'sin el parche la compilación falla en cuanto la ruta del proyecto tiene un espacio.',
        );
      }

      const patch = `${match[0]}
    ${MARKER}
    # React Native genera la fase de codegen como
    #   /bin/sh -c "$WITH_ENVIRONMENT $SCRIPT_PHASES_SCRIPT"
    # y \`sh -c\` vuelve a partir esa cadena por los espacios, así que con una
    # ruta como «Mantra Core Technologies» intenta ejecutar «…/Desktop/Mantra».
    #
    # Comillar los dos argumentos no basta, y esto costó una compilación
    # descubrirlo: \`with-environment.sh\` existe para preparar el entorno y
    # *luego* ejecutar lo que reciba, pero lo ejecuta como \`$1\` —sin comillas—
    # en su última línea, de modo que la ruta se vuelve a partir un nivel más
    # abajo, ya dentro de node_modules. Arreglarlo allí obligaría a parchear una
    # dependencia que \`yarn install\` reescribe.
    #
    # Así que no se le pasa argumento: se le hace \`source\` para quedarse con el
    # entorno que prepara y se invoca el script de fases aquí, entrecomillado.
    # El fichero no tiene \`exit\` ni efectos fuera de exportar variables, de modo
    # que sourcearlo hace exactamente lo mismo sin pasar por el \`$1\` roto.
    #
    # La cuarta fase, la de expo-constants, es la peor de las cuatro porque no
    # rompe la compilación: la deja pasar y rompe la app.
    #
    #   bash -l -c "$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"
    #
    # Comillar esa ruta sólo destapa el problema de dentro. \`get-app-config-ios.sh\`
    # decide si le toca actuar con
    #
    #   PROJECT_DIR_BASENAME=$(basename $PROJECT_DIR)
    #   if [ "x$PROJECT_DIR_BASENAME" != "xPods" ]; then exit 0; fi
    #
    # y ese \`$PROJECT_DIR\` va sin comillas. Con espacios, \`basename\` recibe tres
    # argumentos en vez de uno, no devuelve «Pods», y el script **sale con
    # código 0**. La fase se da por buena, \`EXConstants.bundle\` se queda sin su
    # \`app.config\`, y el fallo aparece mucho más tarde y muy lejos de aquí: la
    # app arranca y muere en rojo con «expo-linking needs access to the
    # expo-constants manifest», que no menciona ni rutas ni espacios.
    #
    # Se le fija \`PROJECT_ROOT\` explícitamente —el mismo valor que el script
    # deduciría— y se le pasa un \`PROJECT_DIR\` que su guard sí reconoce. Así no
    # se reimplementa su lógica, que es lo que se volvería frágil en cuanto Expo
    # la cambie; sólo se le dan las dos variables que su propio código consulta.
    # Las dos fases del proyecto de la app, que escribe el plugin de Sentry y
    # que por eso hay que tocar aquí y no en un mod (ver cabecera).
    #
    # Se trabaja sobre **la copia que CocoaPods ya tiene abierta**
    # (\`aggregate_targets.user_project\`), no sobre una que abramos nosotros con
    # \`Xcodeproj::Project.open\`. Eso último parece lo natural y no funciona: serían
    # dos objetos distintos sobre el mismo fichero, y CocoaPods guarda el suyo
    # después, encima. El parche se aplicaba, se guardaba, y desaparecía sin que
    # nada avisara — el prebuild terminaba bien y el proyecto salía sin parchear.
    app_projects = installer.aggregate_targets.map(&:user_project).compact.uniq { |project| project.path.to_s }
    app_projects.each do |app_project|
      app_touched = false
      app_project.targets.each do |target|
        target.build_phases.each do |build_phase|
          next unless build_phase.respond_to?(:shell_script)
          script = build_phase.shell_script
          next if script.nil? || !script.include?('\`')

          # \`cmd\` -> "$(cmd)". El backtick no anida y no se puede comillar
          # por dentro; \`$( )\` sí, que es justo lo que hace falta cuando el
          # comando de dentro ya lleva sus propias comillas.
          rewritten = script.gsub(/\`([^\`]*)\`/) { "\\"$(#{Regexp.last_match(1)})\\"" }
          next if rewritten == script
          build_phase.shell_script = rewritten
          app_touched = true
        end
      end
      # Se guarda aquí además de dejar que CocoaPods guarde: si su guardado va
      # antes que este hook, el nuestro es el que persiste; si va después,
      # guarda este mismo objeto y el cambio viaja igual.
      app_project.save if app_touched
    end

    installer.pods_project.targets.each do |target|
      target.build_phases.each do |build_phase|
        next unless build_phase.respond_to?(:shell_script)
        script = build_phase.shell_script
        next if script.nil?
        patched = script.dup

        patched = patched.gsub(
          '"$WITH_ENVIRONMENT $SCRIPT_PHASES_SCRIPT"',
          '". \\"$WITH_ENVIRONMENT\\"; \\"$SCRIPT_PHASES_SCRIPT\\""',
        )
        patched = patched.gsub(
          'bash -l -c "$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"',
          'export PROJECT_ROOT="$PODS_ROOT/../.."' + "\\n" +
            'PROJECT_DIR=Pods bash -l -c "\\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\""',
        )

        build_phase.shell_script = patched unless patched == script
      end
    end
`;

      fs.writeFileSync(podfile, contents.replace(match[0], patch));
      return config;
    },
  ]);
}

module.exports = withPodsCodegenPhaseQuoted;
