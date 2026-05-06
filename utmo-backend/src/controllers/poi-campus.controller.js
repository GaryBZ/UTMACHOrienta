import PoiCampusModel from '../models/poi-campus.model.js';

const CATEGORY_ALIASES = new Map([
	['administracion', 'Administración'],
	['admin', 'Administración'],
	['facultad', 'Facultad'],
	['facultades', 'Facultad'],
	['servicio', 'Servicio'],
	['servicios', 'Servicio'],
	['deporte', 'Deportes'],
	['deportes', 'Deportes'],
	['biblioteca', 'Biblioteca'],
	['bibliotecas', 'Biblioteca']
]);

const normalizeCategoria = (value) => {
	if (!value) return null;
	const normalized = value
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
	return CATEGORY_ALIASES.get(normalized) || null;
};

const parseActivo = (value) => {
	if (value === undefined || value === null) return undefined;
	const normalized = String(value).trim().toLowerCase();
	if (normalized === 'true' || normalized === '1') return true;
	if (normalized === 'false' || normalized === '0') return false;
	if (normalized === 'all') return 'all';
	return undefined;
};

export const getAll = async (req, res) => {
	try {
		const categoria = req.query.categoria ? normalizeCategoria(req.query.categoria) : null;
		if (req.query.categoria && !categoria) {
			return res.status(400).json({ ok: false, message: 'Categoria invalida' });
		}

		const activoParsed = parseActivo(req.query.activo);
		const activo = activoParsed === undefined ? true : activoParsed;

		const items = await PoiCampusModel.getAll({
			categoria,
			id_facultad: req.query.id_facultad,
			activo
		});
		res.json({ ok: true, data: items });
	} catch (error) {
		res.status(500).json({ ok: false, message: error.message });
	}
};

export const getById = async (req, res) => {
	try {
		const poi = await PoiCampusModel.getById(req.params.id);
		if (!poi) return res.status(404).json({ ok: false, message: 'Punto no encontrado' });
		res.json({ ok: true, data: poi });
	} catch (error) {
		res.status(500).json({ ok: false, message: error.message });
	}
};

export const getByCategoria = async (req, res) => {
	try {
		const categoria = normalizeCategoria(req.params.categoria);
		if (!categoria) {
			return res.status(400).json({ ok: false, message: 'Categoria invalida' });
		}

		const activoParsed = parseActivo(req.query.activo);
		const activo = activoParsed === undefined ? true : activoParsed;

		const items = await PoiCampusModel.getByCategoria(categoria, { activo });
		res.json({ ok: true, data: items });
	} catch (error) {
		res.status(500).json({ ok: false, message: error.message });
	}
};

export const create = async (req, res) => {
	try {
		const categoria = normalizeCategoria(req.body.categoria);
		if (!categoria) {
			return res.status(400).json({ ok: false, message: 'Categoria invalida' });
		}

		const poi = await PoiCampusModel.create({
			...req.body,
			categoria,
			activo: req.body.activo !== undefined ? req.body.activo : true
		});
		res.status(201).json({ ok: true, data: poi });
	} catch (error) {
		res.status(500).json({ ok: false, message: error.message });
	}
};

export const update = async (req, res) => {
	try {
		const payload = { ...req.body };
		if (payload.categoria !== undefined) {
			const categoria = normalizeCategoria(payload.categoria);
			if (!categoria) {
				return res.status(400).json({ ok: false, message: 'Categoria invalida' });
			}
			payload.categoria = categoria;
		}

		const poi = await PoiCampusModel.update(req.params.id, payload);
		if (!poi) return res.status(404).json({ ok: false, message: 'Punto no encontrado' });
		res.json({ ok: true, data: poi });
	} catch (error) {
		res.status(500).json({ ok: false, message: error.message });
	}
};

export const remove = async (req, res) => {
	try {
		const poi = await PoiCampusModel.remove(req.params.id);
		if (!poi) return res.status(404).json({ ok: false, message: 'Punto no encontrado' });
		res.json({ ok: true, message: 'Punto eliminado correctamente' });
	} catch (error) {
		res.status(500).json({ ok: false, message: error.message });
	}
};
