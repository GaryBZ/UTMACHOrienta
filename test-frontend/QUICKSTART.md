# ⚡ Quick Start - Frontend de Testing

## 🚀 Opción 1: Con Python (Recomendado - Más fácil)

```bash
cd /home/deibisuk/UTMACHOrienta/test-frontend
python3 -m http.server 8080
```

Luego abre: **http://localhost:8080**

## 🚀 Opción 2: Con el script

```bash
cd /home/deibisuk/UTMACHOrienta/test-frontend
chmod +x server.sh
./server.sh 8080
```

Luego abre: **http://localhost:8080**

## 🚀 Opción 3: Con Node.js

```bash
cd /home/deibisuk/UTMACHOrienta/test-frontend
npm install -g http-server  # si no lo tienes
npm start
```

O simplemente:
```bash
npx http-server -p 8080 -c-1 -o
```

## 🚀 Opción 4: Directamente en VS Code

1. Click derecho en `index.html`
2. Selecciona "Open with Live Server"
3. Se abrirá automáticamente en `http://localhost:5500`

O instala la extensión "Live Server" si no la tienes.

## 🎯 Qué hacer después

### 1. Configura tus servicios

En la sección "⚙️ Configuración" arriba:

- **Motor IA API**: `http://localhost:8000` (FastAPI)
- **Backend API**: `http://localhost:3000` (Express)

Ajusta según tus puertos reales.

### 2. Prueba cada módulo

#### Chat RAG
- Escribe un mensaje sobre tus intereses
- Observa la respuesta del sistema
- Revisa el perfil acumulado

#### Motor Test
- Haz clic en "Iniciar Test"
- Responde las preguntas
- Ve el ranking de carreras recomendadas

#### API Explorer
- Prueba los endpoints del backend
- Valida las respuestas

## 📋 Checklist de verificación

- [ ] Servidor web corriendo en puerto 8080
- [ ] Puedo acceder a http://localhost:8080
- [ ] Motor IA está corriendo (puerto 8000)
- [ ] Backend está corriendo (puerto 3000)
- [ ] URLs de configuración son correctas
- [ ] Chat responde mensajes
- [ ] Test se puede iniciar y completar
- [ ] API Explorer devuelve resultados

## 🐛 Problemas comunes

**Puerto 8080 en uso:**
```bash
# Usa otro puerto
python3 -m http.server 9000
```

**"Cannot find module http-server":**
```bash
# Instálalo globalmente
npm install -g http-server
```

**CORS Error:**
- Verifica que Motor IA y Backend tengan CORS habilitado
- Revisa que las URLs sean correctas

**API no responde:**
```bash
# Desde otra terminal, verifica que los servicios corren
curl http://localhost:8000/docs
curl http://localhost:3000/api/carreras
```

## 💡 Tips

- **Dev Tools**: F12 o Ctrl+Shift+I para ver logs y errores
- **Clear Cache**: Ctrl+Shift+R para forzar recarga
- **Console**: Puedes ejecutar `testAPI('getCarreras')` en consola
- **LocalStorage**: Las URLs se guardan automáticamente

## 📚 Documentación completa

Ver [README.md](./README.md) para detalles técnicos y documentación completa.

---

¡Listo para testear! 🎉
