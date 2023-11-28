import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ErrorHandler {
  constructor(private readonly logger: Logger) {}

  public async handleError(message: string, error: any) {
    this.logger.error(message, error);
    this.logger.error((error as Error).stack);
  }
}
