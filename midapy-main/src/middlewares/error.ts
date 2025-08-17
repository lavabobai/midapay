import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // PostgreSQL error codes
  if ('code' in err && typeof err.code === 'string') {
    switch (err.code) {
      case '23514': // Check constraint violation
        return res.status(409).json({
          error: 'Constraint violation',
          message: 'Another generation is already in progress'
        });
      case '23505': // Unique violation
        return res.status(409).json({
          error: 'Unique constraint violation',
          message: err.message
        });
      default:
        break;
    }
  }

  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
};
