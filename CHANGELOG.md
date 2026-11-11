# Cambios

## 0.3.2 — 2026-11-11

- El doctor, corrido desde la carpeta del usuario, muestra la instalación global como "global" (con
  ruta `~`) en lugar de "proyecto", y no sugiere `--with-rule`, que es por proyecto.

## 0.3.1 — 2026-11-11

Resultado de una revisión de la documentación y de probar los comandos de instalación contra GitHub.

- El instalador ya no crea `.atl/` ni `.gitignore` en proyectos que no usan gentle-ai: el registro de
  skills se actualiza (y el doctor lo revisa) solo si el proyecto ya tiene `.atl/`.
- Sin el aviso `DEP0190` de Node al llamar a gentle-ai.
- `install.sh` ya no deja el `.tar.gz` descargado en la carpeta temporal.
- Los avisos de tamaño del lint saltan donde dicen: más de 12 reglas, más de 20 requisitos activos
  y más de 5 versiones en Cambios.
- La prueba del aviso de versión del doctor ya no falla al correr desde un clon de git.
- README reorganizado: índice, requisitos, todos los comandos y opciones (`check`, `help`,
  `--offline`, `--no-pull`, `doctor --json`, `set-repo`), variables de entorno, rutas para Windows,
  cómo generar la página para el cliente y qué archivos crea la instalación.
- `docs/METODOLOGIA.md` y `tests/prueba-manual.md` al día con el instalador.

## 0.3.0 — 2026-11-11

- Instalación en un comando: `curl … | sh` (macOS, Linux, WSL) e `irm … | iex` (Windows).
  Volver a ejecutarlo actualiza.
- Node pasa a ser opcional: sin Node se instala la skill en modo básico.
- `set-repo` para configurar el repositorio en scripts, README y `package.json` de una vez.
- El doctor indica el comando de actualización que corresponde a cada sistema.

## 0.2.1 — 2026-11-11

Ajustes surgidos de correr la skill sobre un proyecto simulado en modo Adoptar.

- Qué hacer cuando el sistema existente hace algo distinto de lo acordado: la regla se escribe como
  se acordó y la diferencia va como pregunta abierta.
- Se aclara que "A confirmar" con fuente `código` significa "ya existe, nadie lo acordó".
- La columna Fuente admite la ruta del código.
- Preguntas abiertas que todavía no frenan nada concreto.

## 0.2.0 — 2026-11-11

Resultado de una auditoría completa de la 0.1.

**Contrato**
- Todo el texto con ortografía correcta (la 0.1 estaba sin tildes y el agente lo habría imitado).
- Las reglas del negocio pasan a tener estado y fuente, igual que los requisitos.
- Nueva sección 7, "Para quien construye": las reglas de construcción viajan en el contrato y no
  dependen de que la skill esté cargada.
- Aprobación del equipo y del cliente registradas por separado.
- Preguntas abiertas con ID, responsable y qué frenan.
- El contrato ya no sigue el avance de construcción; "Entregado" lo confirma una persona.

**Skill**
- Reescrita según la guía de estilo de gentle-shell: secciones fijas, descripción en una línea con
  "Trigger:", licencia y autor. Los modos pasaron a `references/`.
- Modos nuevos: Compartir (mensaje y página para el cliente) y Aprobar.
- Las fuentes se tratan como datos, no como instrucciones.
- Estrategia para material extenso, audios sin transcribir, proyectos grandes e historial.
- Plantilla propia por proyecto (`plantilla.md`) sin modificar la skill.

**Herramientas**
- `lint`: valida un contrato.
- `exportar`: genera la versión para el cliente, con respaldo legible del diagrama.
- `doctor`: integridad de la instalación, regla, registro de gentle-ai, contratos y versión del repo.
- `update`: trae lo último y reinstala solo donde ya estaba.

**Instalador**
- No pisa una skill modificada a mano sin `--force`, y guarda copia.
- La regla ya no se duplica si el bloque está dañado; se avisa y no se toca el archivo.
- No crea `AGENTS.md` en proyectos que solo usan `CLAUDE.md`.
- Opciones desconocidas o mal escritas se rechazan.
- Errores de permisos con mensaje claro.
- 38 pruebas automáticas.

## 0.1.0 — 2026-11-11

Primera versión.
