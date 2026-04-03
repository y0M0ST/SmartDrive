import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import './config/database';

import authRoutes from './apis/auth/auth.routes';
import adminRoutes from './apis/admins/admin.routes';
import routeRoutes from './apis/routes/route.routes';

import { swaggerSpec } from './config/swagger';

dotenv.config();

const app        = express();
const httpServer = createServer(app);
const io         = new Server(httpServer, {
  cors: { origin: '*' }
});
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: `
    .opblock-summary-path {
      display: none !important;
    }
  `
}));

// Expose Swagger JSON cho Postman import
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/routes', routeRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    message:   'SmartDrive API is running',
    timestamp: new Date().toISOString()
  });
});

// Socket.io
io.on('connection', (socket) => {
  console.log(`Client kết nối: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Client ngắt kết nối: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`SmartDrive Backend đang chạy tại http://localhost:${PORT}`);
});

export { io };
export default app;
