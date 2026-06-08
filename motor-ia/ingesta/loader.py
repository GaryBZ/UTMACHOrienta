"""
loader.py — Carga y extrae texto de PDFs con metadatos enriquecidos.

Soporta tres tipos de documento:
  - vocacional  → artículos y teorías de orientación
  - test        → tests e instrumentos vocacionales (RIASEC, Holland, etc.)
  - malla       → mallas curriculares de carreras universitarias

Uso rápido:
    from ingesta.loader import cargar_pdf, cargar_directorio

    doc = cargar_pdf("data/raw/vocacional/holland_theory.pdf", tipo_doc="vocacional")
    docs = cargar_directorio("data/raw/")
"""

import re
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional

import pdfplumber
from pypdf import PdfReader

logger = logging.getLogger(__name__)

TIPOS_VALIDOS = {"vocacional", "test", "malla"}

CARPETA_A_TIPO = {
    "vocacional": "vocacional",
    "tests": "test",
    "test": "test",
    "mallas": "malla",
    "malla": "malla",
}


def _extraer_texto_pdfplumber(ruta: Path) -> str:
    paginas = []
    with pdfplumber.open(str(ruta)) as pdf:
        for num, pagina in enumerate(pdf.pages, start=1):
            texto = pagina.extract_text(x_tolerance=3, y_tolerance=3)
            if texto and texto.strip():
                paginas.append(f"[Página {num}]\n{texto.strip()}")
    return "\n\n".join(paginas)


def _extraer_texto_pypdf(ruta: Path) -> str:
    reader = PdfReader(str(ruta))
    paginas = []
    for num, pagina in enumerate(reader.pages, start=1):
        texto = pagina.extract_text() or ""
        if texto.strip():
            paginas.append(f"[Página {num}]\n{texto.strip()}")
    return "\n\n".join(paginas)


def _limpiar_texto(texto: str) -> str:
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    texto = re.sub(r"[^\S\n\t ]+", " ", texto)
    texto = re.sub(r"-\n([a-záéíóúñA-ZÁÉÍÓÚÑ])", r"\1", texto)
    return texto.strip()


def _inferir_carrera(nombre: str) -> str:
    """
    Extrae el nombre de carrera desde nombres de archivo de UTMACH.

    Patrones soportados:
      MALLA_CURRICULAR_DE_DERECHO.pdf        → derecho
      MALLA_CURRICULAR_AGRONOMIA.pdf         → agronomia
      MALLA_DE_CIENCIA_DE_DATOS_....pdf      → ciencia de datos e inteligencia artificial
      MALLA_BIOQUIMICA_Y_FARMACIA_.pdf       → bioquimica y farmacia
    """
    nombre = nombre.lower().replace(".pdf", "").strip("_").strip()
    # Quitar prefijos en orden
    nombre = re.sub(r"^malla[_\-]", "", nombre)
    nombre = re.sub(r"^curricular[_\-]", "", nombre)
    nombre = re.sub(r"^de[_\-]", "", nombre)
    # Espacios
    nombre = nombre.replace("_", " ").replace("-", " ")
    nombre = re.sub(r"\s+", " ", nombre).strip()
    return nombre


def _inferir_tipo_desde_ruta(ruta: Path) -> Optional[str]:
    for parte in ruta.parts:
        tipo = CARPETA_A_TIPO.get(parte.lower())
        if tipo:
            return tipo
    return None


def cargar_pdf(
    ruta: str | Path,
    tipo_doc: Optional[str] = None,
    carrera: Optional[str] = None,
    fuente: Optional[str] = None,
    metadatos_extra: Optional[dict] = None,
) -> dict:
    ruta = Path(ruta)

    if not ruta.exists():
        return _resultado_error(ruta, f"Archivo no encontrado: {ruta}")

    if ruta.suffix.lower() != ".pdf":
        return _resultado_error(ruta, f"El archivo no es PDF: {ruta.name}")

    if tipo_doc is None:
        tipo_doc = _inferir_tipo_desde_ruta(ruta)
    if tipo_doc and tipo_doc not in TIPOS_VALIDOS:
        logger.warning("tipo_doc '%s' no reconocido. Usando 'vocacional'.", tipo_doc)
        tipo_doc = "vocacional"
    if tipo_doc is None:
        logger.warning("No se pudo inferir tipo_doc para '%s'. Usando 'vocacional'.", ruta.name)
        tipo_doc = "vocacional"

    try:
        reader = PdfReader(str(ruta))
        num_paginas = len(reader.pages)
    except Exception as exc:
        return _resultado_error(ruta, f"No se pudo abrir con pypdf: {exc}")

    texto = ""
    try:
        texto = _extraer_texto_pdfplumber(ruta)
    except Exception as exc:
        logger.warning("pdfplumber falló (%s), intentando pypdf.", exc)

    if not texto.strip():
        try:
            texto = _extraer_texto_pypdf(ruta)
        except Exception as exc:
            return _resultado_error(ruta, f"Ambas librerías fallaron: {exc}")

    if not texto.strip():
        return _resultado_error(
            ruta,
            "PDF sin capa de texto (posiblemente escaneado). "
            "Necesitas OCR antes de indexar.",
        )

    texto = _limpiar_texto(texto)

    if tipo_doc == "malla" and not carrera:
        carrera = _inferir_carrera(ruta.stem)

    metadatos = {
        "tipo_doc": tipo_doc,
        "nombre_archivo": ruta.name,
        "ruta": str(ruta),
        "paginas": num_paginas,
        "fecha_ingesta": datetime.now().isoformat(),
        "fuente": fuente or "",
        "carrera": carrera or "",
    }
    if metadatos_extra:
        metadatos.update(metadatos_extra)

    logger.info(
        "✓ Cargado: %s | tipo=%s | páginas=%d | chars=%d",
        ruta.name, tipo_doc, num_paginas, len(texto),
    )

    return {
        "texto": texto,
        "metadatos": metadatos,
        "paginas": num_paginas,
        "ruta": str(ruta),
        "ok": True,
        "error": None,
    }


def _resultado_error(ruta: Path, mensaje: str) -> dict:
    logger.error("✗ Error en '%s': %s", ruta.name, mensaje)
    return {
        "texto": "",
        "metadatos": {"nombre_archivo": ruta.name, "ruta": str(ruta)},
        "paginas": 0,
        "ruta": str(ruta),
        "ok": False,
        "error": mensaje,
    }


def cargar_directorio(
    directorio: str | Path,
    tipos_forzados: Optional[dict[str, str]] = None,
) -> list[dict]:
    directorio = Path(directorio)
    tipos_forzados = tipos_forzados or {}
    resultados = []

    pdfs = sorted(directorio.rglob("*.pdf"))
    if not pdfs:
        logger.warning("No se encontraron PDFs en '%s'.", directorio)
        return []

    logger.info("Encontrados %d PDFs en '%s'.", len(pdfs), directorio)

    for pdf in pdfs:
        tipo_forzado = tipos_forzados.get(pdf.name)
        doc = cargar_pdf(pdf, tipo_doc=tipo_forzado)
        resultados.append(doc)

    exitosos = sum(1 for d in resultados if d["ok"])
    logger.info("Ingesta completa: %d/%d PDFs cargados correctamente.", exitosos, len(resultados))

    return resultados