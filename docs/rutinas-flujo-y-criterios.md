# Rutinas y entrenamientos: criterio de producto y verificación

## Lo que debe poder hacer una persona

1. Elegir su objetivo una vez en el ingreso inicial. Al crear una rutina se propone ese objetivo, pero se puede cambiar.
2. Elegir dónde entrenará. Si es en un gimnasio, se asume el equipamiento habitual. Si es en casa o al aire libre, se pregunta solo por el material que afecta a la selección. Elegir máquinas incluye banco; no se vuelve a preguntar por un dato inferible.
3. Pedir una propuesta de ejercicios compatible con objetivo, experiencia, lugar, material y tiempo. La propuesta explica el papel de cada ejercicio y es editable.
4. Ordenar ejercicios y definir series, repeticiones, descanso, peso y RIR objetivo. Guardar o editar la rutina como una operación completa: ante un error no queda a medias.
5. Publicarla para miembros del mismo gimnasio o dejarla privada. Una rutina pública usa ejercicios del catálogo general. Otros miembros pueden explorarla, copiarla, entrenarla o reportarla.
6. Empezar la rutina crea una sesión con una copia de su plan. Repetir el toque reabre esa sesión. Durante el entrenamiento se ven objetivos, desempeño anterior y temporizador; se registran series y se puede finalizar o cancelar.

## Criterio de recomendación

- Cubrir patrones de empuje, tracción, rodilla, cadera y tronco antes de repetir un patrón. La selección de patrones y la dificultad técnica son consideraciones útiles para principiantes ([Kompf y colaboradores](https://pmc.ncbi.nlm.nih.gov/articles/PMC11873903/)).
- Dar a fuerza, hipertrofia y resistencia rangos iniciales distintos, sin presentar un rango único como receta universal. La [posición de ACSM de 2026](https://pubmed.ncbi.nlm.nih.gov/41843416/) distingue los efectos de la carga, el volumen y el orden de trabajo sobre distintos resultados.
- Reducir complejidad técnica para principiantes y filtrar ejercicios que exigen material no disponible. La persona conserva el control de la selección y de las cargas.
- Para rehabilitación, evitar una propuesta automática. Ante consideraciones físicas declaradas, pedir revisión profesional de la propuesta.
- La recomendación actual es una heurística transparente basada en metadatos del catálogo. No estima lesiones, técnica real ni volumen semanal; conviene ampliar los metadatos de patrones y equipamiento del catálogo para disminuir la dependencia de nombres.

## Criterios de aceptación

| Caso | Resultado esperado |
| --- | --- |
| Guardar rutina completa y repetir la petición | Una sola rutina con todos sus ejercicios |
| Fallar al guardar un ejercicio | No se conserva una rutina incompleta |
| Editar una rutina con sesiones previas | Cambia el plan futuro; los objetivos guardados en sesiones previas permanecen |
| Iniciar dos veces la misma rutina | Se retoma la sesión abierta |
| Intentar iniciar otra rutina con una sesión abierta | Se informa de la sesión existente y se abre en el móvil |
| Registrar dos series con el mismo descanso | El temporizador comienza de nuevo en la segunda serie |
| Publicar con ejercicio personal | Se bloquea con un mensaje explicativo |
| Abrir catálogo desde otro gimnasio | La rutina no aparece ni puede abrirse por URL |
| Recomendar para casa sin banco | No se propone un press que lo requiera |
| Recomendar para principiante | Se evitan levantamientos avanzados |

## Verificación de esta entrega

- Tipado y lint del backend y del monorepo frontend.
- Pruebas del backend sin fixtures de catálogo enriquecido: 101 suites, 749 pruebas.
- Migración aplicada en una instancia temporal de PostgreSQL.
- Bundles Expo exportados para iOS y Android.
- Falta recorrer el flujo con cuentas reales en dispositivos Android e iOS y un catálogo enriquecido. El bundle confirma que el código empaqueta; no reemplaza esa prueba de interacción.

## Próxima validación de producto

Con un gimnasio de pruebas y dos cuentas en el mismo gimnasio, recorrer ingreso inicial → recomendación → creación → edición → publicación → copia → inicio → series → cierre. Repetir con una cuenta de otro gimnasio para comprobar el aislamiento. Medir el porcentaje que completa la primera rutina y la primera sesión, el número de pasos, fallos de guardado, recomendaciones eliminadas y reportes de ejercicios incompatibles. Esas observaciones deben dirigir los ajustes del selector.
