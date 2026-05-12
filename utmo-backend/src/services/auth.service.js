import bcrypt from 'bcryptjs';
import db from '../config/db.js';
import UsuarioModel from '../models/usuario.model.js';

const createError = (message, status = 400, code) => {
	const error = new Error(message);
	error.status = status;
	if (code) error.code = code;
	return error;
};

const allowedRoles = new Set(['aspirante', 'estudiante', 'administrador', 'invitado']);

const getRoleById = async (id) => {
	const result = await db.query('SELECT id, nombre FROM roles WHERE id = $1 LIMIT 1', [id]);
	return result.rows[0] || null;
};

const getRoleByName = async (name) => {
	const result = await db.query('SELECT id, nombre FROM roles WHERE LOWER(nombre) = LOWER($1) LIMIT 1', [name]);
	return result.rows[0] || null;
};

const resolveRole = async ({ id_rol, rol_nombre }) => {
	if (id_rol) {
		const role = await getRoleById(Number(id_rol));
		if (!role) throw createError('Rol no encontrado', 404);
		if (!allowedRoles.has(role.nombre.toLowerCase())) {
			throw createError('Rol no permitido', 400);
		}
		return role;
	}

	if (rol_nombre) {
		const role = await getRoleByName(rol_nombre);
		if (!role) throw createError('Rol no encontrado', 404);
		if (!allowedRoles.has(role.nombre.toLowerCase())) {
			throw createError('Rol no permitido', 400);
		}
		return role;
	}

	const defaultRoleId = 1;
	const role = await getRoleById(defaultRoleId);
	if (!role) throw createError('Rol por defecto no encontrado', 404);
	if (!allowedRoles.has(role.nombre.toLowerCase())) {
		throw createError('Rol por defecto no permitido', 400);
	}
	return role;
};

export const login = async ({ email, password }) => {
	const normalizedEmail = email ? email.trim().toLowerCase() : '';
	if (!normalizedEmail || !password) {
		throw createError('Email y contrasena requeridos', 400);
	}

	const user = await UsuarioModel.getAuthByEmail(normalizedEmail);
	if (!user) throw createError('Usuario no encontrado', 404);

	const isValid = await bcrypt.compare(password, user.password);
	if (!isValid) throw createError('Credenciales invalidas', 401);

	const { password: _password, ...safeUser } = user;
	return safeUser;
};

export const register = async (payload) => {
	const { nombre, apellido, email, password, colegio, ciudad, id_rol, rol_nombre } = payload;

	if (!nombre || !apellido || !email || !password) {
		throw createError('Datos incompletos', 400);
	}

	if (password.length < 8) {
		throw createError('La contrasena debe tener minimo 8 caracteres', 400);
	}

	const normalizedEmail = email.trim().toLowerCase();
	const existingByEmail = await UsuarioModel.getByEmail(normalizedEmail);
	if (existingByEmail) {
		throw createError('El correo ya esta registrado', 409, '23505');
	}

	const role = await resolveRole({ id_rol, rol_nombre });
	const passwordHash = await bcrypt.hash(password, 10);

	const created = await UsuarioModel.create({
		nombre,
		apellido,
		email: normalizedEmail,
		password: passwordHash,
		id_rol: role.id,
		colegio,
		ciudad
	});

	const user = await UsuarioModel.getAuthByEmail(created.email);
	const { password: _password, ...safeUser } = user;
	return safeUser;
};
