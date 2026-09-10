package com.example.muzic;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;

@CapacitorPlugin(
    name = "NativeAudioScanner",
    permissions = {
        @Permission(
            strings = { Manifest.permission.READ_MEDIA_AUDIO },
            alias = "audioMedia"
        ),
        @Permission(
            strings = { Manifest.permission.READ_EXTERNAL_STORAGE },
            alias = "audioStorage"
        )
    }
)
public class NativeAudioScannerPlugin extends Plugin {
    private static final String TAG = "NativeAudioScanner";

    private boolean hasAudioPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_MEDIA_AUDIO) == PackageManager.PERMISSION_GRANTED;
        } else {
            return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        }
    }

    @PluginMethod
    public void checkAudioPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = hasAudioPermission();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestAudioPermissions(PluginCall call) {
        if (hasAudioPermission()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissionForAlias("audioMedia", call, "permissionCallback");
        } else {
            requestPermissionForAlias("audioStorage", call, "permissionCallback");
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        boolean granted = hasAudioPermission();
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void scanAudioFiles(PluginCall call) {
        if (!hasAudioPermission()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                requestPermissionForAlias("audioMedia", call, "scanPermissionCallback");
            } else {
                requestPermissionForAlias("audioStorage", call, "scanPermissionCallback");
            }
            return;
        }
        performScan(call);
    }

    @PermissionCallback
    private void scanPermissionCallback(PluginCall call) {
        if (hasAudioPermission()) {
            performScan(call);
        } else {
            call.reject("Audio permission denied by user");
        }
    }

    private void performScan(PluginCall call) {
        try {
            ContentResolver resolver = getContext().getContentResolver();
            Uri uri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
            
            // Query music files or audio files with duration > 4 seconds to avoid short notification ringtones
            String selection = "(" + MediaStore.Audio.Media.IS_MUSIC + " != 0 OR " + MediaStore.Audio.Media.DURATION + " > 4000)";
            String sortOrder = MediaStore.Audio.Media.TITLE + " ASC";

            String[] projection = new String[] {
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.ALBUM,
                MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.DATA,
                MediaStore.Audio.Media.ALBUM_ID,
                MediaStore.Audio.Media.DISPLAY_NAME,
                MediaStore.Audio.Media.SIZE,
                MediaStore.Audio.Media.MIME_TYPE
            };

            Cursor cursor = resolver.query(uri, projection, selection, null, sortOrder);
            JSArray tracksArray = new JSArray();

            if (cursor != null) {
                int idCol = cursor.getColumnIndex(MediaStore.Audio.Media._ID);
                int titleCol = cursor.getColumnIndex(MediaStore.Audio.Media.TITLE);
                int artistCol = cursor.getColumnIndex(MediaStore.Audio.Media.ARTIST);
                int albumCol = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM);
                int durationCol = cursor.getColumnIndex(MediaStore.Audio.Media.DURATION);
                int dataCol = cursor.getColumnIndex(MediaStore.Audio.Media.DATA);
                int albumIdCol = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM_ID);
                int nameCol = cursor.getColumnIndex(MediaStore.Audio.Media.DISPLAY_NAME);
                int sizeCol = cursor.getColumnIndex(MediaStore.Audio.Media.SIZE);
                int mimeCol = cursor.getColumnIndex(MediaStore.Audio.Media.MIME_TYPE);

                Uri sArtworkUri = Uri.parse("content://media/external/audio/albumart");

                while (cursor.moveToNext()) {
                    long id = idCol != -1 ? cursor.getLong(idCol) : 0;
                    String title = titleCol != -1 ? cursor.getString(titleCol) : null;
                    String artist = artistCol != -1 ? cursor.getString(artistCol) : null;
                    String album = albumCol != -1 ? cursor.getString(albumCol) : null;
                    long durationMs = durationCol != -1 ? cursor.getLong(durationCol) : 0;
                    String path = dataCol != -1 ? cursor.getString(dataCol) : null;
                    long albumId = albumIdCol != -1 ? cursor.getLong(albumIdCol) : -1;
                    String displayName = nameCol != -1 ? cursor.getString(nameCol) : null;
                    long size = sizeCol != -1 ? cursor.getLong(sizeCol) : 0;
                    String mimeType = mimeCol != -1 ? cursor.getString(mimeCol) : "audio/mpeg";

                    if (displayName == null && path != null) {
                        displayName = new File(path).getName();
                    }
                    if (title == null || title.trim().isEmpty() || title.equals("<unknown>")) {
                        title = displayName != null ? displayName.replaceFirst("[.][^.]+$", "") : "Track " + id;
                    }
                    if (artist == null || artist.trim().isEmpty() || artist.equals("<unknown>")) {
                        artist = "Unknown Artist";
                    }
                    if (album == null || album.trim().isEmpty() || album.equals("<unknown>")) {
                        album = "Device Music";
                    }

                    // Compute clean folder path
                    String folderPath = "Music";
                    if (path != null) {
                        try {
                            File file = new File(path);
                            File parent = file.getParentFile();
                            if (parent != null) {
                                folderPath = parent.getName();
                            }
                        } catch (Exception ignored) {}
                    }

                    String coverUrl = null;
                    if (albumId != -1) {
                        Uri albumArtUri = ContentUris.withAppendedId(sArtworkUri, albumId);
                        coverUrl = albumArtUri.toString();
                    }

                    Uri contentUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);

                    JSObject trackObj = new JSObject();
                    trackObj.put("id", "device_" + id);
                    trackObj.put("title", title);
                    trackObj.put("artist", artist);
                    trackObj.put("album", album);
                    trackObj.put("duration", Math.round(durationMs / 1000.0));
                    trackObj.put("path", path != null ? path : "");
                    trackObj.put("contentUri", contentUri.toString());
                    trackObj.put("fileName", displayName != null ? displayName : title);
                    trackObj.put("folderPath", folderPath);
                    trackObj.put("size", size);
                    trackObj.put("format", mimeType);
                    trackObj.put("cover", coverUrl);

                    tracksArray.put(trackObj);
                }
                cursor.close();
            }

            JSObject result = new JSObject();
            result.put("tracks", tracksArray);
            result.put("count", tracksArray.length());
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error scanning audio files: " + e.getMessage(), e);
            call.reject("Failed to scan audio files: " + e.getMessage());
        }
    }
}
