// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDyXMpu-9dlAg0DaSB22aknfAc1nF5mPx4",
  authDomain: "video-call-a6c34.firebaseapp.com",
  projectId: "video-call-a6c34",
  storageBucket: "video-call-a6c34.appspot.com",
  messagingSenderId: "60441469883",
  appId: "1:60441469883:web:a0aac77f449708b2249a9e",
  measurementId: "G-FLTCNEXK20"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);