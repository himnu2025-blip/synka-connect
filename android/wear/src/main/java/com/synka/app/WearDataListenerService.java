package com.synka.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.annotation.NonNull;

import com.google.android.gms.wearable.DataClient;
import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.DataItem;
import com.google.android.gms.wearable.DataMap;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.WearableListenerService;

/**
 * Listens for data changes from the phone app and updates the watch tile
 */
public class WearDataListenerService extends WearableListenerService {
    
    private static final String TAG = "WearDataListener";
    private static final String PROFILE_SLUG_PATH = "/synka/profile_slug";
    private static final String KEY_PROFILE_SLUG = "profile_slug";
    private static final String PREFS_NAME = "SynkaWearPrefs";

    @Override
    public void onDataChanged(@NonNull DataEventBuffer dataEvents) {
        Log.d(TAG, "onDataChanged received");
        
        for (DataEvent event : dataEvents) {
            if (event.getType() == DataEvent.TYPE_CHANGED) {
                DataItem item = event.getDataItem();
                
                if (item.getUri().getPath() != null && 
                    item.getUri().getPath().equals(PROFILE_SLUG_PATH)) {
                    
                    DataMap dataMap = DataMapItem.fromDataItem(item).getDataMap();
                    String profileSlug = dataMap.getString(KEY_PROFILE_SLUG);
                    
                    if (profileSlug != null) {
                        Log.d(TAG, "Received profile slug: " + profileSlug);
                        saveProfileSlug(profileSlug);
                        QRTileService.updateTile(this, profileSlug);
                    }
                }
            }
        }
    }

    private void saveProfileSlug(String slug) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_PROFILE_SLUG, slug).apply();
    }
}
