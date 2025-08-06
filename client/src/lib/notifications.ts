import { getAuthHeaders } from "./auth";

export class NotificationService {
  private vapidPublicKey: string | null = null;
  
  async initializeVapid(publicKey: string) {
    this.vapidPublicKey = publicKey;
  }

  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.error("This browser does not support notifications");
      return false;
    }

    if (!("serviceWorker" in navigator)) {
      console.error("This browser does not support service workers");
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered successfully:", registration);
      return registration;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      return null;
    }
  }

  async subscribeToPush(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
    if (!this.vapidPublicKey) {
      console.error("VAPID public key not set");
      return null;
    }

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      console.log("Push subscription successful:", subscription);
      return subscription;
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error);
      return null;
    }
  }

  async saveSubscription(subscription: PushSubscription): Promise<boolean> {
    try {
      const response = await fetch("/api/user/vapid-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ subscription })
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to save subscription:", error);
      return false;
    }
  }

  async saveConsentSubscription(linkId: string, subscription: PushSubscription): Promise<boolean> {
    try {
      const response = await fetch(`/api/notification-link/${linkId}/enable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ subscription })
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to save consent subscription:", error);
      return false;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const notificationService = new NotificationService();
