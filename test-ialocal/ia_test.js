// ia_test.js

// La dirección por defecto donde Ollama levanta su API local en Linux
const OLLAMA_URL = 'http://localhost:11434/api/generate';

// Los parámetros que le enviaremos al modelo
const payload = {
  model: 'llama3',
  // Este prompt es un prototipo de lo que luego será dinámico
  prompt: 'Eres un orientador vocacional. Escribe UNA sola pregunta de opción múltiple (A, B, C, D) para saber si a un estudiante le gustaría la carrera de Tecnologías de la Información. Responde solo con la pregunta y las opciones.',
  // stream: false hace que espere a tener la respuesta completa antes de enviarla, 
  // ideal para que tu backend de Express luego la devuelva de golpe al frontend.
  stream: false 
};

async function generarPregunta() {
  console.log("⏳ Enviando petición a Llama 3 (Vulkan)...");
  
  // Guardamos el tiempo de inicio para medir qué tan rápido responde tu Arc B580
  const startTime = Date.now();

  try {
    const respuesta = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const datos = await respuesta.json();
    const tiempoTotal = (Date.now() - startTime) / 1000;

    console.log("\n✅ ¡Respuesta recibida en " + tiempoTotal + " segundos!\n");
    console.log("--------------------------------------------------");
    console.log(datos.response);
    console.log("--------------------------------------------------");

  } catch (error) {
    console.error("❌ Error al conectar con Ollama:", error.message);
    console.log("¿Asegúrate de que el servicio de Ollama esté corriendo?");
  }
}

// Ejecutamos la función
generarPregunta();