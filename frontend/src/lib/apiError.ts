export class ApiError extends Error {
  status: number;
  details?: unknown;
  isTransportFailure?: boolean;

  constructor(status: number, message: string, details?: unknown, isTransportFailure = false) {
    super(message);
    this.status = status;
    this.details = details;
    this.isTransportFailure = isTransportFailure;
  }
}

