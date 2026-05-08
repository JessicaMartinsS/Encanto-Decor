import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD_8o8ZbN08L0ZcJrSQ327mtdCX8aF-YiE",
    authDomain: "encanto-decor.firebaseapp.com",
    projectId: "encanto-decor",
    storageBucket: "encanto-decor.firebasestorage.app",
    messagingSenderId: "152623551052",
    appId: "1:152623551052:web:b3f94933e4838e6b585ae9",
    measurementId: "G-MCT3VDTDSF"
};

// Inicialização única (Removidas as duplicatas abaixo)
const app = initializeApp(firebaseConfig);

// Exportações para serem usadas em outros arquivos (auth.js, finalizar.js, etc.)
export const auth = getAuth(app); 
export const db = getFirestore(app);