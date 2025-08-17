import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import generationsRouter from './routes/generations';
import { authMiddleware } from './middlewares/auth';
import { errorHandler } from './middlewares/error';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check (public endpoint)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth middleware for all routes except /health
app.use(authMiddleware);

// Routes
app.use('/generations', generationsRouter);

// Error handler
app.use(errorHandler);

export default app;
