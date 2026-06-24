# Features propuestas para el flujo adaptativo de Motor IA

Este documento describe las features necesarias para que `motor-ia` ejecute un flujo de orientacion vocacional adaptativo donde el motor calcula afinidades y la IA apoya con analisis, redaccion y explicacion personalizada.

## Flujo objetivo

```text
Banco de preguntas inicial
↓
Respuestas del estudiante
↓
Motor calcula afinidades parciales
↓
IA analiza contexto parcial
↓
IA genera siguiente pregunta adaptativa
↓
Estudiante responde
↓
Motor actualiza afinidades
↓
IA genera otra pregunta
↓
Resultado final calculado por motor
↓
IA genera explicacion personalizada
```

## Estado actual

El proyecto ya cuenta con una base funcional:

- API FastAPI para iniciar sesion, responder preguntas, consultar estado y generar recomendacion.
- Persistencia de usuarios, sesiones, respuestas y recomendaciones en PostgreSQL.
- RAG con ChromaDB para recuperar informacion vocacional y mallas curriculares.
- Cliente LLM compatible con LM Studio.
- Generacion de preguntas adaptativas mediante LLM.
- Extraccion basica de perfil desde respuestas del estudiante mediante LLM.
- Recomendacion final basada en perfil y contexto recuperado desde ChromaDB.

La principal brecha es que el motor aun no calcula afinidades deterministas. Actualmente el LLM extrae perfil, decide si hay suficiente informacion, genera preguntas y tambien produce el ranking final. Para el flujo objetivo, el motor debe calcular puntajes y la IA debe quedar como capa de apoyo.

## Feature 1: Banco de preguntas estructurado

Crear un banco de preguntas versionado, auditable y reutilizable.

Cada pregunta deberia incluir:

- `id`: identificador estable.
- `dimension`: aspecto vocacional que explora.
- `texto`: pregunta mostrada al estudiante.
- `tipo`: `opciones`, `multiple`, `escala` o `texto_libre`.
- `opciones`: alternativas con `id`, texto y pesos.
- `permite_texto_libre`: si permite respuesta abierta.
- `tags`: areas o carreras relacionadas.
- `fase`: inicial, adaptativa, desempate o cierre.

Ejemplo:

```json
{
  "id": "q_intereses_01",
  "dimension": "intereses",
  "texto": "¿Con cuál actividad disfrutas más tu tiempo?",
  "tipo": "opciones",
  "opciones": [
    {
      "id": "op_logica",
      "texto": "Resolver problemas matemáticos o lógicos",
      "pesos": {
        "matematicas/logica": 0.8,
        "tecnologia/datos": 0.5,
        "ingenieria/construccion": 0.4
      }
    }
  ],
  "permite_texto_libre": true,
  "fase": "inicial"
}
```

Beneficio:

- El flujo ya no depende completamente del LLM.
- Las respuestas se pueden auditar y recalcular.
- Se puede mejorar el test sin romper sesiones anteriores.

## Feature 2: Motor de afinidades parciales

Agregar un modulo responsable de calcular y actualizar afinidades.

Nombre sugerido:

```text
pipeline/affinity_engine.py
```

Responsabilidades:

- Recibir pregunta, respuesta y estado actual.
- Sumar pesos por area vocacional.
- Calcular afinidades por carrera.
- Registrar evidencias.
- Calcular confianza parcial.
- Detectar dimensiones ya exploradas.
- Identificar dimensiones faltantes o ambiguas.

Estado sugerido:

```json
{
  "afinidades_area": {
    "tecnologia/datos": 0.72,
    "matematicas/logica": 0.64,
    "salud": 0.12
  },
  "afinidades_carrera": {
    "Ciencia de Datos e Inteligencia Artificial": 0.81,
    "Finanzas y Negocios Digitales": 0.58
  },
  "confianza": 0.68,
  "dimensiones_cubiertas": ["intereses", "habilidades", "modalidad"],
  "evidencias": [
    {
      "turno": 1,
      "pregunta_id": "q_intereses_01",
      "respuesta": "Resolver problemas matemáticos o lógicos",
      "impacto": {
        "matematicas/logica": 0.8,
        "tecnologia/datos": 0.5
      }
    }
  ]
}
```

Beneficio:

- El motor puede explicar por que una carrera sube o baja.
- El resultado final es mas estable.
- Las recomendaciones no quedan a criterio variable del LLM.

## Feature 3: Mapa area-carrera

Crear un catalogo que relacione areas vocacionales con carreras UTMACH.

Ejemplo:

```json
{
  "Ciencia de Datos e Inteligencia Artificial": {
    "areas": {
      "tecnologia/datos": 0.9,
      "matematicas/logica": 0.8,
      "investigacion/ciencia": 0.5
    },
    "entornos": {
      "laboratorio": 0.4,
      "interior/oficina": 0.7
    },
    "modalidades": {
      "independiente": 0.6,
      "equipo": 0.5
    }
  }
}
```

