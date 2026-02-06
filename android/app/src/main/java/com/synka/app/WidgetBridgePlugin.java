package com.synka.app;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.gms.tasks.Task;
import com.google.android.gms.wearable.DataClient;
import com.google.android.gms.wearable.DataItem;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.PutDataRequest;
import com.google.android.gms.wearable.Wearable;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    private static final String TAG = "WidgetBridgePlugin";
    private static final String PROFILE_SLUG_PATH = "/synka/profile_slug";
    private static final String KEY_PROFILE_SLUG = "profile_slug";

    @PluginMethod
    public void updateWidget(PluginCall call) {
        String profileSlug = call.getString("profileSlug");
        
        if (profileSlug == null || profileSlug.isEmpty()) {
            call.reject("Profile slug is required");
            return;
        }

        try {
            // Update phone home screen widget
            QRWidgetProvider.updateWidget(getContext(), profileSlug);
            
            // Sync to Wear OS watch
            syncToWearOS(profileSlug);
            
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to update widget", e);
            call.reject("Failed to update widget: " + e.getMessage());
        }
    }

    /**
     * Sync profile slug to connected Wear OS watches via Data Layer API
     */
    private void syncToWearOS(String profileSlug) {
        try {
            DataClient dataClient = Wearable.getDataClient(getContext());
            
            PutDataMapRequest putDataMapReq = PutDataMapRequest.create(PROFILE_SLUG_PATH);
            putDataMapReq.getDataMap().putString(KEY_PROFILE_SLUG, profileSlug);
            putDataMapReq.getDataMap().putLong("timestamp", System.currentTimeMillis());
            putDataMapReq.setUrgent();
            
            PutDataRequest putDataReq = putDataMapReq.asPutDataRequest();
            
            Task<DataItem> putDataTask = dataClient.putDataItem(putDataReq);
            putDataTask.addOnSuccessListener(dataItem -> {
                Log.d(TAG, "Successfully synced profile slug to Wear OS");
            });
            putDataTask.addOnFailureListener(e -> {
                Log.w(TAG, "Failed to sync to Wear OS (no watch connected?): " + e.getMessage());
            });
        } catch (Exception e) {
            Log.w(TAG, "Wear OS sync not available: " + e.getMessage());
        }
    }
}
