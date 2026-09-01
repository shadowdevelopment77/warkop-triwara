package com.triwara.pos;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.util.Base64;
import android.util.Log;

import android.Manifest;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = {
        @Permission(
            strings = { Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN },
            alias = "bluetooth"
        )
    }
)
public class BluetoothPrinterPlugin extends Plugin {

    private static final String TAG = "BluetoothPrinter";
    // Standard SPP UUID — works with ALL Bluetooth Classic thermal printers
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private BluetoothSocket activeSocket = null;
    private OutputStream activeOutputStream = null;

    /**
     * Returns list of already-paired Bluetooth devices on this phone.
     * User must pair printer via Android Settings → Bluetooth first (one-time only).
     */
    @PluginMethod
    public void getPairedDevices(PluginCall call) {
        if (getPermissionState("bluetooth") != PermissionState.GRANTED) {
            requestPermissionForAlias("bluetooth", call, "bluetoothPermsCallback");
            return;
        }
        getPairedDevicesInternal(call);
    }

    private void getPairedDevicesInternal(PluginCall call) {
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null) {
                call.reject("BLUETOOTH_NOT_SUPPORTED", "Perangkat tidak mendukung Bluetooth.");
                return;
            }
            if (!adapter.isEnabled()) {
                call.reject("BLUETOOTH_DISABLED", "Bluetooth tidak aktif. Nyalakan Bluetooth terlebih dahulu.");
                return;
            }

            Set<BluetoothDevice> paired = adapter.getBondedDevices();
            JSArray devices = new JSArray();
            for (BluetoothDevice device : paired) {
                JSObject d = new JSObject();
                d.put("name", device.getName() != null ? device.getName() : "Unknown");
                d.put("address", device.getAddress());
                devices.put(d);
            }

            JSObject result = new JSObject();
            result.put("devices", devices);
            call.resolve(result);
        } catch (SecurityException e) {
            call.reject("PERMISSION_DENIED", "Izin Bluetooth ditolak: " + e.getMessage());
        } catch (Exception e) {
            call.reject("ERROR", "Gagal mendapatkan daftar perangkat: " + e.getMessage());
        }
    }

    /**
     * Connects to a Bluetooth printer by MAC address using SPP profile.
     * Call: BluetoothPrinter.connect({ mac: "XX:XX:XX:XX:XX:XX" })
     */
    @PluginMethod
    public void connect(PluginCall call) {
        if (getPermissionState("bluetooth") != PermissionState.GRANTED) {
            requestPermissionForAlias("bluetooth", call, "bluetoothPermsCallback");
            return;
        }
        connectInternal(call);
    }

    @PermissionCallback
    private void bluetoothPermsCallback(PluginCall call) {
        if (getPermissionState("bluetooth") != PermissionState.GRANTED) {
            call.reject("PERMISSION_DENIED", "Izin Bluetooth ditolak. Aktifkan izin Bluetooth untuk aplikasi ini di Pengaturan HP.");
            return;
        }
        // Resume whichever method originally triggered the permission request
        if ("getPairedDevices".equals(call.getMethodName())) {
            getPairedDevicesInternal(call);
        } else if ("connect".equals(call.getMethodName())) {
            connectInternal(call);
        }
    }

    private void connectInternal(PluginCall call) {
        String mac = call.getString("mac");
        if (mac == null || mac.isEmpty()) {
            call.reject("INVALID_MAC", "Alamat MAC printer tidak valid.");
            return;
        }

        // Disconnect existing connection first
        disconnectInternal();

        new Thread(() -> {
            try {
                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                if (adapter == null || !adapter.isEnabled()) {
                    call.reject("BLUETOOTH_DISABLED", "Bluetooth tidak aktif.");
                    return;
                }

                BluetoothDevice device = adapter.getRemoteDevice(mac);
                adapter.cancelDiscovery();

                BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                socket.connect();

                activeSocket = socket;
                activeOutputStream = socket.getOutputStream();
                Log.d(TAG, "Connected to printer: " + mac);

                call.resolve();
            } catch (SecurityException e) {
                call.reject("PERMISSION_DENIED", "Izin Bluetooth ditolak.");
            } catch (IOException e) {
                Log.e(TAG, "Failed to connect: " + e.getMessage());
                call.reject("CONNECTION_FAILED", "Gagal tersambung ke printer. Pastikan printer menyala dan dalam jangkauan. Detail: " + e.getMessage());
            }
        }).start();
    }

    /**
     * Sends ESC/POS bytes (base64-encoded) directly to the connected printer.
     * Call: BluetoothPrinter.printBytes({ base64: "..." })
     */
    @PluginMethod
    public void printBytes(PluginCall call) {
        String base64Data = call.getString("base64");
        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("INVALID_DATA", "Data cetak kosong.");
            return;
        }

        if (activeOutputStream == null) {
            call.reject("NOT_CONNECTED", "Printer belum tersambung. Hubungkan printer terlebih dahulu.");
            return;
        }

        new Thread(() -> {
            try {
                byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
                activeOutputStream.write(bytes);
                activeOutputStream.flush();
                Log.d(TAG, "Printed " + bytes.length + " bytes successfully.");

                JSObject result = new JSObject();
                result.put("bytesSent", bytes.length);
                call.resolve(result);
            } catch (IOException e) {
                Log.e(TAG, "Print failed: " + e.getMessage());
                disconnectInternal();
                call.reject("PRINT_FAILED", "Gagal mengirim data ke printer: " + e.getMessage());
            }
        }).start();
    }

    /**
     * Disconnects from the current printer.
     */
    @PluginMethod
    public void disconnect(PluginCall call) {
        disconnectInternal();
        call.resolve();
    }

    /**
     * Checks if currently connected to a printer.
     */
    @PluginMethod
    public void isConnected(PluginCall call) {
        boolean connected = activeSocket != null && activeSocket.isConnected();
        JSObject result = new JSObject();
        result.put("connected", connected);
        call.resolve(result);
    }

    private void disconnectInternal() {
        try {
            if (activeOutputStream != null) {
                activeOutputStream.close();
                activeOutputStream = null;
            }
            if (activeSocket != null) {
                activeSocket.close();
                activeSocket = null;
            }
        } catch (IOException e) {
            Log.w(TAG, "Error during disconnect: " + e.getMessage());
        }
    }
}
