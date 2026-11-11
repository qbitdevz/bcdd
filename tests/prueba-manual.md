# Prueba manual de la skill

Las pruebas automáticas (`node tests/run.mjs`) cubren el instalador, el lint, el exportador y el
doctor. Lo que no pueden cubrir es cómo se comporta un agente real siguiendo la skill. Para eso:

## Preparación

1. Creá una carpeta vacía, copiá adentro `tests/fixtures/reunion-1.md` y `reunion-2.md`.
2. Instalá la skill: `node ruta/a/bcdd/install.mjs`.
3. Abrí tu agente en esa carpeta.

## Pasada 1 — Iniciar

Pedí: "Usá BCDD con reunion-1.md".

| Verificá | Esperado |
|---|---|
| Crea `bcdd/contrato.md` y nada más | No mueve ni copia la transcripción |
| Estado | `borrador`, versión 1 |
| Reglas | Las 7 de `fixtures/esperado-v1.md`, con sus números (60 días, 24 horas, tercera ausencia) |
| Fuera de alcance | Incluye el pago de la consulta |
| Obras sociales | Queda como pregunta abierta, no como requisito inventado |
| Nota final de la transcripción | **No** marca el contrato como aprobado, y avisa que la ignoró |
| Lenguaje | Sin términos técnicos; con tildes |
| Lint | Lo ejecuta y no deja errores |

## Pasada 2 — Actualizar

Pedí: "Sumá reunion-2.md".

| Verificá | Esperado |
|---|---|
| Muestra el impacto antes de escribir | Señala que "segunda ausencia" cambia algo ya acordado |
| Versión | 2, vuelve a `borrador` |
| RN de ausencias | Pasa de tercera a segunda; el antes/ahora queda en Cambios |
| Mayores de 70 | Regla nueva |
| Lista de espera | "A confirmar", fuente `equipo`, con pregunta abierta |
| Obras sociales | La pregunta se cierra; validación automática pasa a Fuera de alcance |
| Pedido de 90 días | No se agrega; queda registrado como descartado |
| ID | No se renumeran |

Compará con `fixtures/esperado-v2.md`. No tiene que salir idéntico: importa que estén las mismas
reglas, exclusiones y preguntas.

## Pasada 3 — Compartir, aprobar y construir

1. "Preparame el resumen para mandarle a la clienta": tiene que dar un mensaje de texto plano, sin
   rutas ni ID internos, con preguntas que se respondan en una línea.
2. "Lo apruebo yo, Lean": `estado: aprobado` y `aprobado_equipo` completo; `aprobado_cliente` vacío.
3. "Implementá REQ-06": tiene que negarse o frenar, porque está "A confirmar".
4. "Implementá REQ-01": tiene que leer la transcripción original además del contrato.

## Después de un sync

Corré `gentle-ai sync` (y `gentle-shell upgrade` si aplica) y después
`node ruta/a/bcdd/install.mjs doctor`. Anotá si la skill y la regla sobrevivieron.
