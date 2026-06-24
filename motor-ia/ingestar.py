#!/usr/bin/env python3
"""
ingestar.py — Script de línea de comandos para indexar PDFs o conocimiento curado.

Uso:
    # Indexar la base curada data/knowledge/
    python ingestar.py --knowledge

    # Indexar toda la carpeta data/raw/
    python ingestar.py

    # Indexar un solo PDF
    python ingestar.py --pdf data/raw/vocacional/holland.pdf --tipo vocacional

    # Indexar directorio alternativo
    python ingestar.py --dir /ruta/a/mis/pdfs

    # Ver estadísticas de ChromaDB sin indexar nada
    python ingestar.py --stats

    # Eliminar chunks de un archivo y re-indexarlo
    python ingestar.py --eliminar holland.pdf
    python ingestar.py --pdf data/raw/vocacional/holland.pdf --tipo vocacional
"""

import argparse
import logging
import sys
from pathlib import Path

# Asegura que la raíz del proyecto esté en sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

# ── Logging ─────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

from settings import CHROMA_PATH, EMBEDDING_MODEL, LMSTUDIO_URL


def main():
    parser = argparse.ArgumentParser(
        description="Pipeline de ingesta para el motor RAG de UTMACHOrienta"
    )
    parser.add_argument("--pdf",   type=str, help="Ruta a un PDF específico")
    parser.add_argument("--tipo",  type=str, choices=["vocacional", "test", "malla"],
                        help="Tipo de documento (si no se infiere de la carpeta)")
    parser.add_argument("--carrera", type=str, default=None,
                        help="Nombre de la carrera (solo para mallas)")
    parser.add_argument("--fuente",  type=str, default=None,
                        help="Referencia bibliográfica o URL del documento")
    parser.add_argument("--dir",   type=str, default="data/raw",
                        help="Directorio a indexar (default: data/raw)")
    parser.add_argument("--knowledge", action="store_true",
                        help="Indexar la base curada data/knowledge en vez de PDFs")
    parser.add_argument("--knowledge-dir", type=str, default="data/knowledge",
                        help="Directorio de conocimiento curado (default: data/knowledge)")
    parser.add_argument("--stats", action="store_true",
                        help="Mostrar estadísticas de ChromaDB y salir")
    parser.add_argument("--eliminar", type=str, metavar="NOMBRE_ARCHIVO",
                        help="Eliminar chunks de un archivo de ChromaDB")
    parser.add_argument("--lmstudio", type=str, default=LMSTUDIO_URL,
                        help=f"URL base de LM Studio (default: {LMSTUDIO_URL})")
    parser.add_argument("--modelo-embedding", type=str,
                        default=EMBEDDING_MODEL,
                        help="Nombre del modelo de embeddings en LM Studio")
    parser.add_argument("--chroma-path", type=str, default=CHROMA_PATH,
                        help="Ruta donde persiste ChromaDB")

    args = parser.parse_args()

    # ── Importar Indexer ─────────────────────
    try:
        from ingesta.indexer import Indexer
    except ImportError as e:
        logger.error("Error al importar el paquete de ingesta: %s", e)
        logger.error("Asegúrate de ejecutar este script desde la raíz del proyecto (motor-ia/)")
        sys.exit(1)

    idx = Indexer(
        lmstudio_url=args.lmstudio,
        embedding_model=args.modelo_embedding,
        chroma_path=args.chroma_path,
    )

    # ── Solo estadísticas ────────────────────
    if args.stats:
        stats = idx.estadisticas()
        print("\n📊 ChromaDB — chunks indexados por colección:")
        for col, count in stats.items():
            print(f"   {col:<15} {count:>6} chunks")
        print(f"   {'TOTAL':<15} {sum(stats.values()):>6} chunks\n")
        return

    # ── Eliminar documento ───────────────────
    if args.eliminar:
        idx.eliminar_documento(args.eliminar)
        print(f"✓ Chunks de '{args.eliminar}' eliminados de ChromaDB.")
        return

    # ── Verificar conexión con LM Studio ────
    print("\n🔌 Verificando conexión con LM Studio...")
    if not idx.verificar():
        print("✗ No se puede conectar con LM Studio.")
        print("  → Asegúrate de que LM Studio esté corriendo y el modelo de embeddings cargado.")
        print(f"  → URL configurada: {args.lmstudio}")
        sys.exit(1)

    # ── Indexar PDF individual ───────────────
    if args.pdf:
        ruta = Path(args.pdf)
        print(f"\n📄 Indexando PDF: {ruta.name}")
        stats = idx.indexar_pdf(
            ruta,
            tipo_doc=args.tipo,
            carrera=args.carrera,
            fuente=args.fuente,
        )
        _imprimir_stats(stats)
        return

    # ── Indexar base curada ─────────────────
    if args.knowledge:
        directorio = Path(args.knowledge_dir)
        if not directorio.exists():
            logger.error("El directorio de conocimiento '%s' no existe.", directorio)
            print(f"\n✗ No se encontró el directorio '{directorio}'.")
            sys.exit(1)

        print(f"\n📚 Indexando base curada: {directorio.resolve()}")
        stats = idx.indexar_knowledge(directorio)
        _imprimir_stats(stats)

        print()
        chroma_stats = idx.estadisticas()
        print("📊 Estado final de ChromaDB:")
        for col, count in chroma_stats.items():
            print(f"   {col:<15} {count:>6} chunks")
        return

    # ── Indexar directorio ───────────────────
    directorio = Path(args.dir)
    if not directorio.exists():
        logger.error("El directorio '%s' no existe.", directorio)
        print(f"\n✗ No se encontró el directorio '{directorio}'.")
        print("  Crea la estructura con:")
        print("    mkdir -p data/raw/vocacional data/raw/tests data/raw/mallas")
        sys.exit(1)

    print(f"\n📁 Indexando directorio: {directorio.resolve()}")
    stats = idx.indexar_directorio(directorio)
    _imprimir_stats(stats)

    # Mostrar estadísticas finales de Chroma
    print()
    chroma_stats = idx.estadisticas()
    print("📊 Estado final de ChromaDB:")
    for col, count in chroma_stats.items():
        print(f"   {col:<15} {count:>6} chunks")


def _imprimir_stats(stats: dict):
    print("\n✅ Ingesta completada:")
    if "pdfs_procesados" in stats:
        print(f"   PDFs procesados : {stats['pdfs_procesados']}")
    if "documentos_procesados" in stats:
        print(f"   Docs procesados : {stats['documentos_procesados']}")
    if "chunks_generados" in stats:
        print(f"   Chunks generados: {stats['chunks_generados']}")
    print(f"   Indexados       : {stats['indexados']}")
    print(f"   Omitidos (dup.) : {stats['omitidos']}")
    print(f"   Errores         : {stats['errores']}")


if __name__ == "__main__":
    main()
