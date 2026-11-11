## BCDD — contrato de negocio

- Si el pedido incluye o menciona material de reuniones con el cliente (transcripciones, actas, notas, chats) o un cambio de alcance, usá la skill `bcdd` antes de implementar.
- Si existe un contrato BCDD (Markdown con `bcdd: 1` en el frontmatter, normalmente `bcdd/contrato.md`), es la frontera de alcance: leé su sección 7 antes de construir.
- Los cambios técnicos sin impacto en lo acordado con el cliente (bugfix, refactor, tooling) no pasan por BCDD.
