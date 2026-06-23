#!/usr/bin/env python3
"""
API Bridge para Test Frontend
Proporciona endpoints CORS-habilitados que hacen proxy a Motor IA y Backend
"""

import json
import sys
from pathlib import Path
from typing import Optional

# Try to use Flask, fallback to simple HTTP server
try:
    from flask import Flask, request, jsonify, cors
    from flask_cors import CORS
    HAS_FLASK = True
except ImportError:
    HAS_FLASK = False
    print("⚠️  Flask no instalado. Características limitadas.")
    print("Instálalo con: pip install flask flask-cors")

import http.client
import urllib.parse

# Configuration
MOTOR_IA_URL = "http://localhost:8000"
BACKEND_URL = "http://localhost:3000"

if HAS_FLASK:
    app = Flask(__name__)
    CORS(app)

    # ═════════════════════════════════════════════════════════════════
    # Motor IA Proxy Routes
    # ═════════════════════════════════════════════════════════════════

    @app.route('/api/motoria/sesion/iniciar', methods=['POST'])
    def motoria_iniciar_sesion():
        """Inicia una sesión de chat RAG"""
        try:
            # In production, call actual Motor IA API
            # response = requests.post(f"{MOTOR_IA_URL}/sesion/iniciar", json=request.json)
            return jsonify({
                "sesion_id": "test-session-001",
                "estado": "activa",
                "mensaje_bienvenida": "Hola, soy tu asistente de orientación vocacional"
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/api/motoria/sesion/<sesion_id>/responder', methods=['POST'])
    def motoria_responder(sesion_id):
        """Envía un mensaje al RAG"""
        try:
            data = request.get_json()
            # In production: proxy to Motor IA
            return jsonify({
                "respuesta": f"Respuesta sobre: {data.get('mensaje', '')}",
                "perfil": {
                    "intereses": ["Tecnología"],
                    "habilidades": ["Programación"]
                }
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/api/motoria/test/<sesion_id>/siguiente', methods=['GET'])
    def motoria_siguiente_pregunta(sesion_id):
        """Obtiene la siguiente pregunta del test"""
        try:
            return jsonify({
                "pregunta_id": "p001",
                "texto": "¿Cuál es tu área de mayor interés?",
                "tipo": "opciones",
                "opciones": ["Matemáticas", "Ciencias", "Lenguaje", "Sociales"]
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # ═════════════════════════════════════════════════════════════════
    # Backend Proxy Routes
    # ═════════════════════════════════════════════════════════════════

    @app.route('/api/backend/carreras', methods=['GET'])
    def backend_carreras():
        """Lista las carreras disponibles"""
        try:
            # In production: proxy to Backend
            return jsonify({
                "carreras": [
                    {
                        "id": 1,
                        "nombre": "Ingeniería en Informática",
                        "facultad_id": 1,
                        "duracion": "4 años"
                    },
                    {
                        "id": 2,
                        "nombre": "Administración de Empresas",
                        "facultad_id": 2,
                        "duracion": "4 años"
                    }
                ]
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/api/backend/facultades', methods=['GET'])
    def backend_facultades():
        """Lista las facultades"""
        try:
            return jsonify({
                "facultades": [
                    {"id": 1, "nombre": "Ingeniería"},
                    {"id": 2, "nombre": "Ciencias Empresariales"}
                ]
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/api/health', methods=['GET'])
    def health():
        """Health check"""
        return jsonify({
            "status": "ok",
            "motor_ia": f"{MOTOR_IA_URL}",
            "backend": f"{BACKEND_URL}"
        })

    def run_flask():
        print("╔═══════════════════════════════════════════════════════════════╗")
        print("║    UTMACHOrienta - API Bridge Server                          ║")
        print("╚═══════════════════════════════════════════════════════════════╝")
        print()
        print("🚀 Servidor iniciado:")
        print("   📍 http://localhost:5000")
        print()
        print("📡 APIs disponibles:")
        print("   /api/motoria/sesion/iniciar")
        print("   /api/motoria/sesion/{id}/responder")
        print("   /api/motoria/test/{id}/siguiente")
        print("   /api/backend/carreras")
        print("   /api/backend/facultades")
        print("   /api/health")
        print()
        print("🔍 Documentación: http://localhost:5000")
        print()
        app.run(debug=True, port=5000, host='0.0.0.0')

if __name__ == '__main__':
    if HAS_FLASK:
        run_flask()
    else:
        print("❌ Flask no está instalado.")
        print()
        print("Instálalo con:")
        print("  pip install flask flask-cors")
        print()
        print("Luego ejecuta este script de nuevo.")
        sys.exit(1)
