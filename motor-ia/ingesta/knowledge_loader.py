"""
knowledge_loader.py — Carga la base curada JSON/Markdown para RAG.

Convierte `data/knowledge` en documentos pequeños y semánticos, listos para
pasar por `chunker.chunkear_documentos()` e indexarse en ChromaDB.
"""

import json
import logging
import re
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def cargar_knowledge_dir(directorio: str | Path = "data/knowledge") -> list[dict]:
    """
    Carga todos los documentos curados de `data/knowledge`.

    Soporta:
      - carreras/*.json
      - mallas/*.json
      - catalogos/*.json
      - catalogos/*.md
      - vocacional/*.json
      - vocacional/*.md

    Returns:
        Lista de documentos con la misma forma que `loader.cargar_pdf()`.
    """
    base = Path(directorio)
    if not base.exists():
        logger.warning("No existe la base de conocimiento curada: %s", base)
        return []

    documentos: list[dict] = []

    for ruta in sorted(base.rglob("*")):
        if not ruta.is_file() or ruta.name == ".gitkeep":
            continue
        if ruta.parts[-2:] and "templates" in ruta.parts:
            continue
        if ruta.name.lower() == "readme.md":
            continue
        if ruta.suffix.lower() == ".json":
            documentos.extend(cargar_json_curado(ruta, base))
        elif ruta.suffix.lower() == ".md":
            documentos.extend(cargar_markdown_curado(ruta, base))

    logger.info("Base curada cargada: %d documentos semánticos.", len(documentos))
    return documentos


