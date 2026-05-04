import db from '../config/db.js';

const FacultadModel = {

  getAll: async () => {
    const result = await db.query('SELECT * FROM facultades ORDER BY id ASC');
    return result.rows;
  },

  getById: async (id) => {
    const result = await db.query('SELECT * FROM facultades WHERE id = $1', [id]);
    return result.rows[0];
  },

  create: async ({ codigo, nombre_completo, descripcion, color_hex, icono }) => {
    const result = await db.query(
      `INSERT INTO facultades (codigo, nombre_completo, descripcion, color_hex, icono)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [codigo, nombre_completo, descripcion, color_hex, icono]
    );
    return result.rows[0];
  },

  update: async (id, { codigo, nombre_completo, descripcion, color_hex, icono }) => {
    const result = await db.query(
      `UPDATE facultades SET
        codigo = $1,
        nombre_completo = $2,
        descripcion = $3,
        color_hex = $4,
        icono = $5
       WHERE id = $6 RETURNING *`,
      [codigo, nombre_completo, descripcion, color_hex, icono, id]
    );
    return result.rows[0];
  },

  remove: async (id) => {
    const result = await db.query('DELETE FROM facultades WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

};

export default FacultadModel;