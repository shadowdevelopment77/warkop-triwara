// ═══════════════════════════════════════════════
// Triwara POS — 58mm Thermal Printer Service
// Direct Bluetooth Classic (SPP) — No RawBT required
// Zero-Queue & Fail-Safe Policy
// ═══════════════════════════════════════════════

import type { IOrder, IShift, IShopConfig } from '../types';
import { receiptService, type ReceiptType } from './receipt.service';
import { BluetoothPrinter } from '../plugins/bluetooth-printer';

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
        return 'Printer thermal belum dipilih. Silakan pilih printer dari daftar Bluetooth di menu Pengaturan.';
      case 'BLUETOOTH_DISABLED':
        return 'Bluetooth perangkat tidak aktif. Silakan nyalakan Bluetooth di HP Anda terlebih dahulu.';
      case 'DEVICE_UNREACHABLE':
        return 'Printer thermal tidak ditemukan atau di luar jangkauan. Pastikan printer dalam keadaan menyala dan dekat dengan perangkat.';
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

    const printerAddress = config.printerMacAddress;

    // 2. Prevent overlapping prints (zero-queue policy)
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

      // 4. Convert ESC/POS Uint8Array to Base64
      let binary = '';
      const len = buffer.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(buffer[i]);
      }
      const base64 = typeof btoa !== 'undefined' ? btoa(binary) : '';

      console.log(`[PRINTER DRIVER] Transmitting ${buffer.length} ESC/POS bytes to ${config.printerName || 'Printer Thermal'} (${printerAddress}) via Direct Bluetooth SPP`);

      // 5. Direct Bluetooth SPP Transmission (no RawBT required)
      await BluetoothPrinter.connect({ mac: printerAddress });
      const printResult = await BluetoothPrinter.printBytes({ base64 });
      await BluetoothPrinter.disconnect();

      return {
        success: true,
        bytesSent: printResult.bytesSent ?? buffer.length,
      };
    } catch (err) {
      // Ensure we always disconnect on error
      try { await BluetoothPrinter.disconnect(); } catch { /* ignore */ }

      const errMsg = (err as Error).message || String(err);

      // Map common Android BT errors to user-friendly codes
      if (errMsg.includes('BLUETOOTH_DISABLED') || errMsg.includes('tidak aktif')) {
        return { success: false, errorCode: 'BLUETOOTH_DISABLED', error: this.formatErrorMessage('BLUETOOTH_DISABLED') };
      }
      if (errMsg.includes('CONNECTION_FAILED') || errMsg.includes('ECONNREFUSED') || errMsg.includes('tersambung')) {
        return { success: false, errorCode: 'DEVICE_UNREACHABLE', error: this.formatErrorMessage('DEVICE_UNREACHABLE') };
      }

      return {
        success: false,
        errorCode: 'CONNECTION_LOST',
        error: this.formatErrorMessage('CONNECTION_LOST', errMsg),
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
