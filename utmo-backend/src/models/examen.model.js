import db from '../config/db.js';

const ExamenModel = {
  getAll: async () => {
    const result = await db.query('SELECT * FROM examenes ORDER BY id ASC');
    return result.rows;
  },

  getByCarrera: async (id_carrera) => {
    const result = await db.query(
      'SELECT * FROM examenes WHERE id_carrera = $1',
      [id_carrera]
    );
    return result.rows[0];
  }
};

export default ExamenModel;