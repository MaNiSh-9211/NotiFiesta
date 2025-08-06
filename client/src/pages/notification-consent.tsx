import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { notificationService } from "@/lib/notifications";
import { Bell, CheckCircle, AlertCircle } from "lucide-react";

interface NotificationLinkData {
  senderName: string;
  customMessage: string;
  vapidPublicKey: string;
}

export default function NotificationConsent() {
  const [, params] = useRoute("/notify/:linkId");
  const [linkData, setLinkData] = useState<NotificationLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [enabling, setEnabling] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const { toast } = useToast();

  const linkId = params?.linkId;

  useEffect(() => {
    const fetchLinkData = async () => {
      if (!linkId) {
        setError("Invalid notification link");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/notification-link/${linkId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("This notification link is invalid or has been removed.");
          } else if (response.status === 410) {
            setError("This notification link has expired.");
          } else {
            setError("Unable to load notification link.");
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setLinkData(data);
        await notificationService.initializeVapid(data.vapidPublicKey);
      } catch (error) {
        setError("Failed to load notification details. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchLinkData();
  }, [linkId]);

  const handleEnableNotifications = async () => {
    if (!linkId || !linkData) return;

    setEnabling(true);

    try {
      // Request notification permission
      const permissionGranted = await notificationService.requestPermission();
      
      if (!permissionGranted) {
        toast({
          title: "Permission denied",
          description: "Notifications were not enabled. You can enable them later in your browser settings.",
          variant: "destructive",
        });
        setEnabling(false);
        return;
      }

      // Register service worker
      const registration = await notificationService.registerServiceWorker();
      
      if (!registration) {
        throw new Error("Failed to register service worker");
      }

      // Subscribe to push notifications
      const subscription = await notificationService.subscribeToPush(registration);
      
      if (!subscription) {
        throw new Error("Failed to subscribe to push notifications");
      }

      // Save subscription to backend
      const success = await notificationService.saveConsentSubscription(linkId, subscription);
      
      if (!success) {
        throw new Error("Failed to save subscription");
      }

      setEnabled(true);
      toast({
        title: "Notifications enabled!",
        description: `You'll now receive notifications from ${linkData.senderName}.`,
      });

    } catch (error: any) {
      console.error("Failed to enable notifications:", error);
      toast({
        title: "Failed to enable notifications",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setEnabling(false);
    }
  };

  const handleDecline = () => {
    toast({
      title: "Notifications declined",
      description: "You can enable notifications later by visiting this link again.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 futuristic-grid opacity-30"></div>
          <div className="absolute inset-0 minimal-pattern"></div>
        </div>
        
        <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-800 border border-gray-600 rounded-full mx-auto mb-6 flex items-center justify-center animate-pulse">
              <Bell className="text-2xl text-gray-300" />
            </div>
            <p className="text-gray-400">Loading notification details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 futuristic-grid opacity-30"></div>
          <div className="absolute inset-0 minimal-pattern"></div>
        </div>
        
        <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg w-full">
            <Card className="glass-modern border-gray-700 shadow-2xl text-center">
              <CardContent className="p-8">
                <div className="w-20 h-20 bg-red-900 border border-red-700 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <AlertCircle className="text-2xl text-red-400" />
                </div>
                
                <h1 className="text-2xl font-bold mb-4">Link Not Available</h1>
                <p className="text-gray-400 mb-8 leading-relaxed">{error}</p>
                
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    If you believe this is an error, please contact the person who shared this link with you.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (enabled) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 futuristic-grid opacity-30"></div>
          <div className="absolute inset-0 minimal-pattern"></div>
        </div>
        
        <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg w-full">
            <Card className="glass-modern border-gray-700 shadow-2xl text-center">
              <CardContent className="p-8">
                <div className="w-20 h-20 bg-green-900 border border-green-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <CheckCircle className="text-2xl text-green-400" />
                </div>
                
                <h1 className="text-2xl font-bold mb-4">All Set!</h1>
                <p className="text-gray-400 mb-8 leading-relaxed">
                  You'll now receive push notifications from <span className="text-white font-medium">{linkData?.senderName}</span>. 
                  You can disable these at any time in your browser settings.
                </p>
                
                <div className="space-y-4">
                  <Button 
                    className="w-full bg-white text-black hover:bg-gray-200 hover-lift font-semibold"
                    onClick={() => window.close()}
                  >
                    Close
                  </Button>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    NotiFiesta respects your privacy and never stores personal data. 
                    You can disable notifications at any time in your browser settings.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Professional futuristic background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 futuristic-grid opacity-30"></div>
        <div className="absolute inset-0 minimal-pattern"></div>
      </div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <Card className="glass-modern border-gray-700 shadow-2xl text-center hover-lift">
            <CardContent className="p-8">
              {/* Notification Icon */}
              <div className="w-20 h-20 bg-gray-800 border border-gray-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Bell className="text-2xl text-gray-300" />
              </div>
              
              <h1 className="text-2xl font-bold mb-4">Enable Notifications</h1>
              <p className="text-gray-400 mb-8 leading-relaxed">
                <span className="text-white font-medium">{linkData?.senderName}</span> wants to send you push notifications through NotiFiesta. 
                You'll receive instant messages directly to your device.
              </p>
              
              {/* Custom Message Preview */}
              {linkData?.customMessage && (
                <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4 mb-8">
                  <p className="text-sm text-gray-400 mb-2">Message from {linkData.senderName}:</p>
                  <p className="text-white font-medium">"{linkData.customMessage}"</p>
                </div>
              )}
              
              <div className="space-y-4">
                <Button 
                  className="w-full bg-white text-black hover:bg-gray-200 hover-lift font-semibold py-4"
                  onClick={handleEnableNotifications}
                  disabled={enabling}
                >
                  <Bell className="mr-2 w-5 h-5" />
                  {enabling ? "Enabling..." : "Enable Notifications"}
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full bg-gray-900 hover:bg-gray-700 border-gray-600 text-gray-300 hover-lift"
                  onClick={handleDecline}
                  disabled={enabling}
                >
                  Maybe Later
                </Button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-xs text-gray-500 leading-relaxed">
                  You can disable notifications at any time in your browser settings. 
                  NotiFiesta respects your privacy and never stores personal data.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
