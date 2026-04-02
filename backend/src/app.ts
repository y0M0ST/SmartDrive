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
import driverRoutes from './apis/drivers/driver.routes';
import vehicleRoutes from './apis/vehicles/vehicle.routes';

import { swaggerSpec } from './config/swagger';
import { loginService } from './apis/auth/auth.service';

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
  override: true,
});

const app        = express();
const httpServer = createServer(app);
const io         = new Server(httpServer, {
  cors: { origin: '*' }
});
const PORT = process.env.PORT || 5000;
type SwaggerCredential = {
  email: string;
  password: string;
};

const swaggerSuperAdminCredential: SwaggerCredential = {
  email: process.env.SWAGGER_SUPER_ADMIN_EMAIL?.trim().toLowerCase() || 'admin@smartdrive.vn',
  password: process.env.SWAGGER_SUPER_ADMIN_PASSWORD || 'Admin@123',
};

const swaggerBaseSpec = swaggerSpec as any;
const swaggerDocsSpec = {
  ...swaggerBaseSpec,
  info: {
    ...swaggerBaseSpec.info,
    title: 'SmartDrive API - Swagger Test Mode',
    description: 'Trang Swagger nay dang chay qua proxy mac dinh quyen Super Admin de ban test them, sua va xoa truc tiep. Frontend/UI thuc te van ap dung phan quyen that theo tai khoan dang nhap.',
  },
  servers: [
    {
      url: '/swagger-api',
      description: 'Swagger docs proxy mac dinh quyen Super Admin de test API',
    },
  ],
};

const swaggerDocsCss = `
  .swagger-ui .information-container .main::before {
    content: 'Swagger docs dang chay o TEST MODE voi quyen Super Admin mac dinh. Luong xoa hien tai la xoa truc tiep, khong con an/restore.';
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

const getSwaggerToken = async (email: string, password: string) => {
  const result = await loginService(email, password);

  if (result.code !== 'SUCCESS' || !result.data?.token) {
    throw new Error(`Khong the tao token Swagger cho tai khoan ${email}`);
  }

  return result.data.token;
};
// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/swagger-api', async (req, res) => {
  try {
    const targetPath = req.originalUrl.replace(/^\/swagger-api/, '') || '/';
    const targetUrl = new URL(targetPath, `http://localhost:${PORT}`);
    const headers = new Headers();

    const acceptHeader = req.headers.accept;
    if (acceptHeader) {
      headers.set('accept', Array.isArray(acceptHeader) ? acceptHeader.join(', ') : acceptHeader);
    }

    const isPublicAuthRoute = /^\/api\/auth\/(login|forgot-password|reset-password)$/.test(targetUrl.pathname);
    if (!isPublicAuthRoute) {
      const token = await getSwaggerToken(
        swaggerSuperAdminCredential.email,
        swaggerSuperAdminCredential.password
      );
      headers.set('authorization', `Bearer ${token}`);
    }

    let body: string | undefined;
    const hasBody = !['GET', 'HEAD'].includes(req.method.toUpperCase());
    if (hasBody && req.body && Object.keys(req.body).length > 0) {
      headers.set('content-type', 'application/json');
      body = JSON.stringify(req.body);
    }

    const proxyResponse = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const responseText = await proxyResponse.text();
    const contentType = proxyResponse.headers.get('content-type');

    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Swagger UI should always render a fresh response body instead of reusing browser cache.
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.removeHeader('ETag');

    res.status(proxyResponse.status);
    return res.end(responseText);
  } catch (error) {
    console.error('[Swagger Proxy] Error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Swagger proxy gap loi khi goi backend',
      error: 'SWAGGER_PROXY_ERROR',
    });
  }
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocsSpec, {
  explorer: true,
  customCss: swaggerDocsCss,
  customSiteTitle: 'SmartDrive Swagger Test Mode',
}));

// Expose Swagger JSON cho Postman import
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agencies', agencyRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/vehicles', vehicleRoutes);

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