Este mapa puede iniciar manualmente y luego enriquecerse desde las mallas indexadas.

Beneficio:

- El ranking final se calcula por reglas claras.
- El RAG se usa para fundamentar, no para inventar carreras.
- Se reduce el riesgo de recomendar carreras fuera del catalogo.

## Feature 4: Decision determinista de suficiencia

Reemplazar la decision del LLM por una regla del motor.

Criterios sugeridos:

- Minimo 5 preguntas respondidas.
- Al menos 3 dimensiones cubiertas.
- Confianza global mayor o igual a `0.70`.
- Diferencia suficiente entre top 1 y top 2, por ejemplo `0.12`.
- Sin dimensiones criticas faltantes.
- Maximo 12 preguntas.

Ejemplo:

```json
{
  "suficiente": false,
  "razon": "Falta explorar entorno de trabajo y desempatar tecnologia/datos vs negocios/economia",
  "siguiente_dimension": "entorno"
}
```

Beneficio:

- El test termina por criterios consistentes.
- Se evita cortar demasiado pronto.
- Se evita seguir preguntando cuando el perfil ya es claro.

## Feature 5: Selector de siguiente pregunta

El motor debe decidir que necesita explorar antes de pedir ayuda al LLM.

Entrada:

- Afinidades actuales.
- Historial.
- Dimensiones cubiertas.
- Carreras candidatas.
- Ambiguedades.

Salida:

```json
{
  "objetivo": "desempatar",
  "dimension": "entorno",
  "areas_en_conflicto": ["tecnologia/datos", "negocios/economia"],
  "carreras_candidatas": [
    "Ciencia de Datos e Inteligencia Artificial",
    "Finanzas y Negocios Digitales"
  ]
}
```

Luego la IA puede redactar una pregunta adaptativa alineada a ese objetivo.

Beneficio:

- Las preguntas dejan de ser genericas.
- La IA no decide la estrategia completa.
- El test se adapta realmente al perfil parcial.

## Feature 6: IA como generadora controlada de preguntas

La IA debe recibir instrucciones especificas desde el motor.

Prompt conceptual:

```text
Genera una pregunta para explorar la dimension: entorno.
Objetivo: desempatar entre tecnologia/datos y negocios/economia.
No menciones carreras especificas.
Devuelve JSON valido con texto, tipo, opciones y permite_texto_libre.
```

El motor debe validar:

- JSON valido.
- Tipo permitido.
- Opciones no vacias cuando aplique.
- Pregunta no repetida.
- No menciona carreras si no corresponde.

Si falla, usar una pregunta del banco.

Beneficio:

- Preguntas mas humanas sin perder control tecnico.
- Flujo robusto aunque falle el LLM.
- Menor probabilidad de preguntas repetidas o fuera de dominio.

## Feature 7: Resultado final calculado por motor

El ranking final debe salir del motor, no del LLM.

Salida sugerida:

```json
{
  "ranking": [
    {
      "carrera": "Ciencia de Datos e Inteligencia Artificial",
      "score": 0.86,
      "confianza": 0.78,
      "areas_fuertes": ["tecnologia/datos", "matematicas/logica"],
      "evidencias": [
        "Alta preferencia por resolver problemas logicos",
        "Interes marcado por tecnologia y datos"
      ]
    }
  ]
}
```

La IA solo deberia convertir ese resultado en una explicacion personalizada.

Beneficio:

- Ranking reproducible.
- Puntajes consistentes.
- Menos alucinaciones.

## Feature 8: Explicacion personalizada con IA

La IA debe recibir el ranking calculado y el contexto recuperado desde ChromaDB.

Debe generar:

- Resumen del perfil.
- Top 1 a top 3 carreras.
- Justificacion por carrera.
- Advertencia de que el resultado es orientativo.
- Recomendacion de revisar malla, perfil de egreso y preferencias personales.

Ejemplo de entrada:

```json
{
  "perfil": {},
  "ranking_motor": [],
  "evidencias": [],
  "contexto_mallas": []
}
```

Beneficio:

- Explicacion clara y empatica.
- Se conserva el control del ranking.
- El RAG fundamenta con mallas reales.

## Feature 9: Persistencia completa de sesion

Actualizar el modelo de datos para guardar mejor el estado.

Campos sugeridos en `sesiones_test`:

- `estado_motor`: JSON con afinidades, confianza y evidencias.
- `version_banco_preguntas`: version usada.
- `version_motor`: version de reglas de afinidad.
- `ultima_pregunta_id`: identificador de pregunta pendiente.

Campos sugeridos en `respuestas`:

- `pregunta_id`.
- `opcion_ids`.
- `respuesta_texto`.
- `pesos_aplicados`.
- `afinidades_despues`.

Beneficio:

- Se puede auditar cada recomendacion.
- Se puede recalcular con una version nueva del motor.
- Se pueden detectar preguntas debiles o sesgadas.

