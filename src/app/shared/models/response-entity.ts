export interface ResponseEntity<T> {
  statusCode: number;
  message: string;
  data?: T | null;
  requestId: string;
  timestamp: string;
}
