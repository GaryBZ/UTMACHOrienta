import db from '../config/db.js';

const ClaseModel = {

  getAll: async () => {
    const result = await db.query('SELECT * FROM clases ORDER BY id ASC');
    return result.rows;
  },

  getById: async (id) => {
    const result = await db.query('SELECT * FROM clases WHERE id = $1', [id]);
    return result.rows[0];
  },

  getByCarrera: async (id_carrera) => {
    const result = await db.query('SELECT * FROM clases WHERE id_carrera = $1 ORDER BY id ASC', [id_carrera]);
    return result.rows;
  },

  create: async ({ id_carrera, titulo, contenido, orden }) => {
    const result = await db.query(
      `INSERT INTO clases (id_carrera, titulo, contenido, orden)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id_carrera, titulo, contenido, orden]
    );
    return result.rows[0];
  },

  update: async (id, { id_carrera, titulo, contenido, orden }) => {
    const result = await db.query(
      `UPDATE clases SET
        id_carrera = $1, titulo = $2, contenido = $3, orden = $4
       WHERE id = $5 RETURNING *`,
      [id_carrera, titulo, contenido, orden, id]
    );
    return result.rows[0];
  },

  remove: async (id) => {
    const result = await db.query('DELETE FROM clases WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

};

export default ClaseModel;