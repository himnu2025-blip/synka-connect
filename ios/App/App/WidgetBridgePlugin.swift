import Foundation
import Capacitor
import WidgetKit

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin {
    
    @objc func updateWidget(_ call: CAPPluginCall) {
        guard let profileSlug = call.getString("profileSlug"), !profileSlug.isEmpty else {
            call.reject("Profile slug is required")
            return
        }
        
        // Save to shared UserDefaults (App Group) - accessible by iOS widget AND watchOS
        if let userDefaults = UserDefaults(suiteName: "group.com.synka.app") {
            userDefaults.set(profileSlug, forKey: "profileSlug")
            userDefaults.synchronize()
        }
        
        // Reload all widget timelines (iOS and watchOS widgets)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        
        // Also reload specific widget kinds if needed
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: "SynkaQRWidget")
            WidgetCenter.shared.reloadTimelines(ofKind: "SynkaQRWatch")
        }
        
        call.resolve()
    }
}
