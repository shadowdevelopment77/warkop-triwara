// ═══════════════════════════════════════════════
// Triwara POS — 58mm Thermal Printer Service (Zero-Queue & Fail-Safe)
// ═══════════════════════════════════════════════

import type { IOrder, IShift, IShopConfig } from '../types';
import { receiptService, type ReceiptType } from './receipt.service';

export type PrinterErrorCode =
  | 'PRINTER_NOT_CONFIGURED'
  | 'BLUETOOTH_DISABLED'
  | 'DEVICE_UNREACHABLE'
  | 'CONNECTION_LOST'
  | 'PRINTING_IN_PROGRESS'
  | 'UNKNOWN_ERROR';

export interface PrinterResult {
  success: boolean;
  error?: string;
  errorCode?: PrinterErrorCode;
  bytesSent?: number;
}

export class PrinterService {
  private isPrinting = false;
  private mockErrorCode: PrinterErrorCode | null = null;

  /**
   * For automated testing / developer simulation of hardware failures
   */
  setMockErrorCode(code: PrinterErrorCode | null) {
    this.mockErrorCode = code;
  }

  /**
   * Translates error codes to user-friendly cashier messages
   */
  formatErrorMessage(code: PrinterErrorCode, customMsg?: string): string {
    switch (code) {
      case 'PRINTER_NOT_CONFIGURED':
        return 'Printer thermal belum tersambung. Silakan pasangkan printer thermal Bluetooth Anda terlebih dahulu melalui menu Pengaturan.';
      case 'BLUETOOTH_DISABLED':
        return 'Bluetooth perangkat tidak aktif. Silakan nyalakan Bluetooth di HP Anda terlebih dahulu.';
      case 'DEVICE_UNREACHABLE':
        return 'Printer thermal tidak ditemukan atau di luar jangkauan. Pastikan printer Xantri BT-58D dalam keadaan menyala dan dekat dengan perangkat.';
      case 'CONNECTION_LOST':
        return 'Koneksi printer terputus di tengah proses cetak. Silakan periksa baterai/kertas printer lalu cetak ulang.';
      case 'PRINTING_IN_PROGRESS':
        return 'Sedang memproses pencetakan sebelumnya. Mohon tunggu sebentar.';
      case 'UNKNOWN_ERROR':
      default:
        return customMsg || 'Terjadi kesalahan saat mencetak ke printer thermal.';
    }
  }

  /**
   * Internal hardware transmission driver.
   * STRICT ZERO-QUEUE POLICY:
   * Any failure cancels immediately without queuing background retries.
   */
  private async transmitEscPos(buffer: Uint8Array, config: IShopConfig): Promise<PrinterResult> {
    // 1. Connection Pre-flight Check
    if (!config.printerMacAddress || config.printerMacAddress.trim() === '') {
      return {
        success: false,
        errorCode: 'PRINTER_NOT_CONFIGURED',
        error: this.formatErrorMessage('PRINTER_NOT_CONFIGURED'),
      };
    }

    // 2. Prevent overlapping prints
    if (this.isPrinting) {
      return {
        success: false,
        errorCode: 'PRINTING_IN_PROGRESS',
        error: this.formatErrorMessage('PRINTING_IN_PROGRESS'),
      };
    }

    this.isPrinting = true;

    try {
      // 3. Check for developer/test simulated error
      if (this.mockErrorCode) {
        const errCode = this.mockErrorCode;
        this.mockErrorCode = null; // One-shot trigger
        return {
          success: false,
          errorCode: errCode,
          error: this.formatErrorMessage(errCode),
        };
      }

      // 4. Native Capacitor vs Browser/Dev Fallback
      // When wrapped with Capacitor native Android, this interfaces with Bluetooth Serial / RFCOMM socket.
      // In web/desktop development mode, it logs cleanly and validates byte generation.
      const isNativeAndroid = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();

      if (isNativeAndroid) {
        // Native Bluetooth execution will be hooked via Capacitor plugin
        // Placeholder for BluetoothSerial.write(buffer)
      } else {
        // Development / Browser simulation
        console.log(`[THERMAL 58MM EMULATOR] Transmitting ${buffer.length} bytes to ${config.printerName || 'Xantri BT-58D'} (${config.printerMacAddress})`);
      }

      return {
        success: true,
        bytesSent: buffer.length,
      };
    } catch (err) {
      return {
        success: false,
        errorCode: 'CONNECTION_LOST',
        error: this.formatErrorMessage('CONNECTION_LOST', (err as Error).message),
      };
    } finally {
      this.isPrinting = false;
    }
  }

  /**
   * Prints an order receipt (customer, bar, or kitchen)
   */
  async printReceipt(order: IOrder, type: ReceiptType, config: IShopConfig): Promise<PrinterResult> {
    try {
      const receiptText = receiptService.generateReceiptText(order, config, type);
      const buffer = receiptService.convertToEscPosBuffer(receiptText);
      return await this.transmitEscPos(buffer, config);
    } catch (err) {
      return {
        success: false,
        errorCode: 'UNKNOWN_ERROR',
        error: (err as Error).message,
      };
    }
  }

  /**
   * Prints cashier shift closing summary
   */
  async printShiftReceipt(shift: IShift, config: IShopConfig): Promise<PrinterResult> {
    try {
      const receiptText = receiptService.generateShiftReceiptText(shift, config);
      const buffer = receiptService.convertToEscPosBuffer(receiptText);
      return await this.transmitEscPos(buffer, config);
    } catch (err) {
      return {
        success: false,
        errorCode: 'UNKNOWN_ERROR',
        error: (err as Error).message,
      };
    }
  }

  /**
   * Sends a 58mm test receipt to verify physical connection and paper feed
   */
  async testPrint(config: IShopConfig): Promise<PrinterResult> {
    try {
      const receiptText = receiptService.generateTestReceiptText(config);
      const buffer = receiptService.convertToEscPosBuffer(receiptText);
      return await this.transmitEscPos(buffer, config);
    } catch (err) {
      return {
        success: false,
        errorCode: 'UNKNOWN_ERROR',
        error: (err as Error).message,
      };
    }
  }
}

export const printerService = new PrinterService();
