import { db } from "./firebase-config.js"; 
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ============================================================
   1. VARIÁVEIS GERAIS
   ============================================================ */
const LAT_EMPRESA = -23.4833; 
const LON_EMPRESA = -46.3333; 

let totalProdutosReal = 0; 
let valorMontagemFixo = 0;  
let valorFreteFinal = 0;    

/* ============================================================
   2. INICIALIZAÇÃO
   ============================================================ */
window.addEventListener('DOMContentLoaded', () => {
    carregarDadosCliente();
    carregarResumoCompleto();
});

function carregarDadosCliente() {
    // Busca o telefone e já remove o sinal de "=" caso ele exista
    const telefoneBruto = localStorage.getItem('telefone_cliente') || "---";
    const telefoneLimpo = telefoneBruto.replace('=', ''); 

    const cliente = {
        nome: localStorage.getItem('nome_cliente') || "---",
        email: localStorage.getItem('email_cliente') || "---",
        tel: telefoneLimpo,
        tema: localStorage.getItem('tema_festa') || "---"
    };

    if(document.getElementById('exibir-nome-cliente')) document.getElementById('exibir-nome-cliente').innerText = cliente.nome;
    if(document.getElementById('exibir-email-cliente')) document.getElementById('exibir-email-cliente').innerText = cliente.email;
    if(document.getElementById('exibir-telefone-cliente')) document.getElementById('exibir-telefone-cliente').innerText = cliente.tel;
    if(document.getElementById('exibir-tema-festa')) document.getElementById('exibir-tema-festa').innerText = cliente.tema;
}

/* ============================================================
   3. CONSTRUÇÃO DA LISTA DE RESUMO
   ============================================================ */
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
        } 
        else if (nome.toLowerCase().includes("entrega") || nome.toLowerCase().includes("retirada")) {
            // Ignorado
        } 
        else {
            totalProdutosReal += precoTotalLinha;
            htmlProdutos += `
    <div class="info-linha">
        <span>${item.qtd}x ${nome}</span>
        <span>R$ ${precoTotalLinha.toFixed(2).replace('.', ',')}</span>
    </div>`;
        }
    }

    let htmlServicos = `
    <div class="info-linha servico-destaque">
        <span>✨ Serviço de Montagem</span>
        <span>R$ ${valorMontagemFixo.toFixed(2).replace('.', ',')}</span>
    </div>
    <div class="info-linha">
        <div style="display: flex; flex-direction: column;">
            <span>🚚 Entrega e Retirada</span>
            <small id="status-frete-detalhe" style="color: #888; font-size: 1.2rem;">(Aguardando CEP)</small>
        </div>
        <span id="resumo-frete">R$ 0,00</span>
    </div>
    
    <div id="bloco-total-resumo">
        <div class="total-geral-linha">
            <span>Total Geral:</span>
            <span>R$ <span id="resumo-total-geral">0,00</span></span>
        </div>
        
        <div class="box-sinal">
            <div class="textos">
                <strong>Sinal de Reserva (40%)</strong>
                <small><p>Valor para garantir a sua data ✨</small></p>
            </div>
            <div class="valor-destaque">
                <strong>R$ <span id="valor-sinal-reserva">0,00</span></strong>
            </div>
        </div>
    </div>
`;

    containerItens.innerHTML = htmlProdutos + `<hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">` + htmlServicos;
    atualizarFinanceiro();
}

/* ============================================================
   4. CÁLCULOS DE FRETE (CEP)
   ============================================================ */
window.buscarCEP = async function buscarCEP() {
    const cepInput = document.getElementById('cep-cliente').value.replace(/\D/g, '');
    const blocoEndereco = document.getElementById('sessao-endereco-completa');
    
    if (cepInput.length !== 8) return;

    try {
        const resVia = await fetch(`https://viacep.com.br/ws/${cepInput}/json/`);
        const dVia = await resVia.json();

        if (dVia.erro) {
            alert("CEP não encontrado.");
            return;
        }

        document.getElementById('rua-cliente').value = dVia.logradouro;
        document.getElementById('bairro-cliente').value = dVia.bairro;
        blocoEndereco.style.display = "block";

        const query = `${dVia.logradouro}, ${dVia.localidade}, Brazil`;
        const resMap = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const dMap = await resMap.json();

        if (dMap && dMap.length > 0) {
            const km = calcularDistancia(LAT_EMPRESA, LON_EMPRESA, parseFloat(dMap[0].lat), parseFloat(dMap[0].lon));
            document.getElementById('distancia-km').value = km.toFixed(1);
            recalcularFreteDinamico();
        }
    } catch (e) { console.error("Erro CEP:", e); }
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c) * 1.2; 
}

