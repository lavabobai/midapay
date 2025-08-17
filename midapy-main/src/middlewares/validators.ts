import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Validation schemas
export const generateSchema = z.object({
  prompt: z.string().min(1).max(1000),
  aspectRatio: z.enum(['1:1', '16:9', '4:3']),
  style: z.string().optional()
});

// Middleware factory
const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      } else {
        next(error);
      }
    }
  };
};

export const validateGenerate = validateRequest(generateSchema);
