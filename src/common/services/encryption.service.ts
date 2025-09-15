import { Injectable } from '@nestjs/common';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
  private readonly encryptionKey: string;

  constructor() {
    // En producción, usar una clave desde variables de entorno
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-2025';
  }

  /**
   * Encripta un texto usando AES-256
   */
  encrypt(text: string): string {
    if (!text) return '';
    
    try {
      const encrypted = CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Error encrypting:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Desencripta un texto encriptado con AES-256
   */
  decrypt(encryptedText: string): string {
    if (!encryptedText) return '';
    
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Error decrypting:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encripta un objeto completo
   */
  encryptObject(obj: any): string {
    if (!obj) return '';
    
    try {
      const jsonString = JSON.stringify(obj);
      return this.encrypt(jsonString);
    } catch (error) {
      console.error('Error encrypting object:', error);
      throw new Error('Failed to encrypt object');
    }
  }

  /**
   * Desencripta un objeto encriptado
   */
  decryptObject(encryptedText: string): any {
    if (!encryptedText) return null;
    
    try {
      const decrypted = this.decrypt(encryptedText);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Error decrypting object:', error);
      throw new Error('Failed to decrypt object');
    }
  }

  /**
   * Genera un hash SHA256 para validación de webhooks
   */
  generateHash(data: string, secret: string): string {
    return CryptoJS.HmacSHA256(data, secret).toString();
  }

  /**
   * Valida un hash SHA256
   */
  validateHash(data: string, secret: string, hash: string): boolean {
    const computedHash = this.generateHash(data, secret);
    return computedHash === hash;
  }
}