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
import agencyRoutes from './apis/agencies/agency.routes';
import agencyAccountRoutes from './apis/agency-accounts/agencyAccount.routes';
import driverRoutes from './apis/drivers/driver.routes';
import driverAccountRoutes from './apis/driver-accounts/driverAccount.routes';
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
const io         = new Server(httpServer, {
  cors: { origin: '*' }
});
const PORT = process.env.PORT || 5000;

const swaggerBaseSpec = swaggerSpec as any;
const swaggerDocsSpec = {
  ...swaggerBaseSpec,
  info: {
    ...swaggerBaseSpec.info,
    title: 'SmartDrive API Swagger',
    description: 'Swagger nay khong tu dong dang nhap hoac chen token. Hay dung nut Authorize va chon dung tai khoan, dung role can test cho tung luong API.',
  },
  servers: [
    {
      url: '/',
      description: 'Backend server hien tai, khong co privilege override',
    },
  ],
};

const swaggerDocsCss = `
  .swagger-ui .information-container .main::before {
    content: 'Swagger docs khong auto gan token. Hay bam Authorize va dang nhap dung role de test. Sprint 1 hien publish cac module auth, agency, driver, driver-account va vehicle.';
    display: block;
    margin: 0 0 16px;
    padding: 14px 16px;
    border-radius: 10px;
    background: #fff4d6;
    border: 1px solid #f0c36d;
    color: #7a4b00;
    font-weight: 700;
    line-height: 1.5;
  }
`;
// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocsSpec, {
  explorer: true,
  customCss: swaggerDocsCss,
  customSiteTitle: 'SmartDrive API Swagger',
}));

// Expose Swagger JSON cho Postman import
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agencies', agencyRoutes);
app.use('/api/agency-accounts', agencyAccountRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/driver-accounts', driverAccountRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/locations', locationRoutes);

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