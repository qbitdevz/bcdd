# Cómo redactar el contrato

Tres lectores tienen que entenderlo sin ayuda: el **cliente** (confirma que eso necesita), quien
**dirige el proyecto** (ve qué entra, qué no y qué cambió) y el **desarrollador** (recupera el mapa
de reglas que ya no arma escribiendo el código). Si una frase la entiende solo uno, reescribila.

Escribí con ortografía correcta, en el idioma del cliente. Si no es español, traducí también los
títulos y los estados, y mantené la numeración de secciones (1 a 7) y los ID.

## Sección 1 — En dos minutos

- **Problema:** una frase, sobre el negocio y no sobre el software.
- **Qué va a notar:** 3 a 5 resultados que el cliente va a poder ver o hacer.
- **Fuera de alcance:** todo lo conversado que no entra, con su motivo. No la dejes vacía sin preguntar.
- **Preguntas abiertas:** ID (P-01), quién responde y qué requisito o regla frena. Si todavía no
  frena nada concreto, decilo en pocas palabras. Formulalas para que se respondan en una línea.
- Límite: unas 300 palabras. Si se pasa, sobra detalle.

## Sección 2 — Cómo funciona

Un `flowchart` de Mermaid de hasta unos 12 nodos, con palabras del cliente. Si el proceso es un ida
y vuelta entre partes, `sequenceDiagram`. Sin nombres de sistemas internos ni términos técnicos.

## Sección 3 — Reglas del negocio

Es el centro del contrato.

- Una regla por fila: "Cuando [situación], [qué pasa]" o "[Quién] puede / no puede [qué]".
- Con los números y límites que dio el cliente: montos, plazos, porcentajes, roles.
- Valor no definido: escribí "a definir", estado "A confirmar" y abrí una pregunta. No lo inventes.
- Excepciones y casos borde son reglas propias, no una cláusula escondida.
- Entre 5 y 12 reglas por contrato; si hay más, ver Proyectos grandes.
- Estados: **A confirmar**, **Acordada**, **Descartada**.

| Mal | Bien |
|---|---|
| El sistema valida el crédito | Cuando un pedido hace que el comprador supere su límite, queda frenado hasta que el encargado lo aprueba |
| Manejo de permisos por rol | Cada vendedor ve únicamente a sus propios compradores |
| Descuentos configurables | El descuento máximo sin autorización es 10 %; por encima lo autoriza el gerente |

## Sección 4 — Requisitos

- **Requisito:** qué necesita el negocio, no cómo se hace.
- **Estado:** A confirmar, Acordado, Entregado, Descartado. El contrato no sigue el avance de
  construcción; "Entregado" se marca solo cuando una persona lo confirma.
- **Cambio:** respecto de la versión anterior — Nuevo, Modificado, Sin cambios, Eliminado.
- **Listo cuando:** una condición que cualquiera puede comprobar. No sirven "funciona bien" ni
  "validado en demo".
- **Reglas:** los RN que ese requisito debe cumplir. Toda regla Acordada debería estar asociada a
  algún requisito.

## Punteros de fuente

Formato: `archivo · fecha o minuto · «cita breve»`. La cita, de hasta 10 palabras, es opcional y
sirve para encontrar el pasaje. Otros valores: `equipo` (lo propuso quien dirige o desarrolla),
`código` (se dedujo del sistema existente; podés agregar la ruta para que el desarrollador lo
encuentre: `código · src/reservas.js`). La columna Fuente es el único lugar del contrato donde van
rutas de archivos. Nunca cites pasajes largos.

## Proyectos grandes

Si el contrato supera unos 20 requisitos activos o hay módulos claramente independientes, dividí:

- `bcdd/contrato.md` queda como índice: problema general, resultados y una tabla de módulos con su
  estado y enlace.
- `bcdd/<módulo>.md` es un contrato completo por módulo, con su propio frontmatter `bcdd: 1`.
- Los ID llevan prefijo del módulo: `VEN-REQ-01`, `VEN-RN-01`.

Proponé la división antes de hacerla.

## Historial

Para que el archivo siga siendo liviano: cuando Cambios tenga más de 5 versiones, o haya más de 15
requisitos Entregados, mové lo más viejo a `historial.md` junto al contrato y dejá una línea que lo
indique. Los ID no se reutilizan aunque la fila ya no esté.

## Plantilla propia

Si existe `plantilla.md` en la carpeta del contrato, usala en lugar de `assets/plantilla-contrato.md`.
Así un equipo adapta el formato sin modificar la skill.
