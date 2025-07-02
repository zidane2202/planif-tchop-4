// src/services/EmailService.js
import * as MailComposer from 'expo-mail-composer';
import axios from 'axios';
import { db } from '../config/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import moment from 'moment';
import 'moment/locale/fr';
import * as FileSystem from 'expo-file-system';

moment.locale('fr');

// --- Fonctions de récupération de données (inchangées) ---
const fetchPlanningData = async (startDate = null, endDate = null) => {
  try {
    const start = startDate || moment().startOf('week').format('YYYY-MM-DD');
    const end = endDate || moment().endOf('week').format('YYYY-MM-DD');
    const mealPlansRef = collection(db, 'mealPlans');
    const q = query(
      mealPlansRef,
      where('date', '>=', start),
      where('date', '<=', end)
    );
    const snapshot = await getDocs(q);
    const mealPlans = [];
    for (const docSnap of snapshot.docs) {
      const plan = { id: docSnap.id, ...docSnap.data() };
      if (plan.dishId) {
        const dishDoc = await getDoc(doc(db, 'dishes', plan.dishId));
        if (dishDoc.exists()) {
          plan.dish = { id: dishDoc.id, ...dishDoc.data() };
        }
      }
      mealPlans.push(plan);
    }
    mealPlans.sort((a, b) => {
      const dateCompare = moment(a.date).diff(moment(b.date));
      if (dateCompare !== 0) return dateCompare;
      const mealTypeOrder = {
        'Petit-déjeuner': 0,
        'Brunch': 1,
        'Déjeuner': 2,
        'Collation': 3,
        'Dîner': 4
      };
      return (mealTypeOrder[a.mealType] || 99) - (mealTypeOrder[b.mealType] || 99);
    });
    return mealPlans;
  } catch (error) {
    console.error('Erreur lors de la récupération du planning:', error);
    throw error;
  }
};

const fetchStockData = async () => {
  try {
    const stockRef = collection(db, 'userStock');
    const snapshot = await getDocs(stockRef);
    const stockItems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    stockItems.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
    return stockItems;
  } catch (error) {
    console.error('Erreur lors de la récupération du stock:', error);
    throw error;
  }
};

const fetchShoppingListData = async () => {
  try {
    const stockRef = collection(db, 'userStock');
    const snapshot = await getDocs(stockRef);
    const shoppingItems = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(item => item.quantity <= 1) 
      .sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
      });
    return shoppingItems;
  } catch (error) {
    console.error('Erreur lors de la récupération de la liste de courses:', error);
    throw error;
  }
};

// --- Fonctions de formatage HTML (inchangées) ---
const formatPlanningToHtml = (planningData) => {
  if (!planningData || planningData.length === 0) {
    return '<p style="font-style:italic;color:#888;">Aucun repas planifié pour cette période.</p>';
  }
  const plansByDate = {};
  planningData.forEach(plan => {
    const dateStr = plan.date;
    if (!plansByDate[dateStr]) {
      plansByDate[dateStr] = [];
    }
    plansByDate[dateStr].push(plan);
  });
  let html = '<div style="background:#fff;border-radius:16px;box-shadow:0 2px 8px #eee;padding:24px 20px 20px 20px;margin:24px auto;max-width:600px;">';
  html += '<h2 style="color:#007A5E;font-size:26px;text-align:center;margin-bottom:24px;letter-spacing:1px;">🍽️ Planning des Repas</h2>';
  Object.keys(plansByDate).sort().forEach(dateStr => {
    const formattedDate = moment(dateStr).format('dddd DD MMMM YYYY');
    html += `<div style="margin-bottom:18px;">
      <div style="font-size:18px;font-weight:600;color:#333;margin-bottom:8px;border-left:4px solid #007A5E;padding-left:8px;">${formattedDate}</div>
      <ul style="list-style:none;padding:0;">`;
    plansByDate[dateStr].forEach(plan => {
      const dishName = plan.dish ? plan.dish.name : 'Plat non spécifié';
      const preparedStatus = plan.prepared ? ' <span style="color:#007A5E;font-weight:bold;">(Préparé)</span>' : '';
      html += `<li style="background:#f8f9fa;border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;">
        <span style="font-weight:500;color:#007A5E;margin-right:8px;">${plan.mealType} :</span>
        <span style="flex:1;">${dishName} - <span style="color:#555;">${plan.servingsPlanned} portions</span>${preparedStatus}</span>
      </li>`;
    });
    html += '</ul></div>';
  });
  html += '</div>';
  return html;
};