window.recalcularFreteDinamico = function() {
    const km = parseFloat(document.getElementById('distancia-km').value) || 0;
    const baseFrete = 30.00;
    const limiteBase = 2.5;
    const valorPorKmExtra = 3.00;
    
    if (km > 0) {
        if (km <= limiteBase) { 
            valorFreteFinal = baseFrete; 
        } else {
            const kmAdicional = km - limiteBase;
            valorFreteFinal = baseFrete + (kmAdicional * valorPorKmExtra);
        }
        document.getElementById('status-frete-detalhe').innerText = "(Calculado conforme distância)";
        document.getElementById('status-frete-detalhe').style.color = "green";
    } else {
        valorFreteFinal = 0;
        document.getElementById('status-frete-detalhe').innerText = "(Informe a quilometragem)";
        document.getElementById('status-frete-detalhe').style.color = "red";
    }
    atualizarFinanceiro();
}

/* ============================================================
   5. ATUALIZAÇÃO DO TOTAL
   ============================================================ */
function atualizarFinanceiro() {
    const subtotal = totalProdutosReal + valorMontagemFixo;
    const totalGeral = subtotal + valorFreteFinal;
    const valorSinal = totalGeral * 0.40;

    const elResumoFrete = document.getElementById('resumo-frete');
    if(elResumoFrete) elResumoFrete.innerText = `R$ ${valorFreteFinal.toFixed(2).replace('.', ',')}`;

    const camposTotal = ['resumo-total-geral', 'total-geral-final'];
    camposTotal.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerText = totalGeral.toFixed(2).replace('.', ',');
    });

    const elSinal = document.getElementById('valor-sinal-reserva');
    if(elSinal) elSinal.innerText = valorSinal.toFixed(2).replace('.', ',');

    const elFreteExibido = document.getElementById('valor-frete-exibido');
    if(elFreteExibido) elFreteExibido.innerText = valorFreteFinal.toFixed(2).replace('.', ',');
};

/* ============================================================
   6. ENVIO WHATSAPP + SALVAR NO CALENDÁRIO
   ============================================================ */
window.salvarEPontuar = async function salvarEPontuar() {
    const btn = document.querySelector('.btn-whatsapp');
    btn.innerHTML = "Processando... ✨";

    const data = document.getElementById('data-evento').value;
    const hora = document.getElementById('horario-evento').value;
    const totalTexto = document.getElementById('resumo-total-geral').innerText;
    
    // Pequeno ajuste na conversão para garantir que o Firebase aceite o número
    const totalNumerico = parseFloat(totalTexto.replace('.', '').replace(',', '.'));

    try {
        const novoPedido = {
            cliente: document.getElementById('exibir-nome-cliente').innerText,
            data: data, 
            tema: document.getElementById('exibir-tema-festa').innerText,
            status: 'pendente',
            valorTotal: totalNumerico,
            valorSinal: totalNumerico * 0.40,
            saldo: totalNumerico * 0.60,
            detalhes: `Horário: ${hora} | Itens: ${document.getElementById('produtos-check-list').innerText}`,
            criadoEm: new Date()
        };

        // Salva no banco de dados
        await addDoc(collection(db, "eventos"), novoPedido);
        console.log("Pedido salvo com sucesso!");

        // Monta o texto do WhatsApp
        const textoZap = `*Novo Orçamento - Jess & Ster* ✨\n\n` +
                         `*Cliente:* ${document.getElementById('exibir-nome-cliente').innerText}\n` +
                         `*Telefone:* ${document.getElementById('exibir-telefone-cliente').innerText}\n` +
                         `*Tema:* ${document.getElementById('exibir-tema-festa').innerText}\n` +
                         `*Evento:* ${data} às ${hora}\n\n` +
                         `*Endereço:* ${document.getElementById('rua-cliente').value}, ${document.getElementById('numero-cliente').value}\n` +
                         `*Itens do Pedido:*\n${document.getElementById('produtos-check-list').innerText}\n\n` +
                         `*Total Geral:* R$ ${totalTexto}\n\n` +
                         `_Por favor, confirme a disponibilidade da data._`;

        const linkZap = `https://api.whatsapp.com/send?phone=5511940776821&text=${encodeURIComponent(textoZap)}`;
        
        // Abre o WhatsApp
        window.open(linkZap, '_blank');
        
        // EXIBE O MODAL (Aqui estava o problema se o script desse erro antes)
        if(document.getElementById('modal-sucesso')) {
            document.getElementById('modal-sucesso').style.display = 'flex';
        }

    } catch (error) {
        console.error("Erro ao salvar no Firebase:", error);
        alert("Erro ao processar pedido. Verifique a conexão.");
    } finally {
        btn.innerHTML = "Confirmar Pedido ✨";
    }
};