/**
 * Browser and device detection utilities for graceful degradation
 * Provides feature detection and compatibility checks for SkillSync platform
 */

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  platform: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  supportsWebRTC: boolean;
  supportsWebGL: boolean;
  supportsServiceWorker: boolean;
  supportsWebAssembly: boolean;
  supportsIntersectionObserver: boolean;
  supportsResizeObserver: boolean;
  supportsWebSockets: boolean;
  supportsLocalStorage: boolean;
  supportsIndexedDB: boolean;
  supportsNotifications: boolean;
  supportsGeolocation: boolean;
  supportsCamera: boolean;
  supportsMicrophone: boolean;
  supportsScreenShare: boolean;
  supportsFullscreen: boolean;
  supportsTouchEvents: boolean;
  supportsPointerEvents: boolean;
  supportsClipboard: boolean;
}

export interface FeatureSupport {
  webrtc: {
    supported: boolean;
    features: {
      peerConnection: boolean;
      dataChannel: boolean;
      getUserMedia: boolean;
      getDisplayMedia: boolean;
      rtcStats: boolean;
    };
    limitations: string[];
  };
  media: {
    supported: boolean;
    features: {
      camera: boolean;
      microphone: boolean;
      screenShare: boolean;
      audioContext: boolean;
      mediaRecorder: boolean;
    };
    limitations: string[];
  };
  storage: {
    supported: boolean;
    features: {
      localStorage: boolean;
      sessionStorage: boolean;
      indexedDB: boolean;
      webSQL: boolean;
    };
    limitations: string[];
  };
  networking: {
    supported: boolean;
    features: {
      fetch: boolean;
      websockets: boolean;
      webworkers: boolean;
      serviceWorker: boolean;
    };
    limitations: string[];
  };
  ui: {
    supported: boolean;
    features: {
      fullscreen: boolean;
      notifications: boolean;
      vibration: boolean;
      clipboard: boolean;
      intersectionObserver: boolean;
      resizeObserver: boolean;
    };
    limitations: string[];
  };
}

class BrowserDetector {
  private userAgent: string;
  private browserInfo: BrowserInfo | null = null;
  private featureSupport: FeatureSupport | null = null;

  constructor() {
    this.userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  }

  /**
   * Get comprehensive browser information
   */
  getBrowserInfo(): BrowserInfo {
    if (this.browserInfo) {
      return this.browserInfo;
    }

    const info = this.detectBrowser();
    const features = this.detectFeatures();

    this.browserInfo = {
      ...info,
      ...features
    };

    return this.browserInfo;
  }

  /**
   * Get detailed feature support information
   */
  getFeatureSupport(): FeatureSupport {
    if (this.featureSupport) {
      return this.featureSupport;
    }

    this.featureSupport = {
      webrtc: this.checkWebRTCSupport(),
      media: this.checkMediaSupport(),
      storage: this.checkStorageSupport(),
      networking: this.checkNetworkingSupport(),
      ui: this.checkUISupport()
    };

    return this.featureSupport;
  }

  /**
   * Check if the current browser/device is supported
   */
  isSupported(): { supported: boolean; limitations: string[]; recommendations: string[] } {
    const info = this.getBrowserInfo();
    const features = this.getFeatureSupport();
    const limitations: string[] = [];
    const recommendations: string[] = [];

    // Critical features for SkillSync
    if (!features.webrtc.supported) {
      limitations.push('Video calling is not supported');
      recommendations.push('Please update your browser or try Chrome/Firefox/Safari');
    }

    if (!features.networking.features.websockets) {
      limitations.push('Real-time features may not work properly');
      recommendations.push('Please update your browser');
    }

    if (!features.storage.features.localStorage) {
      limitations.push('Settings and preferences cannot be saved');
      recommendations.push('Please enable cookies and local storage');
    }

    // Mobile-specific checks
    if (info.isMobile) {
      if (!features.media.features.camera || !features.media.features.microphone) {
        limitations.push('Camera or microphone access may be limited');
        recommendations.push('Please grant camera and microphone permissions');
      }

      if (!info.supportsTouchEvents) {
        limitations.push('Touch interactions may not work properly');
        recommendations.push('Please use a touch-enabled device');
      }
    }

    // Browser-specific limitations
    if (info.name === 'Internet Explorer') {
      limitations.push('This browser is not supported');
      recommendations.push('Please use Chrome, Firefox, Safari, or Edge');
    }

    if (info.name === 'Safari' && parseFloat(info.version) < 14) {
      limitations.push('Some video calling features may not work');
      recommendations.push('Please update Safari to version 14 or later');
    }

    return {
      supported: limitations.length === 0,
      limitations,
      recommendations
    };
  }

