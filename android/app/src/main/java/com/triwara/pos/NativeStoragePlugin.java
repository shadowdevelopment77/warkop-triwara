package com.triwara.pos;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "NativeStorage")
public class NativeStoragePlugin extends Plugin {

    private static final String TAG = "NativeStoragePlugin";

    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        String fileName = call.getString("fileName");
        String content = call.getString("content");
        String mimeType = call.getString("mimeType", "application/json");

        if (fileName == null || content == null) {
            call.reject("Nama file dan konten tidak boleh kosong");
            return;
        }

        Context context = getContext();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ (API 29+): Use official MediaStore.Downloads API
                ContentResolver resolver = context.getContentResolver();

                // If file with same name already exists in Downloads, delete it first to prevent (1), (2) duplicate copies
                Uri queryUri = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
                String selection = MediaStore.MediaColumns.DISPLAY_NAME + "=? AND " +
                        MediaStore.MediaColumns.RELATIVE_PATH + "=?";
                String[] selectionArgs = new String[]{fileName, Environment.DIRECTORY_DOWNLOADS + "/"};

                try (Cursor cursor = resolver.query(queryUri, new String[]{MediaStore.MediaColumns._ID}, selection, selectionArgs, null)) {
                    if (cursor != null && cursor.moveToFirst()) {
                        long id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID));
                        Uri existingUri = Uri.withAppendedPath(queryUri, String.valueOf(id));
                        resolver.delete(existingUri, null, null);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Notice checking existing file: " + e.getMessage());
                }

                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/");

                Uri itemUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (itemUri == null) {
                    throw new Exception("Gagal membuat entri file di folder Download");
                }

                try (OutputStream os = resolver.openOutputStream(itemUri, "wt")) {
                    if (os == null) {
                        throw new Exception("Gagal membuka stream penulisan file");
                    }
                    os.write(content.getBytes(StandardCharsets.UTF_8));
                    os.flush();
                }

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("fileName", fileName);
                ret.put("folder", "Download");
                call.resolve(ret);
            } else {
                // Android 9 or older (API <= 28): Use traditional Public Downloads directory
                File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!downloadDir.exists()) {
                    downloadDir.mkdirs();
                }
                File targetFile = new File(downloadDir, fileName);
                try (FileOutputStream fos = new FileOutputStream(targetFile, false)) {
                    fos.write(content.getBytes(StandardCharsets.UTF_8));
                    fos.flush();
                }

                MediaScannerConnection.scanFile(
                    context,
                    new String[]{targetFile.getAbsolutePath()},
                    new String[]{mimeType},
                    null
                );

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("fileName", fileName);
                ret.put("folder", "Download");
                call.resolve(ret);
            }
        } catch (Exception err) {
            Log.e(TAG, "Failed to save file to downloads", err);
            call.reject("Gagal menyimpan ke folder Download: " + err.getMessage(), err);
        }
    }
}
