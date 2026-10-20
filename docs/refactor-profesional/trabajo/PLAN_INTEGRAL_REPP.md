# Plan de rediseño integral — REPP

**Estado:** plan de trabajo propuesto, basado en decisiones del usuario del 2026-10-13.  
**Nombre público oficial:** REPP.  
**Prioridad de audiencias:** atleta → gimnasio → administración de plataforma.  
**Alcance:** experiencia completa de producto, marca y lanzamiento; web, móvil, servicios y consolas.

## 1. Decisiones ya tomadas

- REPP es el nombre público oficial. La referencia de marca es `/Users/pablo/Downloads/REPP_identidad_visual.html`, identidad V1.0.
- El rediseño incluye todo el producto y sus superficies de lanzamiento. Se atenderán primero las necesidades del atleta, luego las del gimnasio y finalmente las de administración de plataforma.
- La app no parte de cero: hay auditorías, propuestas visuales, componentes compartidos, lógica de negocio y flujos ya implementados. Se conservará y mejorará lo que funcione, con evidencia.
- El pago de registro de Google Play Console de la captura es una dependencia operativa del lanzamiento. El rechazo `OR_FGVEM_40` indica fondos insuficientes; no es una pantalla de REPP para rediseñar.

## 2. Alcance completo

| Área | Incluye |
|---|---|
| Marca y contenidos | Nombre REPP en superficies públicas, logotipo e isotipo, iconos, tipografía, tono de voz, imágenes, materiales de tienda y reglas de uso. |
| Web pública | Inicio y páginas de producto, directorio de gimnasios, páginas legales, acceso, registro, recuperación y rutas de conversión. |
| App del atleta | Onboarding, perfil, inicio, rutinas, planes, ejercicios, sesión de entrenamiento, progresión, comunidad, chat, historias, membresía, acceso, notificaciones y ayuda. |
| App móvil | Flujos equivalentes en iOS y Android, comportamiento nativo, navegación, permisos, notificaciones, estados sin conexión y adaptación a tamaños de pantalla. |
| Portal del gimnasio | Operación diaria, socios, membresías, cobros donde existan, acceso, personal y permisos, equipamiento, instalaciones, moderación local, auditoría e informes. |
| Administración REPP | Operación de plataforma, soporte, moderación global, permisos, auditoría, catálogo oficial, métricas, herramientas de calidad y gestión de datos. |
| Backend y datos | Contratos API, autenticación y autorización, persistencia, migraciones, archivos y medios, notificaciones, eventos, observabilidad, rendimiento, privacidad y recuperación. |
| Lanzamiento | Fichas de App Store y Google Play, nombre visible, descripción, capturas, iconos, enlaces legales, requisitos de cuenta y lista de salida a producción. |

El rediseño puede requerir cambios de comportamiento o contratos cuando un hallazgo de experiencia los justifique. Cada cambio de reglas, permisos, datos o compatibilidad se documentará y verificará por separado; una actualización visual no cambia silenciosamente políticas del producto.

## 3. Fuente de marca y dirección visual

### Identidad confirmada

- **Jade REPP:** `#2E8B7B`, acento de marca.
- **Navy profundo:** `#0F172A`, base oscura y fondos de marca.
- **Niebla:** `#E9EEF2`, base clara y superficies neutras.
- **Tipografía de apoyo:** Inter o Manrope; la identidad no prescribe una fuente display distinta.
- **Logotipo:** usar el SVG vectorial entregado. No reconstruir las letras con una fuente ni alterar proporciones, gesto jade o cortes.
- **Carácter:** deportivo, tecnológico, limpio y legible; fotografía de entrenamiento auténtica y composición ordenada.

### Trabajo de sistema visual

1. Extraer y versionar los vectores oficiales, preparar variantes sobre fondo claro y oscuro, isotipo, icono de aplicación y tamaños mínimos.
2. Definir roles semánticos para texto, fondos, superficies, bordes, acento, foco, éxito, advertencia y error en tema claro y oscuro.
3. Medir contraste de cada combinación real. El jade se conserva en el logotipo; los colores funcionales de texto y estados pueden usar tonos accesibles derivados, documentados y probados.
4. Crear tokens compartidos para web y móvil, catálogo de componentes, estados, espaciado, tipografía, iconos y movimiento.
5. Inventariar y retirar gradualmente el nombre anterior y el acento volt de la experiencia pública. Las referencias internas, identificadores técnicos, bundle IDs, API y datos se migran solo con mapa de compatibilidad y motivo de producto.

La identidad HTML define muestras principales, pero no todas las variantes necesarias para una interfaz completa. Los tonos derivados para accesibilidad y tema oscuro se tratarán como decisiones del sistema, no como cambios al logotipo oficial.

## 4. Secuencia de trabajo

### Fase 0 — Inventario real y protección del trabajo existente