## Feature 10: Contrato de API para el flujo adaptativo

Evitar que el frontend envie de vuelta el texto de la pregunta. El backend debe conocer la pregunta activa.

### Iniciar sesion

```http
POST /sesion/iniciar
```

Respuesta:

```json
{
  "sesion_id": 1,
  "turno": 1,
  "pregunta": {
    "id": "q_intereses_01",
    "texto": "¿Con cuál actividad disfrutas más tu tiempo?",
    "tipo": "opciones",
    "opciones": [
      { "id": "op_logica", "texto": "Resolver problemas matemáticos o lógicos" }
    ],
    "permite_texto_libre": true
  },
  "progreso": 0.08
}
```

### Responder

```http
POST /sesion/{sesion_id}/responder
```

Entrada:

```json
{
  "pregunta_id": "q_intereses_01",
  "respuesta": {
    "opcion_ids": ["op_logica"],
    "texto_libre": null
  }
}
```

Respuesta si continua:

```json
{
  "es_recomendacion": false,
  "turno": 2,
  "pregunta": {},
  "estado_parcial": {
    "top_areas": [],
    "confianza": 0.24
  }
}
```

Respuesta si termina:

```json
{
  "es_recomendacion": true,
  "ranking": [],
  "explicacion": "",
  "perfil": {},
  "progreso": 1.0
}
```

Beneficio:

- Contrato mas claro.
- Menos errores de frontend.
- Mejor trazabilidad.

## Feature 11: Integracion en Angular

El componente actual del test en Angular debe consumir el motor real.

Piezas sugeridas:

- `MotorIaService`: cliente HTTP para `/sesion/iniciar`, `/responder`, `/estado`.
- `TestComponent`: pantalla de pregunta, opciones, progreso y resultado.
- Estado local: pregunta actual, respuesta seleccionada, loading, error, resultado.
- Soporte para `opciones`, `multiple`, `escala` y `texto_libre`.
- Vista final con ranking de carreras y explicacion.

Beneficio:

- El flujo deja de vivir solo en `test-frontend`.
- La app principal puede ejecutar el test real.
- Mejor experiencia para estudiantes.

## Feature 12: Pruebas del motor

Agregar tests sin depender de LM Studio.

Casos minimos:

- Una respuesta actualiza afinidades esperadas.
- Varias respuestas acumulan pesos sin duplicar.
- El motor detecta dimension faltante.
- El motor fuerza cierre al pasar el maximo de preguntas.
- El ranking final se ordena correctamente.
- Si el LLM falla, se usa pregunta fallback.
- El historial no duplica la ultima respuesta.

Beneficio:

- El comportamiento vocacional queda protegido.
- Se puede refactorizar sin miedo.
- La IA queda testeada por contrato, no por texto exacto.

## Roadmap sugerido

### Fase 1: Estabilizar el flujo actual

- Corregir duplicacion potencial del historial en `/responder`.
- Enviar texto real de la opcion seleccionada desde el frontend de prueba.
- Eliminar codigo comentado duplicado en `api/main.py` y `motor_test.py`.
- Mover configuracion sensible a variables de entorno.

### Fase 2: Introducir banco y afinidades

- Crear banco de preguntas inicial.
- Crear `AffinityEngine`.
- Guardar `pregunta_id`, `opcion_ids` y pesos aplicados.
- Calcular `afinidades_area` y `confianza`.

### Fase 3: Adaptacion real

- Crear selector de siguiente dimension.
- Usar IA solo para redactar preguntas segun objetivo del motor.
- Validar salida del LLM.
- Agregar fallbacks por dimension.

### Fase 4: Ranking final por motor

- Crear mapa area-carrera.
- Calcular ranking final determinista.
- Usar RAG para recuperar mallas de las carreras top.
- Usar IA para explicacion personalizada.

### Fase 5: Integracion de producto

- Implementar test real en Angular.
- Permitir reanudar sesion.
- Mostrar estado parcial y resultado final.
- Agregar pruebas unitarias y de integracion.

## Arquitectura propuesta

```text
api/main.py
  └── recibe solicitudes HTTP

pipeline/motor_test.py
  └── orquesta el flujo del test

pipeline/question_bank.py
  └── carga preguntas iniciales y fallbacks

pipeline/affinity_engine.py
  └── calcula afinidades, confianza y ranking

pipeline/adaptive_policy.py
  └── decide siguiente dimension u objetivo

llm/lmstudio_client.py
  └── genera preguntas redactadas y explicaciones

retrieval/retriever.py
  └── recupera mallas y contexto vocacional

db/models.py
  └── persiste sesiones, respuestas, estado y recomendaciones
```

## Regla de oro

El motor debe decidir. La IA debe explicar, redactar y enriquecer.

Esto mantiene el sistema controlable, auditable y mas confiable para estudiantes.
