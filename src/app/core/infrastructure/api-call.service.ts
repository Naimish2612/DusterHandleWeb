import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
  HttpRequest,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ResponseEntity } from '../../shared/models/response-entity';
import { ApiError } from '../../shared/models/api-error';

type BaseURL = keyof typeof environment.apiBaseUrls;

@Injectable({ providedIn: 'root' })
export class ApiCallService {
  constructor(private http: HttpClient) {}

  /* ==============================
     QUERY APIs
     ============================== */

  get<T>(
    module: BaseURL,
    endpoint: string,
    params?: Record<string, any>
  ): Observable<ResponseEntity<T>> {
    return this.http
      .get<ResponseEntity<T>>(this.buildUrl(module, endpoint), {
        params: this.buildParams(params),
      })
      .pipe(
        map(res => this.handleResponse(res)),
        catchError(err => this.handleHttpError(err))
      );
  }

  /* ==============================
     COMMAND APIs
     ============================== */

  post<T>(
    module: BaseURL,
    endpoint: string,
    payload: any
  ): Observable<ResponseEntity<T>> {
    return this.http
      .post<ResponseEntity<T>>(this.buildUrl(module, endpoint), payload)
      .pipe(
        map(res => this.handleResponse(res)),
        catchError(err => this.handleHttpError(err))
      );
  }

  put<T>(
    module: BaseURL,
    endpoint: string,
    params?: Record<string, any>
  ): Observable<ResponseEntity<T>> {
    return this.http
      .put<ResponseEntity<T>>(this.buildUrl(module, endpoint), null, {
        params: this.buildParams(params),
      })
      .pipe(
        map(res => this.handleResponse(res)),
        catchError(err => this.handleHttpError(err))
      );
  }

  delete<T>(
    module: BaseURL,
    endpoint: string,
    params?: Record<string, any>
  ): Observable<ResponseEntity<T>> {
    return this.http
      .delete<ResponseEntity<T>>(this.buildUrl(module, endpoint), {
        params: this.buildParams(params),
      })
      .pipe(
        map(res => this.handleResponse(res)),
        catchError(err => this.handleHttpError(err))
      );
  }

  /* ==============================
     FILE UPLOAD
     ============================== */

  upload<T>(
    module: BaseURL,
    endpoint: string,
    formData: FormData
  ): Observable<ResponseEntity<T>> {
    return this.http
      .post<ResponseEntity<T>>(this.buildUrl(module, endpoint), formData)
      .pipe(
        map(res => this.handleResponse(res)),
        catchError(err => this.handleHttpError(err))
      );
  }

  /* ==============================
     FILE DOWNLOAD
     ============================== */

  download(
    module: BaseURL,
    endpoint: string,
    params?: Record<string, any>
  ): Observable<Blob> {
    return this.http.get(this.buildUrl(module, endpoint), {
      params: this.buildParams(params),
      responseType: 'blob',
    });
  }

  /* ==============================
     CORE RESPONSE HANDLING
     ============================== */

  private handleResponse<T>(res: ResponseEntity<T>): ResponseEntity<T> {
    // SUCCESS
    if (res.statusCode === 200) {
      return res;
    }

    // VALIDATION ERROR
    if (res.statusCode === 422) {
      const validationMessage = this.extractValidationMessage(res);
      throw <ApiError>{
        type: 'VALIDATION',
        message: validationMessage || res.message,
        statusCode: res.statusCode,
        requestId: res.requestId,
        raw: res,
      };
    }

    // BUSINESS ERROR
    throw <ApiError>{
      type: 'BUSINESS',
      message: res.message || 'Operation failed',
      statusCode: res.statusCode,
      requestId: res.requestId,
      raw: res,
    };
  }

  private handleHttpError(error: HttpErrorResponse) {
  // ---------------------------------------
  // HTTP 422 - Validation error
  // ---------------------------------------
  if (error.status === 422 && error.error) {
    return throwError(() => <ApiError>{
      type: 'VALIDATION',
      message: this.extractValidationMessage(error.error),
      statusCode: error.status,
      requestId: error.error?.requestId,
      raw: error.error,
    });
  }

  // ---------------------------------------
  // Other HTTP errors (401, 403, 500, etc.)
  // ---------------------------------------
  return throwError(() => <ApiError>{
    type: 'HTTP',
    message:
      error.error?.message ||
      error.message ||
      'Server error occurred',
    statusCode: error.status,
    raw: error,
  });
}


  /* ==============================
     HELPERS
     ============================== */

  private extractValidationMessage(res: any): string {
  // 1️⃣ errors object (field-wise)
  if (res?.errors && typeof res.errors === 'object') {
    return Object.values(res.errors)
      .flat()
      .join('\n');
  }

  // 2️⃣ data array (flat messages)
  if (Array.isArray(res?.data)) {
    return res.data.join('\n');
  }

  // 3️⃣ fallback to message
  if (typeof res?.message === 'string') {
    return res.message;
  }

  // 4️⃣ absolute fallback
  return 'Validation failed';
}


  private buildParams(params?: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    if (!params) return httpParams;

    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        httpParams = httpParams.set(key, params[key]);
      }
    });
    return httpParams;
  }

  private buildUrl(module: BaseURL, endpoint: string): string {
    const base = environment.apiBaseUrls[module];
    
    return `${base}${endpoint}`;
  }
}
