package com.synka.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;

import androidx.annotation.NonNull;
import androidx.wear.protolayout.ActionBuilders;
import androidx.wear.protolayout.ColorBuilders;
import androidx.wear.protolayout.DeviceParametersBuilders;
import androidx.wear.protolayout.DimensionBuilders;
import androidx.wear.protolayout.LayoutElementBuilders;
import androidx.wear.protolayout.ModifiersBuilders;
import androidx.wear.protolayout.ResourceBuilders;
import androidx.wear.protolayout.TimelineBuilders;
import androidx.wear.protolayout.material.Colors;
import androidx.wear.protolayout.material.Text;
import androidx.wear.protolayout.material.layouts.PrimaryLayout;
import androidx.wear.tiles.RequestBuilders;
import androidx.wear.tiles.TileBuilders;
import androidx.wear.tiles.TileService;

import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import java.io.ByteArrayOutputStream;
import java.util.HashMap;
import java.util.Map;

public class QRTileService extends TileService {
    
    private static final String PREFS_NAME = "SynkaWearPrefs";
    private static final String PREF_PROFILE_SLUG = "profile_slug";
    private static final String BASE_URL = "https://synka.in/u/";
    private static final String RESOURCE_QR_CODE = "qr_code_image";
    private static final int QR_SIZE = 180;

    @NonNull
    @Override
    protected ListenableFuture<TileBuilders.Tile> onTileRequest(
            @NonNull RequestBuilders.TileRequest requestParams) {
        
        return Futures.immediateFuture(
            new TileBuilders.Tile.Builder()
                .setResourcesVersion("1")
                .setFreshnessIntervalMillis(1800000) // 30 minutes
                .setTileTimeline(
                    new TimelineBuilders.Timeline.Builder()
                        .addTimelineEntry(
                            new TimelineBuilders.TimelineEntry.Builder()
                                .setLayout(
                                    new LayoutElementBuilders.Layout.Builder()
                                        .setRoot(createLayout(requestParams.getDeviceConfiguration()))
                                        .build()
                                )
                                .build()
                        )
                        .build()
                )
                .build()
        );
    }

    @NonNull
    @Override
    protected ListenableFuture<ResourceBuilders.Resources> onTileResourcesRequest(
            @NonNull RequestBuilders.ResourcesRequest requestParams) {
        
        ResourceBuilders.Resources.Builder resourcesBuilder = new ResourceBuilders.Resources.Builder()
            .setVersion("1");
        
        String profileSlug = getProfileSlug();
        if (profileSlug != null && !profileSlug.isEmpty()) {
            try {
                Bitmap qrBitmap = generateQRCode(BASE_URL + profileSlug, QR_SIZE);
                ByteArrayOutputStream stream = new ByteArrayOutputStream();
                qrBitmap.compress(Bitmap.CompressFormat.PNG, 100, stream);
                byte[] byteArray = stream.toByteArray();
                
                resourcesBuilder.addIdToImageMapping(
                    RESOURCE_QR_CODE,
                    new ResourceBuilders.ImageResource.Builder()
                        .setInlineResource(
                            new ResourceBuilders.InlineImageResource.Builder()
                                .setData(byteArray)
                                .setWidthPx(QR_SIZE)
                                .setHeightPx(QR_SIZE)
                                .setFormat(ResourceBuilders.IMAGE_FORMAT_PNG)
                                .build()
                        )
                        .build()
                );
            } catch (WriterException e) {
                e.printStackTrace();
            }
        }
        
        return Futures.immediateFuture(resourcesBuilder.build());
    }

    private LayoutElementBuilders.LayoutElement createLayout(
            DeviceParametersBuilders.DeviceParameters deviceParameters) {
        
        String profileSlug = getProfileSlug();
        
        if (profileSlug != null && !profileSlug.isEmpty()) {
            // Show QR code
            return new LayoutElementBuilders.Box.Builder()
                .setWidth(DimensionBuilders.expand())
                .setHeight(DimensionBuilders.expand())
                .setModifiers(
                    new ModifiersBuilders.Modifiers.Builder()
                        .setBackground(
                            new ModifiersBuilders.Background.Builder()
                                .setColor(ColorBuilders.argb(0xFFFFFFFF))
                                .build()
                        )
                        .setClickable(
                            new ModifiersBuilders.Clickable.Builder()
                                .setOnClick(
                                    new ActionBuilders.LaunchAction.Builder()
                                        .setAndroidActivity(
                                            new ActionBuilders.AndroidActivity.Builder()
                                                .setPackageName(getPackageName())
                                                .setClassName("com.synka.app.MainActivity")
                                                .build()
                                        )
                                        .build()
                                )
                                .build()
                        )
                        .build()
                )
                .addContent(
                    new LayoutElementBuilders.Image.Builder()
                        .setResourceId(RESOURCE_QR_CODE)
                        .setWidth(DimensionBuilders.dp(QR_SIZE))
                        .setHeight(DimensionBuilders.dp(QR_SIZE))
                        .build()
                )
                .build();
        } else {
            // Show placeholder
            return new LayoutElementBuilders.Box.Builder()
                .setWidth(DimensionBuilders.expand())
                .setHeight(DimensionBuilders.expand())
                .setModifiers(
                    new ModifiersBuilders.Modifiers.Builder()
                        .setBackground(
                            new ModifiersBuilders.Background.Builder()
                                .setColor(ColorBuilders.argb(0xFF1C1C1E))
                                .build()
                        )
                        .setClickable(
                            new ModifiersBuilders.Clickable.Builder()
                                .setOnClick(
                                    new ActionBuilders.LaunchAction.Builder()
                                        .setAndroidActivity(
                                            new ActionBuilders.AndroidActivity.Builder()
                                                .setPackageName(getPackageName())
                                                .setClassName("com.synka.app.MainActivity")
                                                .build()
                                        )
                                        .build()
                                )
                                .build()
                        )
                        .build()
                )
                .addContent(
                    new LayoutElementBuilders.Column.Builder()
                        .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
                        .addContent(
                            new LayoutElementBuilders.Text.Builder()
                                .setText("Open Synka")
                                .setFontStyle(
                                    new LayoutElementBuilders.FontStyle.Builder()
                                        .setColor(ColorBuilders.argb(0xFFFFFFFF))
                                        .setSize(DimensionBuilders.sp(14))
                                        .build()
                                )
                                .build()
                        )
                        .addContent(
                            new LayoutElementBuilders.Text.Builder()
                                .setText("to setup QR")
                                .setFontStyle(
                                    new LayoutElementBuilders.FontStyle.Builder()
                                        .setColor(ColorBuilders.argb(0xFF888888))
                                        .setSize(DimensionBuilders.sp(12))
                                        .build()
                                )
                                .build()
                        )
                        .build()
                )
                .build();
        }
    }

    private String getProfileSlug() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(PREF_PROFILE_SLUG, null);
    }

    private Bitmap generateQRCode(String content, int size) throws WriterException {
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
     * Update the tile with new profile data
     */
    public static void updateTile(Context context, String profileSlug) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(PREF_PROFILE_SLUG, profileSlug).apply();
        
        // Request tile update
        TileService.getUpdater(context).requestUpdate(QRTileService.class);
    }
}
