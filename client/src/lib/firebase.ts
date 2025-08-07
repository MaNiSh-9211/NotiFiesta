import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, signInWithPopup, getRedirectResult, GoogleAuthProvider, signOut } from "firebase/auth";

// import dotenv from "dotenv";
// dotenv.config();

// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
// };

const firebaseConfig = {
  apiKey: "CHANGE_ME_FIREBASE_API_KEY",
  authDomain: "notifiesta-13524.firebaseapp.com",
  projectId: "notifiesta-13524",
  storageBucket: "notifiesta-13524.firebasestorage.app",
  messagingSenderId: "840566517886",
  appId: "1:840566517886:web:33db5e8f7b4d193d1ba82f",
  measurementId: "G-L2QF4H7BVT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export class FirebaseService {
  async signInWithGoogle(): Promise<any> {
    console.log("Firebase: Using popup for Google sign-in");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Firebase: Popup result received");
      
      if (result) {
        const user = result.user;
        console.log("Firebase: User from popup:", {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        });
        
        const idToken = await user.getIdToken();
        console.log("Firebase: ID token obtained, length:", idToken.length);
        
        return {
          firebaseUid: user.uid,
          email: user.email,
          name: user.displayName,
          avatar: user.photoURL,
          idToken: idToken,
        };
      }
      return null;
    } catch (error) {
      console.error("Firebase: Error with popup sign-in:", error);
      throw error;
    }
  }

  async handleRedirectResult(): Promise<any> {
    console.log("Firebase: Handling redirect result...");
    try {
      const result = await getRedirectResult(auth);
      console.log("Firebase: Raw redirect result:", result ? "Result exists" : "No result");
      
      if (result) {
        const user = result.user;
        console.log("Firebase: User from redirect:", {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        });
        
        const idToken = await user.getIdToken();
        console.log("Firebase: ID token obtained, length:", idToken.length);
        
        return {
          firebaseUid: user.uid,
          email: user.email,
          name: user.displayName,
          avatar: user.photoURL,
          idToken: idToken,
        };
      }
      console.log("Firebase: No redirect result found");
      return null;
    } catch (error) {
      console.error("Firebase: Error handling redirect result:", error);
      return null;
    }
  }

  async signOut(): Promise<void> {
    await signOut(auth);
  }

  async getCurrentUser(): Promise<any> {
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        unsubscribe();
        if (user) {
          const idToken = await user.getIdToken();
          resolve({
            firebaseUid: user.uid,
            email: user.email,
            name: user.displayName,
            avatar: user.photoURL,
            idToken: idToken,
          });
        } else {
          resolve(null);
        }
      });
    });
  }
}

export const firebaseService = new FirebaseService();