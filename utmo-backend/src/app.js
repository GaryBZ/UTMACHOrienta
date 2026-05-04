import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import usuarioRoutes from './routes/usuario.routes.js';
import facultadRoutes from './routes/facultad.routes.js';
import carreraRoutes from './routes/carrera.routes.js';
import pensumRoutes from './routes/pensum.routes.js';
import claseRoutes from './routes/clase.routes.js';
import examenRoutes from './routes/examen.routes.js';
import resultadoTestRoutes from './routes/resultado-test.routes.js';
import poiCampusRoutes from './routes/poi-campus.routes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/carrera', carreraRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/facultades', facultadRoutes);
app.use('/api/carreras', carreraRoutes);
app.use('/api/pensum', pensumRoutes);
app.use('/api/clases', claseRoutes);
app.use('/api/examenes', examenRoutes);
app.use('/api/resultado-test', resultadoTestRoutes);
app.use('/api/poi-campus', poiCampusRoutes);

export default app;