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

const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/api', apiRoutes);
setupSwagger(app);
app.use(notFoundHandler);
app.use(globalErrorHandler);

const httpServer = http.createServer(app);

const corsOrigins = process.env.FRONTEND_URL?.split(',').map((s) => s.trim()).filter(Boolean);
const io = new Server(httpServer, {
    cors: {
        origin: corsOrigins?.length ? corsOrigins : true,
        credentials: true,
    },
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