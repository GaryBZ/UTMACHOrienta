// ═════════════════════════════════════════════════════════════════════════
// UTMACHOrienta Test Frontend - Script Principal
// ═════════════════════════════════════════════════════════════════════════

// ───── CONFIGURACIÓN ─────
const CONFIG = {
    motoriaUrl: localStorage.getItem('motoriaUrl') || 'http://localhost:8000',
    backendUrl: localStorage.getItem('backendUrl') || 'http://localhost:3000'
};

let currentTab = 'chat';
let chatSessionId = null;
let testSessionId = null;
let testCurrentQuestion = null;
let testTurn = 0;
let authToken = null;  // ← Token JWT para autenticación

// ═════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═════════════════════════════════════════════════════════════════════════

function updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
}

function log(message) {
    console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

function showError(message) {
    updateStatus(`❌ Error: ${message}`, 'error');
    log(`ERROR: ${message}`);
}

function showLoading(message = 'Cargando...') {
    updateStatus(message, 'loading');
}

async function fetchAPI(url, options = {}) {
    try {
        showLoading(`📡 ${options.method || 'GET'} ${url.split('/').pop()}`);
        
        // Si el body es FormData, no establecer Content-Type manualmente
        const headers = {
            ...options.headers,
        };
        
        // Agregar token si está disponible
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        // Solo agregar Content-Type si no es FormData
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        
        const response = await fetch(url, {
            ...options,
            headers: headers
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`${response.status}: ${error}`);
        }

        const data = await response.json();
        updateStatus('✅ Listo', 'info');
        return data;
    } catch (error) {
        showError(error.message);
        throw error;
    }
}

// ═════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═════════════════════════════════════════════════════════════════════════

document.getElementById('saveConfig').addEventListener('click', () => {
    CONFIG.motoriaUrl = document.getElementById('motoriaUrl').value;
    CONFIG.backendUrl = document.getElementById('backendUrl').value;

    localStorage.setItem('motoriaUrl', CONFIG.motoriaUrl);
    localStorage.setItem('backendUrl', CONFIG.backendUrl);

    updateStatus('✅ Configuración guardada', 'info');
    log(`Config: Motor IA: ${CONFIG.motoriaUrl}, Backend: ${CONFIG.backendUrl}`);
});

// ═════════════════════════════════════════════════════════════════════════
// NAVEGACIÓN DE TABS
// ═════════════════════════════════════════════════════════════════════════

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Remove active class from all tabs and buttons
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

        // Add active class to clicked button and corresponding tab
        e.target.classList.add('active');
        const tabId = e.target.dataset.tab;
        document.getElementById(tabId).classList.add('active');
        currentTab = tabId;
    });
});

// ═════════════════════════════════════════════════════════════════════════
// CHAT RAG
// ═════════════════════════════════════════════════════════════════════════

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    try {
        // Verificar que el usuario está autenticado
        if (!authToken) {
            showError('Debes hacer login primero. Ve a la pestaña "Motor IA" y haz login.');
            return;
        }
        
        // Initialize session if not already done
        if (!chatSessionId) {
            showLoading('📝 Iniciando sesión de chat...');
            const initResponse = await fetchAPI(
                `${CONFIG.motoriaUrl}/sesion/iniciar`,
                { method: 'POST' }
            );
            chatSessionId = initResponse.sesion_id;
            log(`Chat session iniciada: ${chatSessionId}`);
        }

        // Add user message to chat
        addChatMessage(message, 'user');
        input.value = '';

        showLoading('🤔 Procesando respuesta...');

        // Call Motor IA API real
        const response = await fetchAPI(
            `${CONFIG.motoriaUrl}/sesion/${chatSessionId}/responder`,
            {
                method: 'POST',
                body: JSON.stringify({ 
                    respuesta: message,
                    pregunta_texto: '',
                    pregunta_tipo: 'texto_libre'
                })
            }
        );

        const respuestaTexto = response.respuesta || response.texto || 'Respuesta procesada';
        addChatMessage(respuestaTexto, 'system');

        // Update profile
        if (response.perfil) {
            document.getElementById('chatProfile').textContent = JSON.stringify(response.perfil, null, 2);
        }

        updateStatus('✅ Listo', 'info');
    } catch (error) {
        addChatMessage(`❌ Error: ${error.message}`, 'system');
        showError(error.message);
    }
}

