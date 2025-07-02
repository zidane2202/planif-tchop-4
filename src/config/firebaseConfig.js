// src/firebaseConfig.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Pour la base de données


// Votre configuration Firebase (celle que vous avez copiée)
const firebaseConfig = {
  apiKey: "AIzaSyBHrP2BfEf-9G3l6NkBN8W1e3stZBGQ0_o",
  authDomain: "planif-tchop.firebaseapp.com",
  projectId: "planif-tchop",
  storageBucket: "planif-tchop.firebasestorage.app",
  messagingSenderId: "770553275231",
  appId: "1:770553275231:web:5d67c0289d3a620e914cea"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialise les services que vous allez utiliser
const db = getFirestore(app);


// Exportez les services pour pouvoir les utiliser dans d'autres composants
export { db };