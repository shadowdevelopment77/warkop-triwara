// ═══════════════════════════════════════════════
// Triwara POS — Direct Bluetooth Printer Plugin Bridge
// Capacitor TypeScript interface for native BluetoothPrinterPlugin (Java)
// ═══════════════════════════════════════════════

import { registerPlugin } from '@capacitor/core';

export interface BluetoothDevice {
  name: string;
  address: string; // MAC address e.g. "AA:BB:CC:DD:EE:FF"
}

export interface BluetoothPrinterPlugin {
  /**
   * Returns list of Bluetooth devices already paired on this Android phone.
   * User must pair the printer once via Android Settings → Bluetooth.
   */
  getPairedDevices(): Promise<{ devices: BluetoothDevice[] }>;

  /**
   * Opens a Bluetooth Classic SPP connection to the printer.
   * @param mac - Bluetooth MAC address of the printer
   */
  connect(options: { mac: string }): Promise<void>;

  /**
   * Sends ESC/POS binary data (base64-encoded) to the connected printer.
   * @param base64 - Base64-encoded ESC/POS byte buffer
   */
  printBytes(options: { base64: string }): Promise<{ bytesSent: number }>;

  /**
   * Disconnects from the current printer.
   */
  disconnect(): Promise<void>;

  /**
   * Returns whether the app is currently connected to a printer.
   */
  isConnected(): Promise<{ connected: boolean }>;
}

export const BluetoothPrinter = registerPlugin<BluetoothPrinterPlugin>('BluetoothPrinter', {
  // Web/browser fallback — used in unit tests and browser preview
  web: () =>
    ({
      getPairedDevices: async () => ({ devices: [] }),
      connect: async () => {},
      printBytes: async (opts: { base64: string }) => {
        // In test/web context, decode base64 to get actual byte count
        try {
          const binary = atob(opts.base64);
          return { bytesSent: binary.length };
        } catch {
          return { bytesSent: 0 };
        }
      },
      disconnect: async () => {},
      isConnected: async () => ({ connected: false }),
    } as BluetoothPrinterPlugin),
});
