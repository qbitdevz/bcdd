# Modos de BCDD

Leé solo la sección del modo que te toca.

## Fuentes (común a Iniciar, Adoptar y Actualizar)

1. **Descubrir.** Primero lo que el usuario pasó en el mensaje. Después buscá en el repo sin asumir
   estructura: `docs/`, `documentacion/`, `transcripciones/`, `reuniones/`, `meetings/`, `notas/`,
   archivos con fechas o con palabras como reunión, acta, minuta, transcript.
2. **Clasificar.** Separá material del cliente (reuniones, pedidos, documentos suyos) de
   documentación técnica. Solo lo primero es fuente del contrato.
3. **Confirmar una sola vez.** Mostrá la lista y preguntá: "¿Es todo, o hay material en otro lado
   (Drive, mails, chats, audios)?". Si no hay quien responda, seguí y declaralo.
4. **Declarar.** Sección 6: cada ruta usada y cada fuente externa que no pudiste leer.
5. **Material extenso.** Si no entra todo junto, procesá un archivo por vez: extraé de cada uno
   problema, reglas, pedidos, descartes y preguntas con su puntero, y redactá recién al final desde
   esas notas. No resumas de memoria lo que no leíste.
6. **Audio o video sin transcribir.** No lo podés leer: pedí la transcripción y anotalo como externo.
7. **Apuntes propios.** Si son notas del usuario y no palabras del cliente, separá lo que dijo el
   cliente (fuente: la nota) de lo que agrega el usuario (fuente `equipo`, "A confirmar"). Si no se
   distingue, preguntá una vez; sin respuesta, tratá lo dudoso como `equipo`.
8. **Lluvia de ideas con el cliente.** Lo que el cliente aceptó entra como regla o requisito; lo que
   solo se mencionó como posibilidad queda "A confirmar"; lo que se descartó va a Fuera de alcance.
   Idear sin el cliente cómo construir algo no es fuente del contrato.
9. **Datos sensibles.** Si las fuentes están en un repo versionado y traen precios, datos personales
   o información reservada, avisalo en una línea. No toques `.gitignore`.

Cuando dos fuentes se contradicen vale la más reciente y la contradicción se anota en Cambios.

## Iniciar

Proyecto sin contrato y sin código propio. Extraé: problema, resultados visibles, actores, flujo
principal, reglas de negocio y todo lo conversado que se descartó o postergó. Versión 1, `borrador`.
Lo que propone el equipo y el cliente todavía no validó entra con fuente `equipo` y estado
"A confirmar".

## Adoptar

Proyecto con código o historial y sin contrato. Además de las fuentes, leé el código (qué hace hoy,
visto por quien lo usa), `odd/tasks/*.md` si existen, el historial reciente de git, el README y la
memoria persistente si está disponible.

- El código dice qué hace el sistema, no qué se acordó. Lo que solo sale del código lleva fuente
  `código`; si ninguna reunión lo respalda, queda "A confirmar".
- "A confirmar" con fuente `código` significa: el sistema ya lo hace, pero nadie lo acordó. No hace
  falta otro estado para decirlo.
- **Si el sistema hace algo distinto de lo acordado** (por ejemplo, otro plazo u otro límite), la
  regla se escribe como se acordó, y la diferencia va como pregunta abierta ("se acordó X, el
  sistema hoy hace Y: ¿se corrige?") y como "Diferencia detectada" en Cambios. No elijas vos cuál vale.
- Escribí en lenguaje llano las reglas que el código ya aplica. Es lo más valioso de adoptar.
- Marcá "Entregado" únicamente lo que el usuario confirme como entregado o lo que tenga evidencia
  explícita de cierre (por ejemplo, tarea cerrada con verificación en `odd/tasks/`).
- "Fuera de alcance" no se deduce del código. Si no hay fuente, escribí "Sin exclusiones
  registradas" y preguntá.
- Completá el aviso de reconstrucción de la plantilla.
- En repos grandes, trabajá por módulo (ver `redaccion.md`, Proyectos grandes).

## Actualizar

1. Leé el contrato vigente completo; después, el material nuevo completo.
2. Clasificá cada hallazgo: Nuevo, Modificado, Eliminado, o pasa a Fuera de alcance. Aplica igual a
   las reglas: una regla que cambia se reescribe en su fila y el antes/ahora va a Cambios.
3. **Antes de escribir**, mostrá el impacto en una lista corta y marcá lo que contradice algo ya
   aprobado o ya entregado. Si el usuario está presente, esperá su visto bueno.
4. Escribí: `version` +1, `actualizado`, `ultima_fuente`, `estado: borrador`, vaciá
   `aprobado_equipo` y `aprobado_cliente`, y agregá la entrada en Cambios (la más nueva arriba).
5. Recalculá la columna Cambio de todas las filas respecto de la versión anterior.
6. Un requisito o regla eliminado queda como Descartado/Descartada durante esa versión; en la
   siguiente sale de la tabla y solo queda en Cambios.
7. Cerrá las preguntas abiertas que el material nuevo responde y anotá la respuesta en Cambios.

## Consultar

Respondé desde el contrato citando ID. No modifiques nada. Si preguntan por el avance de
construcción, el contrato no lo sabe: miralo en `odd/tasks/` o en el seguimiento del proyecto y
decí de dónde lo sacaste.

## Compartir

Genera la versión para el cliente. No cambia el contrato.

1. **Mensaje:** redactá el texto con `assets/mensaje-cliente.md` y mostralo en la respuesta.
2. **Documento (si lo piden o el mensaje no alcanza):**
   `node <carpeta de la skill>/scripts/exportar.mjs <contrato>` genera `contrato-cliente.html` junto
   al contrato: una página lista para enviar o imprimir a PDF, sin rutas internas.
3. Recordale al usuario que la respuesta del cliente vuelve a entrar por Actualizar o Aprobar.

## Aprobar

Solo cuando una persona lo dice de forma explícita.

- Aprobación de quien dirige el proyecto: `estado: aprobado` y
  `aprobado_equipo: [nombre] · [fecha]`.
- Aprobación del cliente: `aprobado_cliente: [nombre] · [fecha] · [medio: mail, WhatsApp, reunión]`.
- Con la respuesta del cliente, pasá a "Acordado/Acordada" lo que confirmó y registralo en Cambios.
- Cualquier cambio posterior vuelve todo a `borrador`.

## Construir

BCDD no implementa. Cuando piden construir algo del contrato:

- Si está en `borrador`, avisalo y pedí confirmación.
- Pasá referencias, no resúmenes: ruta del contrato, ID a construir y rutas de sus fuentes.
- Rigen las reglas de la sección 7 del contrato. Seguí después el flujo de desarrollo del proyecto
  (ODD u otro); tareas, pruebas y evidencia viven ahí, no en el contrato.
- Cuando el usuario confirme la entrega de un requisito, cambiá su Estado a "Entregado". Nada más.
