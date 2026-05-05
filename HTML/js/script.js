/* ============================================================
   CARROSSEL ESTILO CARDS 3D - JESS & STER
   ============================================================ */
let slideIndex = 0;

function updateCarousel() {
    const slides = document.getElementsByClassName("mySlides");
    if (slides.length === 0) return;

    for (let i = 0; i < slides.length; i++) {
        slides[i].classList.remove("active", "prev-card", "next-card");
        slides[i].style.opacity = "0"; 
        slides[i].style.display = "block";
    }

    const current = slideIndex;
    const prev = (slideIndex === 0) ? slides.length - 1 : slideIndex - 1;
    const next = (slideIndex === slides.length - 1) ? 0 : slideIndex + 1;

    slides[current].classList.add("active");
    slides[current].style.opacity = "1";

    slides[prev].classList.add("prev-card");
    slides[prev].style.opacity = "0.6";

    slides[next].classList.add("next-card");
    slides[next].style.opacity = "0.6";
}

function plusSlides(n) {
    const slides = document.getElementsByClassName("mySlides");
    if (slides.length === 0) return;

    slideIndex += n;
    if (slideIndex >= slides.length) slideIndex = 0;
    if (slideIndex < 0) slideIndex = slides.length - 1;

    updateCarousel();
}

window.addEventListener('load', () => {
    const slides = document.getElementsByClassName("mySlides");
    if (slides.length > 0) {
        updateCarousel();
        setInterval(() => {
            plusSlides(1);
        }, 4000);
    }
});

/* ============================================================
   ESTADO GLOBAL E CARRINHO - JESS & STER ENCANTO DECOR
   ============================================================ */
let carrinhoItens = JSON.parse(localStorage.getItem('carrinho_v2')) || [];

function adicionarItem(id, nome, preco, operacao) {
    const displayElement = document.getElementById(`qtd-display-${id}`);
    if (!displayElement) return;

    let qtdAtual = parseInt(displayElement.innerText) || 0;

    if (operacao === 1) {
        carrinhoItens.push({ id, nome, preco: parseFloat(preco) });
        qtdAtual++;

        // REGRA DE OBRIGATORIEDADE: Montagem exige Entrega
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
        alert("Carrinho zerado!");
    }
}

window.salvarTema = function() {
    const campoTema = document.getElementById('input-tema');
    if (campoTema) {
        localStorage.setItem('tema_festa', campoTema.value);
    }
}

/* ============================================================
   SINCRONIZAÇÃO E CADASTRO
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
            if (display) {
                display.innerText = contagem[id];
            }
        }
    }
    
    const temaSalvo = localStorage.getItem('tema_festa');
    const campoTema = document.getElementById('input-tema');
    if (temaSalvo && campoTema) {
        campoTema.value = temaSalvo;
    }
});

function salvarCadastroInicial() {
    const nome = document.getElementById('input-nome').value;
    const email = document.getElementById('input-email').value;
    const telefone = document.getElementById('input-telefone').value;

    if (nome.trim() !== "") {
        localStorage.setItem('nome_cliente', nome);
        localStorage.setItem('email_cliente', email);
        localStorage.setItem('telefone_cliente', telefone);
        window.location.href = 'catalogo.html'; 
    } else {
        alert("Por favor, preencha seu nome para continuar! ✨");
    }
}

// Adicione estas linhas na sua função de capturar dados ou salvarCadastroInicial
window.salvarDetalhesEvento = function() {
    const data = document.getElementById('data-evento').value;
    const horario = document.getElementById('horario-evento').value;
    const obs = document.getElementById('obs-evento').value;

    localStorage.setItem('data_evento', data);
    localStorage.setItem('horario_evento', horario);
    localStorage.setItem('obs_evento', obs);
}

// Na sua função de enviar para o WhatsApp, lembre-se de puxar esses valores:
function gerarMensagemWhatsapp() {
    const data = localStorage.getItem('data_evento');
    const horario = localStorage.getItem('horario_evento');
    const obs = localStorage.getItem('obs_evento');
    const tema = localStorage.getItem('tema_festa'); // Do seu código atual

    let mensagem = `*Novo Pedido - Jess & Ster* \n`;
    mensagem += `*Tema:* ${tema} \n`;
    mensagem += `*Data:* ${data} \n`;
    mensagem += `*Horário:* ${horario} \n`;
    mensagem += `*Observações:* ${obs} \n`;
    
    // ... restante da lógica do carrinho ...
}

document.addEventListener('change', function(e) {
    if (e.target.id === 'data-evento') localStorage.setItem('data_evento', e.target.value);
    if (e.target.id === 'horario-evento') localStorage.setItem('horario_evento', e.target.value);
    if (e.target.id === 'obs-evento') localStorage.setItem('obs_evento', e.target.value);
});