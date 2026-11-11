# BCDD — Business Contract Driven Development

**Que el cliente, el PM y el desarrollador entiendan lo mismo antes de que el agente escriba código.**

Con agentes de IA, construir dejó de ser lo lento. El cuello de botella ahora es entender qué hay que
construir y bajo qué reglas. BCDD es una skill para agentes de código (Claude Code, Pi / gentle-shell,
Codex, OpenCode) que toma lo que ya tenés — transcripciones de reuniones, documentos, chats, tus
propias ideas — y mantiene **un solo archivo** por proyecto, el contrato de negocio:

- el problema, en una frase;
- lo que el cliente va a notar;
- **las reglas del negocio**, en lenguaje llano;
- un diagrama de cómo funciona;
- lo que queda **fuera de alcance**;
- los requisitos y su estado;
- qué cambió desde la reunión anterior.

Se lee en dos minutos. Después el agente lo usa como frontera de lo que puede construir.

> **Estado: versión 0.3, en prueba.** El instalador y las herramientas tienen pruebas automáticas.
> Falta validación en uso real con cada agente y del instalador de Windows. Si algo falla, abrí un
> issue: es justo lo que hace falta saber.

## Instalar

Un comando, desde la raíz de tu proyecto:

**macOS / Linux / WSL**

```bash
curl -fsSL https://raw.githubusercontent.com/qbitdevz/bcdd/main/scripts/install.sh | sh
```

**Windows (PowerShell)**

```powershell
irm https://raw.githubusercontent.com/qbitdevz/bcdd/main/scripts/install.ps1 | iex
```

Copia la skill a `.claude/skills/bcdd/` y `.agents/skills/bcdd/`. No toca ningún otro archivo. El
paquete queda guardado en `~/.bcdd/pkg`.

**Volver a ejecutar el mismo comando actualiza a la última versión.**

Con Node 18 o superior (ya lo tenés si usás gentle-shell o Pi) se suman el doctor, el lint, la regla
para `AGENTS.md` y la página para el cliente. Sin Node se instala igual la skill, en modo básico.

Para pasar opciones:

```bash
curl -fsSL https://raw.githubusercontent.com/qbitdevz/bcdd/main/scripts/install.sh | sh -s -- --with-rule
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/qbitdevz/bcdd/main/scripts/install.ps1))) --with-rule
```

| Opción | Qué hace |
|---|---|
| `--with-rule` | Agrega 3 líneas a `AGENTS.md` (o a `CLAUDE.md`, según cuál use el proyecto) para que el agente respete el contrato aunque no invoques la skill. Van entre marcadores `bcdd`; el resto del archivo no se modifica y al desinstalar queda exactamente como estaba. |
| `--no-rule` | Quita esa regla. |
| `--global` | Instala en `~/.claude/skills` y `~/.agents/skills`, para todos tus proyectos. |
| `--target claude\|agents\|both` | Elige la carpeta. Por defecto, ambas. Si usás solo OpenCode, elegí una. |
| `--dir <ruta>` | Proyecto destino, si no es el directorio actual. |
| `--force` | Sobrescribe una skill que modificaste a mano, guardando una copia antes. |

Si preferís revisar el script antes de ejecutarlo, descargalo, leelo y corrélo a mano. También podés
clonar el repo y usar `node install.mjs` directamente.

Una vez instalado, los demás comandos se corren así (en Windows, `node $HOME\.bcdd\pkg\install.mjs`):

```bash
node ~/.bcdd/pkg/install.mjs doctor
```

## Usar

| Querés… | Hacé |
|---|---|
| Empezar un proyecto | Pasale la transcripción o las notas e invocá la skill |
| Sumarlo a un proyecto en curso | Pedile "adoptá BCDD en este proyecto" |
| Incorporar una reunión nueva | Pasale la transcripción: muestra el impacto y actualiza |
| Mandarle el resumen al cliente | Pedile "compartir con el cliente": arma el mensaje y, si querés, una página lista para enviar o imprimir a PDF |
| Registrar una aprobación | Decile quién aprobó; nunca aprueba por su cuenta |
| Saber qué quedó afuera o qué cambió | Preguntalo; responde desde el contrato |
| Construir | Aprobá el contrato y pedí la implementación como siempre |