const formatStockToHtml = (stockData) => {
  if (!stockData || stockData.length === 0) {
    return '<p>Aucun élément en stock.</p>';
  }
  const stockByCategory = {};
  stockData.forEach(item => {
    const category = item.category || 'Autres';
    if (!stockByCategory[category]) {
      stockByCategory[category] = [];
    }
    stockByCategory[category].push(item);
  });
  let html = '<h2>État du Stock</h2>';
  Object.keys(stockByCategory).sort().forEach(category => {
    html += `<h3>${category}</h3>`;
    html += '<ul>';
    stockByCategory[category].forEach(item => {
      const quantity = item.quantity || 0;
      const status = quantity <= 0 ? ' <span class="status-epuise">(Épuisé)</span>' : 
                     quantity <= 1 ? ' <span class="status-stock-bas">(Stock bas)</span>' : '';
      html += `<li><strong>${item.name}:</strong> ${quantity} ${item.unit}${status}</li>`;
    });
    html += '</ul>';
  });
  return html;
};

const formatShoppingListToHtml = (shoppingListData) => {
  if (!shoppingListData || shoppingListData.length === 0) {
    return '<p>Aucun élément dans la liste de courses.</p>';
  }
  const itemsByCategory = {};
  shoppingListData.forEach(item => {
    const category = item.category || 'Autres';
    if (!itemsByCategory[category]) {
      itemsByCategory[category] = [];
    }
    itemsByCategory[category].push(item);
  });
  let html = '<h2>Liste de Courses</h2>';
  Object.keys(itemsByCategory).sort().forEach(category => {
    html += `<h3>${category}</h3>`;
    html += '<ul>';
    itemsByCategory[category].forEach(item => {
      const quantity = item.quantity || 0;
      const status = quantity <= 0 ? ' (À acheter)' : ' (À compléter)';
      html += `<li><strong>${item.name}:</strong> ${item.unit}${status}</li>`;
    });
    html += '</ul>';
  });
  return html;
};

// --- NOUVELLES Fonctions de formatage Texte Brut ---
const formatPlanningToText = (planningData) => {
  if (!planningData || planningData.length === 0) {
    return 'Aucun repas planifié pour cette période.\n\n';
  }
  const plansByDate = {};
  planningData.forEach(plan => {
    const dateStr = plan.date;
    if (!plansByDate[dateStr]) {
      plansByDate[dateStr] = [];
    }
    plansByDate[dateStr].push(plan);
  });
  let text = 'PLANNING DES REPAS\n';
  text += '-------------------\n';
  Object.keys(plansByDate).sort().forEach(dateStr => {
    const formattedDate = moment(dateStr).format('dddd DD MMMM YYYY');
    text += `\n${formattedDate.toUpperCase()}\n`;
    plansByDate[dateStr].forEach(plan => {
      const dishName = plan.dish ? plan.dish.name : 'Plat non spécifié';
      const preparedStatus = plan.prepared ? ' (Préparé)' : '';
      text += `- ${plan.mealType}: ${dishName} - ${plan.servingsPlanned} portions${preparedStatus}\n`;
    });
  });
  text += '\n';
  return text;
};

