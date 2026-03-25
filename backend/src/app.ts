import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import './config/database';

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
  console.log(`🔌 Client kết nối: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client ngắt kết nối: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 SmartDrive Backend đang chạy tại http://localhost:${PORT}`);
});

export { io };
export default app;