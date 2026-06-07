import db from "../config/db.js";

const PensumModel = {
  getAll: async () => {
    const result = await db.query("SELECT * FROM pensum ORDER BY id ASC");
    return result.rows;
  },

  getById: async (id) => {
    const result = await db.query("SELECT * FROM pensum WHERE id = $1", [id]);
    return result.rows[0];
  },

  getByCarrera: async (id_carrera) => {
    const result = await db.query(
      "SELECT * FROM pensum WHERE id_carrera = $1 ORDER BY id ASC",
      [id_carrera],
    );
    return result.rows;
  },

  create: async ({ id_carrera, semestre, nombre_materia }) => {
    const result = await db.query(
      `INSERT INTO pensum (id_carrera, semestre, nombre_materia)
       VALUES ($1, $2, $3) RETURNING *`,
      [id_carrera, semestre, nombre_materia],
    );
    return result.rows[0];
  },

  update: async (id, { id_carrera, semestre, nombre_materia }) => {
    const result = await db.query(
      `UPDATE pensum SET
        id_carrera = $1, semestre = $2, nombre_materia = $3
       WHERE id = $4 RETURNING *`,
      [id_carrera, semestre, nombre_materia, id],
    );
    return result.rows[0];
  },

  upsertByCarrera: async (id_carrera, materias) => {
    // materias = [{ semestre: 1, nombre_materia: 'Cálculo I' }, ...]
    await db.query("DELETE FROM pensum WHERE id_carrera = $1", [id_carrera]);

    if (!materias.length) return [];

    const values = materias
      .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
      .join(", ");

    const params = materias.flatMap((m) => [
      id_carrera,
      m.semestre,
      m.nombre_materia,
    ]);

    const result = await db.query(
      `INSERT INTO pensum (id_carrera, semestre, nombre_materia) VALUES ${values} RETURNING *`,
      params,
    );
    return result.rows;
  },

  remove: async (id) => {
    const result = await db.query(
      "DELETE FROM pensum WHERE id = $1 RETURNING *",
      [id],
    );
    return result.rows[0];
  },
};

export default PensumModel;
