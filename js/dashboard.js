import { db } from './firebase-config.js'; 
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- CONTROLE DOS MODAIS ---
const modalCadastro = document.getElementById('modalCadastro');
const modalGestao = document.getElementById('modalGestao');
const btnNovo = document.getElementById('btnNovoPedido'); 
const btnAbrirGestao = document.getElementById('btnAbrirGestao');
const spanCloseCadastro = document.getElementById('closeCadastro');
const spanCloseGestao = document.getElementById('closeGestao');
const form = document.getElementById('formCadastro');

// Abrir Cadastro
if(btnNovo) btnNovo.onclick = () => {
    form.reset();
    form.dataset.id = "";
    modalCadastro.style.display = "block";
};

// Abrir Gestão (CORREÇÃO: Só carrega a tabela aqui)
if(btnAbrirGestao) {
    btnAbrirGestao.onclick = () => {
        carregarTabela(); 
        modalGestao.style.display = "block";
    };
}

// Fechar Modais
if(spanCloseCadastro) spanCloseCadastro.onclick = () => modalCadastro.style.display = "none";
if(spanCloseGestao) spanCloseGestao.onclick = () => modalGestao.style.display = "none";

window.onclick = (event) => {
    if (event.target == modalGestao) modalGestao.style.display = "none";
    if (event.target == modalCadastro) modalCadastro.style.display = "none";
    if (event.target == document.getElementById('modalResumo')) {
        document.getElementById('modalResumo').style.display = "none";
    }
}

// --- 1. INICIALIZAÇÃO DO CALENDÁRIO ---
document.addEventListener('DOMContentLoaded', async function() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    try {
        const listaEventos = await carregarEventos();

        const calendarObj = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            height: 'auto', 
            handleWindowResize: true,
            windowResizeDelay: 100,
            expandRows: true,
            locale: 'pt-br',
            events: listaEventos,
            timeZone: 'UTC',
            eventClick: function(info) {
                abrirResumo(info.event);
            }
        });

        calendarObj.render();

        setTimeout(() => {
            calendarObj.updateSize();
        }, 300);
    } catch (erro) {
        console.error("Erro ao iniciar o calendário: ", erro);
    }
});
// --- 2. LÓGICA DE STATUS E CORES ---
function obterCorStatus(status) {
    switch (status) {
        case 'pago': return '#28a745';
        case 'sinal': return '#007bff';
        case 'pendente': return '#ff8c00';
        case 'cancelado': return '#dc3545';
        default: return '#ff69b4';
    }
}

function definirStatusTexto(status) {
    if (status === 'sinal') return '<span style="color: #007bff; font-weight:bold;">Sinal Pago</span>';
    if (status === 'pago') return '<span style="color: #28a745; font-weight:bold;">Total Pago</span>';
    if (status === 'cancelado') return '<span style="color: #dc3545; font-weight:bold;">Cancelado</span>';
    return '<span style="color: #ff8c00; font-weight:bold;">Pendente</span>';
}

// --- 3. BUSCAR EVENTOS (COM CORES POR STATUS) ---
async function carregarEventos() {
    const querySnapshot = await getDocs(collection(db, "eventos"));
    return querySnapshot.docs.map(doc => {
        const d = doc.data();
        
        // Pegamos a cor baseada no status usando a função que você já criou
        const corDoEvento = obterCorStatus(d.status);

        return {
            id: doc.id,
            title: d.cliente,
            start: d.data,
            // Adicionamos estas propriedades para o FullCalendar colorir o nome/barra
            color: corDoEvento, 
            display: 'block', // Garante que a cor preencha a barra do evento
            
            extendedProps: {
                cliente: d.cliente,
                telefone: d.telefone || "",
                cep: d.cep || "",
                rua: d.rua || "",
                numero: d.numero || "",
                bairro: d.bairro || "",
                tema: d.tema,
                data: d.data,
                valorTotal: d.valorTotal,
                valorSinal: d.valorSinal,
                detalhes: d.detalhes,
                status: d.status,
                kit: d.kit
            }
        };
    });
}

