import * as AuthService from '../services/auth.service.js';

const handleError = (res, error) => {
	const status = error.status || 500;
	res.status(status).json({ ok: false, message: error.message || 'Error interno' });
};

export const login = async (req, res) => {
	try {
		const data = await AuthService.login(req.body);
		res.json({ ok: true, data });
	} catch (error) {
		handleError(res, error);
	}
};

export const register = async (req, res) => {
	try {
		const data = await AuthService.register(req.body);
		res.status(201).json({ ok: true, data });
	} catch (error) {
		handleError(res, error);
	}
};

export const logout = async (_req, res) => {
	res.json({ ok: true, message: 'Sesion cerrada' });
};
