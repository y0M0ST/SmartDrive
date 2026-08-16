import 'dotenv/config';
import http from 'http';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { Server } from 'socket.io';
import { AppDataSource } from './config/data-source';
import apiRoutes from './apis';
import { setupSwagger } from './api-docs/swagger';
import {
    globalErrorHandler,
    notFoundHandler,
} from './middleware/error-handler.middleware';
import { setSocketIo } from './socket/socket-hub';
import { registerAgencySocketIo } from './socket/agency-socket';
import {
    buildCorsOptions,
    buildSocketIoCorsOptions,
    parseCorsOrigins,
} from './config/cors-origins';

const port = process.env.PORT || 3000;
const app = express();

const corsOrigins = parseCorsOrigins();

if (process.env.NODE_ENV === 'production' && corsOrigins.length === 0) {
    console.warn(
        '[CORS] FRONTEND_URL chua cau hinh — Socket.io va REST co the tu choi origin Vercel. Dat VD: https://your-app.vercel.app',
    );
} else if (corsOrigins.length > 0) {
    console.log('[CORS] Allowed origins:', corsOrigins.join(', '));
}

app.use(cors(buildCorsOptions(corsOrigins)));
app.use(express.json());
app.use(morgan('dev'));
app.use('/api', apiRoutes);
setupSwagger(app);
app.use(notFoundHandler);
app.use(globalErrorHandler);

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: buildSocketIoCorsOptions(corsOrigins),
    allowEIO3: true,
    pingTimeout: 60_000,
    pingInterval: 25_000,
    transports: ['websocket', 'polling'],
});
setSocketIo(io);
registerAgencySocketIo(io);

// Khởi động Database trước, lên thành công thì mới mở cổng Server API + Socket.io
AppDataSource.initialize()
    .then(() => {
        console.log('Đã kết nối thành công tới Database!');
        httpServer.listen(port, () => {
            console.log(`Server dang chay o cong ${port}`);
            console.log(`Swagger docs: http://localhost:${port}/api/docs`);
            console.log('Socket.io: JWT + agency_room, event trip_gps_update.');
        });
    })
    .catch((error) => {
        console.error('Lỗi kết nối Database:', error);
    });