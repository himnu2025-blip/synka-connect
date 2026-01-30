package com.synka.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.widget.RemoteViews;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import java.util.HashMap;
import java.util.Map;

public class QRWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "SynkaWidgetPrefs";
    private static final String PREF_PROFILE_SLUG = "profile_slug";
    private static final String BASE_URL = "https://synka.app/u/";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_qr_code);

        // Get the stored profile slug
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String profileSlug = prefs.getString(PREF_PROFILE_SLUG, null);

        if (profileSlug != null && !profileSlug.isEmpty()) {
            String publicUrl = BASE_URL + profileSlug;
            
            try {
                // Generate QR code
                Bitmap qrBitmap = generateQRCode(publicUrl, 512);
                views.setImageViewBitmap(R.id.qr_code_image, qrBitmap);
                views.setViewVisibility(R.id.placeholder_text, android.view.View.GONE);
                views.setViewVisibility(R.id.qr_code_image, android.view.View.VISIBLE);
            } catch (WriterException e) {
                e.printStackTrace();
                showPlaceholder(views);
            }
        } else {
            showPlaceholder(views);
        }

        // Set up click to open the app
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 
            0, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.qr_code_image, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static void showPlaceholder(RemoteViews views) {
        views.setViewVisibility(R.id.placeholder_text, android.view.View.VISIBLE);
        views.setViewVisibility(R.id.qr_code_image, android.view.View.GONE);
    }

    private static Bitmap generateQRCode(String content, int size) throws WriterException {
        Map<EncodeHintType, Object> hints = new HashMap<>();
        hints.put(EncodeHintType.MARGIN, 1);
        hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");

        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size, hints);

        int width = bitMatrix.getWidth();
        int height = bitMatrix.getHeight();
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);

        for (int x = 0; x < width; x++) {
            for (int y = 0; y < height; y++) {
                bitmap.setPixel(x, y, bitMatrix.get(x, y) ? 0xFF1C1C1E : 0xFFFFFFFF);
            }
        }

        return bitmap;
    }

    /**
     * Call this method from the web app via a Capacitor plugin to update the widget
     */
    public static void updateWidget(Context context, String profileSlug) {
        // Save the profile slug
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(PREF_PROFILE_SLUG, profileSlug).apply();

        // Trigger widget update
        Intent intent = new Intent(context, QRWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        context.sendBroadcast(intent);
    }
}
