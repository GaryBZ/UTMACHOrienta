# 🎓 UTMACHOrienta - Frontend de Testing

Frontend simple y funcional para pruebas del sistema de orientación vocacional. Permite testear el Motor IA, el Motor de Test adaptativo y los endpoints del Backend.

## 📋 Características

### 1. **💬 Chat RAG Interactivo**
- Simula un chat conversacional con el pipeline RAG
- Mantiene historial de conversación
- Muestra el perfil acumulado del estudiante
- Integración con Motor IA (Motor RAG)

### 2. **📋 Motor Test Adaptativo**
- Test vocacional con 5-12 preguntas adaptativas
- Diferentes tipos de preguntas: opciones, escala, múltiple
- Barra de progreso en tiempo real
- Genera ranking de carreras recomendadas
- Muestra resultado detallado con scores

### 3. **🔌 API Explorer**
- Prueba endpoints del Backend Express
- Módulos: Autenticación, Carreras, Facultades
- Soporte para GET/POST
- Visualización de respuestas JSON

## 🚀 Quick Start

### Opción 1: Servidor Local

```bash
# Navega a la carpeta
cd /home/deibisuk/UTMACHOrienta/test-frontend

# Inicia un servidor web simple
python3 -m http.server 8080
# o con Python 2:
# python -m SimpleHTTPServer 8080
```

Luego abre en el navegador:
```
http://localhost:8080
```

### Opción 2: Abrir archivo directamente
```bash
# Abre index.html directamente en el navegador
file:///home/deibisuk/UTMACHOrienta/test-frontend/index.html
```

### Opción 3: Usar Live Server (VS Code)
1. Instala la extensión "Live Server" en VS Code
2. Click derecho en `index.html` → "Open with Live Server"

## ⚙️ Configuración

Al abrir la aplicación, configura las URLs de tus servicios:

**Motor IA API:** `http://localhost:8000` (FastAPI)
**Backend API:** `http://localhost:3000` (Express)

Las configuraciones se guardan en `localStorage`.

## 🧪 Flujo de Testing

### Chat RAG
1. Abre la pestaña "💬 Chat RAG"
2. Escribe tu primer mensaje
3. Observa las respuestas del RAG
4. Revisa el perfil acumulado en la parte inferior
5. Usa "Nueva Sesión" para reiniciar

### Motor Test
1. Abre la pestaña "📋 Motor Test"
2. Haz clic en "Iniciar Test"
3. Responde las preguntas adaptativas
4. El test termina entre la pregunta 5-12
5. Revisa el resultado con carreras recomendadas

### API Explorer
1. Abre la pestaña "🔌 API Explorer"
2. Completa los campos requeridos para cada endpoint
3. Haz clic en el botón correspondiente
4. Visualiza la respuesta JSON

## 📁 Estructura del Proyecto

```
test-frontend/
├── index.html         # Estructura HTML
├── styles.css         # Estilos CSS
├── script.js          # Lógica JavaScript
└── README.md          # Este archivo
```

## 🔌 APIs Testeadas

### Motor IA (FastAPI)
- `POST /sesion/iniciar` - Iniciar sesión de chat
- `POST /sesion/{id}/responder` - Enviar mensaje al RAG
- `GET /sesion/{id}/estado` - Estado de la sesión
- `POST /sesion/{id}/test/siguiente` - Siguiente pregunta del test
- `POST /sesion/{id}/test/responder` - Responder pregunta del test

### Backend (Express)
- `POST /api/auth/registro` - Registrar usuario
- `POST /api/auth/login` - Login
- `GET /api/carreras` - Listar carreras
- `GET /api/facultades` - Listar facultades
- `GET /api/pensum/{id}` - Obtener pensum de una carrera
- `GET /api/clases` - Listar clases
- `GET /api/examenes` - Listar exámenes

## 🛠️ Desarrollo

### Agregar nuevas secciones
1. Agrega un nuevo `<div class="tab-content">` en `index.html`
2. Agrega un `<button class="tab-btn">` correspondiente
3. Implementa la lógica en `script.js`

### Personalizar estilos
- Los colores principales están en `styles.css`
- Gradiente: `#667eea` a `#764ba2`

### Integración real con APIs
Reemplaza las funciones `simulate*` en `script.js` con llamadas reales a las APIs:

```javascript
async function sendChatMessage() {
    const response = await fetchAPI(
        `${CONFIG.motoriaUrl}/sesion/${chatSessionId}/responder`,
        { method: 'POST', body: JSON.stringify({ mensaje: message }) }
    );
    // Procesar respuesta real
}
```

## 📊 Respuestas Simuladas

Actualmente, el frontend usa datos simulados para testing sin dependencias. Para usar APIs reales:

### Chat RAG
Implementar llamada a:
```
POST {motoriaUrl}/sesion/{sessionId}/responder
Body: { "respuesta": "texto del usuario" }
Response: { "respuesta": "...", "perfil": {...} }
```

### Motor Test
Implementar llamada a:
```
POST {motoriaUrl}/sesion/{sessionId}/test/siguiente
Response: { "texto": "...", "tipo": "opciones", "opciones": [...] }

POST {motoriaUrl}/sesion/{sessionId}/test/responder
Body: { "respuesta": "opción seleccionada" }
Response: { "pregunta_siguiente": {...} } o { "resultado": {...} }
```

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| CORS Error | Asegúrate que los servicios tienen CORS habilitado |
| API no responde | Verifica que Motor IA y Backend están ejecutándose |
| Configuración no se guarda | Revisa si localStorage está habilitado en el navegador |
| Estilos rotos | Limpia caché del navegador (Ctrl+Shift+R) |

## 📝 Notas

- Este es un frontend de **testing y desarrollo**, no para producción
- Las respuestas están **simuladas** para testing sin dependencias
- Se puede expandir fácilmente para integración con APIs reales
- Compatible con navegadores modernos (Chrome, Firefox, Safari, Edge)

## 🎨 Customización

### Cambiar colores
En `styles.css`, busca:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Agregar nuevos tipos de preguntas
En `script.js`, modifica `renderTestOptions()` para soportar nuevos tipos.

### Cambiar idioma
Reemplaza strings en español por el idioma deseado en `index.html` y `script.js`.

## 📄 Licencia

Parte del proyecto UTMACHOrienta - Sistema de Orientación Vocacional UTMACH

---

**Última actualización:** Junio 2026
**Versión:** 1.0.0
