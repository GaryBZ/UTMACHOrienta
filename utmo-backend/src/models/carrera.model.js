import db from "../config/db.js";

const CarreraModel = {
  getAll: async () => {
    const result = await db.query("SELECT * FROM carreras ORDER BY id ASC");
    return result.rows;
  },

  getById: async (id) => {
    const result = await db.query("SELECT * FROM carreras WHERE id = $1", [id]);
    return result.rows[0];
  },

  getByFacultad: async (id_facultad) => {
    const result = await db.query(
      "SELECT * FROM carreras WHERE id_facultad = $1 ORDER BY id ASC",
      [id_facultad],
    );
    return result.rows;
  },

  create: async ({
    id_facultad,
    nombre,
    descripcion,
    duracion_anios,
    creditos,
    modalidad,
    puntaje_minimo,
    campo_laboral,
    etiquetas,
    activa,
    link_malla,
  }) => {
    const result = await db.query(
      `INSERT INTO carreras (id_facultad, nombre, descripcion, duracion_anios, creditos, modalidad, puntaje_minimo, campo_laboral, etiquetas, activa, link_malla)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        id_facultad,
        nombre,
        descripcion,
        duracion_anios,
        creditos,
        modalidad,
        puntaje_minimo,
        campo_laboral,
        etiquetas,
        activa,
        link_malla ?? null,
      ],
    );
    return result.rows[0];
  },

  update: async (
    id,
    {
      id_facultad,
      nombre,
      descripcion,
      duracion_anios,
      creditos,
      modalidad,
      puntaje_minimo,
      campo_laboral,
      etiquetas,
      activa,
      link_malla,
    },
  ) => {
    const result = await db.query(
      `UPDATE carreras SET
      id_facultad = $1, nombre = $2, descripcion = $3,
      duracion_anios = $4, creditos = $5, modalidad = $6,
      puntaje_minimo = $7, campo_laboral = $8, etiquetas = $9,
      activa = $10, link_malla = $11
     WHERE id = $12 RETURNING *`,
      [
        id_facultad,
        nombre,
        descripcion,
        duracion_anios,
        creditos,
        modalidad,
        puntaje_minimo,
        campo_laboral,
        etiquetas,
        activa,
        link_malla ?? null,
        id,
      ],
    );
    return result.rows[0];
  },

  remove: async (id) => {
    const result = await db.query(
      "DELETE FROM carreras WHERE id = $1 RETURNING *",
      [id],
    );
    return result.rows[0];
  },
};

export default CarreraModel;
