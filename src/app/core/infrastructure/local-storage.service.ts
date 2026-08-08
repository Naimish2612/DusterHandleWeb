import { Injectable } from '@angular/core';
import CryptoJS from 'crypto-js';



@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  // WARNING: Putting the secret here is NOT secure.
  // It will be visible in the built JS bundle.
  private readonly secretKey = 'replace-with-strong-secret-key';

  constructor() {}

  setItem(key: string, value: any): void {
    localStorage.setItem(key, value);
  }

  setEncryptItem(key: string, value: unknown): void {
    const plainText = JSON.stringify(value);
    const cipherText = CryptoJS.AES.encrypt(
      plainText,
      this.secretKey,
    ).toString();
    localStorage.setItem(key, cipherText);
  }

  getItem(key: string) {
    return localStorage.getItem(key);
  }

  getDecryptItem<T = any>(key: string): T | null {
    const cipherText = localStorage.getItem(key);
    if (!cipherText) {
      return null;
    }

    try {
      const bytes = CryptoJS.AES.decrypt(cipherText, this.secretKey);
      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedText) {
        return null;
      }
      return JSON.parse(decryptedText) as T;
    } catch {
      // Decryption failed (wrong key, corrupted value, etc.)
      return null;
    }
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}