  /**
   * Get fallback options for unsupported features
   */
  getFallbackOptions(): {
    webrtc: string[];
    storage: string[];
    notifications: string[];
    media: string[];
  } {
    const features = this.getFeatureSupport();

    return {
      webrtc: features.webrtc.supported ? [] : [
        'Use text-based chat instead of video calls',
        'Join sessions via phone call',
        'Use screen sharing alternatives'
      ],
      storage: features.storage.supported ? [] : [
        'Settings will reset on page refresh',
        'Use browser bookmarks for quick access',
        'Manual session history tracking'
      ],
      notifications: features.ui.features.notifications ? [] : [
        'Check the app regularly for updates',
        'Enable email notifications',
        'Use browser tabs for status updates'
      ],
      media: features.media.supported ? [] : [
        'Use text-based communication',
        'Share screen via external tools',
        'Use phone for audio communication'
      ]
    };
  }

  /**
   * Detect browser name, version, and platform
   */
  private detectBrowser(): {
    name: string;
    version: string;
    engine: string;
    platform: string;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
  } {
    const ua = this.userAgent;
    let name = 'Unknown';
    let version = 'Unknown';
    let engine = 'Unknown';

    // Browser detection
    if (ua.includes('Chrome') && !ua.includes('Chromium')) {
      name = 'Chrome';
      version = this.extractVersion(ua, /Chrome\/([0-9.]+)/);
      engine = 'Blink';
    } else if (ua.includes('Firefox')) {
      name = 'Firefox';
      version = this.extractVersion(ua, /Firefox\/([0-9.]+)/);
      engine = 'Gecko';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      name = 'Safari';
      version = this.extractVersion(ua, /Version\/([0-9.]+)/);
      engine = 'WebKit';
    } else if (ua.includes('Edge')) {
      name = 'Edge';
      version = this.extractVersion(ua, /Edge\/([0-9.]+)/);
      engine = 'EdgeHTML';
    } else if (ua.includes('Trident')) {
      name = 'Internet Explorer';
      version = this.extractVersion(ua, /rv:([0-9.]+)/);
      engine = 'Trident';
    }

    // Platform detection
    let platform = 'Unknown';
    if (ua.includes('Windows')) platform = 'Windows';
    else if (ua.includes('Mac')) platform = 'macOS';
    else if (ua.includes('Linux')) platform = 'Linux';
    else if (ua.includes('Android')) platform = 'Android';
    else if (ua.includes('iOS')) platform = 'iOS';

    // Device type detection
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
    const isDesktop = !isMobile && !isTablet;

    return {
      name,
      version,
      engine,
      platform,
      isMobile,
      isTablet,
      isDesktop
    };
  }

