// Adicione a importação do 'auth' aqui
import { db, auth } from "./firebase-config.js"; 
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const btnLogin = document.getElementById('btnLogin');

if (btnLogin) {
    btnLogin.addEventListener('click', () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        console.log("Tentando entrar com:", email); 

        // Agora o 'auth' será reconhecido
        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                window.location.href = "admin.html";
            })
            .catch((error) => {
                console.error("Erro no login:", error.code);
                alert("E-mail ou senha inválidos.");
            });
    });
}

// Lógica para o botão Sair funcionar
const btnSair = document.getElementById('btnSair');
if (btnSair) {
    btnSair.onclick = () => {
        // Se estiver usando Firebase Auth
        // auth.signOut().then(() => window.location.href = "login.html");
        
        // Ou apenas redirecionar por enquanto:
        window.location.href = "login.html";
    };
}