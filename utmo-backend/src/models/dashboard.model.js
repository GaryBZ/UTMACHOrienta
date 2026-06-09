import db from '../config/db.js';

export const getStats = async () => {
  const { rows: [carreras] } = await db.query(`SELECT COUNT(*) as total FROM carreras WHERE activa = true`);
  const { rows: [usuarios] } = await db.query(`SELECT COUNT(*) as total FROM usuarios WHERE activo = true`);
  const { rows: [pois] } = await db.query(`SELECT COUNT(*) as total FROM poi_campus WHERE activo = true`);
  const { rows: [examenes] } = await db.query(`SELECT COUNT(*) as total FROM resultados_examen`);
  const { rows: [facultades] } = await db.query(`SELECT COUNT(*) as total FROM facultades`);
  const { rows: [historial] } = await db.query(`SELECT COUNT(*) as total FROM historial_carreras`);

  return {
    carreras_activas: parseInt(carreras.total),
    usuarios_registrados: parseInt(usuarios.total),
    visitas_carreras: parseInt(historial.total),
    pois_campus: parseInt(pois.total),
    examenes_realizados: parseInt(examenes.total),
    facultades: parseInt(facultades.total),
  };
};

export const getTopCarreras = async () => {
  const { rows } = await db.query(`
    SELECT c.nombre, COUNT(h.id) as visitas
    FROM historial_carreras h
    JOIN carreras c ON h.id_carrera = c.id
    GROUP BY c.id, c.nombre
    ORDER BY visitas DESC
    LIMIT 6
  `);

  const max = rows[0]?.visitas || 1;
  const colors = ['#1b6dff', '#1D9E75', '#E07B2A', '#7C3AED', '#DC2626', '#1b6dff'];

  return rows.map((r, i) => ({
    nombre: r.nombre,
    visitas: parseInt(r.visitas),
    pct: Math.round((r.visitas / max) * 100),
    color: colors[i] || '#1b6dff',
  }));
};

export const getVisitasFacultad = async () => {
  const { rows } = await db.query(`
    SELECT f.codigo, f.nombre_completo as nombre, COUNT(h.id) as visitas
    FROM historial_carreras h
    JOIN carreras c ON h.id_carrera = c.id
    JOIN facultades f ON c.id_facultad = f.id
    GROUP BY f.id, f.codigo, f.nombre_completo
    ORDER BY visitas DESC
  `);

  const max = rows[0]?.visitas || 1;
  const palette = [
    { color: '#1b6dff', pale: '#e3edff' },
    { color: '#1D9E75', pale: '#E1F5EE' },
    { color: '#E07B2A', pale: '#FEF3E2' },
    { color: '#7C3AED', pale: '#F3E8FF' },
    { color: '#DC2626', pale: '#FEE2E2' },
  ];

  return rows.map((r, i) => ({
    codigo: r.codigo,
    nombre: r.nombre,
    visitas: parseInt(r.visitas),
    pct: Math.round((r.visitas / max) * 100),
    ...palette[i % palette.length],
  }));
};

export const getUsuariosRoles = async () => {
  const { rows } = await db.query(`
    SELECT r.nombre as rol, COUNT(u.id) as cantidad
    FROM usuarios u
    JOIN roles r ON u.id_rol = r.id
    GROUP BY r.id, r.nombre
    ORDER BY cantidad DESC
  `);

  const max = rows[0]?.cantidad || 1;
  const meta = {
    aspirante:     { color: '#1b6dff', pale: '#e3edff', icon: 'fa-solid fa-user-graduate' },
    estudiante:    { color: '#1D9E75', pale: '#E1F5EE', icon: 'fa-solid fa-book' },
    administrador: { color: '#7C3AED', pale: '#F3E8FF', icon: 'fa-solid fa-shield-halved' },
    invitado:      { color: '#E07B2A', pale: '#FEF3E2', icon: 'fa-solid fa-user' },
  };

  return rows.map(r => ({
    nombre: r.rol,
    cantidad: parseInt(r.cantidad),
    pct: Math.round((r.cantidad / max) * 100),
    ...(meta[r.rol.toLowerCase()] || { color: '#1b6dff', pale: '#e3edff', icon: 'fa-solid fa-user' }),
  }));
};

export const getVisitasDiarias = async (dias = 30) => {
  const { rows } = await db.query(`
    SELECT DATE(fecha) as fecha, COUNT(*) as total
    FROM historial_carreras
    WHERE fecha >= NOW() - INTERVAL '${dias} days'
    GROUP BY DATE(fecha)
    ORDER BY fecha ASC
  `);

  const max = Math.max(...rows.map(r => parseInt(r.total)), 1);

  return rows.map(r => ({
    day: new Date(r.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'numeric' }),
    val: parseInt(r.total),
    pct: Math.round((parseInt(r.total) / max) * 100),
  }));
};