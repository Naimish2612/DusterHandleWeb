import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ResponseEntity } from '../../shared/models/response-entity';

type BaseURL = keyof typeof environment.apiBaseUrls;

@Injectable({ providedIn: 'root' })
export class ApiCallService2 {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrls; // ⬅️ Define in environments/environment.ts

  // ------------- Resolve BaseURL per Domain ------------- //
  private getUrl(endpoint: string, domain: BaseURL): string {
    const base = environment.apiBaseUrls[domain];
    return `${base}${endpoint}`;
  }

  // ------------ 🔹 Error Normalizer 🔹 ----------- //
  private normalizeError(err: any): ResponseEntity<null> {
    // console.log('normalizeError err =>' + JSON.stringify(err));
    return {
      statusCode: err.statusCode ?? err.status ?? 500,
      message:
        err.error?.message ??
        err.message ??
        err.message ??
        'Unexpected error occurred while processing the request.',
      data: err.data as any,
      requestId: err.requestId ?? err.error?.requestId ?? 'N/A',
      timestamp: err.timestamp ?? new Date().toISOString(),
    };
  }

  // ------------ 🔹 Response Unwrapper + Error Guard 🔹 ----------- //
  private unwrapResponse<T>(obs: Observable<ResponseEntity<T>>): Observable<T> {
    return obs.pipe(
      timeout(15000),
      map((res) => {
        // ✅ match exactly what backend sends
        // console.log('unwrapResponse res => ' + JSON.stringify(res));
        if (!res || res.statusCode !== 200) {
          throw this.normalizeError(res);
        }
        return (res.data ?? null) as T;
      }),
      catchError((err) => throwError(() => this.normalizeError(err))),
    );
  }

  // ----------------- CRUD METHODS ----------------- //
  get<T>(
    domain: BaseURL,
    endpoint: string,
    params?: Record<string, any>,
  ): Observable<T> {
    const httpParams = new HttpParams({ fromObject: params || {} });
    return this.unwrapResponse(
      this.http.get<ResponseEntity<T>>(this.getUrl(endpoint, domain), {
        params: httpParams,
        withCredentials: true,
      }),
    );
  }

  post<T>(domain: BaseURL, endpoint: string, body: any): Observable<T> {
    return this.unwrapResponse(
      this.http.post<ResponseEntity<T>>(this.getUrl(endpoint, domain), body, {
        withCredentials: true,
      }),
    );
  }

  put<T>(domain: BaseURL, endpoint: string, body: any): Observable<T> {
    return this.unwrapResponse(
      this.http.put<ResponseEntity<T>>(this.getUrl(endpoint, domain), body, {
        withCredentials: true,
      }),
    );
  }

  delete<T>(domain: BaseURL, endpoint: string): Observable<T> {
    return this.unwrapResponse(
      this.http.delete<ResponseEntity<T>>(this.getUrl(endpoint, domain)),
    );
  }

  postBatch<T>(
    domain: BaseURL,
    endpoint: string,
    items: any[],
  ): Observable<T[]> {
    return this.unwrapResponse(
      this.http.post<ResponseEntity<T[]>>(
        this.getUrl(endpoint, domain),
        items,
        { withCredentials: true },
      ),
    );
  }

  // ----------------- FILE HANDLING ----------------- //
  uploadFile<T>(
    domain: BaseURL,
    endpoint: string,
    file: File,
    extraData?: Record<string, any>,
  ): Observable<T> {
    const formData = new FormData();
    formData.append('file', file);
    if (extraData) {
      Object.entries(extraData).forEach(([key, val]) =>
        formData.append(key, val),
      );
    }
    return this.unwrapResponse(
      this.http.post<ResponseEntity<T>>(
        this.getUrl(endpoint, domain),
        formData,
        { withCredentials: true },
      ),
    );
  }

  uploadMultipleFiles<T>(
    domain: BaseURL,
    endpoint: string,
    files: File[],
    extraData?: Record<string, any>,
  ): Observable<T> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (extraData) {
      Object.entries(extraData).forEach(([key, val]) =>
        formData.append(key, val),
      );
    }
    return this.unwrapResponse(
      this.http.post<ResponseEntity<T>>(
        this.getUrl(endpoint, domain),
        formData,
        { withCredentials: true },
      ),
    );
  }

  downloadFile(
    domain: BaseURL,
    endpoint: string,
    params?: Record<string, any>,
  ): Observable<Blob> {
    const httpParams = new HttpParams({ fromObject: params || {} });
    return this.http.get(this.getUrl(endpoint, domain), {
      params: httpParams,
      responseType: 'blob',
      withCredentials: true,
    });
  }

  // ------------ 🔹 PAGINATION HELPER 🔹 ----------- //
  // Typical response: { items: T[], total: number }
  getPaged<T>(
    domain: BaseURL,
    endpoint: string,
    page: number,
    size: number,
    filters?: Record<string, any>,
  ): Observable<{ items: T[]; total: number }> {
    const params = { page, size, ...(filters || {}) };
    return this.unwrapResponse(
      this.http.get<ResponseEntity<{ items: T[]; total: number }>>(
        this.getUrl(endpoint, domain),
        { params, withCredentials: true },
      ),
    );
  }
}
