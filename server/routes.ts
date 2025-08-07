import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, registerSchema, messageSchema } from "@shared/schema";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import webpush from "web-push";
import admin from "firebase-admin";
import { Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "your-vapid-public-key";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "your-vapid-private-key";

// Initialize Firebase Admin SDK
try {
  if (process.env.VITE_FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
  }
} catch (error) {
if (error instanceof Error) {
  console.log("Firebase Admin initialization skipped:", error.message);
} else {
  console.log("Firebase Admin initialization skipped:", String(error));
}
}

// Configure web-push
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Middleware to verify JWT token
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(validatedData.username) || 
                          await storage.getUserByEmail(validatedData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
        googleId: undefined,
  avatar: undefined,
  vapidSubscription: undefined,
      });

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({ 
        user: { ...user, password: undefined }, 
        token,
        vapidPublicKey: VAPID_PUBLIC_KEY 
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      // Find user
      const user = await storage.getUserByUsername(validatedData.username) || 
                   await storage.getUserByEmail(validatedData.username);
      
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValid = await bcrypt.compare(validatedData.password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({ 
        user: { ...user, password: undefined }, 
        token,
        vapidPublicKey: VAPID_PUBLIC_KEY 
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // app.post("/api/auth/google", async (req, res) => {
  //   try {
  //     const { idToken } = req.body;
      
  //     if (!idToken) {
  //       return res.status(400).json({ message: "Firebase ID token is required" });
  //     }

  //     // Verify Firebase ID token
  //     let decodedToken;
  //     try {
  //       decodedToken = await admin.auth().verifyIdToken(idToken);
  //     } catch (error) {
  //       return res.status(401).json({ message: "Invalid Firebase token" });
  //     }

  //     const { uid, email, name, picture } = decodedToken;

  //     // Find or create user
  //     let user = await storage.getUserByFirebaseUid(uid);
      
  //     if (!user) {
  //       // Check if user exists with same email
  //       const existingUser = await storage.getUserByEmail(email);
  //       if (existingUser) {
  //         // Update existing user with Firebase UID
  //         user = await storage.updateUser(existingUser.id, {
  //           firebaseUid: uid,
  //           avatar: picture,
  //         });
  //       } else {
  //         // Create new user
  //         const username = email.split('@')[0] + '_' + randomBytes(4).toString('hex');
  //         user = await storage.createUser({
  //           username,
  //           email,
  //           name: name || email.split('@')[0],
  //           avatar: picture,
  //           firebaseUid: uid,
  //           vapidSubscription: undefined,
  //         });
  //       }
  //     }

  //     // Generate JWT token
  //     const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

  //     res.json({ 
  //       user: { ...user, password: undefined }, 
  //       token,
  //       vapidPublicKey: VAPID_PUBLIC_KEY 
  //     });
  //   } catch (error: any) {
  //     console.error("Google auth error:", error);
  //     res.status(400).json({ message: error.message });
  //   }
  // });


  app.post("/api/auth/google", async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Firebase ID token is required" });
    }

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      return res.status(401).json({ message: "Invalid Firebase token" });
    }

    const { uid, email, name, picture } = decodedToken;

    if (!email) {
      return res.status(400).json({ message: "Email is required from Firebase token" });
    }

    // Find or create user
    let user = await storage.getUserByFirebaseUid(uid);

    if (!user) {
      const existingUser = await storage.getUserByEmail(email);

      if (existingUser) {
        user = await storage.updateUser(existingUser.id, {
          firebaseUid: uid,
          avatar: picture ?? undefined,
        });
      } else {
        const username = email.split('@')[0] + '_' + randomBytes(4).toString('hex');
        user = await storage.createUser({
          username,
          email,
          name: name ?? email.split('@')[0],
          avatar: picture ?? undefined,
          firebaseUid: uid,
          vapidSubscription: undefined,
        });
      }
    }

    // Type guard: Ensure user is not undefined
    if (!user || !user.id) {
      throw new Error("User creation or fetch failed.");
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      user: { ...user, password: undefined },
      token,
      vapidPublicKey: VAPID_PUBLIC_KEY,
    });

  } catch (error: any) {
    console.error("Google auth error:", error);
    res.status(400).json({ message: error.message || "Authentication failed" });
  }
});
  // User routes
  app.get("/api/user/me", authenticateToken, async (req: any, res) => {
    res.json({ ...req.user, password: undefined });
  });

  app.post("/api/user/vapid-subscription", authenticateToken, async (req: any, res) => {
    try {
      const { subscription } = req.body;
      const updatedUser = await storage.updateUser(req.user.id, {
        vapidSubscription: subscription
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Friend routes
  app.get("/api/friends", authenticateToken, async (req: any, res) => {
    try {
      const friends = await storage.getFriendsByUserId(req.user.id);
      res.json(friends);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/friends", authenticateToken, async (req: any, res) => {
    try {
      const { name, customMessage } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Friend name is required" });
      }

      // Generate unique link ID
      const linkId = randomBytes(16).toString('hex');
      
      // Create friend
      const friend = await storage.createFriend({
        userId: req.user.id,
        name,
        linkId,
        isActive: false,
        vapidSubscription: null,
      });

      // Create notification link
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      await storage.createNotificationLink({
        linkId,
        userId: req.user.id,
        friendId: friend.id,
        customMessage: customMessage || `${req.user.name} wants to send you notifications through NotiFiesta!`,
        expiresAt,
        isActive: true,
      });

      // Generate the full URL
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
      const notificationUrl = `${baseUrl}/notify/${linkId}`;

      res.json({ 
        friend, 
        notificationUrl,
        linkId 
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/friends/:id", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const friend = await storage.getFriend(id);
      
      if (!friend || friend.userId !== req.user.id) {
        return res.status(404).json({ message: "Friend not found" });
      }

      await storage.deleteFriend(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Notification consent route
  app.get("/api/notification-link/:linkId", async (req, res) => {
    try {
      const { linkId } = req.params;
      const link = await storage.getNotificationLink(linkId);
      
      if (!link || !link.isActive) {
        return res.status(404).json({ message: "Invalid or expired link" });
      }

      // Check if expired
      if (link.expiresAt && new Date() > link.expiresAt) {
        return res.status(410).json({ message: "Link has expired" });
      }

      const user = await storage.getUser(link.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        senderName: user.name,
        customMessage: link.customMessage,
        vapidPublicKey: VAPID_PUBLIC_KEY
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/notification-link/:linkId/enable", async (req, res) => {
    try {
      const { linkId } = req.params;
      const { subscription } = req.body;
      
      const link = await storage.getNotificationLink(linkId);
      if (!link || !link.isActive) {
        return res.status(404).json({ message: "Invalid or expired link" });
      }

      // Update friend with subscription
      const friend = await storage.updateFriend(link.friendId, {
        isActive: true,
        vapidSubscription: subscription
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Message routes
  app.get("/api/messages", authenticateToken, async (req: any, res) => {
    try {
      const messages = await storage.getMessagesByUserId(req.user.id);
      res.json(messages);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/messages", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = messageSchema.parse(req.body);
      
      const friend = await storage.getFriend(validatedData.friendId);
      if (!friend || friend.userId !== req.user.id) {
        return res.status(404).json({ message: "Friend not found" });
      }

      if (!friend.isActive || !friend.vapidSubscription) {
        return res.status(400).json({ message: "Friend has not enabled notifications" });
      }

      // Create message record
      const message = await storage.createMessage({
        userId: req.user.id,
        friendId: friend.id,
        title: validatedData.title,
        message: validatedData.message,
        status: "sent"
      });

      // Update friend's last notified time
      await storage.updateFriend(friend.id, {
        lastNotifiedAt: new Date()
      });

      // Send push notification
      try {
        if (friend.vapidSubscription) {
          await webpush.sendNotification(
            friend.vapidSubscription,
            JSON.stringify({
              title: validatedData.title,
              message: validatedData.message,
              icon: '/icon-192x192.svg',
              badge: '/badge-72x72.svg',
            })
          );
          console.log(`Push notification sent to ${friend.name}`);
        }
      } catch (pushError) {
        console.error("Push notification failed:", pushError);
        // Update message status to failed if push fails
        await storage.updateMessage(message.id, { status: "failed" });
      }

      res.json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Schedule notification endpoint
  app.post("/api/messages/schedule", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = messageSchema.parse(req.body);
      
      const friend = await storage.getFriend(validatedData.friendId);
      if (!friend || friend.userId !== req.user.id) {
        return res.status(404).json({ message: "Friend not found" });
      }

      if (!friend.isActive || !friend.vapidSubscription) {
        return res.status(400).json({ message: "Friend has not enabled notifications" });
      }

      if (!validatedData.scheduledFor) {
        return res.status(400).json({ message: "Scheduled date and time are required" });
      }

      const scheduledDate = new Date(validatedData.scheduledFor);
      
      // Validate that the scheduled date is in the future
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ message: "Scheduled time must be in the future" });
      }

      // Create message record with scheduled status
      const message = await storage.createMessage({
        userId: req.user.id,
        friendId: friend.id,
        title: validatedData.title,
        message: validatedData.message,
        status: "scheduled",
        scheduledFor: scheduledDate
      });

      res.json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Statistics route
  app.get("/api/stats", authenticateToken, async (req: any, res) => {
    try {
      const friends = await storage.getFriendsByUserId(req.user.id);
      const messages = await storage.getMessagesByUserId(req.user.id);
      
      const activeFriends = friends.filter(f => f.isActive).length;
      const totalSent = messages.length;
      const successRate = totalSent > 0 ? ((messages.filter(m => m.status === "sent").length / totalSent) * 100).toFixed(1) : "0.0";
      
      // Messages this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeek = messages.filter(m => m.sentAt >= oneWeekAgo).length;

      res.json({
        totalSent,
        activeFriends,
        successRate: `${successRate}%`,
        thisWeek
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
