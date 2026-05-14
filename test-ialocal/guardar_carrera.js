// guardar_carrera.js
const { Client } = require('pg');

// 1. Configuración de tu conexión local a PostgreSQL
// (Ajusta el usuario y contraseña si usas unos diferentes en tu sistema)
const db = new Client({
  user: 'deibisuk', 
  host: 'localhost',
  database: 'utmach_orienta',
  password: 'root', // Deja vacío si tu usuario postgres local no tiene contraseña
  port: 5432,
});

const OLLAMA_EMBED_URL = 'http://localhost:11434/api/embeddings';

// 2. Los datos reales que vamos a guardar
const carrera = "Tecnologías de la Información";
const tipoDocumento = "Perfil de Egreso";
const contenido = "El profesional en Tecnologías de la Información de la UTMACH diseña, implementa y gestiona soluciones de software, bases de datos y arquitectura de redes. Es capaz de desarrollar aplicaciones web full-stack, configurar sistemas operativos basados en Linux y administrar servidores para optimizar los recursos tecnológicos de las organizaciones.";

async function vectorizarYGuardar() {
  try {
    // Conectamos a Postgres
    await db.connect();
    console.log("🟢 Conectado a PostgreSQL (utmach_orienta)");

    // 3. Pedimos a Ollama que convierta el texto en matemáticas
    console.log("🧠 Vectorizando el texto con nomic-embed-text...");
    const respuestaOllama = await fetch(OLLAMA_EMBED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: contenido
      })
    });

    const datosOllama = await respuestaOllama.json();
    const vectorMatematico = datosOllama.embedding; // Aquí están los 768 números

    console.log(`✅ Texto convertido a vector de ${vectorMatematico.length} dimensiones.`);

    // 4. Guardamos todo en la tabla documentos_carreras
    console.log("💾 Guardando en la base de datos...");
    const query = `
      INSERT INTO documentos_carreras (carrera, tipo_documento, contenido, embedding)
      VALUES ($1, $2, $3, $4)
    `;
    
    // pgvector requiere que el array de números se pase como un string tipo "[0.1, 0.2...]"
    const valores = [carrera, tipoDocumento, contenido, JSON.stringify(vectorMatematico)];

    await db.query(query, valores);
    console.log("🎉 ¡Artículo guardado exitosamente en la memoria!");

  } catch (error) {
    console.error("❌ Error en el proceso:", error.message);
  } finally {
    await db.end(); // Cerramos la conexión
  }
}

vectorizarYGuardar();