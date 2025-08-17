import { Request, Response, NextFunction } from 'express';
import { config } from '@/config';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization type' });
  }

  if (token !== config.api.bearerToken) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  next();
};