def cargar_json_curado(ruta: str | Path, base_dir: str | Path | None = None) -> list[dict]:
    ruta = Path(ruta)
    base = Path(base_dir) if base_dir else ruta.parent
    try:
        data = json.loads(ruta.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.error("No se pudo leer JSON curado %s: %s", ruta, exc)
        return [_doc_error(ruta, str(exc))]

    rel = _relpath(ruta, base)
    parent = ruta.parent.name
    tipo = data.get("tipo_doc") or _inferir_tipo_json(parent, ruta.name)

    if parent == "carreras" or tipo == "carrera":
        return _docs_carrera(data, ruta, rel)
    if parent == "mallas" or tipo == "malla":
        return _docs_malla(data, ruta, rel)
    if ruta.name == "areas_vocacionales.json":
        return _docs_areas_vocacionales(data, ruta, rel)
    if ruta.name == "mapa_area_carrera.json":
        return _docs_mapa_area_carrera(data, ruta, rel)
    if ruta.name == "dimensiones_vocacionales.json":
        return _docs_dimensiones(data, ruta, rel)
    if ruta.name == "indice_carreras.json":
        return _docs_indice_carreras(data, ruta, rel)

    texto = _json_a_markdown(data)
    return [_doc_ok(texto, ruta, rel, tipo_doc=tipo)]


def cargar_markdown_curado(ruta: str | Path, base_dir: str | Path | None = None) -> list[dict]:
    ruta = Path(ruta)
    base = Path(base_dir) if base_dir else ruta.parent
    rel = _relpath(ruta, base)
    tipo_doc = "vocacional" if ruta.parent.name in {"vocacional", "catalogos"} else "vocacional"
    raw = ruta.read_text(encoding="utf-8")
    secciones = _split_markdown_sections(raw)

    docs = []
    for idx, (titulo, contenido) in enumerate(secciones):
        texto = contenido.strip()
        if not texto:
            continue
        docs.append(
            _doc_ok(
                texto,
                ruta,
                rel,
                tipo_doc=tipo_doc,
                seccion=titulo or ruta.stem,
                extra={"seccion_index": idx},
            )
        )
    return docs


def _docs_carrera(data: dict[str, Any], ruta: Path, rel: str) -> list[dict]:
    carrera = data.get("nombre_oficial", "")
    base_meta = {
        "carrera": carrera,
        "slug": data.get("slug", ""),
        "facultad": data.get("facultad", ""),
        "version_conocimiento": data.get("version_conocimiento", ""),
        "fuente": _fuentes_a_texto(data.get("fuentes", [])),
    }
    bloques = [
        (
            "descripcion",
            [
                f"Carrera: {carrera}",
                f"Facultad: {data.get('facultad', '')}",
                f"Modalidad: {data.get('modalidad', '')}",
                f"Duración: {data.get('duracion', '')}",
                f"Título que otorga: {data.get('titulo_otorga', '')}",
                "",
                data.get("descripcion", ""),
            ],
        ),
        (
            "perfil_ingreso",
            [
                f"Perfil de ingreso de {carrera}:",
                data.get("perfil_ingreso", {}).get("resumen", ""),
            ],
        ),
        (
            "perfil_egreso",
            [
                f"Perfil de egreso de {carrera}:",
                data.get("perfil_egreso", {}).get("resumen", ""),
                _lista_md("Competencias", data.get("perfil_egreso", {}).get("competencias", [])),
            ],
        ),
        (
            "campo_ocupacional",
            [
                f"Campo ocupacional de {carrera}:",
                _lista_md("", data.get("campo_ocupacional", [])),
            ],
        ),
        (
            "afinidades",
            [
                f"Afinidades vocacionales de {carrera}:",
                _lista_md("Áreas vocacionales", data.get("areas_vocacionales", [])),
                _lista_md("Entornos de trabajo", data.get("entornos_trabajo", [])),
                _lista_md("Modalidades de trabajo", data.get("modalidades_trabajo", [])),
                _lista_md("Materias representativas", data.get("materias_representativas", [])),
            ],
        ),
    ]

    docs = []
    for seccion, partes in bloques:
        texto = "\n".join(p for p in partes if p is not None).strip()
        docs.append(_doc_ok(texto, ruta, rel, "carrera", seccion, base_meta))
    return docs


def _docs_malla(data: dict[str, Any], ruta: Path, rel: str) -> list[dict]:
    carrera = data.get("carrera", "")
    base_meta = {
        "carrera": carrera,
        "slug": data.get("slug", ""),
        "facultad": data.get("facultad", ""),
        "version_conocimiento": data.get("version_conocimiento", ""),
        "fuente": _fuentes_a_texto(data.get("fuentes", [])),
    }

    docs = [
        _doc_ok(
            "\n".join(
                [
                    f"Malla curricular de {carrera}",
                    f"Facultad: {data.get('facultad', '')}",
                    f"Total de semestres: {data.get('total_semestres', '')}",
                    _lista_md("Materias representativas", data.get("materias_representativas", [])),
                    _lista_md("Áreas detectadas", data.get("areas_detectadas", [])),
                ]
            ),
            ruta,
            rel,
            "malla",
            "resumen_malla",
            base_meta,
        )
    ]

    for semestre in data.get("semestres", []):
        numero = semestre.get("numero", "")
        lineas = [f"Malla curricular de {carrera} — semestre {numero}"]
        for materia in semestre.get("materias", []):
            detalle = materia.get("nombre", "")
            if materia.get("area_vocacional"):
                detalle += f" | área: {materia['area_vocacional']}"
            if materia.get("tipo_formacion"):
                detalle += f" | tipo: {materia['tipo_formacion']}"
            lineas.append(f"- {detalle}")
        docs.append(
            _doc_ok(
                "\n".join(lineas),
                ruta,
                rel,
                "malla",
                f"semestre_{numero}",
                {**base_meta, "semestre": numero},
            )
        )
    return docs


def _docs_areas_vocacionales(data: dict[str, Any], ruta: Path, rel: str) -> list[dict]:
    docs = []
    for area in data.get("areas", []):
        texto = "\n".join(
            [
                f"Área vocacional: {area.get('nombre', '')}",
                f"ID: {area.get('id', '')}",
                area.get("descripcion", ""),
                _lista_md("Habilidades asociadas", area.get("habilidades_asociadas", [])),
                _lista_md("Materias indicadoras", area.get("materias_indicadoras", [])),
            ]
        )
        docs.append(
            _doc_ok(
                texto,
                ruta,
                rel,
                "vocacional",
                f"area_{area.get('id', '')}",
                {
                    "area_vocacional": area.get("id", ""),
                    "version_conocimiento": data.get("version_conocimiento", ""),
                },
            )
        )
    return docs


def _docs_mapa_area_carrera(data: dict[str, Any], ruta: Path, rel: str) -> list[dict]:
    docs = []
    for carrera, item in data.get("carreras", {}).items():
        texto = "\n".join(
            [
                f"Mapa de afinidad para carrera: {carrera}",
                _dict_md("Áreas y pesos", item.get("areas", {})),
                _dict_md("Entornos y pesos", item.get("entornos", {})),
                _dict_md("Modalidades y pesos", item.get("modalidades", {})),
                f"Criterio: {item.get('fuente_criterio', '')}",
            ]
        )
        docs.append(
            _doc_ok(
                texto,
                ruta,
                rel,
                "carrera",
                "mapa_area_carrera",
                {"carrera": carrera, "slug": item.get("slug", ""), "version_conocimiento": data.get("version_conocimiento", "")},
            )
        )
    return docs


def _docs_dimensiones(data: dict[str, Any], ruta: Path, rel: str) -> list[dict]:
    docs = []
    for dim in data.get("dimensiones", []):
        texto = "\n".join(
            [
                f"Dimensión vocacional: {dim.get('nombre', '')}",
                f"ID: {dim.get('id', '')}",
                dim.get("descripcion", ""),
                _lista_md("Ejemplos", dim.get("ejemplos", [])),
                _lista_md("Valores", dim.get("valores", [])),
                f"Uso en motor: {dim.get('uso_en_motor', '')}",
            ]
        )
        docs.append(
            _doc_ok(
                texto,
                ruta,
                rel,
                "vocacional",
                f"dimension_{dim.get('id', '')}",
                {
                    "dimension": dim.get("id", ""),
                    "version_conocimiento": data.get("version_conocimiento", ""),
                },
            )
        )
    return docs


def _docs_indice_carreras(data: dict[str, Any], ruta: Path, rel: str) -> list[dict]:
    lineas = [
        "Índice de carreras UTMACH disponibles en la base de conocimiento.",
        f"Total de carreras: {data.get('total_carreras', '')}",
    ]
    for item in data.get("carreras", []):
        lineas.append(
            "- {nombre} | facultad: {facultad} | semestres: {semestres} | áreas: {areas}".format(
                nombre=item.get("nombre", ""),
                facultad=item.get("facultad", ""),
                semestres=item.get("total_semestres", ""),
                areas=", ".join(item.get("areas_vocacionales", [])),
            )
        )
    return [
        _doc_ok(
            "\n".join(lineas),
            ruta,
            rel,
            "carrera",
            "indice_carreras",
            {"version_conocimiento": data.get("version_conocimiento", "")},
        )
    ]


def _split_markdown_sections(texto: str) -> list[tuple[str, str]]:
    partes = re.split(r"(?m)^(#{1,3})\s+(.+)$", texto)
    if len(partes) == 1:
        return [("", texto)]

    intro = partes[0].strip()
    secciones = []
    if intro:
        secciones.append(("introduccion", intro))

    i = 1
    while i < len(partes) - 2:
        nivel, titulo, contenido = partes[i], partes[i + 1].strip(), partes[i + 2]
        encabezado = f"{nivel} {titulo}"
        secciones.append((titulo, f"{encabezado}\n\n{contenido.strip()}"))
        i += 3
    return secciones


def _doc_ok(
    texto: str,
    ruta: Path,
    rel: str,
    tipo_doc: str,
    seccion: str = "",
    extra: dict[str, Any] | None = None,
) -> dict:
    meta = {
        "tipo_doc": tipo_doc,
        "nombre_archivo": ruta.name,
        "ruta": str(ruta),
        "ruta_relativa": rel,
        "fuente": "",
        "carrera": "",
        "facultad": "",
        "seccion": seccion,
    }
    if extra:
        meta.update(extra)
    return {
        "texto": texto.strip(),
        "metadatos": meta,
        "paginas": 0,
        "ruta": str(ruta),
        "ok": bool(texto.strip()),
        "error": None if texto.strip() else "Documento vacío",
    }


def _doc_error(ruta: Path, error: str) -> dict:
    return {
        "texto": "",
        "metadatos": {"nombre_archivo": ruta.name, "ruta": str(ruta), "tipo_doc": "vocacional"},
        "paginas": 0,
        "ruta": str(ruta),
        "ok": False,
        "error": error,
    }


def _inferir_tipo_json(parent: str, nombre: str) -> str:
    if parent == "mallas":
        return "malla"
    if parent == "carreras" or nombre in {"indice_carreras.json", "mapa_area_carrera.json"}:
        return "carrera"
    return "vocacional"


def _relpath(ruta: Path, base: Path) -> str:
    try:
        return str(ruta.relative_to(base))
    except ValueError:
        return str(ruta)


def _fuentes_a_texto(fuentes: Any) -> str:
    if not isinstance(fuentes, list):
        return ""
    partes = []
    for fuente in fuentes:
        if isinstance(fuente, dict):
            titulo = fuente.get("titulo", "")
            url = fuente.get("url", "")
            partes.append(f"{titulo}: {url}".strip(": "))
    return " | ".join(p for p in partes if p)


def _lista_md(titulo: str, items: Any) -> str:
    if not items:
        return ""
    lineas = [f"{titulo}:"] if titulo else []
    lineas.extend(f"- {item}" for item in items if item)
    return "\n".join(lineas)


def _dict_md(titulo: str, data: Any) -> str:
    if not isinstance(data, dict) or not data:
        return ""
    lineas = [f"{titulo}:"]
    lineas.extend(f"- {k}: {v}" for k, v in data.items())
    return "\n".join(lineas)


def _json_a_markdown(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)
