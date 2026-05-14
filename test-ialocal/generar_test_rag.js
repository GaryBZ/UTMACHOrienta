// generar_test_rag.js
const { Client } = require('pg');

// 1. Configuración de tu base de datos
const db = new Client({
  user: 'deibisuk',
  host: 'localhost',
  database: 'utmach_orienta',
  password: 'root',
  port: 5432,
});

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_EMBED_URL = 'http://localhost:11434/api/embeddings';

// Lo que el estudiante seleccionaría en tu plataforma
const carreraSolicitada = "Tecnologías de la Información";

async function generarTestConRAG() {
  try {
    await db.connect();
    const startTime = Date.now();
    console.log(`🔎 1. Buscando información sobre: "${carreraSolicitada}"...`);

    // PASO A: Convertir la petición a vector para poder buscarla
    const resEmbed = await fetch(OLLAMA_EMBED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: carreraSolicitada
      })
    });
    const { embedding } = await resEmbed.json();

    // PASO B: Búsqueda Semántica en PostgreSQL
    // El operador <=> busca la distancia (similitud) entre vectores
    const query = `
      SELECT carrera, contenido 
      FROM documentos_carreras 
      ORDER BY embedding <=> $1 
      LIMIT 1;
    `;
    const dbRes = await db.query(query, [JSON.stringify(embedding)]);
    
    if (dbRes.rows.length === 0) {
      console.log("No se encontró información en la base de datos.");
      return;
    }

    const documentoEncontrado = dbRes.rows[0];
    console.log(`📚 2. ¡Documento encontrado! (Carrera: ${documentoEncontrado.carrera})`);

    // PASO C: El "Prompt Maestro" inyectando el contexto real
    console.log("🧠 3. Llama 3 (Vulkan) está redactando la pregunta...");
    
    const promptMaestro = `
      Eres un experto en orientación vocacional de la UTMACH.
      Basándote ESTRICTAMENTE en la siguiente información oficial de la carrera:
      
      [INICIO DE LA INFORMACIÓN]
      ${documentoEncontrado.contenido}
      [FIN DE LA INFORMACIÓN]

      Genera UNA pregunta de opción múltiple (A, B, C, D) para evaluar si un estudiante tiene aptitud para esta carrera. 
      La pregunta debe tratar sobre las habilidades mencionadas en el texto.
      Responde SOLO con la pregunta y las opciones, sin texto adicional.
    `;

    // PASO D: Generar la respuesta final con Llama 3
    const resLlama = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt: promptMaestro,
        stream: false
      })
    });

    const datosLlama = await resLlama.json();
    const tiempoTotal = (Date.now() - startTime) / 1000;

    console.log(`\n✅ ¡Proceso RAG completado en ${tiempoTotal} segundos!\n`);
    console.log("------------------ TEST GENERADO ------------------");
    console.log(datosLlama.response);
    console.log("---------------------------------------------------");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await db.end();
  }
}

generarTestConRAG();