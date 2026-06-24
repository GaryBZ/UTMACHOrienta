# Base de conocimiento curada

Esta carpeta contiene la version limpia y estructurada de los documentos que usara el RAG de `motor-ia`.

La regla principal es: los PDFs pueden quedarse como fuente original, pero el RAG debe indexar documentos curados en `JSON` y `Markdown` siempre que sea posible.

## Estructura

```text
data/knowledge/
  carreras/
    *.json
  mallas/
    *.json
  vocacional/
    *.md
    *.json
  catalogos/
    areas_vocacionales.json
    mapa_area_carrera.json
    glosario.md
  templates/
    carrera.template.json
    malla.template.json
```

## Prioridad de recopilacion

1. Ficha oficial de cada carrera UTMACH.
2. Malla curricular oficial limpia por carrera.
3. Perfil de ingreso y perfil de egreso.
4. Campo ocupacional.
5. Materias representativas por semestre.
6. Catalogo propio de areas vocacionales.
7. Guias de orientacion vocacional resumidas.

## Contenido curado disponible

- `carreras/*.json`: fichas estructuradas de las 32 carreras UTMACH.
- `mallas/*.json`: mallas estructuradas de las 32 carreras UTMACH.
- `indice_carreras.json`: indice general de carreras, facultades, rutas y areas principales.
- `catalogos/areas_vocacionales.json`: catalogo base de areas vocacionales.
- `catalogos/mapa_area_carrera.json`: mapa inicial de afinidades area-carrera.
- `catalogos/glosario.md`: definiciones academicas para explicaciones.
- `vocacional/dimensiones_vocacionales.json`: dimensiones del test adaptativo.
- `vocacional/riasec_holland.md`: referencia interpretativa RIASEC/Holland.
- `vocacional/intereses_habilidades_valores.md`: guia para interpretar perfil vocacional.
- `vocacional/interpretacion_resultados.md`: reglas de explicacion final.
- `vocacional/preguntas_adaptativas.md`: guia para generacion controlada de preguntas.

## Formatos recomendados

### JSON

Usar JSON cuando la informacion debe ser calculable por el motor:

- Carreras.
- Mallas.
- Areas vocacionales.
- Mapa area-carrera.
- Banco de preguntas.

### Markdown

Usar Markdown cuando la informacion se indexa para explicacion:

- Teoria vocacional.
- Glosario.
- Guias de interpretacion.
- Resumenes explicativos.

### PDF

Usar PDF solo como fuente original o respaldo. Antes de indexar, convertirlo a JSON o Markdown curado.

## Convenciones

- Un archivo por carrera.
- Nombres de archivo en minusculas, sin espacios y con guion bajo.
- Mantener nombres oficiales de carrera dentro del contenido.
- Incluir siempre `fuentes`.
- Marcar campos desconocidos como cadena vacia, lista vacia o `null`.
- No inventar datos oficiales.

## Metadatos minimos

Cada documento curado debe permitir generar chunks con estos metadatos:

- `tipo_doc`
- `nombre_archivo`
- `fuente`
- `carrera`
- `facultad`
- `seccion`
- `version_conocimiento`

## Criterio de calidad

Un buen documento para RAG debe responder una pregunta concreta.

Ejemplos:

- "Cual es el perfil de egreso de Medicina?"
- "Que materias representan a Ciencia de Datos?"
- "Que habilidades son compatibles con tecnologia/datos?"
- "Que significa perfil de egreso?"

Evitar chunks gigantes que mezclen descripcion, malla, campo laboral y requisitos en un solo bloque.
