import db from "../config/db.js";

const UsuarioModel = {
  getAll: async () => {
    const result = await db.query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.colegio, u.ciudad,
            u.activo, u.fecha_registro, r.nombre AS rol_nombre
     FROM usuarios u
     JOIN roles r ON r.id = u.id_rol
     ORDER BY u.id ASC`,
    );
    return result.rows;
  },

  toggleActivo: async (id, activo) => {
    const result = await db.query(
      `UPDATE usuarios SET activo = $1 WHERE id = $2 RETURNING *`,
      [activo, id],
    );
    return result.rows[0];
  },
  getByEmail: async (email) => {
    const result = await db.query(
      "SELECT id, email FROM usuarios WHERE LOWER(email) = LOWER($1)",
      [email],
    );
    return result.rows[0];
  },

  getAuthByEmail: async (email) => {
    const result = await db.query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.id_rol,
					u.colegio, u.ciudad, u.activo, u.fecha_registro, u.password,
					r.nombre AS rol_nombre
			 FROM usuarios u
			 JOIN roles r ON r.id = u.id_rol
			 WHERE LOWER(u.email) = LOWER($1)
			 LIMIT 1`,
      [email],
    );
    return result.rows[0];
  },

  create: async ({
    nombre,
    apellido,
    email,
    password,
    id_rol,
    colegio,
    ciudad,
  }) => {
    const result = await db.query(
      `INSERT INTO usuarios (nombre, apellido, email, password, id_rol, colegio, ciudad)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)
			 RETURNING *`,
      [
        nombre,
        apellido,
        email,
        password,
        id_rol,
        colegio || null,
        ciudad || null,
      ],
    );
    return result.rows[0];
  },
};

export default UsuarioModel;
