import db from '../config/db.js';

const PoiCampusModel = {

	getAll: async ({ categoria, id_facultad, activo } = {}) => {
		const conditions = [];
		const values = [];
		let idx = 1;

		if (categoria) {
			conditions.push(`categoria = $${idx++}`);
			values.push(categoria);
		}

		if (id_facultad) {
			conditions.push(`id_facultad = $${idx++}`);
			values.push(id_facultad);
		}

		if (activo !== undefined && activo !== 'all') {
			conditions.push(`activo = $${idx++}`);
			values.push(activo);
		}

		const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
		const result = await db.query(
			`SELECT * FROM poi_campus ${where} ORDER BY id ASC`,
			values
		);
		return result.rows;
	},

	getById: async (id) => {
		const result = await db.query('SELECT * FROM poi_campus WHERE id = $1', [id]);
		return result.rows[0];
	},

	getByCategoria: async (categoria, { activo } = {}) => {
		const conditions = ['categoria = $1'];
		const values = [categoria];
		let idx = 2;

		if (activo !== undefined && activo !== 'all') {
			conditions.push(`activo = $${idx++}`);
			values.push(activo);
		}

		const result = await db.query(
			`SELECT * FROM poi_campus WHERE ${conditions.join(' AND ')} ORDER BY id ASC`,
			values
		);
		return result.rows;
	},

	create: async ({
		nombre,
		descripcion,
		categoria,
		latitud,
		longitud,
		icono,
		color_hex,
		tags,
		id_facultad,
		activo
	}) => {
		const result = await db.query(
			`INSERT INTO poi_campus
				(nombre, descripcion, categoria, latitud, longitud, icono, color_hex, tags, id_facultad, activo)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			 RETURNING *`,
			[
				nombre,
				descripcion,
				categoria,
				latitud,
				longitud,
				icono,
				color_hex,
				tags,
				id_facultad,
				activo
			]
		);
		return result.rows[0];
	},

	update: async (id, payload) => {
		const setters = [];
		const values = [];
		let idx = 1;

		const assign = (key, value) => {
			setters.push(`${key} = $${idx++}`);
			values.push(value);
		};

		if (Object.prototype.hasOwnProperty.call(payload, 'nombre')) assign('nombre', payload.nombre);
		if (Object.prototype.hasOwnProperty.call(payload, 'descripcion')) assign('descripcion', payload.descripcion);
		if (Object.prototype.hasOwnProperty.call(payload, 'categoria')) assign('categoria', payload.categoria);
		if (Object.prototype.hasOwnProperty.call(payload, 'latitud')) assign('latitud', payload.latitud);
		if (Object.prototype.hasOwnProperty.call(payload, 'longitud')) assign('longitud', payload.longitud);
		if (Object.prototype.hasOwnProperty.call(payload, 'icono')) assign('icono', payload.icono);
		if (Object.prototype.hasOwnProperty.call(payload, 'color_hex')) assign('color_hex', payload.color_hex);
		if (Object.prototype.hasOwnProperty.call(payload, 'tags')) assign('tags', payload.tags);
		if (Object.prototype.hasOwnProperty.call(payload, 'id_facultad')) assign('id_facultad', payload.id_facultad);
		if (Object.prototype.hasOwnProperty.call(payload, 'activo')) assign('activo', payload.activo);

		if (setters.length === 0) {
			return PoiCampusModel.getById(id);
		}

		values.push(id);
		const result = await db.query(
			`UPDATE poi_campus SET ${setters.join(', ')} WHERE id = $${idx} RETURNING *`,
			values
		);
		return result.rows[0];
	},

	remove: async (id) => {
		const result = await db.query('DELETE FROM poi_campus WHERE id = $1 RETURNING *', [id]);
		return result.rows[0];
	}

};

export default PoiCampusModel;
