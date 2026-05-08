// MANTEMOS OS IMPORTS - Eles são necessários para o Firebase funcionar!
import { db } from './firebase-config.js'; 
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ============================================================
   ESTADO GLOBAL E CARRINHO - JESS & STER ENCANTO DECOR
   ============================================================ */
let carrinhoItens = JSON.parse(localStorage.getItem('carrinho_v2')) || [];

// 1. Função para adicionar/remover itens (Vinculada ao window para o HTML enxergar)
window.adicionarItem = function(id, nome, preco, mudanca) {
    let carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || {};

    if (!carrinho[id]) {
        carrinho[id] = { nome: nome, preco: preco, qtd: 0 };
    }

    carrinho[id].qtd += mudanca;

    if (carrinho[id].qtd <= 0) {
        delete carrinho[id];
        const display = document.getElementById(`qtd-display-${id}`);
        if (display) display.innerText = 0;
    } else {
        const display = document.getElementById(`qtd-display-${id}`);
        if (display) display.innerText = carrinho[id].qtd;
    }

    sessionStorage.setItem('carrinho', JSON.stringify(carrinho));
    window.atualizarTotal(); // Usando a versão global
};

// 2. Função de Atualização do Total
window.atualizarTotal = function() {
    let carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || {};
    let total = 0;

    for (let item in carrinho) {
        total += carrinho[item].preco * carrinho[item].qtd;
    }

    const elementoTotal = document.getElementById('valor-total');
    if (elementoTotal) {
        elementoTotal.innerText = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
};

// 3. Função para a Lixeira (Limpar Pedido)
window.limparCarrinho = function() {
    if (confirm("Deseja realmente limpar seu pedido? ✨")) {
        sessionStorage.removeItem('carrinho');
        localStorage.removeItem('carrinho_v2'); // Limpa ambos para garantir
        location.reload();
    }
};

/* ============================================================
   SINCRONIZAÇÃO E FIREBASE
   ============================================================ */

// SALVAR NO BANCO E WHATSAPP (Vinculada ao window para não quebrar)
window.salvarNoBancoEIrParaWhats = async function() {
    const data = localStorage.getItem('data_evento');
    const nome = localStorage.getItem('nome_cliente');

    if (!data || !nome) {
        alert("Erro: Dados do cliente ou data não encontrados!");
        return;
    }

    // Pegamos o total do sessionStorage que é o que você está usando agora
    let carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || {};
    let valorCalculado = 0;
    for (let item in carrinho) {
        valorCalculado += carrinho[item].preco * carrinho[item].qtd;
    }

    const dadosParaOAgendamento = {
        cliente: nome,
        data: data,
        tema: localStorage.getItem('tema_festa') || 'Não definido',
        status: 'pendente',
        detalhes: localStorage.getItem('obs_evento') || '',
        valorTotal: valorCalculado,
        criadoEm: new Date()
    };

    try {
        await addDoc(collection(db, "eventos"), dadosParaOAgendamento);
        console.log("Sucesso no banco!");
        alert("Pedido enviado com sucesso! Abrindo WhatsApp...");
        // Adicione aqui a sua função de abrir o WhatsApp
    } catch (e) {
        console.error("Erro Firebase:", e);
    }
};

// Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    // Sincroniza os displays com o que está salvo
    let carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || {};
    for (let id in carrinho) {
        const display = document.getElementById(`qtd-display-${id}`);
        if (display) display.innerText = carrinho[id].qtd;
    }
    
    window.atualizarTotal();

    // Recupera dados do tema
    const temaSalvo = localStorage.getItem('tema_festa');
    const campoTema = document.getElementById('input-tema');
    if (temaSalvo && campoTema) campoTema.value = temaSalvo;
});

// Listener para salvar inputs automaticamente
document.addEventListener('change', function(e) {
    if (e.target.id === 'data-evento') localStorage.setItem('data_evento', e.target.value);
    if (e.target.id === 'obs-evento') localStorage.setItem('obs_evento', e.target.value);
    if (e.target.id === 'input-tema') localStorage.setItem('tema_festa', e.target.value);
});

window.salvarCadastroInicial = function() {
    const nome = document.getElementById('input-nome').value;
    if (nome && nome.trim() !== "") {
        localStorage.setItem('nome_cliente', nome);
        window.location.href = 'catalogo.html'; 
    } else {
        alert("Por favor, preencha seu nome! ✨");
    }
};