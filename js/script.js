import { db } from './firebase-config.js'; 
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ============================================================
   ESTADO GLOBAL E CARRINHO - JESS & STER
   ============================================================ */
window.adicionarItem = function(id, nome, preco, mudanca) {
    let carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || {};

    // 1. Adiciona o item que foi clicado (ex: Montagem)
    if (!carrinho[id]) {
        carrinho[id] = { nome: nome, preco: preco, qtd: 0 };
    }
    carrinho[id].qtd += mudanca;

    /* ============================================================
       REGRA AUTOMÁTICA JESS & STER: MONTAGEM + FRETE
       ============================================================ */
    
    // Usando o ID exato do seu HTML: 'serv-entrega'
    const idDoFrete = 'serv-entrega'; 

    if (nome.toLowerCase().includes("montagem") && mudanca > 0) {
        // Se a montagem for adicionada e o frete ainda estiver em 0
        if (!carrinho[idDoFrete] || carrinho[idDoFrete].qtd === 0) {
            carrinho[idDoFrete] = { 
                nome: "Entrega e Retirada", 
                preco: 30.00, 
                qtd: 1 
            };

            // ATUALIZAÇÃO VISUAL: Faz o número "1" aparecer no campo do Frete
            const displayVisualFrete = document.getElementById(`qtd-display-${idDoFrete}`);
            if (displayVisualFrete) {
                displayVisualFrete.innerText = "1";
                displayVisualFrete.style.color = "#d1a017"; 
                displayVisualFrete.style.fontWeight = "bold";
            }
            
            alert("🚚 Frete adicionado automaticamente com a Montagem!");
        }
    }

    // 2. Atualização visual do item clicado (ex: Montagem)
    if (carrinho[id].qtd <= 0) {
        delete carrinho[id];
        const display = document.getElementById(`qtd-display-${id}`);
        if (display) display.innerText = 0;
    } else {
        const display = document.getElementById(`qtd-display-${id}`);
        if (display) display.innerText = carrinho[id].qtd;
    }

    // 3. Salva no sessionStorage para que o total considere todos os itens
    sessionStorage.setItem('carrinho', JSON.stringify(carrinho));
    
    // Sincroniza para a página de finalização (Firebase/WhatsApp)
    localStorage.setItem('carrinho_v2', JSON.stringify(Object.values(carrinho).flatMap(item => 
        Array(item.qtd).fill({nome: item.nome, preco: item.preco})
    )));

    // 4. ATUALIZA O VALOR TOTAL NA BARRA ROSA
    window.atualizarTotal();
};

// Nova função para ser usada dentro do catálogo
window.calcularFreteNoCatalogo = async function(cep) {
    try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (data.erro) {
            alert("CEP inválido!");
            return;
        }

        // Aqui você usaria a mesma lógica de KM que já criamos
        // Para simplificar no catálogo, você pode definir um valor base
        // ou importar a função calcularDistancia.
        alert(`✨ Frete calculado para ${data.bairro}! O valor será somado ao total.`);
        
        // Salva o frete no sessionStorage para o total considerar
        sessionStorage.setItem('frete_calculado', "30.00"); // Exemplo de valor base
    } catch (e) {
        console.error("Erro ao buscar CEP no catálogo", e);
    }
};

window.atualizarTotal = function() {
    let carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || {};
    let frete = parseFloat(sessionStorage.getItem('frete_calculado')) || 0;
    let total = frete; // Começa pelo frete se houver

    for (let item in carrinho) {
        total += carrinho[item].preco * carrinho[item].qtd;
    }

    const elementoTotal = document.getElementById('valor-total');
    if (elementoTotal) {
        elementoTotal.innerText = `Total: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
};

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

window.limparCarrinho = function() {
    if (confirm("Deseja realmente limpar seu pedido? ✨")) {
        sessionStorage.removeItem('carrinho');
        localStorage.removeItem('carrinho_v2');
        location.reload();
    }
};

window.salvarCadastroInicial = function() {
    const nome = document.getElementById('input-nome').value;
    if (nome && nome.trim() !== "") {
        localStorage.setItem('nome_cliente', nome);
        window.location.href = 'catalogo.html'; 
    } else {
        alert("Por favor, preencha seu nome! ✨");
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    let carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || {};
    for (let id in carrinho) {
        const display = document.getElementById(`qtd-display-${id}`);
        if (display) display.innerText = carrinho[id].qtd;
    }
    window.atualizarTotal();
});