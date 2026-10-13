import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { Prisma } from './generated/prisma/client';
import { ZodError, type ZodTypeAny } from 'zod';
import type { Response } from 'express';

@Injectable()
export class Validate implements PipeTransform {
  constructor(private readonly schema: ZodTypeAny) {}
  transform(value: unknown) {
    return this.schema.parse(value);
  }
}
@Catch()
export class Errors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (response.headersSent) {
      response.end();
      return;
    }
    if (error instanceof ZodError) {
      response
        .status(400)
        .json({ message: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
      return;
    }
    if (error instanceof HttpException) {
      response.status(error.getStatus()).json({ message: error.message });
      return;
    }
    // Express/Nest parser errors may originate from the CommonJS build while this
    // service uses ESM. Keep their HTTP status without echoing submitted body text.
    if (error instanceof Error && 'getStatus' in error && typeof error.getStatus === 'function' &&
        'getResponse' in error && typeof error.getResponse === 'function') {
      const status: unknown = error.getStatus();
      if (typeof status === 'number' && Number.isInteger(status) && status >= 400 && status <= 599) {
        response.status(status).json({ message: status === 400 ? 'Invalid request body.' :
          status === 413 ? 'Request body is too large.' : 'The request could not be processed.' });
        return;
      }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        response.status(409).json({ message: 'A record with these details already exists.' });
        return;
      }
      if (error.code === 'P2025') {
        response.status(404).json({ message: 'Record not found.' });
        return;
      }
      if (error.code === 'P2003') {
        response.status(400).json({ message: 'The linked record does not exist or is in use.' });
        return;
      }
      if (error.code === 'P2004') {
        response.status(409).json({ message: 'This change conflicts with a protected record. Refresh and review its current state.' });
        return;
      }
    }
    console.error(error instanceof Error ? error.name : 'Unhandled server error');
    response.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
}
