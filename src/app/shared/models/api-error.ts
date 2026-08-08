export interface ApiError {
  type: 'BUSINESS' | 'VALIDATION' | 'HTTP';
  message: string;
  statusCode?: number;
  requestId?: string;
  raw?: any;
}