const formatStockToText = (stockData) => {
  if (!stockData || stockData.length === 0) {
    return 'Aucun élément en stock.\n\n';
  }
  const stockByCategory = {};
  stockData.forEach(item => {
    const category = item.category || 'Autres';
    if (!stockByCategory[category]) {
      stockByCategory[category] = [];
    }
    stockByCategory[category].push(item);
  });
  let text = 'ÉTAT DU STOCK\n';
  text += '-------------\n';
  Object.keys(stockByCategory).sort().forEach(category => {
    text += `\n${category.toUpperCase()}\n`;
    stockByCategory[category].forEach(item => {
      const quantity = item.quantity || 0;
      const status = quantity <= 0 ? ' (Épuisé)' : 
                    quantity <= 1 ? ' (Stock bas)' : '';
      text += `- ${item.name}: ${quantity} ${item.unit}${status}\n`;
    });
  });
  text += '\n';
  return text;
};

const formatShoppingListToText = (shoppingListData) => {
  if (!shoppingListData || shoppingListData.length === 0) {
    return 'Aucun élément dans la liste de courses.\n\n';
  }
  const itemsByCategory = {};
  shoppingListData.forEach(item => {
    const category = item.category || 'Autres';
    if (!itemsByCategory[category]) {
      itemsByCategory[category] = [];
    }
    itemsByCategory[category].push(item);
  });
  let text = 'LISTE DE COURSES\n';
  text += '----------------\n';
  Object.keys(itemsByCategory).sort().forEach(category => {
    text += `\n${category.toUpperCase()}\n`;
    itemsByCategory[category].forEach(item => {
      const quantity = item.quantity || 0;
      const status = quantity <= 0 ? ' (À acheter)' : ' (À compléter)';
      text += `- ${item.name}: ${item.unit}${status}\n`; 
    });
  });
  text += '\n';
  return text;
};