  /**
   * Detect feature support
   */
  private detectFeatures(): {
    supportsWebRTC: boolean;
    supportsWebGL: boolean;
    supportsServiceWorker: boolean;
    supportsWebAssembly: boolean;
    supportsIntersectionObserver: boolean;
    supportsResizeObserver: boolean;
    supportsWebSockets: boolean;
    supportsLocalStorage: boolean;
    supportsIndexedDB: boolean;
    supportsNotifications: boolean;
    supportsGeolocation: boolean;
    supportsCamera: boolean;
    supportsMicrophone: boolean;
    supportsScreenShare: boolean;
    supportsFullscreen: boolean;
    supportsTouchEvents: boolean;
    supportsPointerEvents: boolean;
    supportsClipboard: boolean;
  } {
    if (typeof window === 'undefined') {
      return {
        supportsWebRTC: false,
        supportsWebGL: false,
        supportsServiceWorker: false,
        supportsWebAssembly: false,
        supportsIntersectionObserver: false,
        supportsResizeObserver: false,
        supportsWebSockets: false,
        supportsLocalStorage: false,
        supportsIndexedDB: false,
        supportsNotifications: false,
        supportsGeolocation: false,
        supportsCamera: false,
        supportsMicrophone: false,
        supportsScreenShare: false,
        supportsFullscreen: false,
        supportsTouchEvents: false,
        supportsPointerEvents: false,
        supportsClipboard: false
      };
    }

    return {
      supportsWebRTC: !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection),
      supportsWebGL: this.checkWebGLSupport(),
      supportsServiceWorker: 'serviceWorker' in navigator,
      supportsWebAssembly: 'WebAssembly' in window,
      supportsIntersectionObserver: 'IntersectionObserver' in window,
      supportsResizeObserver: 'ResizeObserver' in window,
      supportsWebSockets: 'WebSocket' in window,
      supportsLocalStorage: this.checkLocalStorageSupport(),
      supportsIndexedDB: 'indexedDB' in window,
      supportsNotifications: 'Notification' in window,
      supportsGeolocation: 'geolocation' in navigator,
      supportsCamera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      supportsMicrophone: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      supportsScreenShare: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
      supportsFullscreen: !!(document.documentElement.requestFullscreen || (document.documentElement as any).webkitRequestFullscreen),
      supportsTouchEvents: 'ontouchstart' in window,
      supportsPointerEvents: 'PointerEvent' in window,
      supportsClipboard: !!(navigator.clipboard && navigator.clipboard.writeText)
    };
  }

  /**
   * Check WebRTC support in detail
   */
  private checkWebRTCSupport(): FeatureSupport['webrtc'] {
    const limitations: string[] = [];
    const features = {
      peerConnection: !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection),
      dataChannel: false,
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      getDisplayMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
      rtcStats: false
    };

    if (!features.peerConnection) {
      limitations.push('Peer-to-peer connections not supported');
    } else {
      // Test data channel support
      try {
        const pc = new RTCPeerConnection();
        features.dataChannel = !!pc.createDataChannel;
        features.rtcStats = !!pc.getStats;
        pc.close();
      } catch (e) {
        limitations.push('WebRTC initialization failed');
      }
    }

    if (!features.getUserMedia) {
      limitations.push('Camera and microphone access not supported');
    }

    if (!features.getDisplayMedia) {
      limitations.push('Screen sharing not supported');
    }

    return {
      supported: features.peerConnection && features.getUserMedia,
      features,
      limitations
    };
  }

  /**
   * Check media support
   */
  private checkMediaSupport(): FeatureSupport['media'] {
    const limitations: string[] = [];
    const features = {
      camera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      microphone: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      screenShare: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
      audioContext: !!(window.AudioContext || (window as any).webkitAudioContext),
      mediaRecorder: 'MediaRecorder' in window
    };

    if (!features.camera || !features.microphone) {
      limitations.push('Media device access may be limited');
    }

    if (!features.screenShare) {
      limitations.push('Screen sharing not available');
    }

    if (!features.audioContext) {
      limitations.push('Advanced audio features not supported');
    }

    return {
      supported: features.camera && features.microphone,
      features,
      limitations
    };
  }

  /**
   * Check storage support
   */
  private checkStorageSupport(): FeatureSupport['storage'] {
    const limitations: string[] = [];
    const features = {
      localStorage: this.checkLocalStorageSupport(),
      sessionStorage: this.checkSessionStorageSupport(),
      indexedDB: 'indexedDB' in window,
      webSQL: 'openDatabase' in window
    };

    if (!features.localStorage) {
      limitations.push('Local storage not available - settings will not persist');
    }

    if (!features.indexedDB) {
      limitations.push('Advanced storage features not available');
    }

    return {
      supported: features.localStorage,
      features,
      limitations
    };
  }

  /**
   * Check networking support
   */
  private checkNetworkingSupport(): FeatureSupport['networking'] {
    const limitations: string[] = [];
    const features = {
      fetch: 'fetch' in window,
      websockets: 'WebSocket' in window,
      webworkers: 'Worker' in window,
      serviceWorker: 'serviceWorker' in navigator
    };

    if (!features.fetch) {
      limitations.push('Modern networking features not supported');
    }

    if (!features.websockets) {
      limitations.push('Real-time features may not work');
    }

    if (!features.serviceWorker) {
      limitations.push('Offline features not available');
    }

    return {
      supported: features.fetch && features.websockets,
      features,
      limitations
    };
  }

  /**
   * Check UI support
   */
  private checkUISupport(): FeatureSupport['ui'] {
    const limitations: string[] = [];
    const features = {
      fullscreen: !!(document.documentElement.requestFullscreen || (document.documentElement as any).webkitRequestFullscreen),
      notifications: 'Notification' in window,
      vibration: 'vibrate' in navigator,
      clipboard: !!(navigator.clipboard && navigator.clipboard.writeText),
      intersectionObserver: 'IntersectionObserver' in window,
      resizeObserver: 'ResizeObserver' in window
    };

    if (!features.notifications) {
      limitations.push('Push notifications not supported');
    }

    if (!features.clipboard) {
      limitations.push('Clipboard operations may be limited');
    }

    return {
      supported: true, // UI features are generally optional
      features,
      limitations
    };
  }

  /**
   * Helper methods
   */
  private extractVersion(ua: string, regex: RegExp): string {
    const match = ua.match(regex);
    return match ? match[1] : 'Unknown';
  }

  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  private checkLocalStorageSupport(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  private checkSessionStorageSupport(): boolean {
    try {
      const test = '__sessionStorage_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
}

// Create singleton instance
export const browserDetector = new BrowserDetector();

// Convenience functions
export const getBrowserInfo = () => browserDetector.getBrowserInfo();
export const getFeatureSupport = () => browserDetector.getFeatureSupport();
export const isSupported = () => browserDetector.isSupported();
export const getFallbackOptions = () => browserDetector.getFallbackOptions();

export default browserDetector;