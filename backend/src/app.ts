import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';

import authRoutes from './apis/auth/auth.routes';
import userRoutes from './apis/users/user.routes';
import agencyRoutes from './apis/agencies/agency.routes';
import driverRoutes from './apis/drivers/driver.routes';
import vehicleRoutes from './apis/vehicles/vehicle.routes';
import routeRoutes from './apis/routes/route.routes';
import locationRoutes from './apis/locations/location.routes';

import { swaggerSpec } from './config/swagger';

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
  override: false,
});

const app        = express();
const httpServer = createServer(app);
const io         = new Server(httpServer, { cors: { origin: '*' } });
const PORT       = process.env.PORT || 5000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve as any, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'SmartDrive API',
}) as any);

app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/agencies',  agencyRoutes);
app.use('/api/drivers',   driverRoutes);
app.use('/api/vehicles',  vehicleRoutes);
app.use('/api/routes',    routeRoutes);
app.use('/api/locations', locationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SmartDrive API is running', timestamp: new Date().toISOString() });
});

// Socket.io
io.on('connection', (socket) => {
  console.log(`Client kết nối: ${socket.id}`);
  socket.on('disconnect', () => console.log(`Client ngắt kết nối: ${socket.id}`));
});

httpServer.listen(PORT, () => {
  console.log(`SmartDrive Backend đang chạy tại http://localhost:${PORT}`);
});

export { io };
export default app;