// --- Fonction principale sendEmail MODIFIÉE ---
const GEMINI_API_KEY = 'AIzaSyBNp7imyhArP-jdnqqaopDGAAsYL4V1RWY';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Nouvelle fonction Gemini avec retry/backoff et prompt avancé
const generatePersonalizedMessage = async (member, attempt = 1, maxAttempts = 3) => {
  const { prenom, name, age, sexe } = member;
  const firstName = prenom || (name ? name.split(' ')[0] : '');
  const isChild = age && age <= 12;
  const isTeen = age && age > 12 && age <= 18;
  const isMale = sexe && (sexe.toLowerCase() === 'masculin' || sexe.toLowerCase() === 'homme');

  let prompt;
  if (isChild) {
    prompt = `Tu es Gemini, un chef cuisinier passionné et magique. Écris un email personnalisé pour un enfant nommé ${firstName}, âgé de ${age} ans. Utilise un ton ludique et amical, avec des emojis comme 🧙‍🍳 et 🥄. Mentionne une planification de repas "super rigolote et délicieuse" qui va "le faire sauter de joie", et indique que les détails sont dans un PDF en pièce jointe. Signe en tant que "ton chef Gemini".`;
  } else if (isTeen) {
    prompt = `Tu es Gemini, un chef cuisinier cool et passionné. Écris un email personnalisé pour un adolescent nommé ${firstName}, âgé de ${age} ans. Utilise un ton décontracté et moderne, avec un langage jeune (par exemple, "kiffer", "stylé") et un emoji comme 🔥. Mentionne une planification hebdomadaire des repas "qui va le faire kiffer" avec des "saveurs qui envoient du lourd", et indique que les détails sont dans un PDF en pièce jointe. Signe en tant que "ton chef Gemini".`;
  } else {
    prompt = `Tu es Gemini, un chef cuisinier raffiné et passionné. Écris un email personnalisé pour un adulte nommé ${firstName}, âgé de ${age || 'un âge inconnu'} ans, de sexe ${sexe || 'non précisé'}. Utilise un ton élégant et formel, en commençant par "${isMale ? 'Cher' : 'Chère'} ${firstName}". Mentionne une planification hebdomadaire des repas "conçue avec soin pour éveiller les papilles", avec des "plats raffinés et équilibrés", et indique que les détails sont dans un PDF en pièce jointe. Ajoute un emoji élégant comme 🍷. Signe en tant que "votre chef Gemini".`;
  }

  try {
    const response = await axios.post(
      GEMINI_URL,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text;
  } catch (e) {
    if (attempt < maxAttempts) {
      const delay = 500 * Math.pow(2, attempt); // backoff exponentiel
      await new Promise(res => setTimeout(res, delay));
      return generatePersonalizedMessage(member, attempt + 1, maxAttempts);
    }
    console.error('Erreur Gemini:', e.message);
    return '';
  }
};

// Génère un PDF stylé du planning et retourne le chemin du fichier
const generatePlanningPDF = async (planningData) => {
  const html = formatPlanningToHtml(planningData);
  const fullHtml = `<html><head><meta charset='utf-8'><title>Planning des Repas</title><style>
    html,body{margin:0;padding:0;width:100vw;min-width:100vw;max-width:100vw;height:100vh;min-height:100vh;max-height:100vh;background:#fff;}
    .fullpage{width:100vw;min-width:100vw;max-width:100vw;height:100vh;min-height:100vh;max-height:100vh;margin:0;padding:0;box-sizing:border-box;}
    body, .fullpage { font-size: 28px; line-height: 1.8; }
    h1, h2 { font-size: 36px; margin-bottom: 32px; }
    h3 { font-size: 32px; margin-bottom: 20px; }
    ul, li { font-size: 28px; }
    .categoryTitle { font-size: 32px; font-weight: bold; margin-top: 32px; margin-bottom: 18px; }
    .itemText { font-size: 28px; }
    .status-epuise, .status-stock-bas { font-size: 26px; }
    .warningText { font-size: 24px; }
    .date { font-size: 28px; font-weight: bold; margin-top: 24px; }
  </style></head><body><div class="fullpage">${html}</div></body></html>`;
  return await generatePDFViaHtml2PdfRocket(fullHtml, `planning-repas-${Date.now()}`);
};

// Génère un PDF stylé du stock et retourne le chemin du fichier
const generateStockPDF = async (stockData) => {
  const html = formatStockToHtml(stockData);
  const fullHtml = `<html><head><meta charset='utf-8'><title>État du Stock</title><style>
    html,body{margin:0;padding:0;width:100vw;min-width:100vw;max-width:100vw;height:100vh;min-height:100vh;max-height:100vh;background:#fff;}
    .fullpage{width:100vw;min-width:100vw;max-width:100vw;height:100vh;min-height:100vh;max-height:100vh;margin:0;padding:0;box-sizing:border-box;}
    body, .fullpage { font-size: 28px; line-height: 1.8; }
    h1, h2 { font-size: 36px; margin-bottom: 32px; }
    h3 { font-size: 32px; margin-bottom: 20px; }
    ul, li { font-size: 28px; }
    .categoryTitle { font-size: 32px; font-weight: bold; margin-top: 32px; margin-bottom: 18px; }
    .itemText { font-size: 28px; }
    .status-epuise, .status-stock-bas { font-size: 26px; }
    .warningText { font-size: 24px; }
    .date { font-size: 28px; font-weight: bold; margin-top: 24px; }
  </style></head><body><div class="fullpage">${html}</div></body></html>`;
  return await generatePDFViaHtml2PdfRocket(fullHtml, `etat-stock-${Date.now()}`);
};

// Génère un PDF stylé de la liste de courses et retourne le chemin du fichier
const generateShoppingListPDF = async (shoppingListData) => {
  const html = formatShoppingListToHtml(shoppingListData);
  const fullHtml = `<html><head><meta charset='utf-8'><title>Liste de Courses</title><style>
    html,body{margin:0;padding:0;width:100vw;min-width:100vw;max-width:100vw;height:100vh;min-height:100vh;max-height:100vh;background:#fff;}
    .fullpage{width:100vw;min-width:100vw;max-width:100vw;height:100vh;min-height:100vh;max-height:100vh;margin:0;padding:0;box-sizing:border-box;}
    body, .fullpage { font-size: 28px; line-height: 1.8; }
    h1, h2 { font-size: 36px; margin-bottom: 32px; }
    h3 { font-size: 32px; margin-bottom: 20px; }
    ul, li { font-size: 28px; }
    .categoryTitle { font-size: 32px; font-weight: bold; margin-top: 32px; margin-bottom: 18px; }
    .itemText { font-size: 28px; }
    .status-epuise, .status-stock-bas { font-size: 26px; }
    .warningText { font-size: 24px; }
    .date { font-size: 28px; font-weight: bold; margin-top: 24px; }
  </style></head><body><div class="fullpage">${html}</div></body></html>`;
  return await generatePDFViaHtml2PdfRocket(fullHtml, `liste-courses-${Date.now()}`);
};
const HTML2PDF_API_KEY = '6e688a18-7034-451b-ba49-34a019164abf';

// Fonction utilitaire pour convertir un ArrayBuffer en base64 (compatible React Native)
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return global.btoa(binary);
}

