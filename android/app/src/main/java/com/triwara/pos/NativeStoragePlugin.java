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

                // 1. Try physically deleting existing file if accessible on disk
                File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                File targetPhysicalFile = new File(downloadDir, fileName);
                if (targetPhysicalFile.exists()) {
                    try {
                        targetPhysicalFile.delete();
                    } catch (Exception ignored) {}
                }

                // 2. Search if an entry with this exact DISPLAY_NAME already exists in MediaStore.Downloads
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

                // 3. Try to delete the existing entry so insert can take the exact clean name
                if (targetUri != null) {
                    try {
                        int deleted = resolver.delete(targetUri, null, null);
                        if (deleted > 0) {
                            targetUri = null; // deleted cleanly, can insert fresh
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "Notice deleting existing MediaStore entry: " + e.getMessage());
                    }
                }

                // 4. If targetUri still exists, attempt direct in-place overwrite with "rwt"
                boolean writeSuccess = false;
                if (targetUri != null) {
                    try (OutputStream os = resolver.openOutputStream(targetUri, "rwt")) {
                        if (os != null) {
                            os.write(content.getBytes(StandardCharsets.UTF_8));
                            os.flush();
                            writeSuccess = true;

                            // Explicitly refresh DATE_MODIFIED in MediaStore so it jumps to top ("Just now") in file manager
                            ContentValues updateValues = new ContentValues();
                            updateValues.put(MediaStore.MediaColumns.DATE_MODIFIED, System.currentTimeMillis() / 1000);
                            resolver.update(targetUri, updateValues, null, null);
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "Direct overwrite failed, will insert fresh record: " + e.getMessage());
                        try {
                            resolver.delete(targetUri, null, null);
                        } catch (Exception ignored) {}
                        targetUri = null;
                    }
                }

                // 5. If file didn't exist or direct overwrite failed, insert brand new record
                long savedId = -1;
                if (!writeSuccess) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    values.put(MediaStore.MediaColumns.DATE_MODIFIED, System.currentTimeMillis() / 1000);

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

                if (targetUri != null) {
                    try {
                        savedId = ContentUris.parseId(targetUri);
                    } catch (Exception ignored) {}
                }

                // 6. If saving the auto-backup file, clean up older legacy duplicates WITHOUT deleting the newly saved file
                if ("TriwaraPOS_Backup_Terbaru.json".equalsIgnoreCase(fileName)) {
                    cleanupDuplicateBackups(resolver, contentUri, savedId);
                }

                // 7. Trigger MediaScanner to ensure file manager UI immediately displays newest size & time
                if (targetPhysicalFile.exists()) {
                    MediaScannerConnection.scanFile(
                        context,
                        new String[]{targetPhysicalFile.getAbsolutePath()},
                        new String[]{mimeType},
                        null
                    );
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
                    File[] dupFiles = downloadDir.listFiles((dir, name) -> {
                        String lower = name.toLowerCase();
                        return (lower.startsWith("triwarapos_backup_terbaru (") ||
                                lower.startsWith("triwara_backup_terbaru (") ||
                                lower.equals("triwara_backup_terbaru.json")) &&
                               lower.endsWith(".json") &&
                               !name.equalsIgnoreCase(fileName);
                    });
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
     * Cleans up orphaned duplicate files matching auto-backup patterns from MediaStore,
     * while guaranteeing that the newly saved file (savedId) is NEVER deleted.
     */
    private void cleanupDuplicateBackups(ContentResolver resolver, Uri contentUri, long excludeSavedId) {
        try {
            String selection = "(" +
                MediaStore.MediaColumns.DISPLAY_NAME + " LIKE 'TriwaraPOS_Backup_Terbaru (%.json' OR " +
                MediaStore.MediaColumns.DISPLAY_NAME + " LIKE 'triwara_backup_terbaru (%.json' OR " +
                MediaStore.MediaColumns.DISPLAY_NAME + " LIKE 'triwara%backup%terbaru% (%.json' OR " +
                MediaStore.MediaColumns.DISPLAY_NAME + " = 'triwara_backup_terbaru.json'" +
            ")";

            if (excludeSavedId > 0) {
                selection += " AND " + MediaStore.MediaColumns._ID + " != " + excludeSavedId;
            }

            try (Cursor cursor = resolver.query(contentUri, new String[]{MediaStore.MediaColumns._ID}, selection, null, null)) {
                if (cursor != null) {
                    while (cursor.moveToNext()) {
                        long id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID));
                        if (id != excludeSavedId) {
                            try {
                                resolver.delete(ContentUris.withAppendedId(contentUri, id), null, null);
                            } catch (Exception ignored) {}
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Notice cleaning up duplicate backups: " + e.getMessage());
        }
    }
}
