import { MongoClient, Db, Collection } from "mongodb";
import { type User, type InsertUser, type Friend, type InsertFriend, type NotificationLink, type InsertNotificationLink, type Message, type InsertMessage } from "@shared/schema";
import { randomUUID } from "crypto";

import dotenv from "dotenv";
dotenv.config();

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Friend operations
  getFriendsByUserId(userId: string): Promise<Friend[]>;
  getFriendByLinkId(linkId: string): Promise<Friend | undefined>;
  getFriend(id: string): Promise<Friend | undefined>;
  createFriend(friend: InsertFriend): Promise<Friend>;
  updateFriend(id: string, updates: Partial<Friend>): Promise<Friend | undefined>;
  deleteFriend(id: string): Promise<boolean>;

  // Notification Link operations
  getNotificationLink(linkId: string): Promise<NotificationLink | undefined>;
  createNotificationLink(link: InsertNotificationLink): Promise<NotificationLink>;
  updateNotificationLink(id: string, updates: Partial<NotificationLink>): Promise<NotificationLink | undefined>;

  // Message operations
  getMessagesByUserId(userId: string): Promise<Message[]>;
  getMessagesByFriendId(friendId: string): Promise<Message[]>;
  getScheduledMessages(beforeDate: Date): Promise<Message[]>; // Get messages scheduled before a certain date
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined>;
}

export class MongoStorage implements IStorage {
  private client: MongoClient;
  private db: Db;
  private users: Collection<User>;
  private friends: Collection<Friend>;
  private notificationLinks: Collection<NotificationLink>;
  private messages: Collection<Message>;

  constructor(connectionString: string) {
    this.client = new MongoClient(connectionString);
    this.db = this.client.db("notifiesta");
    this.users = this.db.collection<User>("users");
    this.friends = this.db.collection<Friend>("friends");
    this.notificationLinks = this.db.collection<NotificationLink>("notificationLinks");
    this.messages = this.db.collection<Message>("messages");
  }

  async connect(): Promise<void> {
    await this.client.connect();
    console.log("Connected to MongoDB");
    
    // Create indexes for better performance
    await this.users.createIndex({ username: 1 }, { unique: true });
    await this.users.createIndex({ email: 1 }, { unique: true });
    await this.users.createIndex({ googleId: 1 }, { sparse: true });
    await this.users.createIndex({ firebaseUid: 1 }, { sparse: true });
    await this.friends.createIndex({ linkId: 1 }, { unique: true });
    await this.friends.createIndex({ userId: 1 });
    await this.notificationLinks.createIndex({ linkId: 1 }, { unique: true });
    await this.messages.createIndex({ userId: 1 });
    await this.messages.createIndex({ friendId: 1 });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const user = await this.users.findOne({ id });
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await this.users.findOne({ username });
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await this.users.findOne({ email });
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const user = await this.users.findOne({ googleId });
    return user || undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const user = await this.users.findOne({ firebaseUid });
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
    };
    await this.users.insertOne(user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await this.users.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    );
    return result || undefined;
  }

  // Friend operations
  async getFriendsByUserId(userId: string): Promise<Friend[]> {
    return await this.friends.find({ userId }).sort({ createdAt: -1 }).toArray();
  }

  async getFriendByLinkId(linkId: string): Promise<Friend | undefined> {
    const friend = await this.friends.findOne({ linkId });
    return friend || undefined;
  }

  async getFriend(id: string): Promise<Friend | undefined> {
    const friend = await this.friends.findOne({ id });
    return friend || undefined;
  }

  async createFriend(insertFriend: InsertFriend): Promise<Friend> {
    const id = randomUUID();
    const friend: Friend = {
      ...insertFriend,
      id,
      createdAt: new Date(),
    };
    await this.friends.insertOne(friend);
    return friend;
  }

  async updateFriend(id: string, updates: Partial<Friend>): Promise<Friend | undefined> {
    const result = await this.friends.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    );
    return result || undefined;
  }

  async deleteFriend(id: string): Promise<boolean> {
    const result = await this.friends.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Notification Link operations
  async getNotificationLink(linkId: string): Promise<NotificationLink | undefined> {
    const link = await this.notificationLinks.findOne({ linkId });
    return link || undefined;
  }

  async createNotificationLink(insertLink: InsertNotificationLink): Promise<NotificationLink> {
    const id = randomUUID();
    const link: NotificationLink = {
      ...insertLink,
      id,
      createdAt: new Date(),
    };
    await this.notificationLinks.insertOne(link);
    return link;
  }

  async updateNotificationLink(id: string, updates: Partial<NotificationLink>): Promise<NotificationLink | undefined> {
    const result = await this.notificationLinks.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    );
    return result || undefined;
  }

  // Message operations
  async getMessagesByUserId(userId: string): Promise<Message[]> {
    return await this.messages.find({ userId }).sort({ sentAt: -1 }).toArray();
  }

  async getMessagesByFriendId(friendId: string): Promise<Message[]> {
    return await this.messages.find({ friendId }).sort({ sentAt: -1 }).toArray();
  }

  async getScheduledMessages(beforeDate: Date): Promise<Message[]> {
    return await this.messages.find({ 
      status: "scheduled",
      scheduledFor: { $lte: beforeDate }
    }).toArray();
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      sentAt: new Date(),
    };
    await this.messages.insertOne(message);
    return message;
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined> {
    const result = await this.messages.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    );
    return result || undefined;
  }
}

// Initialize MongoDB storage
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error("MONGODB_URI environment variable is required");
}

export const storage = new MongoStorage(mongoUri);

// Connect to MongoDB on startup
storage.connect().catch(console.error);
