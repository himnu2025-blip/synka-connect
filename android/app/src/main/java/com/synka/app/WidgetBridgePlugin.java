package com.synka.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void updateWidget(PluginCall call) {
        String profileSlug = call.getString("profileSlug");
        
        if (profileSlug == null || profileSlug.isEmpty()) {
            call.reject("Profile slug is required");
            return;
        }

        try {
            QRWidgetProvider.updateWidget(getContext(), profileSlug);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to update widget: " + e.getMessage());
        }
    }
}
