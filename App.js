// App.js
import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';


// Optionnel: Si vous avez besoin de l'instance db globalement, initialisez-la ici
// import { getFirestore } from "firebase/firestore";
// export const db = getFirestore(app);
// Sinon, importez getFirestore(app) où nécessaire dans vos composants/écrans.

export default function App() {
  return <AppNavigator />;
}
