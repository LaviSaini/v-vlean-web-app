// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyArgbKTDtLnwqBEaSEfGckmYRA35A9ALww",
  authDomain: "v-clean-7ee80.firebaseapp.com",
  projectId: "v-clean-7ee80",
  storageBucket: "v-clean-7ee80.firebasestorage.app",
  messagingSenderId: "286268506646",
  appId: "1:286268506646:web:cbe216fed7c4a4dbd62b37",
  measurementId: "G-JKL9WD39YJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);