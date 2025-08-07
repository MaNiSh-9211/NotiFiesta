# Vercel Deployment Guide for NotiFiestaBlast

This document provides instructions for deploying the NotiFiestaBlast application to Vercel.

## Prerequisites

1. A Vercel account
2. The Vercel CLI installed (optional for advanced configuration)

## Deployment Steps

### 1. Connect Your Repository

Connect your GitHub, GitLab, or Bitbucket repository to Vercel.

### 2. Configure Environment Variables

Add the following environment variables in the Vercel dashboard:

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
NODE_ENV=production
```

### 3. Deploy

Vercel will automatically detect the monorepo structure and build both the frontend and backend using the configuration in `vercel.json` and the build scripts in `package.json`.

## Vercel Configuration

The project includes the following Vercel-specific files:

- `vercel.json`: Configures build settings and routing
- `.vercelignore`: Specifies files to exclude from deployment

## Troubleshooting

### API Routes Not Working

If API routes are not working, check:

1. Environment variables are correctly set in Vercel
2. The routing configuration in `vercel.json` is correct
3. The build process completed successfully

### Database Connection Issues

If you're experiencing database connection issues:

1. Verify your MongoDB connection string is correct
2. Ensure your MongoDB instance allows connections from Vercel's IP addresses
3. Check the deployment logs for any connection errors

### Authentication Problems

If authentication is not working:

1. Verify all Firebase configuration variables are set correctly
2. Check that JWT_SECRET is properly configured
3. Ensure the Firebase project settings allow authentication from your deployed domain

## Monitoring

Use Vercel's built-in monitoring tools to track your application's performance and errors.