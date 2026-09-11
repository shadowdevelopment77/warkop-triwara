package com.triwara.pos;

import android.content.ContentResolver;
import android.content.ContentUris;
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
                Uri contentUri = MediaStore.Downloads.EXTERNAL_CONTENT_URI;

                // 1. Search if a file with this exact DISPLAY_NAME already exists in MediaStore.Downloads
                String selection = MediaStore.MediaColumns.DISPLAY_NAME + "=?";
                String[] selectionArgs = new String[]{fileName};

                Uri targetUri = null;
                try (Cursor cursor = resolver.query(contentUri, new String[]{MediaStore.MediaColumns._ID}, selection, selectionArgs, null)) {
                    if (cursor != null && cursor.moveToFirst()) {
                        long id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID));
                        targetUri = ContentUris.withAppendedId(contentUri, id);

                        // Clean up any extra duplicates with the exact same name if any exist
                        while (cursor.moveToNext()) {
                            try {
                                long dupId = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID));
                                resolver.delete(ContentUris.withAppendedId(contentUri, dupId), null, null);
                            } catch (Exception ignored) {}
                        }
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Notice querying existing backup file: " + e.getMessage());
                }

                // 2. If existing file was found, overwrite it directly in-place with "wt" (truncate)
                boolean writeSuccess = false;
                if (targetUri != null) {
                    try (OutputStream os = resolver.openOutputStream(targetUri, "wt")) {
                        if (os != null) {
                            os.write(content.getBytes(StandardCharsets.UTF_8));
                            os.flush();
                            writeSuccess = true;
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "Notice overwriting existing file URI, will recreate: " + e.getMessage());
                        try {
                            resolver.delete(targetUri, null, null);
                        } catch (Exception ignored) {}
                        targetUri = null;
                    }
                }

                // 3. If file did not exist yet (or overwrite failed), insert brand new record
                if (!writeSuccess) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

                    targetUri = resolver.insert(contentUri, values);
                    if (targetUri == null) {
                        throw new Exception("Gagal membuat entri file di folder Download");
                    }

                    try (OutputStream os = resolver.openOutputStream(targetUri, "wt")) {
                        if (os == null) {
                            throw new Exception("Gagal membuka stream penulisan file");
                        }
                        os.write(content.getBytes(StandardCharsets.UTF_8));
                        os.flush();
                    }
                }

                // 4. If saving the auto-backup file, automatically clean up legacy duplicate "(1).json", "(2).json"
                if ("TriwaraPOS_Backup_Terbaru.json".equalsIgnoreCase(fileName)) {
                    cleanupDuplicateBackups(resolver, contentUri);
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

                // Clean up physical duplicates if any
                if ("TriwaraPOS_Backup_Terbaru.json".equalsIgnoreCase(fileName)) {
                    File[] dupFiles = downloadDir.listFiles((dir, name) ->
                        name.startsWith("TriwaraPOS_Backup_Terbaru (") && name.endsWith(".json")
                    );
                    if (dupFiles != null) {
                        for (File dup : dupFiles) {
                            try { dup.delete(); } catch (Exception ignored) {}
                        }
                    }
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

    /**
     * Cleans up orphaned duplicate files matching "TriwaraPOS_Backup_Terbaru (*).json" from MediaStore.
     */
    private void cleanupDuplicateBackups(ContentResolver resolver, Uri contentUri) {
        try {
            String selection = MediaStore.MediaColumns.DISPLAY_NAME + " LIKE 'TriwaraPOS_Backup_Terbaru (%.json'";
            try (Cursor cursor = resolver.query(contentUri, new String[]{MediaStore.MediaColumns._ID}, selection, null, null)) {
                if (cursor != null) {
                    while (cursor.moveToNext()) {
                        long id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID));
                        try {
                            resolver.delete(ContentUris.withAppendedId(contentUri, id), null, null);
                        } catch (Exception ignored) {}
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Notice cleaning up duplicate backups: " + e.getMessage());
        }
    }
}
