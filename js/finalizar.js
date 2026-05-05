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
    const cliente = {
        nome: localStorage.getItem('nome_cliente') || "---",
        email: localStorage.getItem('email_cliente') || "---",
        tel: localStorage.getItem('telefone_cliente') || "---",
        tema: localStorage.getItem('tema_festa') || "---"
    };

    if(document.getElementById('exibir-nome-cliente')) document.getElementById('exibir-nome-cliente').innerText = cliente.nome;
    if(document.getElementById('exibir-email-cliente')) document.getElementById('exibir-email-cliente').innerText = cliente.email;
    if(document.getElementById('exibir-telefone-cliente')) document.getElementById('exibir-telefone-cliente').innerText = cliente.tel;
    if(document.getElementById('exibir-tema-festa')) document.getElementById('exibir-tema-festa').innerText = cliente.tema;
}

/* ============================================================
   3. CONSTRUÇÃO DA LISTA DE RESUMO (CORRIGIDO)
   ============================================================ */
function carregarResumoCompleto() {
    const dadosCarrinho = localStorage.getItem('carrinho_v2');
    const itensBrutos = JSON.parse(dadosCarrinho) || [];
    const containerItens = document.getElementById('produtos-check-list');

    if (!containerItens) return;

    totalProdutosReal = 0;
    valorMontagemFixo = 0;
    let htmlProdutos = "";

    // Agrupar itens para evitar repetição
    const agrupado = itensBrutos.reduce((acc, item) => {
        if (!acc[item.nome]) acc[item.nome] = { preco: parseFloat(item.preco), qtd: 0 };
        acc[item.nome].qtd++;
        return acc;
    }, {});

    // 1. Processar Produtos e identificar Montagem
    for (let nome in agrupado) {
        const item = agrupado[nome];
        const precoTotalLinha = item.preco * item.qtd;

        if (nome.toLowerCase().includes("montagem")) {
            valorMontagemFixo += precoTotalLinha;
        } 
        else if (nome.toLowerCase().includes("entrega") || nome.toLowerCase().includes("retirada")) {
            // Ignorado conforme solicitado
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

    // 2. Definir Bloco de Serviços e Totais (Classes batendo com seu CSS)
    let htmlServicos = `
    <div class="info-linha servico-destaque">
        <span>✨ Serviço de Montagem</span>
        <span>R$ ${valorMontagemFixo.toFixed(2).replace('.', ',')}</span>
    </div>
    <div class="info-linha">
        <div style="display: flex; flex-direction: column;">
            <span>🚚 Entrega e Retirada</span>
            <small id="status-frete-detalhe" style="color: #888; font-size: 0.7rem;">(Aguardando CEP)</small>
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
                <small>Valor para garantir a sua data ✨</small>
            </div>
            <div class="valor-destaque">
                R$ <span id="valor-sinal-reserva">0,00</span>
            </div>
        </div>
    </div>
`;

    // Inserir tudo no container único
    containerItens.innerHTML = htmlProdutos + `<hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">` + htmlServicos;
    
    // Disparar cálculos financeiros
    atualizarFinanceiro();
}

/* ============================================================
   4. CÁLCULOS DE FRETE (CEP)
   ============================================================ */
async function buscarCEP() {
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

function recalcularFreteDinamico() {
    const km = parseFloat(document.getElementById('distancia-km').value) || 0;
    const baseFrete = 30.00;
    const limiteBase = 2.5;
    
    if (km > 0) {
        if (km <= limiteBase) { 
            valorFreteFinal = baseFrete; 
        } else {
            const blocosExtras = Math.ceil((km - limiteBase) / 2);
            valorFreteFinal = baseFrete + (blocosExtras * 6.00);
        }
        document.getElementById('status-frete-detalhe').innerText = "(Calculado conforme distância)";
        document.getElementById('status-frete-detalhe').style.color = "green";
    }

    atualizarFinanceiro();
}

/* ============================================================
   5. ATUALIZAÇÃO DO TOTAL (SINCRONIZADO)
   ============================================================ */
function atualizarFinanceiro() {
    const subtotal = totalProdutosReal + valorMontagemFixo;
    const totalGeral = subtotal + valorFreteFinal;
    const valorSinal = totalGeral * 0.40;

    // Atualiza o Frete na linha do resumo
    const elResumoFrete = document.getElementById('resumo-frete');
    if(elResumoFrete) elResumoFrete.innerText = `R$ ${valorFreteFinal.toFixed(2).replace('.', ',')}`;

    // Atualiza o Total Geral no Resumo e na Caixa Roxa (se existir)
    const camposTotal = ['resumo-total-geral', 'total-geral-final'];
    camposTotal.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerText = totalGeral.toFixed(2).replace('.', ',');
    });

    // Atualiza o Valor do Sinal (Box Rosa)
    const elSinal = document.getElementById('valor-sinal-reserva');
    if(elSinal) elSinal.innerText = valorSinal.toFixed(2).replace('.', ',');

    // Opcional: Atualiza o campo de frete escondido se necessário para o WhatsApp
    const elFreteExibido = document.getElementById('valor-frete-exibido');
    if(elFreteExibido) elFreteExibido.innerText = valorFreteFinal.toFixed(2).replace('.', ',');
}

/* ============================================================
   6. ENVIO WHATSAPP
   ============================================================ */
async function salvarEPontuar() {
    const btn = document.querySelector('.btn-whatsapp');
    
    const data = document.getElementById('data-evento').value;
    const hora = document.getElementById('horario-evento').value;
    const cep = document.getElementById('cep-cliente').value;
    const total = document.getElementById('total-geral-final').innerText;

    if (!data || !hora || !cep || total === "0,00") {
        alert("⚠️ Por favor, preencha a Data e o CEP para calcular o total.");
        return;
    }

    btn.innerHTML = "Enviando... ✨";
    
    const textoZap = `*Novo Orçamento - Jess & Ster* ✨\n\n` +
                     `*Cliente:* ${document.getElementById('exibir-nome-cliente').innerText}\n` +
                     `*Tema:* ${document.getElementById('exibir-tema-festa').innerText}\n` +
                     `*Evento:* ${data} às ${hora}\n\n` +
                     `*Endereço:* ${document.getElementById('rua-cliente').value}, ${document.getElementById('numero-cliente').value}\n` +
                     `*Total Geral:* R$ ${total}\n\n` +
                     `_Por favor, confirme a disponibilidade da data._`;

    const linkZap = `https://api.whatsapp.com/send?phone=5511940776821&text=${encodeURIComponent(textoZap)}`;
    
    window.open(linkZap, '_blank');
    document.getElementById('modal-sucesso').style.display = 'flex';
    btn.innerHTML = "Confirmar Pedido ✨";
}