# Recorrido (modo Recorrido)

Para quien dirige o desarrolla, antes de probar la aplicación o de mostrársela al cliente. Tiene que
leerse en cinco minutos. Lenguaje de negocio; las rutas de código van solo en "dónde".

```
RECORRIDO — [proyecto] — [fecha]
Contrato: versión [N], [estado], actualizado el [fecha]. Código revisado: [qué se leyó y qué no].

1. QUÉ HACE HOY
• [Capacidad, en una frase: quién hace qué y qué obtiene] (REQ-01 · RN-02)
• [...]

2. CÓMO PROBARLO
[Capacidad 1]
  1. [Con qué usuario o rol se entra y por dónde]
  2. [Qué se carga o se elige, con un dato de ejemplo]
  3. [Qué se tiene que ver] — regla que se comprueba: RN-02
  Caso límite: [qué probar para ver la regla actuar, por ejemplo superar el tope]
[Capacidad 2]
  1. [...]

3. CONSTRUIDO Y FUERA DEL CONTRATO
• [Qué hace el sistema que el contrato no dice] — dónde: [código · ruta]
  ¿Ya funciona así y lo das por acordado, o hay que consultarlo?

4. EN EL CONTRATO Y SIN CONSTRUIR
• REQ-05 [requisito] — [no se encontró / está a medias: qué falta]

5. DISTINTO DE LO ACORDADO
• RN-03 dice [X]; el sistema hoy hace [Y] — dónde: [código · ruta]

6. PARA PREGUNTARLE AL CLIENTE
1. [Pregunta que se responde en una línea] — destraba: [REQ o RN]
```

Reglas:
- De 3 a 8 capacidades, las mismas en los bloques 1 y 2 y en el mismo orden.
- Los pasos de prueba salen de leer el código: si no ejecutaste la aplicación, decilo arriba y no
  afirmes que algo funciona.
- Un bloque sin nada que decir lleva "Nada para señalar"; no se borra.
- Hasta 5 preguntas en el bloque 6: primero las abiertas del contrato que frenan algo, después las
  que nacen de los bloques 3 y 5.
