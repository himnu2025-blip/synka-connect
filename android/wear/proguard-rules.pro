# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /sdk/tools/proguard/proguard-android.txt

# ZXing
-keep class com.google.zxing.** { *; }

# Wear Tiles
-keep class androidx.wear.tiles.** { *; }
-keep class androidx.wear.protolayout.** { *; }

# Wearable Data Layer
-keep class com.google.android.gms.wearable.** { *; }