const generatePDFViaHtml2PdfRocket = async (html, fileName) => {
  const response = await axios.post(
    'https://api.html2pdfrocket.com/pdf',
    {
      value: html,
      apikey: HTML2PDF_API_KEY
    },
    { responseType: 'arraybuffer' }
  );
  const fileUri = FileSystem.cacheDirectory + fileName + '.pdf';
  await FileSystem.writeAsStringAsync(
    fileUri,
    arrayBufferToBase64(response.data),
    { encoding: FileSystem.EncodingType.Base64 }
  );
  return fileUri;
};

const sendEmail = async (members, includePlanning, includeStock, includeShoppingList) => {
  try {
    let planningData = [];
    let pdfPaths = [];
    let stockData = [];
    let shoppingListData = [];
    if (includePlanning) {
      planningData = await fetchPlanningData();
      const planningPDF = await generatePlanningPDF(planningData);
      pdfPaths.push(planningPDF);
    }
    if (includeStock) {
      stockData = await fetchStockData();
      const stockPDF = await generateStockPDF(stockData);
      pdfPaths.push(stockPDF);
    }
    if (includeShoppingList) {
      shoppingListData = await fetchShoppingListData();
      const shoppingListPDF = await generateShoppingListPDF(shoppingListData);
      pdfPaths.push(shoppingListPDF);
    }
    for (const member of members) {
      const intro = await generatePersonalizedMessage(member);
      let emailContentText = `${intro}\n\n`;
      if (includePlanning) {
        emailContentText += `Le planning des repas est en pièce jointe au format PDF.\n\n`;
      }
      if (includeStock) {
        emailContentText += `L'état du stock est en pièce jointe au format PDF.\n\n`;
      }
      if (includeShoppingList) {
        emailContentText += `La liste de courses est en pièce jointe au format PDF.\n\n`;
      }
      emailContentText += `Cordialement,\nL'équipe Planif-Tchop`;
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        return { success: false, message: "Aucune application de messagerie n'est disponible sur cet appareil." };
      }
      await MailComposer.composeAsync({
        recipients: [member.email],
        subject: 'Planif-Tchop - Mise à jour',
        body: emailContentText,
        attachments: pdfPaths.length > 0 ? pdfPaths : undefined
      });
    }
    // Nettoyage des PDF temporaires
    for (const path of pdfPaths) {
      try { await FileSystem.deleteAsync(path, { idempotent: true }); } catch (e) {}
    }
    return { success: true, message: "L'application de messagerie a été ouverte avec le message préparé pour chaque membre." };
  } catch (error) {
    console.error("Erreur lors de la préparation de l'email:", error);
    return { success: false, message: `Erreur lors de la préparation de l'email: ${error.message}` };
  }
};

export default {
  sendEmail,
  fetchPlanningData,
  fetchStockData,
  fetchShoppingListData,
  formatPlanningToHtml,
  formatStockToHtml,
  formatShoppingListToHtml,
  formatPlanningToText,
  formatStockToText,
  formatShoppingListToText,
  generateStockPDF,
  generateShoppingListPDF,
  generatePDFViaHtml2PdfRocket
};