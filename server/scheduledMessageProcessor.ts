import { storage } from './storage';
import webpush from 'web-push';

// Function to process scheduled messages
export async function processScheduledMessages() {
  try {
    console.log('Processing scheduled messages...');
    
    // Get current time
    const now = new Date();
    
    // Find all messages that are scheduled and due to be sent
    const scheduledMessages = await storage.getScheduledMessages(now);
    
    console.log(`Found ${scheduledMessages.length} scheduled messages to process`);
    
    // Process each scheduled message
    for (const message of scheduledMessages) {
      try {
        // Get the friend to send the notification to
        const friend = await storage.getFriend(message.friendId);
        
        if (!friend || !friend.isActive || !friend.vapidSubscription) {
          console.log(`Cannot send scheduled message ${message.id}: Friend not found or not active`);
          await storage.updateMessage(message.id, { status: 'failed' });
          continue;
        }
        
        // Send the push notification
        await webpush.sendNotification(
          friend.vapidSubscription,
          JSON.stringify({
            title: message.title,
            message: message.message,
            icon: '/icon-192x192.svg',
            badge: '/badge-72x72.svg',
          })
        );
        
        console.log(`Scheduled push notification sent to ${friend.name}`);
        
        // Update message status to sent
        await storage.updateMessage(message.id, { 
          status: 'sent',
          sentAt: new Date() // Update the sentAt time to when it was actually sent
        });
        
        // Update friend's last notified time
        await storage.updateFriend(friend.id, {
          lastNotifiedAt: new Date()
        });
      } catch (error) {
        console.error(`Error processing scheduled message ${message.id}:`, error);
        await storage.updateMessage(message.id, { status: 'failed' });
      }
    }
  } catch (error) {
    console.error('Error in processScheduledMessages:', error);
  }
}

// Start the scheduled message processor
export function startScheduledMessageProcessor(intervalMinutes = 1) {
  console.log(`Starting scheduled message processor with ${intervalMinutes} minute interval`);
  
  // Run immediately on startup
  processScheduledMessages();
  
  // Then run at the specified interval
  const intervalMs = intervalMinutes * 60 * 1000;
  const interval = setInterval(processScheduledMessages, intervalMs);
  
  return interval;
}