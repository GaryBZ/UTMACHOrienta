#!/usr/bin/env python3
"""
chat.py — Prueba interactiva del pipeline RAG completo.

Uso:
    python chat.py

Comandos especiales durante el chat:
    /perfil     → ver el perfil acumulado del estudiante
    /nuevo      → reiniciar sesión (nuevo estudiante)
    /salir      → terminar
"""

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

logging.basicConfig(
    level=logging.WARNING,   # silencia INFO para una consola más limpia
    format="%(asctime)s [%(levelname)s] %(message)s",
)

from pipeline.rag_chain import RAGChain
from settings import CHROMA_PATH, EMBEDDING_MODEL, LLM_MODEL, LMSTUDIO_URL

# ── Configuración ── ajusta estos valores a tu LM Studio ────────────
# ────────────────────────────────────────────────────────────────────

BANNER = """
╔══════════════════════════════════════════════╗
║         UTMACHOrienta — Motor IA RAG         ║
║   Asistente de orientación vocacional        ║
╚══════════════════════════════════════════════╝
Escribe tu mensaje y presiona Enter.
Comandos: /perfil · /nuevo · /salir
"""


def main():
    print(BANNER)

    print("⏳ Iniciando pipeline RAG...")
    try:
        rag = RAGChain(
            lmstudio_url=LMSTUDIO_URL,
            embedding_model=EMBEDDING_MODEL,
            llm_model=LLM_MODEL,
            chroma_path=CHROMA_PATH,
        )
    except Exception as e:
        print(f"\n✗ Error al iniciar: {e}")
        sys.exit(1)

    print("✓ Listo. Puedes empezar.\n")

    while True:
        try:
            entrada = input("Tú: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nHasta luego.")
            break

        if not entrada:
            continue

        # Comandos especiales
        if entrada.lower() == "/salir":
            print("Hasta luego.")
            break

        if entrada.lower() == "/perfil":
            perfil = rag.perfil
            if perfil:
                print("\n📋 Perfil acumulado del estudiante:")
                for k, v in perfil.items():
                    print(f"   {k}: {v}")
                print()
            else:
                print("   (Sin datos de perfil aún)\n")
            continue

        if entrada.lower() == "/nuevo":
            rag.nueva_sesion()
            print("✓ Nueva sesión iniciada.\n")
            continue

        # Llamada al pipeline RAG
        print("\nAsistente: ", end="", flush=True)
        try:
            respuesta = rag.chat(entrada)
            print(respuesta)
        except Exception as e:
            print(f"[Error al generar respuesta: {e}]")
            print("Verifica que LM Studio esté corriendo con ambos modelos cargados.")
        print()


if __name__ == "__main__":
    main()