- Revisar las ramas y cambios locales de `GymSheetFrontend`, `GymSheetBackend` y la consola de sistema.
- Inventariar rutas, pantallas, roles, estados y dependencias de web, móvil, portal de gimnasio y administración.
- Relacionar el inventario existente (`INVENTARIO.md`, `MAPA_UX.md`, `ADMIN_GIMNASIO.md`) con el estado actual de cada repositorio.
- Marcar cada elemento como observado, existente, pendiente, duplicado o propuesto. Identificar cambios locales ajenos al rediseño antes de editar.
- Registrar baseline visual, funcional, de accesibilidad y rendimiento con versiones, dispositivos, cuentas de QA y entorno reproducibles.

**Salida:** alcance firmado en documentación, mapa de superficies y riesgos; lista priorizada de flujos con evidencia inicial.

### Fase 1 — Fundamento REPP

- Adoptar la identidad REPP como marca pública en la web, móvil, mensajes de producto y tiendas.
- Crear tokens de marca y de interfaz con paridad web/móvil, incluyendo claro/oscuro, foco, error y estados deshabilitados.
- Actualizar logo, isotipo, tipografía de apoyo, controles y componentes base.
- Definir accesibilidad, tamaños táctiles, contraste, escalado de texto, movimiento reducido, carga, vacío, error, conexión lenta y sin conexión.
- Preparar un prototipo de referencia del inicio del atleta y del entrenamiento activo.

**Puerta de salida:** sistema visual probado con contenido real, nombres largos, distintos tamaños y contraste; componentes base aprobados antes del barrido de pantallas.

### Fase 2 — Atleta: descubrir, entrenar y progresar

Orden de diseño y ejecución de flujos completos:

1. Alta, onboarding, objetivos, perfil y selección de gimnasio.
2. Inicio orientado al siguiente paso útil: entrenar, continuar sesión o elegir rutina.
3. Descubrir rutinas y ejercicios, filtrar, guardar, crear y activar un programa.
4. Día de entrenamiento: orden de ejercicios, series, repeticiones, cargas, descansos y superseries.
5. Sesión en curso: registrar series con baja fricción, temporizador, recuperación ante interrupciones y cierre.
6. Resumen, progresión, marcas, calendario e historial.
7. Comunidad, perfiles, compartir rutinas, comentarios, chat e interacciones.
8. Membresía, acceso al gimnasio, notificaciones y ayuda.

Cada flujo se recorre desde su punto de entrada hasta la persistencia del resultado, incluyendo primera visita, uso habitual, carga, error, datos vacíos y permisos denegados.

**Puerta de salida:** una persona puede encontrar una rutina, comenzar una sesión, registrar ejercicios, terminarla y comprender su progreso en web y móvil; pruebas de usabilidad del flujo y evidencia por plataforma.

### Fase 3 — Gimnasio: operar el servicio

- Inicio operativo según el rol y tareas frecuentes del personal.
- Buscar, registrar, invitar y gestionar socios.
- Administrar ciclo de membresía y cobros según las capacidades vigentes.
- Controlar acceso y resolver fallos en recepción.
- Gestionar personal, roles y permisos; aislar datos por gimnasio.
- Mantener equipamiento, instalaciones y catálogos locales.
- Consultar actividad, informes, moderación local, auditoría y soporte.

**Puerta de salida:** tareas frecuentes se completan con cuentas de cada rol y datos aislados por tenant; acciones delicadas muestran alcance, confirmación y registro de auditoría.

### Fase 4 — Administración de plataforma REPP

- Separar claramente administración del gimnasio y administración global.
- Consolidar operaciones, gestión de gimnasios, usuarios, catálogo oficial, moderación, soporte, permisos y auditoría.
- Diseñar herramientas de sistema existentes o propuestas (QA Lab, catálogo de datos y analítica) según sus contratos reales; no presentar mocks como datos de producción.
- Mostrar contexto, alcance e impacto antes de acciones globales; ofrecer historial y recuperación cuando corresponda.
- Proteger acceso multi-tenant, datos personales, información de salud y acciones de alto impacto.

**Puerta de salida:** las operaciones de sistema se verifican con `SYSTEM_ADMIN`; se comprueba que roles de gimnasio no accedan a datos de otros tenants ni a acciones globales.

### Fase 5 — Presencia pública y lanzamiento

- Alinear web pública, mensajes de registro y directorio con REPP.
- Preparar icono, capturas, descripción, categoría, enlaces legales y materiales de App Store/Google Play.
- Auditar cadenas visibles, deep links, correo/notificaciones y políticas legales para eliminar inconsistencias de nombre.
- Añadir el registro de Play Console a la lista operativa: resolver el medio de pago rechazado, confirmar el perfil de desarrollador y verificar propiedad de activos.

**Puerta de salida:** la persona reconoce REPP de forma consistente desde el anuncio y la ficha de tienda hasta la primera sesión real.

### Fase 6 — Servicios, seguridad y calidad transversal

