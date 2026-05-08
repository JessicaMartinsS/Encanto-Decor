import { db } from './firebase-config.js'; 
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ============================================================
   ESTADO GLOBAL E CARRINHO - JESS & STER ENCANTO DECOR
   ============================================================ */
let carrinhoItens = JSON.parse(localStorage.getItem('carrinho_v2')) || [];

window.adicionarItem = function(id, nome, preco, operacao) {
    const displayElement = document.getElementById(`qtd-display-${id}`);
    if (!displayElement) return;

    let qtdAtual = parseInt(displayElement.innerText) || 0;

    if (operacao === 1) {
        carrinhoItens.push({ id, nome, preco: parseFloat(preco) });
        qtdAtual++;

        if (id === 'serv-montagem') {
            const temEntrega = carrinhoItens.some(item => item.id === 'serv-entrega');
            if (!temEntrega) {
                alert("O serviço de Montagem exige obrigatoriamente a contratação da Entrega! ✨");
                adicionarItem('serv-entrega', 'Entrega e Retirada', 30, 1);
            }
        }
    } else {
        const index = carrinhoItens.findIndex(item => item.id === id);
        if (index > -1) {
            carrinhoItens.splice(index, 1);
            qtdAtual--;
        }
    }

    displayElement.innerText = Math.max(0, qtdAtual);
    localStorage.setItem('carrinho_v2', JSON.stringify(carrinhoItens));
    atualizarTotalFlutuante();
}

function atualizarTotalFlutuante() {
    const total = carrinhoItens.reduce((sum, item) => sum + item.preco, 0);
    const widget = document.getElementById('total-flutuante');
    const elementoValor = document.getElementById('valor-total-fixo');

    if (elementoValor) {
        elementoValor.innerText = total.toFixed(2).replace('.', ',');
    }

    if (widget) {
        if (carrinhoItens.length > 0) {
            widget.classList.add('mostrar');
        } else {
            widget.classList.remove('mostrar');
        }
    }
}

window.limparCarrinho = function() {
    if (confirm("Deseja remover todos os itens do carrinho? ✨")) {
        localStorage.removeItem('carrinho_v2');
        carrinhoItens = [];
        const displays = document.querySelectorAll('[id^="qtd-display-"]');
        displays.forEach(display => display.innerText = "0");
        atualizarTotalFlutuante();
    }
}

/* ============================================================
   SINCRONIZAÇÃO E FIREBASE
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    atualizarTotalFlutuante();

    if (carrinhoItens.length > 0) {
        const contagem = carrinhoItens.reduce((acc, item) => {
            acc[item.id] = (acc[item.id] || 0) + 1;
            return acc;
        }, {});

        for (let id in contagem) {
            const display = document.getElementById(`qtd-display-${id}`);
            if (display) display.innerText = contagem[id];
        }
    }
    
    const temaSalvo = localStorage.getItem('tema_festa');
    const campoTema = document.getElementById('input-tema');
    if (temaSalvo && campoTema) campoTema.value = temaSalvo;
});

window.salvarCadastroInicial = function() {
    const nome = document.getElementById('input-nome').value;
    if (nome.trim() !== "") {
        localStorage.setItem('nome_cliente', nome);
        localStorage.setItem('email_cliente', document.getElementById('input-email').value);
        localStorage.setItem('telefone_cliente', document.getElementById('input-telefone').value);
        window.location.href = 'catalogo.html'; 
    } else {
        alert("Por favor, preencha seu nome! ✨");
    }
}

// SALVAR NO BANCO E WHATSAPP
window.salvarNoBancoEIrParaWhats = async function() {
    const data = localStorage.getItem('data_evento');
    const nome = localStorage.getItem('nome_cliente');

    if (!data || !nome) {
        alert("Erro: Dados do cliente ou data não encontrados!");
        return;
    }

    const dadosParaOAgendamento = {
        cliente: nome,
        data: data,
        tema: localStorage.getItem('tema_festa') || 'Não definido',
        status: 'pendente',
        detalhes: localStorage.getItem('obs_evento') || '',
        valorTotal: carrinhoItens.reduce((sum, item) => sum + item.preco, 0),
        valorSinal: 0,
        saldo: carrinhoItens.reduce((sum, item) => sum + item.preco, 0),
        criadoEm: new Date()
    };

    try {
        await addDoc(collection(db, "eventos"), dadosParaOAgendamento);
        console.log("Sucesso no banco!");
        // Aqui você chamaria sua função original de abrir o WhatsApp
    } catch (e) {
        console.error("Erro Firebase:", e);
    }
}

document.addEventListener('change', function(e) {
    if (e.target.id === 'data-evento') localStorage.setItem('data_evento', e.target.value);
    if (e.target.id === 'horario-evento') localStorage.setItem('horario_evento', e.target.value);
    if (e.target.id === 'obs-evento') localStorage.setItem('obs_evento', e.target.value);
    if (e.target.id === 'input-tema') localStorage.setItem('tema_festa', e.target.value);
});