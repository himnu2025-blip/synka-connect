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
        
        // Save to shared UserDefaults (App Group)
        if let userDefaults = UserDefaults(suiteName: "group.com.synka.app") {
            userDefaults.set(profileSlug, forKey: "profileSlug")
            userDefaults.synchronize()
        }
        
        // Reload widget timeline
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        
        call.resolve()
    }
}