- Trazar cada flujo a su API, esquema, permisos, tablas, notificaciones y telemetría.
- Corregir contratos o backend donde sean causa demostrable de fricción, errores o falta de recuperación.
- Revisar sesión segura, permisos, aislamiento de tenant, carga de medios, privacidad, borrado/exportación y retención.
- Definir eventos de producto mínimos para conocer éxito de tareas; evitar incluir texto libre, nombres o datos sensibles innecesarios.
- Medir tiempos de respuesta y estabilidad en dispositivos y redes representativos.
- Mantener compatibilidad durante migraciones y preparar rollback de cambios de datos y cliente.

**Puerta de salida:** no hay flujo de interfaz que aparente haber guardado una acción que el servidor no persistió; errores y reintentos quedan claros y medibles.

### Fase 7 — Verificación y despliegue gradual

- Revisar recorridos de atleta, gimnasio y sistema en web, iOS y Android.
- Verificar accesibilidad con automatización y revisión manual; usar WCAG 2.2 AA como objetivo para web y principios equivalentes en móvil.
- Revisar responsive, lectura con tamaños grandes, contraste, teclado/lector de pantalla, movimiento reducido y objetivos táctiles.
- Ejecutar pruebas de regresión funcionales, visuales y de permisos sobre entornos de QA con evidencia.
- Lanzar por cohortes o fases, observar métricas y errores, documentar soporte y rollback.

**Salida:** registro por plataforma de lo entregado, evidencia ejecutada, limitaciones conocidas, responsable operativo y siguiente revisión.

## 5. Medición del resultado

Primero se medirá la línea base; luego se fijarán objetivos numéricos con datos reales. No se prometerán mejoras porcentuales antes de observar el baseline.

| Audiencia | Señales de éxito a medir |
|---|---|
| Atleta | Tiempo hasta iniciar primer entrenamiento; éxito al registrar una sesión; sesiones terminadas; uso de rutinas; retención de semana 1 y semana 4; errores o abandonos por paso. |
| Gimnasio | Tiempo para registrar/buscar un socio; éxito de check-in; tiempo para resolver una incidencia de membresía; errores operativos; tareas completadas por rol. |
| Administración REPP | Tiempo de resolución de soporte/moderación; casos reabiertos; acciones globales revertidas; precisión de permisos; incidentes de aislamiento; frescura y completitud de métricas. |
| Plataforma | Fallos, latencia, crash-free sessions, accesibilidad, errores de API, consumo y estabilidad de medios/notificaciones. |

## 6. Reglas de ejecución

- Trabajar por flujos completos y entregables revisables; evitar un cambio masivo sin validación intermedia.
- Mantener la prioridad de audiencias: el trabajo de atleta precede al de gimnasio, y el de gimnasio al de administración global, después de la fase común de inventario y marca.
- No cambiar contratos, permisos, cálculos de entrenamiento o reglas de negocio solo por estética. Registrar explícitamente cada cambio funcional.
- Mantener la lógica compartida en `packages/*`; revisar impacto en móvil cuando cambien tipos, esquemas, dominio o componentes compartidos.
- Separar diffs de cambios preexistentes y no sobrescribir trabajo local de otras iniciativas.
- Registrar evidencia real y diferenciar lo inspeccionado en código de lo probado en dispositivo o navegador.
- No introducir dependencias visuales o reescrituras de framework sin una necesidad observada y una comparación de costo.

## 7. Riesgos conocidos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| La identidad REPP usa jade y navy; la interfaz actual conserva GymSheet/volt en distintas áreas. | Inventario de tokens y nombres; migración semántica por componentes con contraste y paridad de tema. |
| La guía de marca V1.0 no define todos los colores de estado ni tonos para accesibilidad. | Definir una escala derivada, registrar ratios y mantener intactos los colores del logo. |
| Web, móvil, backend y consolas viven en repositorios y estados distintos. | Baseline por repo, matriz de dependencias y cambios pequeños con evidencia. |
| La auditoría visual previa del móvil tenía limitaciones de captura, mientras otras pasadas cubrieron pantallas concretas. | Reusar evidencia útil y completar huecos por dispositivo, estado y audiencia; no generalizar resultados parciales. |
| Herramientas de consola pueden usar mocks o contratos aún no implementados. | Etiquetar datos simulados y cerrar contratos antes de afirmar cobertura de producción. |
| El registro de Play Console está bloqueado por el medio de pago. | Tratarlo como dependencia de lanzamiento y darle seguimiento operativo independiente del producto. |

## 8. Próximos entregables concretos

1. Matriz única de rutas, pantallas, roles, plataforma, estados y repositorio.
2. Auditoría visual y funcional inicial con evidencia de atleta, gimnasio y administración.
3. Inventario de cadenas y activos con marca anterior, más mapa de reemplazo público y técnico.
4. Sistema visual REPP para web y móvil, con tokens, logos, tipografía, estados y contraste.
5. Prototipo revisable de los flujos atleta: inicio, detalle de rutina, día y entrenamiento activo.
6. Backlog priorizado, dependencias, criterios de aceptación y estrategia de despliegue por fase.

El trabajo de implementación comienza después de que esos entregables permitan revisar la dirección, y avanza con la secuencia de fases descrita arriba.