function addChatMessage(text, role) {
    const messagesDiv = document.getElementById('chatMessages');
    const msgEl = document.createElement('div');
    msgEl.className = `message ${role}`;
    msgEl.innerHTML = `<strong>${role === 'user' ? '👤 Tú' : '🤖 Asistente'}:</strong> ${escapeHtml(text)}`;
    messagesDiv.appendChild(msgEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ═════════════════════════════════════════════════════════════════════════
// Funciones simuladas (deprecated - ahora usamos APIs reales)
// Dejadas como fallback si las APIs no están disponibles
// ═════════════════════════════════════════════════════════════════════════

async function simulateRAGResponse(userMessage) {
    // Simulated responses for testing
    const responses = [
        {
            text: '¿Qué materias te gustan más en la escuela?',
            perfil: { intereses: ['STEM'] }
        },
        {
            text: '¿Tienes facilidad para resolver problemas matemáticos?',
            perfil: { intereses: ['STEM'], habilidades: ['matemáticas'] }
        },
        {
            text: 'Perfecto. Basándome en tus respuestas, te recomiendo carreras en: Ingeniería, Informática, Física.',
            perfil: { intereses: ['STEM'], habilidades: ['matemáticas'], carrera_candidata: 'Ingeniería' }
        }
    ];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    return { respuesta: randomResponse.text, perfil: randomResponse.perfil };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.getElementById('chatSendBtn').addEventListener('click', sendChatMessage);
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

document.getElementById('chatResetBtn').addEventListener('click', async () => {
    try {
        // Verificar que el usuario está autenticado
        if (!authToken) {
            showError('Debes hacer login primero. Ve a la pestaña "Motor IA" y haz login.');
            return;
        }
        
        showLoading('🔄 Iniciando nueva sesión...');
        
        // Initialize chat session with Motor IA
        const response = await fetchAPI(
            `${CONFIG.motoriaUrl}/sesion/iniciar`,
            { method: 'POST' }
        );
        
        chatSessionId = response.sesion_id;
        
        document.getElementById('chatMessages').innerHTML = `
            <div class="message system">
                <strong>Sistema:</strong> ${response.texto || 'Hola 👋 Nueva sesión iniciada. ¿Cuáles son tus intereses académicos?'}
            </div>
        `;
        document.getElementById('chatProfile').textContent = JSON.stringify(response.perfil || {}, null, 2);
        updateStatus('✅ Nueva sesión de chat', 'info');
    } catch (error) {
        addChatMessage(`❌ Error al iniciar sesión: ${error.message}`, 'system');
        showError(`Error: ${error.message}`);
    }
});

// ═════════════════════════════════════════════════════════════════════════
// MOTOR TEST
// ═════════════════════════════════════════════════════════════════════════

async function startTest() {
    try {
        // Verificar que el usuario está autenticado
        if (!authToken) {
            showError('Debes hacer login primero. Ve a la pestaña "Motor IA" y haz login.');
            return;
        }
        
        showLoading('📋 Iniciando test adaptativo...');
        
        // Call Motor IA to start test session
        const response = await fetchAPI(
            `${CONFIG.motoriaUrl}/sesion/iniciar`,
            { method: 'POST' }
        );
        
        testSessionId = response.sesion_id;
        testTurn = response.turno || 1;
        testCurrentQuestion = response;

        // Display first question
        document.getElementById('testQuestion').innerHTML = `
            <p><strong>${escapeHtml(response.texto)}</strong></p>
        `;

        renderTestOptions(response);
        updateTestProgress();

        document.getElementById('testStartBtn').style.display = 'none';
        document.getElementById('testSubmitBtn').style.display = 'inline-block';
        updateStatus('✅ Test iniciado', 'info');
    } catch (error) {
        showError(`No se pudo iniciar el test: ${error.message}`);
    }
}

function renderTestOptions(question) {
    const optionsDiv = document.getElementById('testOptions');
    optionsDiv.innerHTML = '';

    if (question.tipo === 'opciones' || question.tipo === 'escala') {
        question.opciones.forEach((opcion, index) => {
            const label = document.createElement('label');
            label.className = 'test-option';
            label.innerHTML = `
                <input type="radio" name="respuesta" value="${index}">
                ${escapeHtml(opcion)}
            `;
            optionsDiv.appendChild(label);

            label.addEventListener('click', () => {
                document.querySelectorAll('.test-option').forEach(l => l.classList.remove('selected'));
                label.classList.add('selected');
            });
        });
    } else if (question.tipo === 'multiple') {
        question.opciones.forEach((opcion, index) => {
            const label = document.createElement('label');
            label.className = 'test-option';
            label.innerHTML = `
                <input type="checkbox" name="respuesta" value="${index}">
                ${escapeHtml(opcion)}
            `;
            optionsDiv.appendChild(label);

            label.addEventListener('click', (e) => {
                if (e.target.checked) {
                    label.classList.add('selected');
                } else {
                    label.classList.remove('selected');
                }
            });
        });
    }
}

function updateTestProgress() {
    const progressEl = document.getElementById('testProgress');
    progressEl.textContent = `Pregunta ${testTurn} de 12`;

    const fillEl = document.getElementById('progressFill');
    fillEl.style.width = `${(testTurn / 12) * 100}%`;
}

async function submitTestAnswer() {
    const selectedOptions = document.querySelectorAll('input[name="respuesta"]:checked');

    if (selectedOptions.length === 0) {
        showError('Selecciona una respuesta');
        return;
    }

    try {
        showLoading('📊 Procesando respuesta...');

        const respuesta = selectedOptions[0].value;

        // Send answer to Motor IA API
        const response = await fetchAPI(
            `${CONFIG.motoriaUrl}/sesion/${testSessionId}/responder`,
            {
                method: 'POST',
                body: JSON.stringify({
                    respuesta: respuesta,
                    pregunta_texto: testCurrentQuestion.texto,
                    pregunta_tipo: testCurrentQuestion.tipo
                })
            }
        );

        // Check if test is complete
        if (response.es_recomendacion) {
            // Test finished, show result
            document.getElementById('testResult').textContent = JSON.stringify(response, null, 2);
            document.getElementById('testSubmitBtn').textContent = '✅ Test Completado';
            document.getElementById('testSubmitBtn').disabled = true;
            document.getElementById('testQuestion').innerHTML = '<p><strong>✅ Test completado. Ver resultados abajo.</strong></p>';
            document.getElementById('testOptions').innerHTML = '';
            updateStatus('🎉 Test completado', 'info');
            return;
        }

        // Continue with next question
        testCurrentQuestion = response;
        testTurn = response.turno || testTurn + 1;

        document.getElementById('testQuestion').innerHTML = `
            <p><strong>${escapeHtml(response.texto)}</strong></p>
        `;

        renderTestOptions(response);
        updateTestProgress();
        updateStatus('✅ Respuesta enviada', 'info');
    } catch (error) {
        showError(`Error al enviar respuesta: ${error.message}`);
    }
}

async function simulateTestQuestion(turnNumber) {
    const preguntas = [
        {
            texto: '¿Cuál de estas áreas te interesa más?',
            tipo: 'opciones',
            opciones: ['Matemáticas', 'Ciencias Naturales', 'Lenguaje', 'Sociales']
        },
        {
            texto: '¿Qué tan importante es el trabajo en equipo para ti?',
            tipo: 'escala',
            opciones: ['Muy poco', 'Poco', 'Moderadamente', 'Mucho', 'Extremadamente']
        },
        {
            texto: '¿En qué áreas crees que tienes más habilidades? (Selecciona múltiples)',
            tipo: 'multiple',
            opciones: ['Análisis', 'Creatividad', 'Comunicación', 'Liderazgo', 'Resolución de problemas']
        },
        {
            texto: '¿Te gustaría trabajar con tecnología?',
            tipo: 'opciones',
            opciones: ['Definitivamente sí', 'Probablemente', 'No estoy seguro', 'Probablemente no', 'No']
        },
        {
            texto: '¿Prefieres un trabajo más teórico o práctico?',
            tipo: 'opciones',
            opciones: ['Muy teórico', 'Más teórico que práctico', 'Equilibrado', 'Más práctico que teórico', 'Muy práctico']
        }
    ];

    await new Promise(resolve => setTimeout(resolve, 300));
    return preguntas[turnNumber % preguntas.length];
}

document.getElementById('testStartBtn').addEventListener('click', startTest);
document.getElementById('testSubmitBtn').addEventListener('click', submitTestAnswer);
document.getElementById('testResetBtn').addEventListener('click', () => {
    testTurn = 0;
    testSessionId = null;
    testCurrentQuestion = null;
    document.getElementById('testQuestion').innerHTML = `
        <p class="message system">👇 Haz clic en "Iniciar Test" para comenzar</p>
    `;
    document.getElementById('testOptions').innerHTML = '';
    document.getElementById('testResult').textContent = 'Esperando resultado...';
    document.getElementById('testStartBtn').style.display = 'inline-block';
    document.getElementById('testSubmitBtn').style.display = 'none';
    document.getElementById('testSubmitBtn').disabled = false;
    document.getElementById('testSubmitBtn').textContent = 'Enviar Respuesta';
    document.getElementById('progressFill').style.width = '0%';
    updateStatus('✅ Test reiniciado', 'info');
});

// ═════════════════════════════════════════════════════════════════════════
// API EXPLORER
// ═════════════════════════════════════════════════════════════════════════

async function testAPI(endpoint) {
    const responseEl = document.getElementById('apiResponse');

    try {
        let url, options;

        switch (endpoint) {
            case 'registro':
                const nombre = document.getElementById('apiRegNombre').value;
                const email = document.getElementById('apiRegEmail').value;
                const pass = document.getElementById('apiRegPass').value;

                if (!nombre || !email || !pass) {
                    showError('Completa todos los campos');
                    return;
                }

                // Auth está en Motor IA, no en Backend
                url = `${CONFIG.motoriaUrl}/auth/registro`;
                options = {
                    method: 'POST',
                    body: JSON.stringify({ nombre, email, password: pass })
                };
                break;

            case 'login':
                const loginEmail = document.getElementById('apiLoginEmail').value;
                const loginPass = document.getElementById('apiLoginPass').value;

                if (!loginEmail || !loginPass) {
                    showError('Completa email y contraseña');
                    return;
                }

                // Auth está en Motor IA y espera form-data
                url = `${CONFIG.motoriaUrl}/auth/login`;
                
                // Usar FormData para enviar como application/x-www-form-urlencoded
                const formData = new FormData();
                formData.append('username', loginEmail);
                formData.append('password', loginPass);
                
                options = {
                    method: 'POST',
                    body: formData,
                    headers: {
                        // NO enviar Content-Type, el navegador lo establece automáticamente
                    }
                };
                break;

            case 'getCarreras':
                url = `${CONFIG.motoriaUrl}/carreras`;
                options = { method: 'GET' };
                break;

            case 'getFacultades':
                url = `${CONFIG.motoriaUrl}/facultades`;
                options = { method: 'GET' };
                break;

            default:
                showError('Endpoint no soportado');
                return;
        }

        const data = await fetchAPI(url, options);
        responseEl.textContent = JSON.stringify(data, null, 2);
        
        // Si es login, guardar el token
        if (endpoint === 'login' && data.access_token) {
            authToken = data.access_token;
            updateStatus(`✅ Autenticado como ${data.nombre}`, 'info');
            log(`Token guardado para usuario: ${data.nombre}`);
        }
        
        updateStatus('✅ Respuesta recibida', 'info');
    } catch (error) {
        responseEl.textContent = `Error: ${error.message}`;
        responseEl.style.color = '#ff6b6b';
    }
}

// ═════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═════════════════════════════════════════════════════════════════════════

window.addEventListener('load', () => {
    document.getElementById('motoriaUrl').value = CONFIG.motoriaUrl;
    document.getElementById('backendUrl').value = CONFIG.backendUrl;
    log('Frontend de Testing Iniciado ✅');
    updateStatus('✅ No autenticado - Haz login en Motor IA', 'info');

    // Test de conectividad (opcional)
    setTimeout(() => {
        testConnectivity();
    }, 500);
});

async function testConnectivity() {
    log('Verificando conectividad...');

    // Try Motor IA
    try {
        await fetchAPI(`${CONFIG.motoriaUrl}/docs`);
        log('✅ Motor IA disponible');
    } catch (error) {
        log(`⚠️ Motor IA no disponible: ${error.message}`);
    }

    // Try Backend
    try {
        await fetchAPI(`${CONFIG.backendUrl}/api/carreras`);
        log('✅ Backend disponible');
    } catch (error) {
        log(`⚠️ Backend no disponible: ${error.message}`);
    }
}

// Export for use in console
window.testAPI = testAPI;
window.CONFIG = CONFIG;
