import { z } from "zod";

// MongoDB Document Interfaces
export interface User {
  _id?: string;
  id: string;
  username: string;
  email: string;
  password?: string;
  googleId?: string;
  firebaseUid?: string;
  name: string;
  avatar?: string;
  vapidSubscription?: any;
  createdAt: Date;
}

export interface Friend {
  _id?: string;
  id: string;
  userId: string;
  name: string;
  linkId: string;
  isActive: boolean;
  vapidSubscription?: any;
  createdAt: Date;
  lastNotifiedAt?: Date;
}

export interface NotificationLink {
  _id?: string;
  id: string;
  linkId: string;
  userId: string;
  friendId: string;
  customMessage?: string;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface Message {
  _id?: string;
  id: string;
  userId: string;
  friendId: string;
  title: string;
  message: string;
  status: string; // sent, delivered, failed, scheduled
  sentAt: Date;
  scheduledFor?: Date; // Date and time when the notification should be sent
}

// Zod Schemas for validation
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
});

export const messageSchema = z.object({
  friendId: z.string().min(1, "Friend is required"),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  scheduledFor: z.string().optional(), // ISO string for scheduled date/time
});

export const insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  googleId: z.string().optional(),
  firebaseUid: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  avatar: z.string().optional(),
  vapidSubscription: z.any().optional(),
});

export const insertFriendSchema = z.object({
  userId: z.string(),
  name: z.string().min(1, "Name is required"),
  linkId: z.string(),
  isActive: z.boolean().default(false),
  vapidSubscription: z.any().optional(),
});

export const insertNotificationLinkSchema = z.object({
  linkId: z.string(),
  userId: z.string(),
  friendId: z.string(),
  customMessage: z.string().optional(),
  expiresAt: z.date().optional(),
  isActive: z.boolean().default(true),
});

export const insertMessageSchema = z.object({
  userId: z.string(),
  friendId: z.string(),
  title: z.string(),
  message: z.string(),
  status: z.string().default("sent"),
  scheduledFor: z.date().optional(), // Date object for scheduled date/time
});

// Type exports
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type MessageRequest = z.infer<typeof messageSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertFriend = z.infer<typeof insertFriendSchema>;
export type InsertNotificationLink = z.infer<typeof insertNotificationLinkSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
