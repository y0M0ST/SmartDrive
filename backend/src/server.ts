import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { AppDataSource } from './config/data-source';
import apiRoutes from './apis';
import { setupSwagger } from './api-docs/swagger';
import {
    globalErrorHandler,
    notFoundHandler,
} from './middleware/error-handler.middleware';

const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/api', apiRoutes);
setupSwagger(app);
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Khởi động Database trước, lên thành công thì mới mở cổng Server API
AppDataSource.initialize()
    .then(() => {
        console.log('Đã kết nối thành công tới Database!');
        app.listen(port, () => {
            console.log(`Server dang chay o cong ${port}`);
            console.log(`Swagger docs: http://localhost:${port}/api/docs`);
        });
    })
    .catch((error) => {
        console.error('Lỗi kết nối Database:', error);
    });