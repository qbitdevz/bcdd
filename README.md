# 📜 BCDD — Business Contract Driven Development

**Que el cliente, el PM y el desarrollador entiendan lo mismo antes de que el agente escriba código.**

Con agentes de IA, construir dejó de ser lo lento. El cuello de botella ahora es entender qué hay que
construir y bajo qué reglas. BCDD es una skill para agentes de código (Claude Code, Pi / gentle-shell,
Codex, OpenCode) que toma lo que ya tenés — transcripciones de reuniones, documentos, chats, tus
propias ideas — y mantiene **un solo archivo** por proyecto, el contrato de negocio:

- 🎯 el problema, en una frase;
- 👀 lo que el cliente va a notar;
- 📏 **las reglas del negocio**, en lenguaje llano;
- 🔀 un diagrama de cómo funciona;
- 🚫 lo que queda **fuera de alcance**;
- 📋 los requisitos y su estado;
- 📝 qué cambió desde la reunión anterior.

Se lee en dos minutos. Después el agente lo usa como frontera de lo que puede construir.
La metodología completa está en [`docs/METODOLOGIA.md`](docs/METODOLOGIA.md).

| Para quién | Qué le resuelve |
|---|---|
| 👤 **Cliente** | Confirma en dos minutos que eso es lo que necesita, sin leer documentación técnica |
| 🧭 **PM / quien dirige** | Ve qué entra, qué no, qué cambió en cada reunión y qué falta decidir |
| 💻 **Desarrollador** | Recupera el mapa de reglas de negocio que ya no arma escribiendo el código |

> 🚧 **Estado: versión 0.3, en prueba.** El instalador y las herramientas tienen pruebas automáticas.
> Falta validación en uso real con cada agente y del instalador de Windows. Si algo falla, abrí un
> issue: es justo lo que hace falta saber.

<a id="indice"></a>

## 📑 Índice

