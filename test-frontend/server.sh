#!/bin/bash

# ═════════════════════════════════════════════════════════════════════════
# UTMACHOrienta Test Frontend - Server Launcher
# ═════════════════════════════════════════════════════════════════════════

PORT=${1:-8080}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║    UTMACHOrienta - Test Frontend Server Launcher              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "📂 Directorio: $SCRIPT_DIR"
echo "🌐 Puerto: $PORT"
echo ""

cd "$SCRIPT_DIR"

# Try Python 3 first
if command -v python3 &> /dev/null; then
    echo "🚀 Iniciando servidor con Python 3..."
    echo "📲 Abre en tu navegador: http://localhost:$PORT"
    echo ""
    echo "Presiona Ctrl+C para detener el servidor"
    echo ""
    python3 -m http.server $PORT
# Fallback to Python 2
elif command -v python &> /dev/null; then
    echo "🚀 Iniciando servidor con Python 2..."
    echo "📲 Abre en tu navegador: http://localhost:$PORT"
    echo ""
    echo "Presiona Ctrl+C para detener el servidor"
    echo ""
    python -m SimpleHTTPServer $PORT
# Try Node.js http-server
elif command -v npx &> /dev/null; then
    echo "🚀 Iniciando servidor con Node.js..."
    echo "📲 Abre en tu navegador: http://localhost:$PORT"
    echo ""
    echo "Presiona Ctrl+C para detener el servidor"
    echo ""
    npx http-server . -p $PORT -c-1
else
    echo "❌ Error: No se encontró Python ni Node.js"
    echo ""
    echo "Instala uno de los siguientes:"
    echo "  - Python 3: sudo apt-get install python3"
    echo "  - Node.js: sudo apt-get install nodejs"
    exit 1
fi
