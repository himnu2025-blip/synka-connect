package com.synka.app;

import android.os.Bundle;
import android.view.WindowManager;
import android.os.Build;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
        
        // Handle status bar overlay - ensure content doesn't go under system UI
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ - Use modern WindowInsets API
            WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        } else {
            // Older Android versions - fallback method
            // Remove the FLAG_LAYOUT_NO_LIMITS if it was set
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
        }
        
        // Make status bar background match app background
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        }
    }
}