- 🚀 [Instalar](#instalar) · ⚙️ [Opciones](#opciones)
- 💬 [Usar](#usar)
- 🧰 [Comandos](#comandos)
- 🩺 [Doctor](#doctor)
- 🔄 [Actualizar](#actualizar)
- ✅ [Validar un contrato](#validar)
- 📄 [Página para el cliente](#pagina-cliente)
- 🗑️ [Desinstalar](#desinstalar)
- 📂 [Qué archivos crea](#archivos)
- 🔧 [Variables de entorno](#variables)
- 🤝 [Cómo convive con ODD, gentle-ai y Engram](#convivencia)
- 🗂️ [Contenido del repo](#contenido)
- 🙌 [Contribuir](#contribuir)

<a id="instalar"></a>

## 🚀 Instalar

Un comando, desde la raíz de tu proyecto:

🍎🐧 **macOS / Linux / WSL / Git Bash**

```bash
curl -fsSL https://raw.githubusercontent.com/qbitdevz/bcdd/main/scripts/install.sh | sh
```

🪟 **Windows (PowerShell 5.1 o 7)**

```powershell
irm https://raw.githubusercontent.com/qbitdevz/bcdd/main/scripts/install.ps1 | iex
```

Descarga el paquete en `~/.bcdd/pkg` y copia la skill a `.claude/skills/bcdd/` y
`.agents/skills/bcdd/` del proyecto. El detalle de lo que escribe está en
[Qué archivos crea](#archivos).

🔁 **Volver a ejecutar el mismo comando actualiza a la última versión.**

**📦 Requisitos**

| Para | Hace falta |
|---|---|
| `install.sh` | `sh`, `tar` y `curl` o `wget` |
| `install.ps1` | PowerShell 5.1 o superior (Windows 10/11 ya lo trae) |
| Doctor, lint, página para el cliente, regla en `AGENTS.md` | Node 18 o superior (ya lo tenés si usás gentle-shell o Pi) |

Sin Node se instala igual la skill, en modo básico: solo se copia, con o sin `--global`. Cualquier
otra opción o comando pide Node.

<a id="opciones"></a>

### ⚙️ Opciones

Las opciones se pasan así:

```bash
curl -fsSL https://raw.githubusercontent.com/qbitdevz/bcdd/main/scripts/install.sh | sh -s -- --with-rule
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/qbitdevz/bcdd/main/scripts/install.ps1))) --with-rule
```

En PowerShell también podés usar la forma corta con la variable `BCDD_ARGS`:

```powershell
$env:BCDD_ARGS = '--with-rule'; irm https://raw.githubusercontent.com/qbitdevz/bcdd/main/scripts/install.ps1 | iex
```

| Opción | Qué hace |
|---|---|
| `--with-rule` | Agrega 3 líneas a `AGENTS.md` (o a `CLAUDE.md`, según cuál use el proyecto) para que el agente respete el contrato aunque no invoques la skill. Van entre marcadores `bcdd`; el resto del archivo no se modifica y al desinstalar queda exactamente como estaba. Una vez agregada, las reinstalaciones la conservan. |
| `--no-rule` | Quita esa regla. |
| `--global` | Instala en `~/.claude/skills` y `~/.agents/skills`, para todos tus proyectos. La regla es por proyecto, así que con `--global` no se agrega. |
| `--target claude\|agents\|both` | Elige la carpeta. Por defecto, ambas. Si usás solo OpenCode, elegí una. |
| `--dir <ruta>` | Proyecto destino, si no es el directorio actual. |
| `--force` | Sobrescribe una skill que modificaste a mano, guardando una copia antes. |
| `--offline` | No consulta el repo (doctor, update). |
| `--no-pull` | En `update`, no ejecuta `git pull`. |

Si preferís revisar el script antes de ejecutarlo, descargalo, leelo y correlo a mano. También podés
clonar el repo y usar `node install.mjs` directamente.

<a id="usar"></a>

## 💬 Usar

| Querés… | Hacé |
|---|---|
| Empezar un proyecto | Pasale la transcripción o las notas e invocá la skill |
| Sumarlo a un proyecto en curso | Pedile "adoptá BCDD en este proyecto" |
| Incorporar una reunión nueva | Pasale la transcripción: muestra el impacto y actualiza |
| Mandarle el resumen al cliente | Pedile "compartir con el cliente": arma el mensaje y, si querés, una [página lista para enviar o imprimir a PDF](#pagina-cliente) |
| Registrar una aprobación | Decile quién aprobó; nunca aprueba por su cuenta |
| Saber qué quedó afuera o qué cambió | Preguntalo; responde desde el contrato |
| Construir | Aprobá el contrato y pedí la implementación como siempre |

Invocación: `/bcdd` (Claude Code, OpenCode), `/skill:bcdd` (Pi, gentle-shell), `$bcdd` (Codex).
También se activa sola cuando le pasás material de una reunión.

El contrato se guarda en `bcdd/contrato.md`; lo crea el agente, no el instalador. Tus transcripciones
y documentos **se quedan donde están**: el contrato solo anota sus rutas. Para adaptar el formato sin
tocar la skill, dejá tu propia `plantilla.md` junto al contrato.

<a id="comandos"></a>

## 🧰 Comandos

Una vez instalado, el instalador queda en `~/.bcdd/pkg/install.mjs`. La ruta se escribe distinto
según la terminal:

```bash
# macOS / Linux / WSL / Git Bash
node ~/.bcdd/pkg/install.mjs doctor
```

```powershell
# Windows PowerShell
node $HOME\.bcdd\pkg\install.mjs doctor
```

| Comando | Qué hace |
|---|---|
| `install` | Instala o actualiza la skill. Es el comando por defecto. |
| `update` | Reinstala solo donde ya estaba, con las mismas opciones. Ver [Actualizar](#actualizar). |
| `doctor` (o `check`) | Revisa la instalación sin modificar nada. |
| `lint <contrato.md>` | Valida un contrato. |
| `uninstall` | Quita la skill y la regla. |
| `help` | Muestra la ayuda. |
| `set-repo usuario/repo` | Solo para mantenedores de un fork: cambia el repo en los scripts, el README y `package.json`. |

Todos aceptan las [opciones](#opciones) que correspondan. También se pueden ejecutar con el comando
de instalación, sin tener el paquete: `curl … | sh -s -- doctor`, o en PowerShell
`$env:BCDD_ARGS = 'doctor'; irm … | iex`.

<a id="doctor"></a>

## 🩺 Doctor: ¿está bien instalada y al día?

```bash
node ~/.bcdd/pkg/install.mjs doctor
```

Revisa, sin modificar nada:

- que la skill esté completa y sin alteraciones (compara cada archivo contra lo instalado);
- que la regla de `AGENTS.md` siga en su lugar y no esté dañada ni desactualizada;
- que `bcdd` figure en el registro de skills de gentle-ai, si el proyecto lo usa (tiene `.atl/`);
- que los contratos del proyecto sean válidos;
- si el repo tiene una versión más nueva, y con qué comando actualizar.

Sale con código 1 si encuentra un problema. Corré el doctor después de cualquier `gentle-ai sync`,
`gentle-shell upgrade` o actualización de tus herramientas. También podés pedírselo al agente: el
doctor viaja dentro de la skill y funciona sin el paquete:

```bash
node .claude/skills/bcdd/scripts/doctor.mjs           # o .agents/skills/bcdd/...
node .claude/skills/bcdd/scripts/doctor.mjs --json    # resultado en JSON
```

Sin conexión (o con `--offline`), el chequeo de versión se omite y el resto funciona igual.

<a id="actualizar"></a>

## 🔄 Actualizar

Lo más simple es **volver a ejecutar el comando de instalación**: descarga la última versión y
reinstala.

```bash
node ~/.bcdd/pkg/install.mjs update
```

`update` reinstala **solo donde ya estaba** (proyecto y/o global, las mismas carpetas), conservando
la regla si la tenías. Si el paquete es un clon de git, antes hace `git pull`. Si no lo es (el caso
del comando de instalación), **no descarga nada**: reinstala desde `~/.bcdd/pkg` y te recuerda volver
a ejecutar `curl`/`irm`. Si modificaste la skill a mano, no la pisa: avisa y pide `--force`.

<a id="validar"></a>

## ✅ Validar un contrato

```bash
node ~/.bcdd/pkg/install.mjs lint bcdd/contrato.md
node .claude/skills/bcdd/scripts/lint.mjs bcdd/contrato.md --json   # desde la skill, en JSON
```

Detecta reglas sin fuente, requisitos sin "Listo cuando", referencias rotas, IDs repetidos, estados
inválidos, jerga técnica y secciones faltantes. Advierte cuando el contrato crece demasiado: más de
12 reglas, más de 20 requisitos activos o más de 5 versiones en Cambios. Sale con código 1 si hay
errores; las advertencias no cortan. El agente lo ejecuta solo al terminar cada pasada.

<a id="pagina-cliente"></a>

## 📄 Página para el cliente

Cuando le pedís "compartir con el cliente", el agente puede generar una página HTML lista para enviar
o imprimir a PDF, sin rutas internas ni la sección "Para quien construye". También podés generarla
vos:

```bash
node .claude/skills/bcdd/scripts/exportar.mjs bcdd/contrato.md
node .claude/skills/bcdd/scripts/exportar.mjs bcdd/contrato.md --out entrega/cliente.html
```

Por defecto crea `contrato-cliente.html` junto al contrato. El diagrama se dibuja con Mermaid, que la
página carga de internet; sin conexión se muestra como una lista de pasos.

<a id="desinstalar"></a>

## 🗑️ Desinstalar

```bash
node ~/.bcdd/pkg/install.mjs uninstall
node ~/.bcdd/pkg/install.mjs uninstall --global   # la instalación global
```

Quita la skill, las carpetas `.claude/skills` y `.agents/skills` si quedan vacías, y la regla (si
`AGENTS.md` solo contenía la regla, lo borra). Tus contratos y tus fuentes no se tocan. Para borrar
también el paquete descargado, eliminá `~/.bcdd`.

<a id="archivos"></a>

## 📂 Qué archivos crea

| Dónde | Qué | Cuándo |
|---|---|---|
| `~/.bcdd/pkg/` | El paquete descargado | Comando de instalación (`curl`/`irm`) |
| `.claude/skills/bcdd/`, `.agents/skills/bcdd/` | La skill y su `.bcdd-manifest.json` (versión y huellas de cada archivo, para el doctor) | Siempre (o en `~` con `--global`) |
| `AGENTS.md` o `CLAUDE.md` | 3 líneas entre marcadores `bcdd` | Solo con `--with-rule` |
| `.atl/` | Registro de skills de gentle-ai, actualizado con `gentle-ai skill-registry refresh` | Solo si el proyecto ya tiene `.atl/`; en los demás no se crea nada |
| Temporal del sistema (`bcdd-backup-…`) | Copia de la skill que modificaste | Solo con `--force` |
| `bcdd/contrato.md` | El contrato | Lo crea el agente al usar la skill |

<a id="variables"></a>

## 🔧 Variables de entorno

| Variable | Para qué | Por defecto |
|---|---|---|
| `BCDD_REPO` | Repo de origen (`usuario/repo`), para un fork. También lo usa el doctor | `qbitdevz/bcdd` |
| `BCDD_REF` | Rama o tag a descargar | `main` |
| `BCDD_HOME` | Carpeta donde queda el paquete | `~/.bcdd` |
| `BCDD_ARGS` | Solo PowerShell: opciones o comando para `irm … \| iex` | — |
| `BCDD_TARBALL_URL` / `BCDD_ZIP_URL` | URL completa del `.tar.gz` (sh) o `.zip` (PowerShell), en lugar de GitHub | — |
| `BCDD_UPDATE_URL` | URL del `package.json` contra el que el doctor compara la versión (pruebas) | el del repo |

Por ejemplo, para instalar otra rama o un tag: `curl -fsSL … | BCDD_REF=<rama-o-tag> sh`, o en
PowerShell `$env:BCDD_REF = '<rama-o-tag>'; irm … | iex`.

<a id="convivencia"></a>

## 🤝 Cómo convive con ODD, gentle-ai y Engram

- **Va antes, no en lugar de.** BCDD define qué se acordó; ODD (o tu flujo) decide cómo construirlo.
- **No duplica.** Tareas, pruebas y evidencia siguen en `odd/tasks/`. El contrato no sigue el avance.
- **Pasa referencias, no resúmenes.** Quien construye lee el contrato y la fuente original.
- **Las reglas para construir viajan en el contrato** (sección 7), así las respeta cualquier agente.
- **No es obligatoria.** Bugfixes, refactors y cambios técnicos no pasan por BCDD.
- **Memoria:** si hay Engram, guarda solo una nota con la ruta y la versión del contrato.

Diseñada según la documentación de gentle-ai 4.x, gentle-shell 4.x y Engram 1.x, y conforme a la
especificación Agent Skills y a la guía de estilo de skills de gentle-shell. Funciona sin ninguna de
esas herramientas.

<a id="contenido"></a>

## 🗂️ Contenido del repo

```
skills/bcdd/SKILL.md              reglas y tabla de decisión para el agente
skills/bcdd/references/           modos de uso y guía de redacción
skills/bcdd/assets/               plantilla, ejemplo completo y formato del mensaje al cliente
skills/bcdd/scripts/              lint, exportar y doctor
snippets/agents-rule.md           la regla opcional para AGENTS.md
docs/METODOLOGIA.md               la metodología explicada
scripts/install.sh                instalación en un comando (macOS, Linux, WSL, Git Bash)
scripts/install.ps1               instalación en un comando (Windows PowerShell)
install.mjs                       install · update · doctor · lint · uninstall · help · set-repo
tests/run.mjs                     pruebas automáticas
tests/fixtures/                   reuniones de ejemplo y los contratos esperados
tests/prueba-manual.md            recorrido guiado para probar la skill con un agente real
tests/simulacion/                 proyecto simulado (modo Adoptar) y el contrato que produjo
CHANGELOG.md                      cambios por versión
package.json · LICENSE            metadatos del paquete y licencia MIT
```

<a id="contribuir"></a>

## 🙌 Contribuir

Probala en un proyecto real y contá qué pasó: qué entendió bien el agente, qué no, y si tu cliente
entendió el contrato. [`tests/prueba-manual.md`](tests/prueba-manual.md) tiene un recorrido guiado.

Pruebas automáticas: `node tests/run.mjs` (o `npm test`). Las del comando `curl | sh` corren solo en
macOS y Linux. Licencia MIT.
