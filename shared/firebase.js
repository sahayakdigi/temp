// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAmLax2Y1yntOF3Ln343YX54DYVeaGtAIU",
  authDomain: "temp-aa4db.firebaseapp.com",
  projectId: "temp-aa4db",
  storageBucket: "temp-aa4db.firebasestorage.app",
  messagingSenderId: "572495583446",
  appId: "1:572495583446:web:a8eac4f04c02a5722f5177"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export default app;