Invocación: `/bcdd` (Claude Code, OpenCode), `/skill:bcdd` (Pi, gentle-shell), `$bcdd` (Codex).
También se activa sola cuando le pasás material de una reunión.

El contrato se guarda en `bcdd/contrato.md`. Tus transcripciones y documentos **se quedan donde están**:
el contrato solo anota sus rutas. Para adaptar el formato sin tocar la skill, dejá tu propia
`plantilla.md` junto al contrato.

## Doctor: ¿está bien instalada y al día?

```bash
node ~/.bcdd/pkg/install.mjs doctor
```

Revisa, sin modificar nada:

- que la skill esté completa y sin alteraciones (compara cada archivo contra lo instalado);
- que la regla de `AGENTS.md` siga en su lugar y no esté dañada ni desactualizada;
- que `bcdd` figure en el registro de skills de gentle-ai, si lo usás;
- que los contratos del proyecto sean válidos;
- si el repo tiene una versión más nueva.

Corré el doctor después de cualquier `gentle-ai sync`, `gentle-shell upgrade` o actualización de tus
herramientas. También podés pedírselo al agente: el doctor viaja dentro de la skill
(`scripts/doctor.mjs`).

Sin conexión, el chequeo de versión se omite y el resto funciona igual.

## Actualizar

```bash
node ~/.bcdd/pkg/install.mjs update
```

Lo más simple es volver a ejecutar el comando de instalación: descarga la última versión y actualiza.
`update` reinstala **solo donde ya estaba**, conservando la regla si la tenías; si el paquete es un
clon de git, antes hace `git pull`. Si modificaste la skill a mano, no la pisa: avisa y pide `--force`.

## Validar un contrato

```bash
node ~/.bcdd/pkg/install.mjs lint bcdd/contrato.md
```

Detecta reglas sin fuente, requisitos sin "Listo cuando", referencias rotas, estados inválidos, jerga
técnica y secciones faltantes. El agente lo ejecuta solo al terminar cada pasada.

## Desinstalar

```bash
node ~/.bcdd/pkg/install.mjs uninstall
```

Quita la skill y la regla. Tus contratos y tus fuentes no se tocan.

## Cómo convive con ODD, gentle-ai y Engram

- **Va antes, no en lugar de.** BCDD define qué se acordó; ODD (o tu flujo) decide cómo construirlo.
- **No duplica.** Tareas, pruebas y evidencia siguen en `odd/tasks/`. El contrato no sigue el avance.
- **Pasa referencias, no resúmenes.** Quien construye lee el contrato y la fuente original.
- **Las reglas para construir viajan en el contrato** (sección 7), así las respeta cualquier agente.
- **No es obligatoria.** Bugfixes, refactors y cambios técnicos no pasan por BCDD.
- **Memoria:** si hay Engram, guarda solo una nota con la ruta y la versión del contrato.

Diseñada según la documentación de gentle-ai 4.x, gentle-shell 4.x y Engram 1.x, y conforme a la
especificación Agent Skills y a la guía de estilo de skills de gentle-shell. Funciona sin ninguna de
esas herramientas.

## Contenido

```
skills/bcdd/SKILL.md            reglas y tabla de decisión para el agente
skills/bcdd/references/         modos de uso y guía de redacción
skills/bcdd/assets/             plantilla, ejemplo completo y formato del mensaje al cliente
skills/bcdd/scripts/            lint, exportar y doctor
snippets/agents-rule.md         la regla opcional para AGENTS.md
docs/METODOLOGIA.md             la metodología explicada
tests/                          pruebas automáticas y caso de prueba manual
scripts/install.sh · install.ps1 instalación en un comando
install.mjs                     install · update · doctor · uninstall · lint
```

## Contribuir

Probala en un proyecto real y contá qué pasó: qué entendió bien el agente, qué no, y si tu cliente
entendió el contrato. `tests/prueba-manual.md` tiene un recorrido guiado.

Pruebas automáticas: `node tests/run.mjs`. Licencia MIT.