// --- 4. CARREGAR TABELA DENTRO DO MODAL ---
async function carregarTabela() {
    const corpoTabela = document.getElementById('corpoTabela');
    if (!corpoTabela) return;

    try {
        const querySnapshot = await getDocs(collection(db, "eventos"));
        corpoTabela.innerHTML = ""; 

        querySnapshot.forEach((documento) => {
            const dados = documento.data();
            const id = documento.id;

            corpoTabela.innerHTML += `
                <tr>
                    <td>${dados.cliente}</td>
                    <td>${dados.data ? new Date(dados.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'}</td>
                    <td>${definirStatusTexto(dados.status)}</td>
                    <td>
                        <button onclick="editarCliente('${id}')" style="cursor:pointer; background:none; border:none; font-size:1.2rem;">✏️</button>
                        <button onclick="cancelarPedido('${id}')" style="cursor:pointer; background:none; border:none; font-size:1.2rem;">❌</button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Erro ao carregar tabela:", e);
    }
}

// --- 5. SALVAR OU ATUALIZAR (COM JANELA BONITA) ---
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idExistente = form.dataset.id;

        // Mantendo a captura completa dos seus dados
        const dados = {
            cliente: document.getElementById('nomeCliente').value,
            telefone: document.getElementById('telefoneCliente').value,
            cep: document.getElementById('cepCliente').value,
            rua: document.getElementById('ruaCliente').value,
            numero: document.getElementById('numCliente').value,
            bairro: document.getElementById('bairroCliente').value,
            data: document.getElementById('dataEvento').value,
            tema: document.getElementById('temaEvento').value,
            kit: document.getElementById('itensPedido').value,
            status: document.getElementById('statusPedido').value,
            valorTotal: parseFloat(document.getElementById('valorTotal').value) || 0,
            valorSinal: parseFloat(document.getElementById('valorSinal').value) || 0,
            detalhes: document.getElementById('detalhesPedido').value
        };
        dados.saldo = dados.valorTotal - dados.valorSinal;

        try {
            if (idExistente) {
                await updateDoc(doc(db, "eventos", idExistente), dados);
                
                // Janela bonita de atualização
                Swal.fire({
                    icon: 'success',
                    title: 'Pedido Atualizado!',
                    text: 'As alterações foram salvas com sucesso.',
                    confirmButtonColor: '#ff69b4' // Rosa Encanto Decor
                }).then(() => {
                    location.reload();
                });

            } else {
                await addDoc(collection(db, "eventos"), { ...dados, criadoEm: new Date() });
                
                // Janela bonita de novo pedido
                Swal.fire({
                    icon: 'success',
                    title: '🎉 Pedido Lançado!',
                    text: 'O novo pedido já está na sua agenda.',
                    confirmButtonColor: '#ff69b4'
                }).then(() => {
                    location.reload();
                });
            }
        } catch (error) {
            console.error("Erro ao salvar:", error);
            
            // Janela de erro estilizada
            Swal.fire({
                icon: 'error',
                title: 'Ops!',
                text: 'Houve um problema ao salvar o pedido.',
                confirmButtonColor: '#dc3545'
            });
        }
    });
}

// --- 6. FUNÇÕES GLOBAIS (Edit e Delete) ---

// Função de Cancelar/Excluir atualizada com SweetAlert
window.cancelarPedido = async (id) => {
    const resultado = await Swal.fire({
        title: 'Tem certeza?',
        text: "Esta ação não pode ser desfeita!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff2d92', // Rosa da sua marca
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sim, remover!',
        cancelButtonText: 'Cancelar'
    });

    if (resultado.isConfirmed) {
        try {
            await deleteDoc(doc(db, "eventos", id));
            await Swal.fire({
                title: 'Removido!',
                text: 'O pedido foi excluído com sucesso.',
                icon: 'success',
                confirmButtonColor: '#ff2d92'
            });
            location.reload();
        } catch (e) {
            console.error("Erro ao excluir:", e);
            Swal.fire('Erro!', 'Não foi possível excluir o pedido.', 'error');
        }
    }
};

// Mantenha sua função de editar exatamente como estava:
window.editarCliente = async (id) => {
    try {
        const querySnapshot = await getDocs(collection(db, "eventos"));
        querySnapshot.forEach((documento) => {
            if(documento.id === id) {
                const dados = documento.data();
                
                // Preenchendo os campos do formulário
                document.getElementById('nomeCliente').value = dados.cliente || "";
                document.getElementById('telefoneCliente').value = dados.telefone || "";
                document.getElementById('dataEvento').value = dados.data || "";
                document.getElementById('temaEvento').value = dados.tema || "";
                document.getElementById('cepCliente').value = dados.cep || "";
                document.getElementById('ruaCliente').value = dados.rua || "";
                document.getElementById('numCliente').value = dados.numero || "";
                document.getElementById('bairroCliente').value = dados.bairro || "";
                document.getElementById('statusPedido').value = dados.status || "pendente";
                document.getElementById('itensPedido').value = dados.kit || "pegue e monte";
                document.getElementById('valorTotal').value = dados.valorTotal || 0;
                document.getElementById('valorSinal').value = dados.valorSinal || 0;
                document.getElementById('detalhesPedido').value = dados.detalhes || "";
                
                const formCadastro = document.getElementById('formCadastro');
                formCadastro.dataset.id = id; 
                
                // Fecha a lista e abre o formulário
                document.getElementById('modalGestao').style.display = "none";
                document.getElementById('modalCadastro').style.display = "block";
            }
        });
    } catch (e) {
        console.error("Erro ao buscar dados para edição:", e);
    }
};

// --- 7. MODAL DE RESUMO ATUALIZADO (COM BOTÃO EDITAR) ---
function abrirResumo(evento) {
    const props = evento.extendedProps;
    const idDoEvento = evento.id; // Pegamos o ID do evento para a edição
    const modalResumo = document.getElementById('modalResumo');
    const titulo = document.getElementById('resumoTitulo');
    const texto = document.getElementById('resumoTexto');

    if (modalResumo && titulo && texto) {
        titulo.innerText = `📋 Detalhes: ${props.cliente || 'Cliente'}`;
        
        const total = Number(props.valorTotal) || 0;
        const sinal = Number(props.valorSinal) || 0;
        const saldo = total - sinal;

        const endereco = props.rua 
            ? `${props.rua}, ${props.numero || 'S/N'} - ${props.bairro || ''}`
            : "Endereço não informado";

        texto.innerHTML = `
            <div style="text-align: left; padding: 10px; line-height: 1.6;">
                <p><strong>👤 Cliente:</strong> ${props.cliente}</p>
                <p><strong>📞 Telefone:</strong> ${props.telefone || 'Não informado'}</p>
                <p><strong>📍 Endereço:</strong> ${endereco}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">
                
                <p><strong>🎨 Tema:</strong> ${props.tema || 'Não definido'}</p>
                <p><strong>📅 Data:</strong> ${new Date(props.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                <p><strong>📦 Tipo:</strong> ${props.kit || 'Não informado'}</p>
                
                <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">
                <p><strong>💰 Total:</strong> R$ ${total.toFixed(2)}</p>
                <p><strong>📉 Saldo:</strong> 
                    <span style="color: ${saldo > 0 ? '#ff1493' : '#28a745'}; font-weight: bold;">
                        R$ ${saldo.toFixed(2)}
                    </span>
                </p>
                
                <p><strong>📍 Status:</strong> <span class="badge-status">${(props.status || 'pendente').toUpperCase()}</span></p>

                <div style="margin-top: 20px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                    
                    <button onclick="fecharResumoEAbrirEdicao('${idDoEvento}')" class="btn-secondary" style="background: #007bff; color: white; border: none;">
                        ✏️ Editar Pedido
                    </button>

                    <a href="https://wa.me/55${props.telefone?.replace(/\D/g, '')}" target="_blank" class="btn-primary" style="text-decoration: none; font-size: 0.8rem; background: #25D366; display: flex; align-items: center;">
                        💬 WhatsApp
                    </a>
                    
                    <button onclick="document.getElementById('modalResumo').style.display='none'" class="btn-secondary">Fechar</button>
                </div>
            </div>
        `;

        modalResumo.style.display = 'flex';
    }
}

// 7 Função auxiliar para fechar um modal e abrir o outro
window.fecharResumoEAbrirEdicao = (id) => {
    document.getElementById('modalResumo').style.display = 'none';
    window.editarCliente(id);
};
    // --- BUSCA CEP AUTOMÁTICA ---
const cepInput = document.getElementById('cepCliente');
if (cepInput) {
    cepInput.addEventListener('blur', function() {
        let cep = this.value.replace(/\D/g, '');
        if (cep.length === 8) {
            fetch(`https://viacep.com.br/ws/${cep}/json/`)
                .then(res => res.json())
                .then(dados => {
                    if (!dados.erro) {
                        document.getElementById('ruaCliente').value = dados.logradouro;
                        document.getElementById('bairroCliente').value = dados.bairro;
                        document.getElementById('numCliente').focus();
                    } else {
                        alert("CEP não encontrado.");
                    }
                });
        }
    });
}
