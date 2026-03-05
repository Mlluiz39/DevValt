import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app.error';
import { logger } from '../../config/logger';
import { env } from '../../config/env';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.errorCode,
        ...(env.NODE_ENV === 'development' && { stack: error.stack }),
      },
    });
    return;
  }

  // Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as {code?: string; meta?: {target?: string[]}};
    
    if (prismaError.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: {
          message: 'A record with this value already exists',
          code: 'DUPLICATE_ENTRY',
          fields: prismaError.meta?.target,
        },
      });
      return;
    }

    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: { message: 'Record not found', code: 'NOT_FOUND' },
      });
      return;
    }
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: { message: 'Invalid token', code: 'INVALID_TOKEN' },
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: { message: 'Token expired', code: 'TOKEN_EXPIRED' },
    });
    return;
  }

  // Unhandled error - log it but don't expose internals
  logger.error('Unhandled error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    requestId: req.headers['x-request-id'],
  });

  res.status(500).json({
    success: false,
    error: {
      message: env.NODE_ENV === 'production'
        ? 'An internal server error occurred'
        : error.message,
      code: 'INTERNAL_SERVER_ERROR',
    },
  });
}
