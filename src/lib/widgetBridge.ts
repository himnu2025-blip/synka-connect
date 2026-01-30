import { registerPlugin } from '@capacitor/core';

export interface WidgetBridgePlugin {
  updateWidget(options: { profileSlug: string }): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

export default WidgetBridge;
