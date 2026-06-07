import db from "../config/db.js";

const HistorialModel = {
  registrarVisita: async (id_usuario, id_carrera) => {
    const result = await db.query(
      `INSERT INTO historial_carreras (id_usuario, id_carrera)
       VALUES ($1, $2) RETURNING *`,
      [id_usuario, id_carrera],
    );
    return result.rows[0];
  },

  getByUsuario: async (id_usuario) => {
    const result = await db.query(
      `SELECT h.id as historial_id,
            h.id_usuario,
            h.fecha,
            h.tabs_vistos,
            c.id as id_carrera,
            c.nombre as carrera_nombre,
            c.id_facultad,
            f.codigo as facultad_codigo,
            f.icono as facultad_icono
     FROM historial_carreras h
     JOIN carreras c ON c.id = h.id_carrera
     JOIN facultades f ON f.id = c.id_facultad
     WHERE h.id_usuario = $1
     ORDER BY h.fecha DESC`,
      [id_usuario],
    );
    return result.rows;
  },

  getMasVisitadas: async (limit = 10) => {
    const result = await db.query(
      `SELECT c.id, c.nombre, COUNT(h.id) as visitas
       FROM historial_carreras h
       JOIN carreras c ON c.id = h.id_carrera
       GROUP BY c.id, c.nombre
       ORDER BY visitas DESC
       LIMIT $1`,
      [limit],
    );
    return result.rows;
  },

  getVisitasPorCarrera: async (id_carrera) => {
    const result = await db.query(
      `SELECT COUNT(id) as visitas FROM historial_carreras WHERE id_carrera = $1`,
      [id_carrera],
    );
    return result.rows[0];
  },

  getTendencias: async () => {
    const result = await db.query(
      `SELECT DATE(fecha) as dia, COUNT(id) as visitas
       FROM historial_carreras
       GROUP BY dia
       ORDER BY dia DESC
       LIMIT 30`,
    );
    return result.rows;
  },

  actualizarTabs: async (id_usuario, id_carrera, tabs_vistos) => {
    const result = await db.query(
      `UPDATE historial_carreras 
     SET tabs_vistos = $1
     WHERE id = (
       SELECT id FROM historial_carreras 
       WHERE id_usuario = $2 AND id_carrera = $3
       ORDER BY fecha DESC 
       LIMIT 1
     ) RETURNING *`,
      [tabs_vistos, id_usuario, id_carrera],
    );
    return result.rows[0];
  },
};

export default HistorialModel;
