import WidgetKit
import SwiftUI

struct QRCodeEntry: TimelineEntry {
    let date: Date
    let profileSlug: String?
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> QRCodeEntry {
        QRCodeEntry(date: Date(), profileSlug: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (QRCodeEntry) -> Void) {
        let entry = QRCodeEntry(date: Date(), profileSlug: getProfileSlug())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<QRCodeEntry>) -> Void) {
        let entry = QRCodeEntry(date: Date(), profileSlug: getProfileSlug())
        // Update every hour
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
    
    private func getProfileSlug() -> String? {
        let userDefaults = UserDefaults(suiteName: "group.com.synka.app")
        return userDefaults?.string(forKey: "profileSlug")
    }
}

struct SynkaQRWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                Color.white
                
                if let slug = entry.profileSlug, !slug.isEmpty {
                    QRCodeView(url: "https://synka.in/u/\(slug)", size: min(geometry.size.width, geometry.size.height) - 16)
                } else {
                    VStack(spacing: 4) {
                        Image(systemName: "qrcode")
                            .font(.system(size: 32))
                            .foregroundColor(.gray)
                        Text("Open Synka")
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                }
            }
        }
        .containerBackground(.white, for: .widget)
    }
}

struct QRCodeView: View {
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
                .font(.system(size: 40))
                .foregroundColor(.black)
        }
    }
    
    func generateQRCode(from string: String) -> UIImage? {
        let data = string.data(using: .ascii)
        
        guard let filter = CIFilter(name: "CIQRCodeGenerator") else { return nil }
        filter.setValue(data, forKey: "inputMessage")
        filter.setValue("M", forKey: "inputCorrectionLevel")
        
        guard let outputImage = filter.outputImage else { return nil }
        
        let scaleX = size / outputImage.extent.size.width
        let scaleY = size / outputImage.extent.size.height
        let transformedImage = outputImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
        
        let context = CIContext()
        guard let cgImage = context.createCGImage(transformedImage, from: transformedImage.extent) else { return nil }
        
        return UIImage(cgImage: cgImage)
    }
}

@main
struct SynkaQRWidget: Widget {
    let kind: String = "SynkaQRWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            SynkaQRWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Synka QR Code")
        .description("Display your profile QR code on your home screen")
        .supportedFamilies([.systemSmall])
        .contentMarginsDisabled()
    }
}

#Preview(as: .systemSmall) {
    SynkaQRWidget()
} timeline: {
    QRCodeEntry(date: .now, profileSlug: "demo-user")
    QRCodeEntry(date: .now, profileSlug: nil)
}
