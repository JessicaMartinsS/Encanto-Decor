import { db } from "./firebase-config.js"; 
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const LAT_EMPRESA = -23.4833; 
const LON_EMPRESA = -46.3333; 

let totalProdutosReal = 0; 
let valorMontagemFixo = 0;  
let valorFreteFinal = 0;    

window.addEventListener('DOMContentLoaded', () => {
    carregarDadosCliente();
    carregarResumoCompleto();
});

function carregarDadosCliente() {
    const telefoneBruto = localStorage.getItem('telefone_cliente') || "---";
    const cliente = {
        nome: localStorage.getItem('nome_cliente') || "---",
        email: localStorage.getItem('email_cliente') || "---",
        tel: telefoneBruto.replace('=', ''),
        tema: localStorage.getItem('tema_festa') || "---"
    };
    if(document.getElementById('exibir-nome-cliente')) document.getElementById('exibir-nome-cliente').innerText = cliente.nome;
    if(document.getElementById('exibir-email-cliente')) document.getElementById('exibir-email-cliente').innerText = cliente.email;
    if(document.getElementById('exibir-telefone-cliente')) document.getElementById('exibir-telefone-cliente').innerText = cliente.tel;
    if(document.getElementById('exibir-tema-festa')) document.getElementById('exibir-tema-festa').innerText = cliente.tema;
}

function carregarResumoCompleto() {
    const dadosCarrinho = localStorage.getItem('carrinho_v2');
    const itensBrutos = JSON.parse(dadosCarrinho) || [];
    const containerItens = document.getElementById('produtos-check-list');
    if (!containerItens) return;

    totalProdutosReal = 0;
    valorMontagemFixo = 0;
    let htmlProdutos = "";

    const agrupado = itensBrutos.reduce((acc, item) => {
        if (!acc[item.nome]) acc[item.nome] = { preco: parseFloat(item.preco), qtd: 0 };
        acc[item.nome].qtd++;
        return acc;
    }, {});

    for (let nome in agrupado) {
        const item = agrupado[nome];
        const precoTotalLinha = item.preco * item.qtd;
        if (nome.toLowerCase().includes("mon")) {
            valorMontagemFixo += precoTotalLinha;
        } else {
            totalProdutosReal += precoTotalLinha;
            htmlProdutos += `<div class="info-linha"><span>${item.qtd}x ${nome}</span><span>R$ ${precoTotalLinha.toFixed(2).replace('.', ',')}</span></div>`;
        }
    }

    containerItens.innerHTML = htmlProdutos + `<hr> <div class="info-linha servico-destaque"><span>✨ Montagem</span><span>R$ ${valorMontagemFixo.toFixed(2).replace('.', ',')}</span></div><div class="info-linha"><div style="display: flex; flex-direction: column;"><span>🚚 Frete</span><small id="status-frete-detalhe">(Aguardando CEP)</small></div><span id="resumo-frete">R$ 0,00</span></div><div id="bloco-total-resumo"><div class="total-geral-linha"><span>Total:</span><span>R$ <span id="resumo-total-geral">0,00</span></span></div></div>`;
    atualizarFinanceiro();
}

window.buscarCEP = async function() {
    const cepInput = document.getElementById('cep-cliente').value.replace(/\D/g, '');
    if (cepInput.length !== 8) return;
    try {
        const resVia = await fetch(`https://viacep.com.br/ws/${cepInput}/json/`);
        const dVia = await resVia.json();
        if (dVia.erro) return alert("CEP não encontrado.");

        document.getElementById('rua-cliente').value = dVia.logradouro;
        document.getElementById('bairro-cliente').value = dVia.bairro;
        document.getElementById('sessao-endereco-completa').style.display = "block";

        const query = `${dVia.logradouro}, ${dVia.localidade}, Brazil`;
        const resMap = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const dMap = await resMap.json();
        if (dMap.length > 0) {
            const km = calcularDistancia(LAT_EMPRESA, LON_EMPRESA, parseFloat(dMap[0].lat), parseFloat(dMap[0].lon));
            document.getElementById('distancia-km').value = km.toFixed(1);
            recalcularFreteDinamico();
        }
    } catch (e) { console.error(e); }
};

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))) * 1.2; 
}

window.recalcularFreteDinamico = function() {
    const km = parseFloat(document.getElementById('distancia-km').value) || 0;
    
    if (km > 0) {
        if (km <= 2.5) {
            // Até 2.5km, paga apenas o fixo
            valorFreteFinal = 30;
        } else {
            // Acima de 2.5km, paga o fixo + o adicional de R$ 3,00 por cada KM extra
            valorFreteFinal = 30 + (km - 2.5) * 4;
        }
    } else {
        valorFreteFinal = 0;
    }

    atualizarFinanceiro();
};

function atualizarFinanceiro() {
    const subtotal = totalProdutosReal + valorMontagemFixo;
    const elStatusFrete = document.getElementById('status-frete-detalhe');
    const btnWhats = document.querySelector('.btn-whatsapp'); // Pega o botão de finalizar

    // REGRA: Se tem valor de montagem mas o frete ainda é zero
    if (valorMontagemFixo > 0 && valorFreteFinal <= 0) {
        if (elStatusFrete) {
            elStatusFrete.innerText = "⚠️ OBRIGATÓRIO PARA MONTAGEM";
            elStatusFrete.style.color = "red";
            elStatusFrete.style.fontWeight = "bold";
        }
        // Opcional: Deixar o botão de finalizar cinza para mostrar que está bloqueado
        if (btnWhats) {
            btnWhats.style.opacity = "0.5";
            btnWhats.title = "Calcule o frete para continuar";
        }
    } else if (valorFreteFinal > 0) {
        if (elStatusFrete) {
            elStatusFrete.innerText = "(Calculado com sucesso! ✨)";
            elStatusFrete.style.color = "green";
        }
        if (btnWhats) {
            btnWhats.style.opacity = "1";
        }
    }

    const totalGeral = subtotal + valorFreteFinal;
    const valorSinal = totalGeral * 0.40;

    // Atualiza os textos na tela
    if(document.getElementById('resumo-frete')) {
        document.getElementById('resumo-frete').innerText = `R$ ${valorFreteFinal.toFixed(2).replace('.', ',')}`;
    }

    const camposTotal = ['resumo-total-geral', 'total-geral-final'];
    camposTotal.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerText = totalGeral.toFixed(2).replace('.', ',');
    });

    const elSinal = document.getElementById('valor-sinal-reserva');
    if(elSinal) elSinal.innerText = valorSinal.toFixed(2).replace('.', ',');
}