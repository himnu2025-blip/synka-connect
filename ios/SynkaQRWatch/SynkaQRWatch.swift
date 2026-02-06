import WidgetKit
import SwiftUI

// MARK: - Timeline Entry
struct WatchQRCodeEntry: TimelineEntry {
    let date: Date
    let profileSlug: String?
}

// MARK: - Timeline Provider
struct WatchQRProvider: TimelineProvider {
    func placeholder(in context: Context) -> WatchQRCodeEntry {
        WatchQRCodeEntry(date: Date(), profileSlug: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (WatchQRCodeEntry) -> Void) {
        let entry = WatchQRCodeEntry(date: Date(), profileSlug: getProfileSlug())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WatchQRCodeEntry>) -> Void) {
        let entry = WatchQRCodeEntry(date: Date(), profileSlug: getProfileSlug())
        // Update every 30 minutes on watch to save battery
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
    
    private func getProfileSlug() -> String? {
        // Use the same App Group as the iOS app
        let userDefaults = UserDefaults(suiteName: "group.com.synka.app")
        return userDefaults?.string(forKey: "profileSlug")
    }
}

// MARK: - Watch Widget Entry View
struct SynkaWatchWidgetEntryView: View {
    var entry: WatchQRProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                Color.white
                
                if let slug = entry.profileSlug, !slug.isEmpty {
                    WatchQRCodeView(
                        url: "https://synka.in/u/\(slug)", 
                        size: min(geometry.size.width, geometry.size.height) - 8
                    )
                } else {
                    VStack(spacing: 2) {
                        Image(systemName: "qrcode")
                            .font(.system(size: 24))
                            .foregroundColor(.gray)
                        Text("Open Synka")
                            .font(.system(size: 10))
                            .foregroundColor(.gray)
                    }
                }
            }
        }
        .containerBackground(.white, for: .widget)
    }
}

// MARK: - QR Code Generator View
struct WatchQRCodeView: View {
    let url: String
    let size: CGFloat
    
    var body: some View {
        if let qrImage = generateQRCode(from: url) {
            Image(uiImage: qrImage)
                .interpolation(.none)
                .resizable()
                .scaledToFit()
                .frame(width: size, height: size)
        } else {
            Image(systemName: "qrcode")
                .font(.system(size: 20))
                .foregroundColor(.black)
        }
    }
    
    func generateQRCode(from string: String) -> UIImage? {
        let data = string.data(using: .ascii)
        
        guard let filter = CIFilter(name: "CIQRCodeGenerator") else { return nil }
        filter.setValue(data, forKey: "inputMessage")
        filter.setValue("M", forKey: "inputCorrectionLevel")
        
        guard let outputImage = filter.outputImage else { return nil }
        
        // Scale for watch display
        let scale = size / outputImage.extent.size.width
        let transformedImage = outputImage.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
        
        let context = CIContext()
        guard let cgImage = context.createCGImage(transformedImage, from: transformedImage.extent) else { return nil }
        
        return UIImage(cgImage: cgImage)
    }
}

// MARK: - Widget Configuration
@main
struct SynkaQRWatch: Widget {
    let kind: String = "SynkaQRWatch"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WatchQRProvider()) { entry in
            SynkaWatchWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Synka QR")
        .description("Your profile QR code")
        // Support accessory widgets for watchOS
        #if os(watchOS)
        .supportedFamilies([.accessoryRectangular, .accessoryCircular, .accessoryCorner])
        #endif
        .contentMarginsDisabled()
    }
}

// MARK: - Accessory Views for Watch Complications
struct AccessoryRectangularView: View {
    var entry: WatchQRProvider.Entry
    
    var body: some View {
        if let slug = entry.profileSlug, !slug.isEmpty {
            WatchQRCodeView(url: "https://synka.in/u/\(slug)", size: 50)
        } else {
            HStack {
                Image(systemName: "qrcode")
                Text("Synka")
            }
            .font(.caption)
        }
    }
}

struct AccessoryCircularView: View {
    var entry: WatchQRProvider.Entry
    
    var body: some View {
        if let slug = entry.profileSlug, !slug.isEmpty {
            WatchQRCodeView(url: "https://synka.in/u/\(slug)", size: 40)
        } else {
            Image(systemName: "qrcode")
                .font(.title3)
        }
    }
}

#if DEBUG
struct SynkaQRWatch_Previews: PreviewProvider {
    static var previews: some View {
        SynkaWatchWidgetEntryView(entry: WatchQRCodeEntry(date: .now, profileSlug: "demo-user"))
            .previewContext(WidgetPreviewContext(family: .accessoryRectangular))
    }
}
#endif
