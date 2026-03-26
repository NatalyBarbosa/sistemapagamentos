window.DISABLE_WHATSAPP_BOT = true; 
// Variáveis globais
let orders = [];
let highlightNewOrderId = null;
let highlightNewBoletoId = null;
let hasLoadedFullOrdersList = false; 
let hasLoadedBoletos = false;
let highlightEditedOrderId = null;
let hasLoadedCustomEntryData = false; 
let hasLoadedSalaries = false; 
let hasLoadedAllPaidOrdersForReports = false; 
let hasLoadedAllSalariesForReports = false; 
let hasLoadedDeposits = false; 
let fullOrdersList = []; 
let salaries = [];
let currentUser = null;
let authToken = null;
let currentOrderId = null;
let editingOrderId = null;
let editingSalaryId = null;
let lastActiveTabBeforeEdit = null;
let autoRefreshInterval = null;
let selectedRole = null;
let reportsData = [];
let allPaidOrdersForReports = []; 
let allSalariesForReports = []; 
let currentCashValue = 0; 
let deposits = []; 
let boletos = [];
let selectedSalaryIds = new Set();
let currentCustomEntryDataId = null; 
let paidOrdersProcessFilterSelection = [];
let selectedOrdersDiretoria = new Set(); 
let selectedOrdersFinanceiro = new Set();
let highlightPaidBoletoId = null;
let parcelCounter = 0;


// Define funções debounced globalmente para reutilização nos event listeners
const debouncedApplyAdvancedFilters = debounce(applyAdvancedFilters, 500); // 500ms de atraso
const debouncedApplyCustomEntryDataFilters = debounce(applyCustomEntryDataFilters, 500);
const debouncedApplyReportFilters = debounce(applyReportFilters, 500);
const debouncedApplySalaryFilters = debounce(applySalaryFilters, 500);
const debouncedApplyReports2Filters = debounce(applyReports2Filters, 500);
// Para boletos, usaremos addEventListener, então não precisamos de uma global para o HTML

// --- NOVAS VARIÁVEIS GLOBAIS PARA DADOS DE ENTRADA PERSONALIZADOS ---
let customEntryData = []; // Armazena todos os dados personalizados
let editingCustomEntryDataId = null; // Para edição

let customEntryDataCurrentFilters = {
    company: '',
    process: '',
    status: '', // Adicionado 'status' aqui
    dateStart: '',
    dateEnd: '',
    valueMin: '',
    valueMax: '',
    searchTerm: '', // Para processo ou empresa
    sortBy: 'entryDate_desc' // Default: mais recente primeiro
};

let customEntryDataCurrentPage = 1;
const CUSTOM_ENTRY_DATA_DEFAULT_ITEMS_PER_PAGE = 50;
let customEntryDataItemsPerPage = CUSTOM_ENTRY_DATA_DEFAULT_ITEMS_PER_PAGE;
let customEntryDataTotalPages = 1;
let customEntryDataTotalItemsInSystem = 0;
let customEntryDataShowAllItemsMode = false;

// --- NOVAS VARIÁVEIS GLOBAIS PARA PAGINAÇÃO ---
let currentPage = 1;
const DEFAULT_ITEMS_PER_PAGE = 50; // Valor padrão de itens por página
let itemsPerPage = DEFAULT_ITEMS_PER_PAGE; // Variável que pode ser alterada
let totalPages = 1;
let totalOrdersInSystem = 0; // Para guardar o total real de registros
let showAllOrdersMode = false; // Flag para indicar se estamos no modo "Mostrar Tudo"
let dashboardAllPaidItems = []; // Itens pagos (ordens, boletos, salários) unificados para o dashboard
let dashboardAllDeposits = []; // Todos os depósitos para o dashboard

// --- NOVAS VARIÁVEIS GLOBAIS PARA DADOS DE ENTRADA (Entry Data) ---
let entryDataCurrentFilters = {
    status: [], // Pendente, Aguardando Financeiro, Aguardando Pagamento
    priority: '',
    paymentType: '',
    direction: '',
    solicitant: '',
    process: '',
    searchTerm: '',
    valueMin: '',
    valueMax: '',
    dateStart: '',   // Data de Geração Inicial
    dateEnd: '',     // Data de Geração Final
    forecastDateStart: '', // Data de Previsão Inicial (embora para pendentes já seja uma data de geração/previsão, bom manter)
    forecastDateEnd: '',   // Data de Previsão Final
    sortBy: 'generationDate_desc' // Default: mais recente primeiro
};

let entryDataCurrentPage = 1;
const ENTRY_DATA_DEFAULT_ITEMS_PER_PAGE = 50; // Valor padrão de itens por página
let entryDataItemsPerPage = ENTRY_DATA_DEFAULT_ITEMS_PER_PAGE;
let entryDataTotalPages = 1;
let entryDataTotalItemsInSystem = 0; // Para guardar o total real de registros visíveis
let entryDataShowAllItemsMode = false; // Flag para indicar se estamos no modo "Mostrar Tudo"

// ... (fim das variáveis globais existentes) ...

// --- NOVAS VARIÁVEIS GLOBAIS PARA PAGINAÇÃO DE BOLETOS PENDENTES ---
let boletoCurrentPage = 1;
const BOLETO_DEFAULT_ITEMS_PER_PAGE = 50; // Valor padrão de itens por página
let boletoItemsPerPage = BOLETO_DEFAULT_ITEMS_PER_PAGE;
let boletoTotalPages = 1;
let boletoTotalPendingParcelsInSystem = 0; // Total real de parcelas pendentes no sistema
let boletoShowAllItemsMode = false; // Flag para indicar se estamos no modo "Mostrar Tudo"

// --- NOVAS VARIÁVEIS GLOBAIS PARA PAGINAÇÃO DE ORDENS PAGAS ---
let paidCurrentPage = 1;
const PAID_DEFAULT_ITEMS_PER_PAGE = 50; // Valor padrão de itens por página para ordens pagas
let paidItemsPerPage = PAID_DEFAULT_ITEMS_PER_PAGE;
let paidTotalPages = 1;
let paidTotalItemsInSystem = 0; // Para guardar o total real de registros de itens pagos
let paidShowAllItemsMode = false; // Flag para indicar se estamos no modo "Mostrar Tudo"

// Seleciona os elementos HTML
const boletoFileInput = document.getElementById('boletoFile');
const fornecedorInput = document.getElementById('fornecedor');
const dataVencimentoInput = document.getElementById('dataVencimento');
const valorTotalInput = document.getElementById('valorTotal');
const observacaoTextarea = document.getElementById('observacao');


// =======================================================
// NOVAS VARIÁVEIS E FUNÇÕES PARA O DASHBOARD DE DADOS DE SAÍDA
// =======================================================

// Variáveis globais para os filtros do Dashboard de Dados de Saída
let dashboardCurrentFilters = {
    processes: [],          // Array de processos selecionados (Lido dos checkboxes)
    companies: []           // Array de empresas selecionadas (Lido dos checkboxes)
};

// Dados completos para o dashboard (serão carregados do servidor)
let dashboardAllPaidOrders = [];
let dashboardAllSalaries = [];

// Adiciona um evento de mudança ao input de arquivo
boletoFileInput.addEventListener('change', async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    // Cria um objeto FormData para enviar o arquivo
    const formData = new FormData();
    formData.append('boleto', arquivo);

    try {
        // Envia o arquivo para a API
        const response = await fetch('/api/processar_boleto.php', {
            method: 'POST',
            body: formData
        });

        // Verifica se a resposta foi bem-sucedida
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        // Decodifica a resposta JSON
        const data = await response.json();

        // Preenche os campos do formulário com os dados extraídos
        fornecedorInput.value = data.fornecedor || '';
        dataVencimentoInput.value = data.data_vencimento || '';
        valorTotalInput.value = data.valor_total || '';
        observacaoTextarea.value = data.observacao || '';
    } catch (error) {
        console.error('Erro ao processar o boleto:', error);
    }
});

// Permissão para gerenciar Dados de Entrada Personalizados
function canManageCustomEntryData() {
    return currentUser && ['Geral', 'RH'].includes(currentUser.role);
} 
// --- FUNÇÃO GLOBAL showSystemMessage (PARA RESOLVER ReferenceError) ---
// Se você já tem uma implementação mais completa, certifique-se de que ela esteja no topo
function showSystemMessage(message, type = 'info', duration = 3000) {
    console.log(`[Notificação - ${type.toUpperCase()}] ${message}`); // Log básico para debug

    // Implementação visual básica de exemplo (adapte se tiver um sistema melhor)
    const notificationContainer = document.getElementById('system-message-container') || document.createElement('div');
    if (!document.getElementById('system-message-container')) {
        notificationContainer.id = 'system-message-container';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none; /* Permite clicar por trás */
        `;
        document.body.appendChild(notificationContainer);
    }

    const notification = document.createElement('div');
    notification.className = `system-message system-message-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        padding: 10px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        text-align: center;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
        background-color: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    notificationContainer.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '1';
    }, 50); // Pequeno delay para a transição

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.addEventListener('transitionend', () => notification.remove());
    }, duration);
}
// --- FIM showSystemMessage ---

const API_BASE_URL = 'https://ordemdepagamento.com/sistema/api';

// --- NOVAS FUNÇÕES PARA EDITAR 13º SALÁRIO NO MODAL DE EDIÇÃO ---

// Função para selecionar a parte do 13º salário no modal de edição
function selectEditThirteenthSalaryPart(salaryId, part) {
    const salary = salaries.find(s => s.id === salaryId);
    if (!salary) return;

    const editSalaryMonthDisplayInput = document.getElementById('editSalaryMonthDisplay');
    const editSalaryMonthBackendInput = document.getElementById('editSalaryMonthBackendValue');
    
    // Usa o ano do campo de input no modal de opções
    const yearInputElem = document.getElementById('editThirteenthYearInput');
    if (!yearInputElem || isNaN(parseInt(yearInputElem.value)) || String(parseInt(yearInputElem.value)).length !== 4) {
        showSystemMessage('Por favor, insira um ano válido com 4 dígitos.', 'error', 3000);
        return;
    }
    const selectedYear = parseInt(yearInputElem.value);

    let backendMonthFormat = '';
    let displayMonthFormat = '';

    if (part === '1') {
        backendMonthFormat = `${selectedYear}-13-P1`;
        displayMonthFormat = `13º ${selectedYear} - Parte 1`;
    } else if (part === '2') {
        backendMonthFormat = `${selectedYear}-13-P2`;
        displayMonthFormat = `13º ${selectedYear} - Parte 2`;
    }

    if (editSalaryMonthDisplayInput && editSalaryMonthBackendInput) {
        editSalaryMonthDisplayInput.type = 'text'; // Garante que seja texto
        editSalaryMonthDisplayInput.readOnly = true; // Garante que seja somente leitura
        editSalaryMonthDisplayInput.value = displayMonthFormat;
        editSalaryMonthBackendInput.value = backendMonthFormat;
        editSalaryMonthDisplayInput.style.backgroundColor = '#e9ecef';
        editSalaryMonthDisplayInput.title = `Mês definido automaticamente para ${displayMonthFormat}.`;
        editSalaryMonthDisplayInput.onclick = () => { openEditThirteenthSalaryOptions(salaryId); }; // Re-adiciona o onclick
    }
    document.getElementById('editThirteenthSalaryOptionsModal').remove();
    showSystemMessage(`13º Salário atualizado para ${displayMonthFormat}!`, 'success', 3000);
}

// Função para converter o mês de 13º salário para mês normal no modal de edição
function convertSalaryMonthToNormal(salaryId) {
    const salary = salaries.find(s => s.id === salaryId);
    if (!salary) return;

    const editSalaryMonthDisplayInput = document.getElementById('editSalaryMonthDisplay');
    const editSalaryMonthBackendInput = document.getElementById('editSalaryMonthBackendValue');

    if (editSalaryMonthDisplayInput && editSalaryMonthBackendInput) {
        editSalaryMonthDisplayInput.value = ''; // Limpa o valor
        editSalaryMonthDisplayInput.type = 'month'; // Reverte para seletor de mês
        editSalaryMonthDisplayInput.readOnly = false; // Torna editável
        editSalaryMonthDisplayInput.onclick = null; // Remove onclick
        editSalaryMonthDisplayInput.style.backgroundColor = '';
        editSalaryMonthDisplayInput.title = '';

        editSalaryMonthBackendInput.value = ''; // Limpa o valor do backend
        // Define o mês atual como padrão ao converter para normal
        const today = new Date();
        const currentMonthFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        editSalaryMonthDisplayInput.value = currentMonthFormatted;
        editSalaryMonthBackendInput.value = currentMonthFormatted;
    }
    document.getElementById('editThirteenthSalaryOptionsModal').remove();
    editingThirteenthSalaryYear = null; // Limpa o ano para o modal de edição
    showSystemMessage('Mês convertido para seleção normal!', 'info', 3000);
}
// --- FIM NOVAS FUNÇÕES PARA EDITAR 13º SALÁRIO NO MODAL DE EDIÇÃO ---

// Função para selecionar a parte do 13º salário no modal de edição
function selectEditThirteenthSalaryPart(salaryId, part) {
    const salary = salaries.find(s => s.id === salaryId);
    if (!salary) return;

    const editSalaryMonthDisplayInput = document.getElementById('editSalaryMonthDisplay');
    const editSalaryMonthBackendInput = document.getElementById('editSalaryMonthBackendValue');
    const currentYear = new Date().getFullYear(); // Assume o ano atual para o 13º salário

    let backendMonthFormat = '';
    let displayMonthFormat = '';

    if (part === '1') {
        backendMonthFormat = `${currentYear}-13-P1`;
        displayMonthFormat = `13º ${currentYear} - Parte 1`;
    } else if (part === '2') {
        backendMonthFormat = `${currentYear}-13-P2`;
        displayMonthFormat = `13º ${currentYear} - Parte 2`;
    }

    if (editSalaryMonthDisplayInput && editSalaryMonthBackendInput) {
        editSalaryMonthDisplayInput.value = displayMonthFormat;
        editSalaryMonthBackendInput.value = backendMonthFormat;
        editSalaryMonthDisplayInput.style.backgroundColor = '#e9ecef';
        editSalaryMonthDisplayInput.title = `Mês definido automaticamente para ${displayMonthFormat}.`;
    }
    document.getElementById('editThirteenthSalaryOptionsModal').remove();
    showSystemMessage(`13º Salário atualizado para ${displayMonthFormat}!`, 'success', 3000);
}

// Função para converter o mês de 13º salário para mês normal no modal de edição
function convertSalaryMonthToNormal(salaryId) {
    const salary = salaries.find(s => s.id === salaryId);
    if (!salary) return;

    const editSalaryMonthDisplayInput = document.getElementById('editSalaryMonthDisplay');
    const editSalaryMonthBackendInput = document.getElementById('editSalaryMonthBackendValue');

    if (editSalaryMonthDisplayInput && editSalaryMonthBackendInput) {
        editSalaryMonthDisplayInput.value = ''; // Limpa o valor
        editSalaryMonthDisplayInput.type = 'month'; // Reverte para seletor de mês
        editSalaryMonthDisplayInput.readOnly = false; // Torna editável
        editSalaryMonthDisplayInput.onclick = null; // Remove o onclick
        editSalaryMonthDisplayInput.style.backgroundColor = '';
        editSalaryMonthDisplayInput.title = '';

        editSalaryMonthBackendInput.value = ''; // Limpa o valor do backend
        // Define o mês atual como padrão ao converter para normal
        const today = new Date();
        const currentMonthFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        editSalaryMonthDisplayInput.value = currentMonthFormatted;
        editSalaryMonthBackendInput.value = currentMonthFormatted;
    }
    document.getElementById('editThirteenthSalaryOptionsModal').remove();
    showSystemMessage('Mês convertido para seleção normal!', 'info', 3000);
}


document.addEventListener('DOMContentLoaded', async function() {
    // `checkSavedSession()` agora é responsável por chamar `loadOrders()` e setar a aba inicial,
    // então não precisamos chamar `loadOrders()` diretamente aqui.
    await checkSavedSession(); 
    
    populateBoletoVendorsDatalist();

    // --- INÍCIO DO BLOCO DE LISTENERS DE LOGIN (MANTIDO) ---
    document.querySelectorAll('.login-icon').forEach(button => {
        button.addEventListener('click', function() {
            selectRole(this.dataset.role);
        });
    });

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) { loginBtn.addEventListener('click', login); }

    const backBtn = document.getElementById('backBtn');
    if (backBtn) { backBtn.addEventListener('click', clearSelection); }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) { logoutBtn.addEventListener('click', logout); }
    // --- FIM DO BLOCO DE LISTENERS DE LOGIN ---

    // Estes serão populados quando a aba 'add' ou 'orders' for ativada
    // populateFavoredNamesDatalist();
    // populateProcessesDatalist();
    // populateVendorsDatalist(); // Populado em loadBoletos()
    
    populateAutocompleteDatalist('fornecedorSugestoes', 'fornecedoresHistory');
    populateAutocompleteDatalist('favorecidoSugestoes', 'favorecidosHistory');
    
    // NOVO: Inicializa os dropdowns de mês no carregamento da página (para Salários)
    populateMonthSelect('salaryMonthSelect'); // Para o formulário de cadastro
    populateMonthSelect('salaryFilterMonthSelect'); // Para os filtros
    populateMonthSelect('salaryBackupMonthStartSelect'); // Para o gerenciamento (mês inicial)
    populateMonthSelect('salaryBackupMonthEndSelect'); // Para o gerenciamento (mês final)
    populateMonthSelect('bulkEditMonthSelect'); // Para o modal de edição em massa

    // NOVO: Define o ano atual como padrão nos campos de ano
    const currentYear = new Date().getFullYear();
    if (document.getElementById('salaryYearInput')) {
        document.getElementById('salaryYearInput').value = currentYear;
    }
    if (document.getElementById('salaryFilterYearInput')) {
        document.getElementById('salaryFilterYearInput').value = currentYear;
    }
    if (document.getElementById('salaryBackupYearStart')) {
        document.getElementById('salaryBackupYearStart').value = currentYear;
    }
    if (document.getElementById('salaryBackupYearEnd')) {
        document.getElementById('salaryBackupYearEnd').value = currentYear;
    }
    
    // Listener para o botão 'Pagar' nas tabelas (gerais, pendentes etc.)
    document.body.addEventListener('click', function(event) {
        const targetButton = event.target.closest('.pay-order-btn');
        if (targetButton) {
            event.preventDefault(); 
            event.stopPropagation(); 

            const orderId = targetButton.dataset.orderId;
            if (orderId) {
                console.log(`[DEBUG DELEGATION] Clique detectado em botão 'Pagar'. Order ID: ${orderId}`);
                openPaymentModal(orderId);
            } else {
                console.warn('⚠️ Botão Pagar clicado, mas sem data-order-id encontrado no elemento:', targetButton);
            }
        }
    });
    console.log('✅ Event Listener de delegação para botões "Pagar" da tabela anexado.');
    
    // Listener para o botão de registrar pagamento (dentro do modal)
    const registerPaymentBtn = document.getElementById('registerPaymentBtn');
    if (registerPaymentBtn) {
        registerPaymentBtn.addEventListener('click', function(event) {
            event.preventDefault(); 
            event.stopPropagation(); 
            registerPayment();       
        });
        console.log('✅ Event Listener para #registerPaymentBtn anexado com preventDefault e stopPropagation.');
    } else {
        console.warn('⚠️ Botão #registerPaymentBtn não encontrado ao carregar o DOM. O evento de clique não será anexado.');
    }
    
    // Listener para sugestões de Favorecido (debounce)
    const favoredNameInput = document.getElementById('favoredName');
    if (favoredNameInput) {
        favoredNameInput.addEventListener('input', debounce(async function(event) { 
            const favoredName = event.target.value.trim();
            if (favoredName.length >= 2) {
                await handleFavoredNameSuggestions(favoredName);
            } else {
                const processDatalist = document.getElementById('favoredProcessSuggestions');
                const paymentTypeSelect = document.getElementById('paymentType');
                const pixKeyTypeSelect = document.getElementById('pixKeyType');
                const pixKeyInput = document.getElementById('pixKey');

                if (processDatalist) processDatalist.innerHTML = '';
                if (paymentTypeSelect) paymentTypeSelect.value = '';
                if (pixKeyTypeSelect) pixKeyTypeSelect.value = '';
                if (pixKeyInput) pixKeyInput.value = '';
                
                showPaymentFields();
            }
        }, 500));
    }

    // Inicialização do WhatsApp (aguardando)
    const whatsappAllInitialized = await orchestrateWhatsAppInitialization();
    if (!whatsappAllInitialized) {
        console.warn('⚠️ [script.js] A inicialização completa do Bot WhatsApp falhou. Algumas funcionalidades podem estar indisponíveis.');
    }

    // Define data atual para campos de geração
    const getLocalYYYYMMDD = () => new Date().toLocaleDateString('en-CA'); 
    
    const generationDateField = document.getElementById('generationDate');
    if (generationDateField) { generationDateField.value = getLocalYYYYMMDD(); }

    const boletoGenerationDateField = document.getElementById('boletoGenerationDate');
    if (boletoGenerationDateField) { boletoGenerationDateField.value = getLocalYYYYMMDD(); }
    
    controlarVisibilidadeGerenciamentoSalarios(); 

    addParcelField(); // Parece ser para inicializar a primeira parcela no formulário de cadastro de boleto
    // =========================================================================
    // LÓGICA CONSOLIDADA PARA O PREVIEW DE ANEXO DE BOLETO E VALIDAÇÃO
    // =========================================================================
    const boletoFileInput = document.getElementById('boletoFileAttachment');
    const boletoFileNameSpan = document.getElementById('boletoFileName');
    const boletoFileSizeSpan = document.getElementById('boletoFileSize');
    const boletoFilePreview = document.getElementById('boletoFilePreview');
    const boletoFileErrorMsgSpan = document.getElementById('boletoFileErrorMsg');
    
    if (boletoFileInput && boletoFileNameSpan && boletoFileSizeSpan && boletoFilePreview && boletoFileErrorMsgSpan) {
        boletoFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            
            if (file) {
                // Reset visual inicial para permitir re-display do erro se validação falhar
                boletoFileErrorMsgSpan.style.display = 'none';
                boletoFileNameSpan.textContent = '';
                boletoFileSizeSpan.textContent = '';

                // Validar tipo de arquivo
                if (file.type !== 'application/pdf') {
                    showModernErrorNotification('Por favor, selecione apenas arquivos PDF!');
                    e.target.value = ''; // Limpa o input de arquivo
                    boletoFileErrorMsgSpan.style.display = 'block'; // Mostra o erro
                    boletoFilePreview.style.display = 'block'; // Garante que o preview está visível para o erro
                    clearParsedBoletoFields(); // Limpa campos se o tipo de arquivo estiver errado
                    return;
                }
                
                // Validar tamanho (10MB)
                const MAX_FILE_SIZE_MB = 10;
                if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                    showModernErrorNotification(`O arquivo deve ter no máximo ${MAX_FILE_SIZE_MB}MB!`);
                    e.target.value = '';
                    boletoFileErrorMsgSpan.style.display = 'block'; // Mostra o erro
                    boletoFilePreview.style.display = 'block'; // Garante que o preview está visível para o erro
                    clearParsedBoletoFields(); // Limpa campos se o tamanho estiver errado
                    return;
                }
                
                // Se tudo validou, mostra o nome, tamanho e esconde a mensagem de erro
                boletoFileNameSpan.textContent = file.name;
                boletoFileSizeSpan.textContent = `(${getFileSizeFromBase64(file.size)} MB)`; // Adapta para mostrar o tamanho real do arquivo
                boletoFileErrorMsgSpan.style.display = 'none'; // Esconde a mensagem de erro
                boletoFilePreview.style.display = 'block'; // Mostra o contêiner de preview

                // --- NOVA CHAMADA AQUI: PARA PARSEAR E PREENCHER ---
                //parseBoletoPDF(file);

            } else {
                // Se nenhum arquivo foi selecionado (ex: usuário cancelou a seleção)
                boletoFileNameSpan.textContent = '';
                boletoFileSizeSpan.textContent = '';
                boletoFileErrorMsgSpan.style.display = 'block'; // Mostra a mensagem de erro padrão
                boletoFilePreview.style.display = 'block'; // Manter preview visível para mostrar a mensagem de erro
                // --- Limpar campos se nenhum arquivo for selecionado ---
                clearParsedBoletoFields();
            }
        });
    } else {
        console.warn("DOMContentLoaded listener: Um ou mais elementos do preview de boleto não encontrados no DOM.");
    }
    // =========================================================================
    // FIM DA LÓGICA CONSOLIDADA PARA O PREVIEW DE ANEXO DE BOLETO E VALIDAÇÃO
    // =========================================================================

    // =========================================================================
    // LÓGICA CONSOLIDADA PARA O CAMPO DE VALOR E FORMATAÇÃO
    // =========================================================================
    const valorTotalInput = document.getElementById('valorTotal'); // Este ID parece não ser usado para boletos. Verifique se é relevante para alguma outra parte do sistema.
    if (valorTotalInput) {
        valorTotalInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
            if (value === '') {
                e.target.value = '';
                return;
            }
            value = (parseInt(value, 10) / 100).toFixed(2); // Divide por 100 para centavos e formata
            value = value.replace('.', ','); // Troca ponto por vírgula
            value = 'R$ ' + value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'); // Adiciona pontos de milhar
            e.target.value = value;
        });
    }
    // =========================================================================
    // FIM DA LÓGICA CONSOLIDADA PARA O CAMPO DE VALOR E FORMATAÇÃO
    // =========================================================================

    // =========================================================================
    // LÓGICA CONSOLIDADA PARA VALIDAÇÃO DE VALOR DE PAGAMENTO EM TEMPO REAL
    // =========================================================================
    const paymentAmountInput = document.getElementById('paymentAmount');
    if (paymentAmountInput) {
        paymentAmountInput.addEventListener('input', function() {
            const amount = parseFloat(this.value);
            const order = orders.find(o => o.id === currentOrderId);
            
            if (order && amount) {
                const totalPaid = order.payments ? order.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0) : 0;
                const remaining = parseFloat(order.paymentValue || 0) - totalPaid;
                
                if (amount > remaining) {
                    this.value = remaining.toFixed(2);
                    alert(`O valor máximo permitido é R$ ${remaining.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
                }
                
                const partialInfo = document.getElementById('partialPaymentInfo');
                if (amount < remaining && amount > 0) {
                    partialInfo.style.display = 'block';
                } else {
                    partialInfo.style.display = 'none';
                }
            }
        });
    }
    // =========================================================================
    // FIM DA LÓGICA CONSOLIDADA PARA VALIDAÇÃO DE VALOR DE PAGAMENTO EM TEMPO REAL
    // =========================================================================

    // =========================================================================
    // LÓGICA CONSOLIDADA PARA INICIALIZAÇÕES DE FILTROS E DROPDOWNS
    // =========================================================================
    updateFilterPresetsDropdown(); // Carregar presets salvos para Ordens Gerais
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.value = 'priority_date'; // Configurar ordenação padrão para Ordens Gerais
    }
    setupBoletoFilterListeners(); // Adicionar inicialização dos filtros de boletos
    if (typeof displayBoletos === 'function') { // Se já existe displayBoletos(), garantir que seja chamada
        displayBoletos();
    }
    // =========================================================================
    // FIM DA LÓGICA CONSOLIDADA PARA INICIALIZAÇÕES DE FILTROS E DROPDOWNS
    // =========================================================================
});

// NOVO: Converte "DD/MM/YYYY" para "YYYY-MM-DD" para inputs HTML type="date"
function convertDateDDMMYYYYtoYYYYMMDD(dateString) {
    if (!dateString || dateString.length !== 10) return '';
    const parts = dateString.split('/'); // parts = ["DD", "MM", "YYYY"]
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`; // Retorna "YYYY-MM-DD"
    }
    return '';
}

// NOVO: Converte "1.566,43" para 1566.43 (float) para inputs HTML type="number"
function convertCurrencyToFloat(currencyString) {
    if (!currencyString) return 0;
    // Remove separadores de milhar (ponto) e troca a vírgula por ponto decimal
    return parseFloat(currencyString.replace(/\./g, '').replace(',', '.'));
}

// NOVO: Função para limpar os campos preenchidos automaticamente
function clearParsedBoletoFields() {
    document.getElementById('boletoVendor').value = '';
    document.getElementById('boletoObservation').value = '';
    document.getElementById('singleParcelValue').value = '';
    document.getElementById('singleParcelDueDate').value = '';
    // Reseta para o modo de parcela única, caso tenha mudado
    document.getElementById('singleParcel').checked = true;
    document.getElementById('multipleParcels').checked = false;
    toggleParcelFields(); // Garante que os campos corretos estão visíveis
    // Limpa o container de múltiplas parcelas se houver
    const parcelasContainer = document.getElementById('parcelasContainer');
    if (parcelasContainer) parcelasContainer.innerHTML = '';
    parcelCounter = 0; // Reseta o contador global de parcelas
}

function exibirConferenciaBoletoPDF(data) {
    // Remove instância anterior se existir
    const existente = document.getElementById('modalConferenciaBoleto');
    if (existente) existente.remove();

    // Monta as linhas de parcelas a partir da estrutura real da API
    const parcelas = (data.parcels_extracted_from_pdf && data.parcels_extracted_from_pdf.length > 0)
        ? data.parcels_extracted_from_pdf
        : (data.valor_total > 0 && data.data_vencimento
            ? [{ value: data.valor_total, dueDate: data.data_vencimento }]
            : []);

    const totalParcelas = parcelas.length;

    const parcelasHtml = parcelas.length > 0
        ? parcelas.map((p, i) => {
            const valor = parseFloat(p.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            let vencimento = 'Não identificada';
            if (p.dueDate) {
                const d = criarDataLocal(p.dueDate);
                if (!isNaN(d.getTime())) vencimento = d.toLocaleDateString('pt-BR');
            }
            const isUnica = totalParcelas === 1;
            const labelParcela = isUnica ? 'Parcela única' : `Parcela ${i + 1} de ${totalParcelas}`;

            // Alerta visual se data não identificada
            const vencimentoHtml = vencimento === 'Não identificada'
                ? `<span style="color:#c0392b; font-weight:600;">Não identificada — verifique</span>`
                : `<span style="color:#1a1a1a;">${vencimento}</span>`;

            return `
                <tr style="border-bottom: 1px solid #e8e8e8;">
                    <td style="padding: 9px 12px; font-size: 13px; color: #555;">${labelParcela}</td>
                    <td style="padding: 9px 12px; font-size: 14px; font-weight: 700; color: #1a6b1a;">
                        R$ ${valor}
                    </td>
                    <td style="padding: 9px 12px; font-size: 13px;">${vencimentoHtml}</td>
                </tr>
            `;
        }).join('')
        : `<tr><td colspan="3" style="padding:12px; text-align:center; color:#c0392b; font-style:italic;">
            Nenhuma parcela identificada — preencha manualmente
           </td></tr>`;

    const fornecedorHtml = data.fornecedor
        ? `<span style="font-size:16px; font-weight:700; color:#1a1a1a;">${escapeForHTML(data.fornecedor)}</span>`
        : `<span style="font-size:14px; color:#c0392b; font-style:italic;">Não identificado — preencha manualmente</span>`;

    const modal = document.createElement('div');
    modal.id = 'modalConferenciaBoleto';
    modal.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.55);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s ease;
    `;

    modal.innerHTML = `
        <div style="
            background: #fff;
            border-radius: 10px;
            width: 100%;
            max-width: 520px;
            margin: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.22);
            overflow: hidden;
            animation: slideUp 0.25s ease;
        ">
            <!-- Cabeçalho -->
            <div style="
                background: #f5c518;
                padding: 16px 20px;
                display: flex;
                align-items: center;
                gap: 10px;
                border-bottom: 2px solid #e0a800;
            ">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7a5c00" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <strong style="font-size:15px; color:#7a5c00; letter-spacing:0.2px;">
                    Confira os dados extraídos do boleto
                </strong>
            </div>

            <!-- Corpo -->
            <div style="padding: 20px 22px;">

                <!-- Fornecedor -->
                <div style="
                    margin-bottom: 18px;
                    padding: 12px 14px;
                    background: #f9f9f9;
                    border-radius: 7px;
                    border-left: 4px solid #ccc;
                ">
                    <div style="font-size:11px; text-transform:uppercase; color:#888; letter-spacing:0.8px; margin-bottom:5px;">
                        Fornecedor
                    </div>
                    ${fornecedorHtml}
                </div>

                <!-- Tabela de Parcelas -->
                <div style="margin-bottom: 6px; font-size:11px; text-transform:uppercase; color:#888; letter-spacing:0.8px;">
                    Parcelas e Vencimentos
                </div>
                <table style="
                    width: 100%;
                    border-collapse: collapse;
                    border: 1px solid #e0e0e0;
                    border-radius: 7px;
                    overflow: hidden;
                    margin-bottom: 16px;
                ">
                    <thead>
                        <tr style="background: #f0f0f0;">
                            <th style="padding:8px 12px; text-align:left; font-size:12px; color:#555; font-weight:600;">Parcela</th>
                            <th style="padding:8px 12px; text-align:left; font-size:12px; color:#555; font-weight:600;">Valor</th>
                            <th style="padding:8px 12px; text-align:left; font-size:12px; color:#555; font-weight:600;">Vencimento</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${parcelasHtml}
                    </tbody>
                </table>

                <!-- Instrução -->
                <div style="
                    font-size: 12.5px;
                    color: #777;
                    line-height: 1.5;
                    margin-bottom: 18px;
                ">
                    Os campos do formulário foram preenchidos automaticamente com base no PDF.
                    Verifique e corrija as informações acima antes de salvar.
                </div>

                <!-- Botão -->
                <div style="text-align: right;">
                    <button
                        onclick="document.getElementById('modalConferenciaBoleto').remove()"
                        style="
                            padding: 9px 28px;
                            background: #f5c518;
                            border: none;
                            border-radius: 6px;
                            font-weight: 700;
                            font-size: 14px;
                            cursor: pointer;
                            color: #333;
                            letter-spacing: 0.2px;
                            transition: background 0.15s;
                        "
                        onmouseover="this.style.background='#e0a800'"
                        onmouseout="this.style.background='#f5c518'"
                    >
                        Entendido, continuar
                    </button>
                </div>
            </div>
        </div>
    `;

    // Fechar ao clicar fora do card
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
}
/*
async function parseBoletoPDF(file) {
    const boletoVendorInput = document.getElementById('boletoVendor');
    const boletoObservationTextarea = document.getElementById('boletoObservation');
    const singleParcelRadio = document.getElementById('singleParcel');
    const multipleParcelsRadio = document.getElementById('multipleParcels');
    const singleParcelValueInput = document.getElementById('singleParcelValue');
    const singleParcelDueDateInput = document.getElementById('singleParcelDueDate');
    const boletoFileErrorMsgSpan = document.getElementById('boletoFileErrorMsg');
    const linhaDigitavelInput = document.getElementById('linhaDigitavel');

    if (!boletoVendorInput || !boletoObservationTextarea || !singleParcelRadio || !multipleParcelsRadio || !singleParcelValueInput || !singleParcelDueDateInput || !boletoFileErrorMsgSpan || !linhaDigitavelInput) {
        console.error('Um ou mais elementos do formulário de boleto para preenchimento automático não foram encontrados. Verifique os IDs.');
        showModernErrorNotification('Erro interno: Formulário de boleto incompleto para leitura automática. Contate o suporte.');
        return;
    }

    boletoFileErrorMsgSpan.style.display = 'none';
    showLoadingOverlay();

    const formData = new FormData();
    formData.append('boleto', file);

    try {
        const response = await fetch('api/processar_boleto.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('A API retornou uma resposta que não é JSON válido');
        }

        const data = await response.json();

        if (!data.success) {
            showModernErrorNotification('Boleto anexado, mas não foi possível realizar a leitura. Preencha os campos manualmente.');
            boletoFileErrorMsgSpan.textContent = 'Boleto anexado, mas não foi possível realizar a leitura. Preencha os campos manualmente.';
            boletoFileErrorMsgSpan.style.display = 'block';
            clearParsedBoletoFields();
            return;
        }

        boletoVendorInput.value = data.fornecedor || '';
        boletoObservationTextarea.value = data.observacao || '';
        linhaDigitavelInput.value = data.linha_digitavel || '';
        exibirConferenciaBoletoPDF(data);

        if (data.parcels_extracted_from_pdf && data.parcels_extracted_from_pdf.length > 1) {
            multipleParcelsRadio.checked = true;
            toggleParcelFields();
            const parcelasContainer = document.getElementById('parcelasContainer');
            if (parcelasContainer) parcelasContainer.innerHTML = '';
            parcelCounter = 0;
            data.parcels_extracted_from_pdf.forEach(parcel => {
                addParcelField(parcel.value, parcel.dueDate);
            });
            exibirConferenciaBoletoPDF(data);
        } else if (data.valor_total > 0 && data.data_vencimento) {
            singleParcelRadio.checked = true;
            toggleParcelFields();
            singleParcelValueInput.value = data.valor_total.toFixed(2);
            singleParcelDueDateInput.value = data.data_vencimento;
            exibirConferenciaBoletoPDF(data);
        } else {
            singleParcelRadio.checked = true;
            toggleParcelFields();
            showModernInfoNotification('Boleto lido, mas não foi possível extrair dados de parcela automaticamente. Por favor, preencha manualmente.');
        }

    } catch (error) {
        console.error('Erro ao processar boleto PDF via API:', error);
        showModernErrorNotification('Boleto anexado, mas não foi possível realizar a leitura. Preencha os campos manualmente.');
        boletoFileErrorMsgSpan.textContent = 'Boleto anexado, mas não foi possível realizar a leitura. Preencha os campos manualmente.';
        boletoFileErrorMsgSpan.style.display = 'block';
        clearParsedBoletoFields();
    } finally {
        hideLoadingOverlay();
    }
}
*/

function populatePaidCompanyFilter() {
    const select = document.getElementById('paidFilterCompany');
    if (!select) {
        console.warn('populatePaidCompanyFilter: Elemento paidFilterCompany não encontrado.');
        return;
    }
    
    // Limpar opções existentes (exceto a primeira "Todas as Empresas")
    while (select.options.length > 1) {
        select.remove(1);
    }

    const uniqueCompanies = new Set();
    // Adiciona empresas fixas (se houver e forem relevantes para este filtro)
    // Se estas empresas são sempre as mesmas ou se devem vir de uma fonte de dados, ajuste.
    // Pela imagem, a coluna "Empresa" aparece com valores como "IF PAULISTANA", "IF SÃO JOÃO DO PIAUÍ".
    // Certifique-se de que a lista fixa reflete as empresas reais do seu sistema.
    const fixedCompanies = ["Facilita Serviços", "T Santana", "Maia Silva", "DDSJ"]; // Exemplos
    fixedCompanies.forEach(company => uniqueCompanies.add(company.trim())); // Adiciona e remove espaços extras

    // 1. Coleta empresas de Ordens Pagas
    if (typeof fullOrdersList !== 'undefined' && fullOrdersList && Array.isArray(fullOrdersList)) {
        fullOrdersList.filter(order => order.status === 'Paga' && order.company)
                           .forEach(order => uniqueCompanies.add(order.company.trim()));
    } else {
        console.warn('populatePaidCompanyFilter: Array global "fullOrdersList" não está disponível ou é inválido para coletar empresas.');
    }

    // 2. Coleta empresas de Boletos Pagos (se boletos tiverem um campo 'company' válido e com parcelas pagas)
    // A propriedade `boleto.company` pode não existir em todos os objetos de boleto do seu backend.
    // Se o `boleto` não tiver um `company`, ele será ignorado aqui.
    if (typeof boletos !== 'undefined' && boletos && Array.isArray(boletos)) {
        boletos.forEach(boleto => {
            // Verifica se o boleto tem um campo 'company' válido, se ele não é 'N/A' e se possui parcelas pagas
            if (boleto.company && typeof boleto.company === 'string' && boleto.company.trim() !== '' && boleto.company.trim().toUpperCase() !== 'N/A' && boleto.parcels?.some(p => p.isPaid)) {
                uniqueCompanies.add(boleto.company.trim());
            }
        });
    }

    // Converter o Set para Array, ordenar alfabeticamente e adicionar ao select
    const sortedCompanies = Array.from(uniqueCompanies).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    sortedCompanies.forEach(company => {
        if (company) { // Garante que não adiciona opções vazias se .trim() resultou em string vazia
            const option = document.createElement('option');
            option.value = company;
            option.textContent = company;
            select.appendChild(option);
        }
    });
}

function clearExampleData() {
    // Limpar dados de exemplo de salários
    const currentSalaries = JSON.parse(localStorage.getItem('salaries') || '[]');
    const filteredSalaries = currentSalaries.filter(salary => 
        !['Pedro Silva', 'Pedro Gomes', 'Juliana Lima'].includes(salary.favoredName)
    );
    
    localStorage.setItem('salaries', JSON.stringify(filteredSalaries));
    salaries = filteredSalaries;
    
    // Limpar dados de exemplo de ordens também
    const currentOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const filteredOrders = currentOrders.filter(order =>
        !['João Silva', 'Maria Santos'].includes(order.favoredName)
    );
    
    localStorage.setItem('orders', JSON.stringify(filteredOrders));
    orders = filteredOrders;
    allOrders = filteredOrders;
    
    // Atualizar as telas após limpeza
    if (typeof displaySalaries === 'function') displaySalaries();
    if (typeof displayOrders === 'function') displayOrders();
}


// NOVA FUNÇÃO: Para popular selects de ano (ex: para filtros de salário)
function populateYearSelect(selectElementId) {
    const select = document.getElementById(selectElementId);
    if (!select) {
        console.warn(`populateYearSelect: Elemento '${selectElementId}' não encontrado.`);
        return;
    }
    const currentYear = new Date().getFullYear();
    const startYear = 2020; // Ano inicial a partir do qual você quer mostrar
    
    // Limpa opções existentes, mantendo a primeira se for "Todos" ou similar
    while (select.options.length > (select.options[0]?.value === '' ? 1 : 0)) {
        select.remove(select.options.length - 1);
    }

    for (let year = currentYear + 1; year >= startYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        select.appendChild(option);
    }
}

function selectRole(role) {
    selectedRole = role;
    
    document.querySelectorAll('.login-icon').forEach(icon => {
        icon.classList.remove('selected');
    });
    
    const selectedIcon = document.querySelector(`[data-role="${role}"]`);
    if (selectedIcon) {
        selectedIcon.classList.add('selected');
    }
    
    const selectedRoleSpan = document.getElementById('selectedRole');
    if (selectedRoleSpan) {
        selectedRoleSpan.textContent = role;
    }
    
    const passwordSection = document.getElementById('passwordSection');
    if (passwordSection) {
        passwordSection.classList.add('show'); // 'show' pode ter CSS para animação, mas 'display: block' é o que torna visível
        passwordSection.style.display = 'block'; // <<< ESSENCIAL: Torna a seção de senha visível
    }
    // >> A CHAVE DE FECHAMENTO ANTERIOR FOI REMOVIDA DAQUI <<
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.value = '';
        setTimeout(() => passwordInput.focus(), 100);
    }
} // <<<<<< A CHAVE DE FECHAMENTO CORRETA ESTÁ AQUI AGORA
function clearSelection() {
    selectedRole = null;
    
    document.querySelectorAll('.login-icon').forEach(icon => {
        icon.classList.remove('selected');
    });
    
    const passwordSection = document.getElementById('passwordSection');
    if (passwordSection) {
        passwordSection.classList.remove('show');
        passwordSection.style.display = 'none';
    }
    
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.value = '';
    }
}
// =======================================================
// FUNÇÃO GLOBAL DE ORQUESTRAÇÃO DO WHATSAPP (Mova para o escopo global do script.js)
// =======================================================
async function orchestrateWhatsAppInitialization() {
    try {
        if (typeof window.whatsAppIntegration !== 'undefined' && typeof window.whatsAppIntegration.initialize === 'function') {
            await window.whatsAppIntegration.initialize();
        } else {
            console.warn('⚠️ [script.js] WhatsApp Integration base não encontrado ou não inicializável.');
        }

        const scheduler = await waitForWhatsAppScheduler();
        if (scheduler) {
             console.log('✅ [script.js] WhatsAppScheduler encontrado e inicializado.');
        } else {
            console.warn('⚠️ [script.js] WhatsAppScheduler não foi encontrado após tentativas.');
        }

        if (typeof window.WhatsAppBot !== 'undefined' && typeof window.WhatsAppBot === 'function') {
            window.whatsappBot = new window.WhatsAppBot();
            await window.whatsappBot.initialize();
            console.log('✅ [script.js] WhatsAppBot core inicializado.');
        } else {
            console.warn('⚠️ [script.js] WhatsAppBot core (classe) não encontrado. Notificações do bot podem não funcionar.');
        }

        if (typeof window.whatsappBotIntegration !== 'undefined' && typeof window.whatsappBotIntegration.initialize === 'function') {
            await window.whatsappBotIntegration.initialize();
            console.log('✅ [script.js] WhatsAppBotIntegration inicializado.');
        } else {
            console.warn('⚠️ [script.js] WhatsAppBotIntegration (instância) não encontrado. Notificações do bot podem não funcionar.');
        }
        return true;

    } catch (error) {
        console.error('❌ [script.js] Erro na orquestração WhatsApp:', error);
        return false;
    }
}

// ... (certifique-se que waitForWhatsAppScheduler está definida logo abaixo dela ou acima) ...
async function waitForWhatsAppScheduler(maxAttempts = 10, delayMs = 500) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (typeof window.whatsappScheduler !== 'undefined') {
            if (typeof window.whatsappScheduler.initialize === 'function' && !window.whatsappScheduler.isInitialized) {
                try {
                    await window.whatsappScheduler.initialize();
                } catch (error) {
                    console.warn('⚠️ [script.js] Erro na inicialização do WhatsAppScheduler:', error);
                }
            }
            return window.whatsappScheduler;
        }
        
        if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    
    console.warn('⚠️ [script.js] WhatsAppScheduler não foi encontrado após todas as tentativas.');
    return null;
}
// =======================================================
// FUNÇÕES DE LOGIN (SUBSTITUA A SUA VERSÃO ATUAL)
// =======================================================
async function login() {
    if (!selectedRole) {
        alert('Por favor, selecione um perfil de acesso.');
        return;
    }

    const passwordInput = document.getElementById('password');
    const password = passwordInput.value.trim();
    
    if (!password) {
        alert('Por favor, digite a senha.');
        passwordInput.focus();
        return;
    }

    const passwords = {
        'Geral': '123', 'Diretoria': 'd123', 'Financeiro': 'f123',
        'Pagador': 'p123', 'Comum': 'c123', 'RH': 'r123'
    };

    if (passwords[selectedRole] !== password) {
        alert('Senha incorreta!');
        passwordInput.value = '';
        passwordInput.focus();
        return;
    }

    authToken = btoa(selectedRole + ':' + Date.now());
    currentUser = { username: selectedRole, role: selectedRole };

    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('passwordSection').style.display = 'none';

    updateUserInterface();
    updatePermissionChecks();
    
    // REMOVIDO: await loadFullOrdersList(); // Não carrega TUDO no login
    // REMOVIDO: await loadSalaries();       // Carregado sob demanda
    // REMOVIDO: await loadBoletos();        // Carregado sob demanda
    
    // Carrega apenas o valor de caixa e a primeira página de ordens
    await loadCashValueFromDB(); 
    await loadOrders(); // Carrega apenas a primeira página de ordens
    updateUIComponentsAfterLoad(); // Redesenha a UI com os dados paginados

    startAutoRefresh();

    alert(`Login realizado com sucesso! Bem-vindo ao perfil ${selectedRole}`);
    showTab('orders', null); 
}

// APROX. LINHA 2244: function logout() {
function logout() {
    console.warn('🔴 [DEBUG - LOGOUT] FUNÇÃO LOGOUT CHAMADA!');
    console.warn('🔴 [DEBUG - LOGOUT] Stack Trace:', new Error().stack); // ADICIONADO PARA DEBUG
    stopAutoRefresh();
    authToken = null;
    currentUser = null;
    selectedRole = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('passwordSection').style.display = 'none';
    
    clearSelection();
}

// APROX. LINHA 2270: async function checkSavedSession() {
async function checkSavedSession() {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    const loginSection = document.getElementById('loginSection');
    const mainContent = document.getElementById('mainContent');
    const passwordSection = document.getElementById('passwordSection');

    if (passwordSection) passwordSection.style.display = 'none';

    // Carregar apenas o valor de caixa, que é rápido e necessário para a dashboard
    await loadCashValueFromDB(); 

    if (savedToken && savedUser) {
        try {
            authToken = savedToken;
            currentUser = JSON.parse(savedUser);
            selectedRole = currentUser.role;
            
            if (loginSection) loginSection.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';
            if (passwordSection) passwordSection.style.display = 'none';
            
            updateUserInterface();
            updatePermissionChecks();
            
            // Inicia o auto-refresh, que já atualiza contadores
            startAutoRefresh();

            await loadOrders(); // Carrega apenas a primeira página de ordens
            updateUIComponentsAfterLoad(); // Renderiza a UI com os dados paginados

        } catch (error) {
            console.error('❌ [DEBUG - checkSavedSession] Erro ao restaurar sessão (JSON.parse ou similar):', error);
            logout(); 
        }
    } else {
        if (loginSection) loginSection.style.display = 'block';
        if (mainContent) mainContent.style.display = 'none';
        if (passwordSection) passwordSection.style.display = 'none';
        clearExampleData(); 
    }
}
// ===== SISTEMA DE FILTROS E ORDENAÇÃO AVANÇADOS =====

// Variáveis globais para filtros
let currentFilters = {
    status: [],
    priority: '',
    paymentType: '',
    direction: '',
    solicitant: '',
    company: '',
    process: '',
    searchTerm: '',
    valueMin: '',
    valueMax: '',
    dateStart: '', // Data de Geração Inicial
    dateEnd: '',   // Data de Geração Final
    forecastDateStart: '', // Data de Previsão Inicial
    forecastDateEnd: '',   // Data de Previsão Final
    sortBy: 'priority_date'
};

let filterPresets = JSON.parse(localStorage.getItem('orderFilterPresets') || '{}');

function applyAdvancedFilters() {
    // Capturar valores dos filtros
    const statusSelect = document.getElementById('filterStatus');
    currentFilters.status = Array.from(statusSelect.selectedOptions).map(option => option.value);
    currentFilters.priority = document.getElementById('filterPriority').value;
    currentFilters.paymentType = document.getElementById('filterPaymentType').value;
    currentFilters.direction = document.getElementById('filterDirection').value;
    currentFilters.solicitant = document.getElementById('filterSolicitant').value;
    currentFilters.company = document.getElementById('filterCompany').value;
    currentFilters.process = document.getElementById('filterProcess').value;
    currentFilters.searchTerm = document.getElementById('searchTerm').value.toLowerCase();
    currentFilters.valueMin = parseFloat(document.getElementById('filterValueMin').value) || 0;
    currentFilters.valueMax = parseFloat(document.getElementById('filterValueMax').value) || Infinity;
    currentFilters.dateStart = document.getElementById('filterDateStart').value; // Data Geração Inicial
    currentFilters.dateEnd = document.getElementById('filterDateEnd').value;     // Data Geração Final
    currentFilters.forecastDateStart = document.getElementById('filterPaymentForecastStartDate').value; // NOVO: Data Previsão Inicial
    currentFilters.forecastDateEnd = document.getElementById('filterPaymentForecastEndDate').value;     // NOVO: Data Previsão Final
    currentFilters.sortBy = document.getElementById('sortBy').value;

    currentPage = 1; 

    displayOrders();
}

function sortOrders(ordersArray, sortBy) {
    return ordersArray.sort((a, b) => {
        switch (sortBy) {
            case 'priority_date':
                // Priority: Emergencia (3) > Urgencia (2) > Normal (1) > Baixa (0)
                const priorityOrderMap = { 'Emergencia': 3, 'Urgencia': 2, 'Normal': 1 }; // Ajustado para Emergencia ser a mais alta
                const aPriority = priorityOrderMap[a.priority] || 0; 
                const bPriority = priorityOrderMap[b.priority] || 0;
                
                // Priorizar ordens não pagas
                const aIsPaid = a.status === 'Paga';
                const bIsPaid = b.status === 'Paga';

                // Ordens não pagas vêm antes das pagas
                if (aIsPaid && !bIsPaid) return 1; // 'a' é paga, 'b' não -> 'a' vai para o final
                if (!aIsPaid && bIsPaid) return -1; // 'a' não é paga, 'b' é -> 'a' vai para o começo

                // Se ambos são pagos, ordenar pela data de conclusão de pagamento (mais recente primeiro)
                if (aIsPaid && bIsPaid) {
                    const aCompletionDate = criarDataLocal(a.paymentCompletionDate || a.createdAt);
                    const bCompletionDate = criarDataLocal(b.paymentCompletionDate || b.createdAt);
                    return bCompletionDate - aCompletionDate;
                }

                // Se ambos não são pagos, aplicar prioridade e depois data de vencimento
                if (aPriority !== bPriority) {
                    return bPriority - aPriority; // Maior prioridade primeiro (Emergencia)
                }
                
                // Se mesma prioridade (e ambos não pagos), ordenar por data de vencimento (mais antiga primeiro)
                const aDate = criarDataLocal(a.paymentForecast || a.generationDate);
                const bDate = criarDataLocal(b.paymentForecast || b.generationDate);
                return aDate - bDate; // Data mais antiga primeiro (mais próxima de vencer)
                
            case 'paymentForecast':
                return new Date(a.paymentForecast || '9999-12-31') - new Date(b.paymentForecast || '9999-12-31');
                
            case 'generationDate':
                return new Date(a.generationDate) - new Date(b.generationDate);
                
            case 'paymentValue':
                return parseFloat(b.paymentValue || 0) - parseFloat(a.paymentValue || 0); // Maior primeiro
                
            case 'paymentValue_asc':
                return parseFloat(a.paymentValue || 0) - parseFloat(b.paymentValue || 0); // Menor primeiro
                
            case 'status':
                const statusOrder = { 'Pendente': 1, 'Aguardando Financeiro': 2, 'Aguardando Pagamento': 3, 'Paga': 4 };
                return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
                
            case 'favoredName':
                return (a.favoredName || '').localeCompare(b.favoredName || '');
                
            case 'process':
                return (a.process || '').localeCompare(b.process || '');
                
            default:
                return 0;
        }
    });
}
// Função para verificar se uma ordem deve ser exibida (não arquivada)
function isOrdemVisivel(ordem) {
    if (ordem.status !== 'Paga') {
        return true; // Ordens não pagas sempre visíveis
    }
    
    // Para ordens pagas, verificar se foram pagas no mês atual
    const hoje = new Date();
    const primeiroDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    // Verificar data de pagamento (assumindo que há um campo dataPagamento)
    let dataPagamento = null;
    
    if (ordem.dataPagamento) {
        dataPagamento = new criarDataLocal(ordem.dataPagamento);
    } else if (ordem.parcels) {
        // Procurar a data de pagamento mais recente nas parcelas
        ordem.parcels.forEach(parcela => {
            if (parcela.isPaid && parcela.paymentDate) {
                const dataParcelaPagamento = new criarDataLocal(parcela.paymentDate);
                if (!dataPagamento || dataParcelaPagamento > dataPagamento) {
                    dataPagamento = dataParcelaPagamento;
                }
            }
        });
    }
    
    // Se não tem data de pagamento, usar a data de criação como fallback
    if (!dataPagamento && ordem.createdAt) {
        dataPagamento = new criarDataLocal(ordem.createdAt);
    }
    
    // Se ainda não tem data, mostrar (para não ocultar por engano)
    if (!dataPagamento) {
        return true;
    }
    
    // Mostrar apenas se foi paga neste mês
    return dataPagamento >= primeiroDiaDoMes;
}

// Função para alternar visualização das ordens arquivadas
function mostrarOrdensArquivadas() {
    const ordensArquivadas = document.querySelectorAll('.ordem-arquivada');
    const botao = document.querySelector('#indicador-arquivamento button');
    
    if (ordensArquivadas.length === 0) return;
    
    const primeiraArquivada = ordensArquivadas[0];
    const estaVisivel = primeiraArquivada.style.display !== 'none';
    
    ordensArquivadas.forEach(linha => {
        linha.style.display = estaVisivel ? 'none' : '';
        linha.style.opacity = estaVisivel ? '1' : '0.6';
    });
    
    if (botao) {
        botao.textContent = estaVisivel ? 'Ver Arquivadas' : 'Ocultar Arquivadas';
        botao.style.background = estaVisivel ? '#2196f3' : '#ff9800';
    }
}


// Função para filtrar ordens visíveis
function getOrdensVisiveis(todasAsOrdens) {
    return todasAsOrdens.filter(ordem => isOrdemVisivel(ordem));
}

function updateFilterResults(displayedOrdersArray, totalFilteredItemsFromBackend) {
    const ordersTab = document.getElementById('ordersTab');
    if (!ordersTab) return;

    const existingInfoBox = ordersTab.querySelector('.filtered-info-box');
    if (existingInfoBox) {
        existingInfoBox.remove();
    }

    const totalOrdersInSystemGlobal = totalFilteredItemsFromBackend; // Total de ordens filtradas no backend
    const filteredCount = displayedOrdersArray.length; // Quantidade visível NA PÁGINA ATUAL

    if (totalOrdersInSystemGlobal === 0 && filteredCount === 0) {
        return;
    }

    const orderTextFiltered = filteredCount === 1 ? 'ordem' : 'ordens';
    const totalOrderText = totalOrdersInSystemGlobal === 1 ? 'ordem' : 'ordens';

    // ✅ CORRIGIDO: Calcular o valor total de TODAS as ordens filtradas (não apenas da página)
    // Usando getFilteredOrders() para obter TODAS as ordens que passaram pelos filtros
    const allFilteredOrders = getFilteredOrders(); // Retorna TODAS as ordens filtradas
    
    const totalValueAllFiltered = allFilteredOrders.reduce((sum, order) => {
        return sum + (parseFloat(order.paymentValue) || 0);
    }, 0);

    const formattedTotalValueAllFiltered = totalValueAllFiltered.toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        style: 'currency', 
        currency: 'BRL' 
    });

    let messageContent;

    if (showAllOrdersMode) {
        if (filteredCount === 0) {
            messageContent = `Nenhuma ${orderTextFiltered} de pagamento encontrada com os filtros aplicados.`;
        } else {
            messageContent = `Mostrando <strong>todas</strong> as <strong>${filteredCount}</strong> ${orderTextFiltered} de pagamento (de um total de ${totalOrdersInSystemGlobal}).`;
            // ✅ MODIFICADO: Exibir valor total de TODAS as ordens
            messageContent += `<br>Valor Total de Todas as Ordens: <strong>${formattedTotalValueAllFiltered}</strong>`;
        }
    } else { // Modo de Paginação
        if (filteredCount === 0 && totalOrdersInSystemGlobal === 0) {
            messageContent = `Nenhuma ${orderTextFiltered} de pagamento encontrada com os filtros aplicados.`;
        } else if (filteredCount === 0 && totalOrdersInSystemGlobal > 0) {
            messageContent = `Nenhuma ${orderTextFiltered} de pagamento nesta página. (Total de <strong>${totalOrdersInSystemGlobal}</strong> ${totalOrderText} de pagamento no sistema.)`;
        } else {
            messageContent = `<strong>${filteredCount}</strong> ${orderTextFiltered} de pagamento exibida(s) nesta página (de <strong>${totalOrdersInSystemGlobal}</strong> ${totalOrderText} de pagamento no total).`;
            messageContent += `<br>Valor Total de Todas as Ordens: <strong>${formattedTotalValueAllFiltered}</strong>`;
        }
    }

    const infoBoxHtml = `
        <div class="filtered-info-box">
            <span class="text-content">
                ${messageContent}
            </span>
        </div>
    `;

    const filtersContainer = ordersTab.querySelector('.filters-container');
    if (filtersContainer && filtersContainer.parentElement) {
        filtersContainer.parentElement.insertBefore(document.createRange().createContextualFragment(infoBoxHtml), filtersContainer.nextElementSibling);
    } else if (ordersTab) {
        ordersTab.insertBefore(document.createRange().createContextualFragment(infoBoxHtml), ordersTab.firstChild);
    }
}

// Função para atualizar a legenda discreta usando a lógica existente do sistema
function updateDiscreteLegend() {
    try {
        // Usar as ordens que estão sendo exibidas atualmente (filtradas ou todas)
        const currentOrders = (typeof filteredOrders !== 'undefined' && Array.isArray(filteredOrders)) 
            ? filteredOrders 
            : (typeof orders !== 'undefined' && Array.isArray(orders)) 
                ? orders 
                : [];
        
        let emergencyCount = 0;
        let overdueCount = 0;
        let approachingCount = 0;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        currentOrders.forEach(order => {
            // Emergências (usando a mesma lógica do sistema)
            if (order.priority && order.priority.toLowerCase() === 'emergencia') {
                emergencyCount++;
            }
            
            // Vencidas e próximas do vencimento (usando a mesma lógica do sistema)
            if (order.paymentForecast) {
                const forecastDate = new Date(order.paymentForecast);
                forecastDate.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((forecastDate - today) / (1000 * 60 * 60 * 24));
                
                if (diffDays < 0) {
                    overdueCount++;
                } else if (diffDays <= 3) {
                    approachingCount++;
                }
            }
        });
        
        // Atualizar elementos da legenda discreta
        const emergencyElement = document.querySelector('.emergency-count');
        const overdueElement = document.querySelector('.overdue-count');
        const approachingElement = document.querySelector('.approaching-count');
        
        if (emergencyElement) emergencyElement.textContent = emergencyCount;
        if (overdueElement) overdueElement.textContent = overdueCount;
        if (approachingElement) approachingElement.textContent = approachingCount;
        
    } catch (error) {
        console.warn('Erro ao atualizar legenda discreta:', error);
    }
}


// Função para limpar todos os filtros
function clearAdvancedFilters() {

    // Limpar campos de filtro
    document.getElementById('filterStatus').selectedIndex = -1;
    document.getElementById('filterPriority').value = '';
    document.getElementById('filterPaymentType').value = '';
    document.getElementById('filterDirection').value = '';
    document.getElementById('filterSolicitant').value = '';
    document.getElementById('filterProcess').value = '';
    document.getElementById('searchTerm').value = '';
    document.getElementById('filterValueMin').value = '';
    document.getElementById('filterValueMax').value = '';
    document.getElementById('filterDateStart').value = '';     // Data Geração Inicial
    document.getElementById('filterDateEnd').value = '';       // Data Geração Final
    document.getElementById('filterPaymentForecastStartDate').value = ''; // NOVO: Data Previsão Inicial
    document.getElementById('filterPaymentForecastEndDate').value = '';     // NOVO: Data Previsão Final
    document.getElementById('sortBy').value = 'priority_date';
    
    // Resetar currentFilters
    currentFilters = {
        status: [],
        priority: '',
        paymentType: '',
        direction: '',
        solicitant: '',
        process: '',
        searchTerm: '',
        valueMin: '',
        valueMax: '',
        dateStart: '',
        dateEnd: '',
        forecastDateStart: '', // NOVO
        forecastDateEnd: '',   // NOVO
        sortBy: 'priority_date'
    };
    
    // Reexibir todas as ordens
    displayOrders();
}

// Função para mostrar/esconder os filtros avançados
function toggleAdvancedFilters() {
    const filtersContainer = document.getElementById('advancedFiltersContainer');
    const toggleBtn = document.getElementById('toggleFiltersBtn');
    
    if (!filtersContainer || !toggleBtn) {
        console.warn('Elementos de filtros não encontrados');
        return;
    }
    
    const isCurrentlyVisible = filtersContainer.style.display !== 'none';
    
    if (isCurrentlyVisible) {
        // Esconder filtros
        filtersContainer.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-filter"></i> Filtros';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-primary');
    } else {
        // Mostrar filtros
        filtersContainer.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-filter"></i> Fechar Filtros';
        toggleBtn.classList.remove('btn-primary');
        toggleBtn.classList.add('btn-secondary');
    }
}

// Função para mostrar/esconder os filtros avançados da aba de Ordens Pagas
function togglePaidAdvancedFilters() {
    const filtersContainer = document.getElementById('paidAdvancedFiltersContainer');
    const toggleBtn = document.getElementById('togglePaidFiltersBtn');
    
    if (!filtersContainer || !toggleBtn) {
        console.warn('Elementos de filtros de ordens pagas não encontrados');
        return;
    }
    
    const isCurrentlyVisible = filtersContainer.style.display !== 'none';
    
    if (isCurrentlyVisible) {
        // Esconder filtros
        filtersContainer.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-filter"></i> Filtros';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-primary');
    } else {
        // Mostrar filtros
        filtersContainer.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-filter"></i> Fechar Filtros';
        toggleBtn.classList.remove('btn-primary');
        toggleBtn.classList.add('btn-secondary');
    }
}

// --- Função para popular o datalist de Fornecedores de Boletos ---
function populateBoletoVendorsDatalist() {
    const datalist = document.getElementById('boletoVendorsDatalist');
    if (!datalist) {
        console.warn('Datalist para fornecedores de boletos (ID: boletoVendorsDatalist) não encontrado no DOM. Verifique o HTML.');
        return;
    }

    // Limpa as opções existentes para evitar duplicações
    datalist.innerHTML = '';

    const vendorNames = new Set();
    if (Array.isArray(boletos)) { // Verifica se 'boletos' é um array antes de iterar
        boletos.forEach(boleto => {
            if (boleto.vendor && typeof boleto.vendor === 'string' && boleto.vendor.trim() !== '') {
                vendorNames.add(boleto.vendor.trim());
            }
        });
    } else {
        console.warn('Array global "boletos" não é um array válido ou está vazio. O datalist de fornecedores pode estar vazio.');
    }


    // Converte o Set para Array e ordena alfabeticamente
    const sortedVendorNames = Array.from(vendorNames).sort();

    // Adiciona as novas opções ao datalist
    sortedVendorNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        datalist.appendChild(option);
    });

}
// --- FIM: Função para popular o datalist de Fornecedores de Boletos ---

function populateProcessFilter() {
    const processSelect = document.getElementById('filterProcess');
    if (!processSelect) return;
    
    // Obter processos únicos de forma case-insensitive e ordenar
    const uniqueProcessesMap = new Map();
    orders.forEach(order => {
        const process = order.process?.trim();
        if (process) {
            const lowerProcess = process.toLowerCase();
            if (!uniqueProcessesMap.has(lowerProcess)) {
                uniqueProcessesMap.set(lowerProcess, process);
            }
        }
    });
    const processes = Array.from(uniqueProcessesMap.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    
    // Limpar opções existentes (exceto a primeira)
    while (processSelect.children.length > 1) {
        processSelect.removeChild(processSelect.lastChild);
    }
    
    // Adicionar processos
    processes.forEach(process => {
        const option = document.createElement('option');
        option.value = process;
        option.textContent = process;
        processSelect.appendChild(option);
    });
}


// Função para popular o datalist de Favorecidos
function populateFavoredNamesDatalist() {
    const datalist = document.getElementById('favoredNamesDatalist');
    if (!datalist) {
        console.warn('Datalist para favorecidos (#favoredNamesDatalist) não encontrado no DOM. Verifique o HTML.');
        return;
    }

    // Limpa as opções existentes para evitar duplicações antes de preencher
    datalist.innerHTML = '';

    const favoredNames = new Set();

    // 1. Coletar nomes de favorecidos de TODAS as ordens (fullOrdersList)
    if (Array.isArray(fullOrdersList)) {
        fullOrdersList.forEach(order => {
            if (order.favoredName && order.favoredName.trim() !== '') {
                favoredNames.add(order.favoredName.trim());
            }
        });
    }

    // 2. Coletar nomes de favorecidos de TODOS os salários (salaries)
    if (Array.isArray(salaries)) {
        salaries.forEach(salary => {
            if (salary.favoredName && salary.favoredName.trim() !== '') {
                favoredNames.add(salary.favoredName.trim());
            }
        });
    }

    // 3. Coletar nomes de fornecedores de TODOS os boletos (boletos), pois são favorecidos de boletos
    if (Array.isArray(boletos)) {
        boletos.forEach(boleto => {
            if (boleto.vendor && boleto.vendor.trim() !== '') {
                favoredNames.add(boleto.vendor.trim());
            }
        });
    }

    // Converte o Set para Array, filtra valores vazios e ordena alfabeticamente
    const sortedFavoredNames = Array.from(favoredNames)
                                   .filter(name => name) // Remove possíveis strings vazias
                                   .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    // Adiciona as novas opções ao datalist
    if (sortedFavoredNames.length === 0) {
        console.warn('Nenhum favorecido/fornecedor único encontrado para popular o datalist.');
    } else {
        sortedFavoredNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            datalist.appendChild(option);
        });
        console.log(`Datalist de favorecidos populado com ${sortedFavoredNames.length} nomes.`);
    }
}

// script.js
// ... (próximo a populateProcessFilter ou populateFavoredNamesDatalist) ...

// NOVA FUNÇÃO: Para popular o filtro de EMPRESA na aba de Ordens de Pagamento
function populateCompanyFilter() {
    const select = document.getElementById('filterCompany');
    if (!select) {
        console.warn('populateCompanyFilter: Elemento filterCompany não encontrado.');
        return;
    }
    
    // Limpar opções existentes (exceto a primeira "Todas as Empresas")
    while (select.options.length > 1) {
        select.remove(1);
    }

    const uniqueCompanies = new Set();
    // Adiciona empresas fixas (se houver e forem relevantes para este filtro)
    const fixedCompanies = ["Facilita Serviços", "T Santana", "Maia Silva", "DDSJ"];
    fixedCompanies.forEach(company => uniqueCompanies.add(company));

    // Adiciona empresas da fullOrdersList (que já inclui ordens de todos os status)
    if (Array.isArray(fullOrdersList)) {
        fullOrdersList.forEach(order => {
            if (order.company && typeof order.company === 'string' && order.company.trim() !== '') {
                uniqueCompanies.add(order.company.trim());
            }
        });
    }

    // Converte o Set para Array, ordena alfabeticamente e adiciona ao select
    const sortedCompanies = Array.from(uniqueCompanies).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    sortedCompanies.forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        option.textContent = company;
        select.appendChild(option);
    });
}

// NOVA: Função para popular o filtro de FORNECEDOR na aba de Boletos Pendentes
function populateBoletoVendorFilter() {
    const select = document.getElementById('filterBoletoVendor');
    if (!select) {
        console.warn('populateBoletoVendorFilter: Elemento filterBoletoVendor não encontrado.');
        return;
    }
    // Limpar opções existentes (exceto a primeira "Todos os Fornecedores")
    while (select.options.length > 1) {
        select.remove(1);
    }

    const uniqueVendors = new Set();
    if (Array.isArray(boletos)) {
        boletos.forEach(boleto => {
            if (boleto.vendor && typeof boleto.vendor === 'string' && boleto.vendor.trim() !== '') {
                uniqueVendors.add(boleto.vendor.trim());
            }
        });
    }

    const sortedVendors = Array.from(uniqueVendors).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    sortedVendors.forEach(vendor => {
        const option = document.createElement('option');
        option.value = vendor;
        option.textContent = vendor;
        select.appendChild(option);
    });
}

// NOVA: Função para popular o filtro de PROCESSO na aba de Boletos Pendentes
function populateBoletoProcessFilter() {
    const select = document.getElementById('filterBoletoProcess');
    if (!select) {
        console.warn('populateBoletoProcessFilter: Elemento filterBoletoProcess não encontrado.');
        return;
    }

    // Limpar opções existentes (exceto a primeira "Todos os Processos")
    while (select.options.length > 1) {
        select.remove(1);
    }

    const uniqueProcesses = new Set();
    if (Array.isArray(boletos)) {
        boletos.forEach(boleto => {
            if (boleto.process && typeof boleto.process === 'string' && boleto.process.trim() !== '') {
                uniqueProcesses.add(boleto.process.trim());
            }
        });
    }

    const sortedProcesses = Array.from(uniqueProcesses).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    sortedProcesses.forEach(process => {
        const option = document.createElement('option');
        option.value = process;
        option.textContent = process;
        select.appendChild(option);
    });
}

// NOVO CÓDIGO (APÓS AS MODIFICAÇÕES) para populateProcessesDatalist():
function populateProcessesDatalist() {
    const datalist = document.getElementById('processesList');
    if (!datalist) {
        console.warn('Datalist para processos (#processesList) não encontrado no DOM. Verifique o HTML.');
        return;
    }

    // Limpa as opções existentes para evitar duplicações antes de preencher
    datalist.innerHTML = '';

    const uniqueProcesses = new Set();

    // 1. Coletar processos de TODAS as ordens (fullOrdersList)
    if (Array.isArray(fullOrdersList)) {
        fullOrdersList.forEach(order => {
            if (order.process && order.process.trim() !== '') {
                uniqueProcesses.add(order.process.trim());
            }
        });
    }

    // 2. Coletar processos de TODOS os salários (salaries)
    if (Array.isArray(salaries)) {
        salaries.forEach(salary => {
            if (salary.process && salary.process.trim() !== '') {
                uniqueProcesses.add(salary.process.trim());
            }
        });
    }

    // 3. Coletar processos de TODOS os boletos (boletos)
    if (Array.isArray(boletos)) {
        boletos.forEach(boleto => {
            if (boleto.process && boleto.process.trim() !== '') {
                uniqueProcesses.add(boleto.process.trim());
            }
        });
    }

    // Converte o Set para Array, filtra valores vazios e ordena alfabeticamente
    const sortedProcesses = Array.from(uniqueProcesses)
                                .filter(process => process) // Remove possíveis strings vazias
                                .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    // Adiciona as novas opções ao datalist
    if (sortedProcesses.length === 0) {
        console.warn('Nenhum processo único encontrado para popular o datalist.');
    } else {
        sortedProcesses.forEach(process => {
            const option = document.createElement('option');
            option.value = process;
            datalist.appendChild(option);
        });
        console.log(`Datalist de processos populado com ${sortedProcesses.length} nomes.`);
    }
}

function populateVendorsDatalist() {
        const datalist = document.getElementById('vendorsList');
        if (!datalist) return;

        const uniqueVendorsMap = new Map(); // Key: lowercased vendor, Value: original-cased vendor
        boletos.forEach(boleto => {
            const vendor = boleto.vendor?.trim();
            if (vendor) {
                const lowerVendor = vendor.toLowerCase();
                if (!uniqueVendorsMap.has(lowerVendor)) {
                    uniqueVendorsMap.set(lowerVendor, vendor);
                }
            }
        });

        const vendors = Array.from(uniqueVendorsMap.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        datalist.innerHTML = ''; // Limpa as opções existentes
        vendors.forEach(vendor => {
            const option = document.createElement('option');
            option.value = vendor;
            datalist.appendChild(option);
        });
    }


function saveFilterPreset() {
    const name = prompt('Nome para este conjunto de filtros:');
    if (!name) return;
    
    filterPresets[name] = { ...currentFilters };
    localStorage.setItem('orderFilterPresets', JSON.stringify(filterPresets));
    
    updateFilterPresetsDropdown();
    alert(`Filtro "${name}" salvo com sucesso!`);
}

// Função para carregar preset de filtro
function loadFilterPreset() {
    const select = document.getElementById('filterPresets');
    const presetName = select.value;
    
    if (!presetName || !filterPresets[presetName]) return;
    
    const preset = filterPresets[presetName];
    
    // Aplicar valores do preset
    const statusSelect = document.getElementById('filterStatus');
    Array.from(statusSelect.options).forEach(option => {
        option.selected = preset.status.includes(option.value);
    });
    
    document.getElementById('filterPriority').value = preset.priority || '';
    document.getElementById('filterPaymentType').value = preset.paymentType || '';
    document.getElementById('filterDirection').value = preset.direction || '';
    document.getElementById('filterSolicitant').value = preset.solicitant || '';
    document.getElementById('filterProcess').value = preset.process || '';
    document.getElementById('searchTerm').value = preset.searchTerm || '';
    document.getElementById('filterValueMin').value = preset.valueMin || '';
    document.getElementById('filterValueMax').value = preset.valueMax || '';
    document.getElementById('filterDateStart').value = preset.dateStart || '';
    document.getElementById('filterDateEnd').value = preset.dateEnd || '';
    document.getElementById('sortBy').value = preset.sortBy || 'priority_date';
    
    // Aplicar filtros
    applyAdvancedFilters();
}

// Função para atualizar dropdown de presets
function updateFilterPresetsDropdown() {
    const select = document.getElementById('filterPresets');
    if (!select) return;
    
    // Limpar opções existentes (exceto a primeira)
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    // Adicionar presets salvos
    Object.keys(filterPresets).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}

displayOrders = function() {
    console.log('   displayOrders iniciada');
    
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) {
        console.log('❌ Elemento ordersTableBody não encontrado');
        return;
    }
    
    tbody.innerHTML = ''; // Limpa a tabela
    
    let allOrdersToProcess = getFilteredOrders(); 

    const finalSortedOrders = sortOrders(allOrdersToProcess, 'priority_date');

    const tableContainer = tbody.parentElement;
    const existingIndicators = tableContainer.querySelectorAll('.indicator');

    existingIndicators.forEach(indicator => indicator.remove());
    
    // 2. Calcular contagens APENAS das ordens que serão exibidas na tabela (CATEGORIAS EXCLUSIVAS)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera hora para comparação de datas

    let unpaidEmergencyCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;


    finalSortedOrders.forEach((order, index) => {
        if (order.status !== 'Paga') { 
            console.log(`📋 Ordem ${index + 1}: ${order.favoredName}, Prioridade: ${order.priority}, Status: ${order.status}, Data: ${order.paymentForecast}`);
            
            // CATEGORIA 1: EMERGÊNCIA (tem prioridade absoluta)
            if (order.priority?.toLowerCase() === 'emergencia' || order.priority?.toLowerCase() === 'emergência') {
                unpaidEmergencyCount++;
                console.log(`  ➤ EMERGÊNCIA detectada (total: ${unpaidEmergencyCount})`);
                return; // Pula para a próxima ordem
            }
            
            // CATEGORIA 2 e 3: Alertas de vencimento (APENAS para ordens NÃO emergenciais)
            if (order.paymentForecast) {
                const forecastDate = new Date(order.paymentForecast);
                forecastDate.setHours(0, 0, 0, 0);
                const diffTime = forecastDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
                console.log(`  ➤ Data de vencimento: ${order.paymentForecast}, Diferença: ${diffDays} dias`);
    
                // CORREÇÃO: Lógica mais clara para as datas
                if (diffDays < 0) {
                    // VENCIDA: Apenas datas que já passaram (ontem, anteontem, etc.)
                    overdueCount++;
                    console.log(`  ➤ VENCIDA detectada (total: ${overdueCount})`);
                } else if (diffDays >= 0 && diffDays <= 4) {
                    // PRÓXIMA: De hoje (0) até 4 dias no futuro
                    upcomingCount++;
                }
            }
        }
    });
    
    // 3. Exibir avisos visuais no topo APENAS se houver ordens para cada categoria
    if (unpaidEmergencyCount > 0) {
        console.log(`🚨 Criando aviso de emergência: ${unpaidEmergencyCount}`);
        updateEmergencyIndicator(unpaidEmergencyCount, 'emergency');
    }
    if (upcomingCount > 0) {
        console.log(`⚠️ Criando aviso de próximas: ${upcomingCount}`);
        updateEmergencyIndicator(upcomingCount, 'upcoming');
    }
    
    const totalDisplayedOrdersValue = finalSortedOrders.reduce((sum, order) => {
        return sum + parseFloat(order.paymentValue || 0);
    }, 0);

    updateOrdersTotalSummaryDisplay(finalSortedOrders.length, totalDisplayedOrdersValue);

    // 4. Criar e adicionar as linhas à tabela
    finalSortedOrders.forEach(order => {
        const row = createOrderRow(order, 'general');
        tbody.appendChild(row);
    });
    
    updateFilterResults(finalSortedOrders); 
    updateDiscreteLegend();
    
    // --- NOVO: Lógica para rolar e destacar a nova ordem após o cadastro ---
    if (highlightNewOrderId) {
        console.log(`✨ [displayOrders] Tentando destacar nova ordem com ID: ${highlightNewOrderId}`);
        // Pequeno atraso para garantir que o DOM foi atualizado e a linha da ordem existe
        setTimeout(() => {
            const newOrderElement = document.getElementById(`order-${highlightNewOrderId}`); 
            if (newOrderElement) {
                newOrderElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Rola suavemente
                newOrderElement.classList.add('highlight-new-order'); // Adiciona classe de destaque

                // Remove a classe de destaque após 2 segundos
                setTimeout(() => {
                    newOrderElement.classList.remove('highlight-new-order');
                }, 2000); 
            } else {
                console.warn(`⚠️ [displayOrders] Elemento da nova ordem com ID ${highlightNewOrderId} não encontrado para destacar.`);
            }
            highlightNewOrderId = null; // Limpa a variável global após o uso
        }, 500); // 500ms de atraso para o DOM renderizar
    }
};


// Helper para criar um elemento de alerta suave
function createSoftAlertElement(type, count, message) {
    if (count === 0) return null; // Não cria alerta se a contagem for zero

    const alertElement = document.createElement('div');
    alertElement.className = `soft-alert-item soft-alert-${type}`;
    
    // Configurações específicas por tipo (cores suaves)
    const typeConfigs = {
        emergency: {
            icon: '🚨',
            textColor: '#c53030', // Vermelho escuro
            bgColor: '#fff5f5',   // Rosa muito suave
            borderColor: '#fed7d7'// Borda rosa suave
        },
        overdue: {
            icon: '🚩',
            textColor: '#dd6b20', // Laranja escuro
            bgColor: '#fffaf0',   // Creme suave
            borderColor: '#fbd38d'// Borda laranja suave
        },
        upcoming: {
            icon: '⚠️',
            textColor: '#d69e2e', // Amarelo/Marrom escuro
            bgColor: '#fffff0',   // Amarelo muito suave
            borderColor: '#f6e05e'// Borda amarela suave
        }
    };
    
    const config = typeConfigs[type];

    alertElement.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 5px;
        font-size: 13px;
        font-weight: 500;
        background-color: ${config.bgColor};
        color: ${config.textColor};
        border: 1px solid ${config.borderColor};
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        transition: all 0.2s ease;
    `;
    
    alertElement.innerHTML = `
        <span style="font-size: 16px;">${config.icon}</span>
        <span>${count}</span>
        <span>${message}</span>
    `;

    return alertElement;
}

// Função para exibir avisos suaves de ORDENS
function displaySoftOrderAlerts(ordersList, targetInsertionElement) {
    // Remover avisos antigos deste tipo antes de criar novos
    const existingAlertsContainer = targetInsertionElement.previousElementSibling;
    if (existingAlertsContainer && existingAlertsContainer.classList.contains('soft-alerts-container')) {
        existingAlertsContainer.remove();
    }
    
    const alertsWrapper = document.createElement('div');
    alertsWrapper.className = 'soft-alerts-container';
    alertsWrapper.style.cssText = `
        margin-bottom: 15px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: center; /* Centraliza os alertas */
    `;

    // Calcular contagens
    let emergencyCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera a hora para comparação de datas

    ordersList.forEach(order => {
        // Ignora ordens já pagas para os alertas de prioridade/vencimento
        if (order.status === 'Paga') { 
            return;
        }

        // As emergências têm prioridade absoluta nos alertas
        if (order.priority && (order.priority.toLowerCase() === 'emergencia' || order.priority.toLowerCase() === 'emergência')) {
            emergencyCount++;
        } else if (order.paymentForecast) { // Só verifica vencimento se não for emergência
            const forecastDate = criarDataLocal(order.paymentForecast); // Usar criarDataLocal para consistência
            if (isNaN(forecastDate.getTime())) return; // Ignora se a data for inválida

            const diffDays = Math.ceil((forecastDate - today) / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) { // Ordem vencida
                overdueCount++;
            } else if (diffDays >= 0 && diffDays <= 4) { // Ordem próxima (hoje ou nos próximos 4 dias)
                upcomingCount++;
            }
        }
    });

    // Criar e adicionar alertas
    const emergencyAlert = createSoftAlertElement('emergency', emergencyCount, `Emergência${emergencyCount > 1 ? 's' : ''}`);
    if (emergencyAlert) alertsWrapper.appendChild(emergencyAlert);

    const upcomingAlert = createSoftAlertElement('upcoming', upcomingCount, `Ordem${upcomingCount > 1 ? 's' : ''} Próxima${upcomingCount > 1 ? 's' : ''}`);
    if (upcomingAlert) alertsWrapper.appendChild(upcomingAlert);

    // Inserir o container de alertas no DOM
    if (alertsWrapper.children.length > 0 && targetInsertionElement && targetInsertionElement.parentNode) {
        targetInsertionElement.parentNode.insertBefore(alertsWrapper, targetInsertionElement);
    }
}

// Função para exibir avisos suaves de BOLETOS (parcelas pendentes)
function displaySoftBoletoAlerts(parcelList, targetInsertionElement) {
    // Remover avisos antigos deste tipo antes de criar novos
    const existingAlertsContainer = targetInsertionElement.previousElementSibling;
    if (existingAlertsContainer && existingAlertsContainer.classList.contains('soft-alerts-container')) {
        existingAlertsContainer.remove();
    }

    const alertsWrapper = document.createElement('div');
    alertsWrapper.className = 'soft-alerts-container';
    alertsWrapper.style.cssText = `
        margin-bottom: 15px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: center; /* Centraliza os alertas */
    `;

    // Calcular contagens para boletos
    let overdueParcelsCount = 0;
    let upcomingParcelsCount = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    parcelList.forEach(item => {
        // 'item' aqui é um objeto que contém 'boleto' e 'parcela', e 'sortDate'
        const parcelDueDate = item.sortDate; // item.sortDate já é um objeto Date (criado por getSortedPendingBoletoParcels)
        
        if (!isNaN(parcelDueDate.getTime())) {
            const diffDays = Math.ceil((parcelDueDate - today) / (1000 * 60 * 60 * 24));

            if (diffDays < 0) { // Ordem vencida
                overdueParcelsCount++;
            } else if (diffDays >= 0 && diffDays <= 4) { // Ordem próxima (hoje ou nos próximos 4 dias), consistente com ordens
                upcomingParcelsCount++;
            }
        }
    });
    
    // Criar e adicionar alertas
    const overdueBoletoAlert = createSoftAlertElement('overdue', overdueParcelsCount, `Parcela${overdueParcelsCount > 1 ? 's' : ''} Vencida${overdueParcelsCount > 1 ? 's' : ''}`);
    if (overdueBoletoAlert) alertsWrapper.appendChild(overdueBoletoAlert);
    
    const upcomingBoletoAlert = createSoftAlertElement('upcoming', upcomingParcelsCount, `Parcela${upcomingParcelsCount > 1 ? 's' : ''} Próxima${upcomingParcelsCount > 1 ? 's' : ''}`);
    if (upcomingBoletoAlert) alertsWrapper.appendChild(upcomingBoletoAlert);

    // Inserir o container de alertas no DOM
    if (alertsWrapper.children.length > 0 && targetInsertionElement && targetInsertionElement.parentNode) {
        targetInsertionElement.parentNode.insertBefore(alertsWrapper, targetInsertionElement);
    }
}

// Função para exibir avisos suaves de ORDENS
// Função para exibir avisos suaves de ORDENS (com lógica de contagem corrigida para igualar ao original)
function displaySoftOrderAlerts(ordersList, targetInsertionElement) {
    // Remover avisos antigos deste tipo antes de criar novos
    const existingAlertsContainer = targetInsertionElement.previousElementSibling;
    if (existingAlertsContainer && existingAlertsContainer.classList.contains('soft-alerts-container')) {
        existingAlertsContainer.remove();
    }
    
    const alertsWrapper = document.createElement('div');
    alertsWrapper.className = 'soft-alerts-container';
    alertsWrapper.style.cssText = `
        margin-bottom: 15px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: center; /* Centraliza os alertas */
    `;

    // Calcular contagens
    let emergencyCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;
    
    const today = getTodayCorrect(); // Utiliza a função original do seu script para 'hoje'

    ordersList.forEach(order => {
        // Ignora ordens já pagas para os alertas de prioridade/vencimento, exatamente como o original
        if (order.status === 'Paga') { 
            return;
        }

        // As emergências têm prioridade absoluta nos alertas
        if (order.priority && (order.priority.toLowerCase() === 'emergencia' || order.priority.toLowerCase() === 'emergência')) {
            emergencyCount++;
            return; // CRUCIAL: Se for emergência, não conta para outras categorias (comportamento original)
        } 
        
        // Só verifica vencimento se não for emergência e se tiver paymentForecast
        if (order.paymentForecast) {
            // *** AQUI ESTÁ A CORREÇÃO: Usamos createLocalDate, exatamente como o sistema original usava ***
            const forecastDate = createLocalDate(order.paymentForecast); 
            forecastDate.setHours(0, 0, 0, 0); // Garante que a hora está zerada para a comparação

            if (isNaN(forecastDate.getTime())) {
                // Se createLocalDate não conseguiu parsear, ignora esta ordem
                return; 
            }

            const diffTime = forecastDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Diferença em dias
            
            if (diffDays < 0) { // Ordem vencida
                overdueCount++;
            } else if (diffDays >= 0 && diffDays <= 4) { // Ordem próxima (hoje ou nos próximos 4 dias)
                upcomingCount++;
            }
        }
    });

    // Criar e adicionar alertas
    const emergencyAlert = createSoftAlertElement('emergency', emergencyCount, `Emergência${emergencyCount > 1 ? 's' : ''}`);
    if (emergencyAlert) alertsWrapper.appendChild(emergencyAlert);

    const overdueAlert = createSoftAlertElement('overdue', overdueCount, `Ordem${overdueCount > 1 ? 's' : ''} Vencida${overdueCount > 1 ? 's' : ''}`);
    if (overdueAlert) alertsWrapper.appendChild(overdueAlert);
    
    const upcomingAlert = createSoftAlertElement('upcoming', upcomingCount, `Ordem${upcomingCount > 1 ? 's' : ''} Próxima${upcomingCount > 1 ? 's' : ''}`);
    if (upcomingAlert) alertsWrapper.appendChild(upcomingAlert);

    // Inserir o container de alertas no DOM
    if (alertsWrapper.children.length > 0 && targetInsertionElement && targetInsertionElement.parentNode) {
        targetInsertionElement.parentNode.insertBefore(alertsWrapper, targetInsertionElement);
    }
}

// Função para exibir avisos suaves de BOLETOS (parcelas pendentes)
function displaySoftBoletoAlerts(parcelList, targetInsertionElement) {
    // Remover avisos antigos deste tipo antes de criar novos
    const existingAlertsContainer = targetInsertionElement.previousElementSibling;
    if (existingAlertsContainer && existingAlertsContainer.classList.contains('soft-alerts-container')) {
        existingAlertsContainer.remove();
    }

    const alertsWrapper = document.createElement('div');
    alertsWrapper.className = 'soft-alerts-container'; // Reusa a classe para consistência
    alertsWrapper.style.cssText = `
        margin-bottom: 15px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: center; /* Centraliza os alertas */
    `;

    // Calcular contagens para boletos
    let overdueParcelsCount = 0;
    let upcomingParcelsCount = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    parcelList.forEach(item => {
        const parcelDueDate = item.sortDate; // item.sortDate já é um objeto Date
        if (!isNaN(parcelDueDate.getTime())) {
            const diffDays = Math.ceil((parcelDueDate - today) / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                overdueParcelsCount++;
            } else if (diffDays >= 0 && diffDays >= -3 && diffDays <= 3) { // Vencidas até 3 dias atrás ou próximas em até 3 dias
                // Para boletos, vamos considerar "upcoming" se for hoje (0) ou nos próximos 3 dias
                upcomingParcelsCount++;
            }
        }
    });
    
    // Para boletos, vamos fazer uma distinção um pouco diferente:
    // "Overdue" - Parcelas com data de vencimento já passada (dias < 0)
    // "Upcoming" - Parcelas que vencem hoje (diffDays = 0) ou nos próximos 3 dias (diffDays <= 3)

    // Criar e adicionar alertas
    const overdueBoletoAlert = createSoftAlertElement('overdue', overdueParcelsCount, `Parcela${overdueParcelsCount > 1 ? 's' : ''} Vencida${overdueParcelsCount > 1 ? 's' : ''}`);
    if (overdueBoletoAlert) alertsWrapper.appendChild(overdueBoletoAlert);
    
    const upcomingBoletoAlert = createSoftAlertElement('upcoming', upcomingParcelsCount, `Parcela${upcomingParcelsCount > 1 ? 's' : ''} Próxima${upcomingParcelsCount > 1 ? 's' : ''}`);
    if (upcomingBoletoAlert) alertsWrapper.appendChild(upcomingBoletoAlert);

    // Inserir o container de alertas no DOM
    if (alertsWrapper.children.length > 0 && targetInsertionElement && targetInsertionElement.parentNode) {
        targetInsertionElement.parentNode.insertBefore(alertsWrapper, targetInsertionElement);
    }
}

// Localização: showTab (aproximadamente linha 2300)

async function showTab(tabName, event) {
    console.log('Mostrando aba:', tabName);
    console.log(`[DEBUG - showTab] currentUser ao mostrar aba ${tabName}:`, currentUser); 
    console.log(`[DEBUG - showTab] authToken ao mostrar aba ${tabName}:`, authToken);     
    
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        const defaultButton = document.querySelector(`.tab-button[onclick*="showTab('${tabName}')"]`);
        if (defaultButton) {
            defaultButton.classList.add('active');
        }
    }

    // --- Controle centralizado do overlay global por showTab ---
    // Apenas estas abas terão o overlay global no início (exceto 'orders' que tem tratamento especial)
    const isHeavyTabInitially = ['reports', 'reports2', 'deposits', 'entryData', 'boletos', 'paid', 'diretoria', 'financeiro', 'pending'].includes(tabName);
    
    if (isHeavyTabInitially && tabName !== 'orders') { // 'orders' terá seu próprio show/hide específico
        showLoadingOverlay(); 
    }
    // --- Fim do controle centralizado ---

    try {
        switch(tabName) {
            case 'orders':
                // Tratamento especial para 'orders' para alta velocidade percebida
                showLoadingOverlay(); // Mostra overlay ESPECIFICAMENTE para a aba 'orders'
                await loadOrders();   // Carrega apenas a página paginada (deve ser rápido)
                displayOrders();      // Exibe a tabela principal de ordens
                hideLoadingOverlay(); // Esconde o overlay IMEDIATAMENTE após a tabela principal ser exibida.
                                      // O usuário vê a tabela muito rápido!

                // Carrega os dados restantes para filtros e contadores em SEGUNDO PLANO (não bloqueia a UI)
                (async () => {
                    await loadFullOrdersList(false); // Carrega todas as ordens
                    await loadSalaries(false);       // Carrega todos os salários
                    await loadBoletos(false);        // Carrega todos os boletos
                    
                    // Após todos os dados de fundo estarem carregados, popule os filtros e atualize os contadores
                    populateCompanyFilter();
                    populateFavoredNamesDatalist();
                    populateProcessesDatalist();
                    updateCounters();           // Atualiza contadores globais com base em fullOrdersList
                    updateDetailedCounters();   // Atualiza contadores detalhados com base em fullOrdersList
                })(); 
                
                // Os contadores são atualizados uma vez com os dados da página atual, depois novamente com os dados completos
                updateCounters();           
                updateDetailedCounters();   
                
                break; 

            case 'add': 
                populateFavoredNamesDatalist();
                populateProcessesDatalist();
                const companySelectElement = document.getElementById('company'); 
                if (companySelectElement) {
                    companySelectElement.innerHTML = '<option value="">Selecione uma empresa...</option>'; 
                    const companyNames = new Set();
                    const fixedCompanies = ["Facilita Serviços", "T Santana", "Maia Silva", "DDSJ"];
                    fixedCompanies.forEach(company => companyNames.add(company));
                    if (hasLoadedFullOrdersList) {
                        fullOrdersList.forEach(order => {
                            if (order.company && typeof order.company === 'string' && order.company.trim() !== '') {
                                companyNames.add(order.company.trim());
                            }
                        });
                    }
                    const sortedCompanies = Array.from(companyNames).sort();
                    sortedCompanies.forEach(company => {
                        const option = document.createElement('option');
                        option.value = company;
                        option.textContent = company;
                        companySelectElement.appendChild(option);
                    });
                } else {
                    console.warn("Elemento 'company' (SELECT de empresas) não encontrado no formulário 'Cadastrar Ordem'.");
                }
                populateCompanyFilter();
                break;
            case 'entryData': 
                await loadFullOrdersList(false); // loadFullOrdersList não tem show/hide interno
                await loadCustomEntryData(); // loadCustomEntryData não tem show/hide interno
                populateEntryCompaniesDatalist(); 
                populateProcessesDatalist();      
                displayCustomEntryData(); 
                break;
            case 'diretoria':
                await loadFullOrdersList(false); // loadFullOrdersList não tem show/hide interno
                displayDiretoriaOrders(); 
                break;
            case 'financeiro':
                await loadFullOrdersList(false); // loadFullOrdersList não tem show/hide interno
                displayFinanceiroOrders();
                break;
            case 'pending': 
                await loadFullOrdersList(false); // loadFullOrdersList não tem show/hide interno
                displayPendingOrders(); 
                break;
            case 'boletos':
                // Mostrar tabela vazia rapidamente
                hideLoadingOverlay();
                
                // Carregar dados em background (não bloqueia UI)
                if (!hasLoadedBoletos) {
                    (async () => {
                        await loadBoletos(false);
                        populateBoletoVendorsDatalist(); // Só quando tiver dados
                        displayBoletos();
                    })();
                } else {
                    displayBoletos();
                }
                break;
            case 'paid':
                await loadFullOrdersList(true); 
                await loadBoletos(true);      
                
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Popular filtros
                populatePaidFavoredFilter();
                populatePaidSolicitantFilter();
                populatePaidProcessFilter();
                populatePaidCompanyFilter();
                populatePaidPaymentTypeFilter();
                populatePaidPriorityFilter();
                
                // Exibir tabela atualizada
                displayPaidOrders(); 
                break;
            case 'reports':
                await loadDashboardData(); // loadDashboardData não tem show/hide interno
                renderDashboard();
                displayReports();
                break;
            case 'salaries': 
                await loadSalaries(false); // loadSalaries não tem show/hide interno
                populateMonthSelect('salaryFilterMonthSelect'); 
                displaySalaries(); 
                break;
            case 'reports2': 
                await fetchSalariesForReports(); // fetchSalariesForReports não tem show/hide interno
                displayReports2(); 
                break;
            case 'deposits': 
                await loadDepositsFromDB(); // loadDepositsFromDB não tem show/hide interno
                showDepositsTab(); 
                displayDeposits(); 
                break;
        }
    } catch (error) {
        console.error(`❌ Erro ao carregar aba ${tabName}:`, error);
        showModernErrorNotification(`Erro ao carregar a aba ${tabName}. Verifique o console.`);
    } finally {
        if (isHeavyTabInitially && tabName !== 'orders') {
            hideLoadingOverlay(); 
        }
    }
}

function validateProcessSelection(inputId, dataListId) {
    const processInput = document.getElementById(inputId);
    const dataList = document.getElementById(dataListId);
    
    // Se não encontrar o input ou o datalist, retorna false
    if (!processInput || !dataList) {
        console.warn(`validateProcessSelection: Elemento ${inputId} ou ${dataListId} não encontrado.`);
        return false;
    }
    
    const userValue = processInput.value.trim();
    
    // Se o campo estiver vazio, é inválido
    if (!userValue) {
        alert('Por favor, selecione um processo válido.');
        processInput.focus();
        return false;
    }
    
    // Obter todas as opções válidas do datalist
    const validOptions = Array.from(dataList.querySelectorAll('option'))
        .map(opt => opt.value.trim());
    
    // Verificar se o valor digitado/selecionado existe no datalist (case-sensitive exato)
    if (!validOptions.includes(userValue)) {
        alert(`Processo "${userValue}" não encontrado. Por favor, selecione um processo existente na lista.`);
        processInput.focus();
        return false;
    }
    
    return true;
}

// NOVA FUNÇÃO: Popula o select/datalist de processos para o filtro avançado de Dados de Entrada
function populateEntryDataProcessFilterForCustomEntry() {
    const select = document.getElementById('filterCustomEntryProcess');
    if (!select) {
        console.warn('populateEntryDataProcessFilterForCustomEntry: Elemento filterCustomEntryProcess não encontrado no DOM. Verifique o HTML.');
        return;
    }

    // NOVO: Verificação adicional para garantir que 'select' é um elemento <select> com a propriedade 'options'
    if (!select.options || typeof select.options.length === 'undefined') {
        console.error('populateEntryDataProcessFilterForCustomEntry: O elemento com ID "filterCustomEntryProcess" não parece ser um <select> válido ou não possui a propriedade "options".', select);
        return; // Impede o TypeError se não for um <select>
    }

    // Limpa opções existentes (exceto a primeira "Todos")
    while (select.options.length > 1) { // AQUI É A LINHA 1992 se for a primeira linha executável dentro do `while`
        select.remove(1);
    }

    const uniqueProcesses = new Set();
    // Adiciona processos de customEntryData
    if (Array.isArray(customEntryData)) {
        customEntryData.forEach(entry => {
            if (entry && entry.process && typeof entry.process === 'string' && entry.process.trim() !== '') {
                uniqueProcesses.add(entry.process.trim());
            }
        });
    }
    // Adiciona processos de ordens (fullOrdersList) também, para consistência
    if (Array.isArray(fullOrdersList)) {
        fullOrdersList.forEach(order => {
            if (order && order.process && typeof order.process === 'string' && order.process.trim() !== '') {
                uniqueProcesses.add(order.process.trim());
            }
        });
    }

    const sortedProcesses = Array.from(uniqueProcesses).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    sortedProcesses.forEach(process => {
        const option = document.createElement('option');
        option.value = process;
        option.textContent = process;
        select.appendChild(option);
    });
}

// --- FUNÇÕES ESPECÍFICAS PARA A ABA 'DADOS DE ENTRADA' (Personalizados) ---

async function loadCustomEntryData(forceReload = false) { // Adiciona forceReload
    if (!canManageCustomEntryData()) {
        console.warn('AVISO: loadCustomEntryData - Usuário sem permissão para carregar dados personalizados.');
        customEntryData = [];
        return;
    }

    if (hasLoadedCustomEntryData && !forceReload) {
        console.log('⏳ [loadCustomEntryData] Dados de Entrada Personalizados já carregados. Pulando recarregamento da API.');
        return; // Retorna imediatamente se já carregado
    }

    console.log('DEBUG: loadCustomEntryData - Iniciando carregamento de Dados de Entrada Personalizados...');

    try {
        const response = await fetch(`${API_BASE_URL}/get_entry_data_custom.php?_=${new Date().getTime()}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('ERRO HTTP ao carregar Dados de Entrada Personalizados:', response.status, response.statusText, errorText);
            throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
            customEntryData = data.data.map(item => ({
                id: item.id,
                process: item.process,
                company: item.company,
                value: parseFloat(item.value || 0),
                entry_date: item.entry_date ? item.entry_date.split('T')[0] : '', // Garante formato YYYY-MM-DD
                observation: item.observation || '',
                status: item.status || 'Pendente', // Adicionado status padrão
                payment_date: item.payment_date || null, // NOVO: Data do pagamento
                payment_observation: item.payment_observation || '', // NOVO: Observação do pagamento
                proof_data: item.proof_data || null, // NOVO: Dados do comprovante
                proof_file_name: item.proof_file_name || null, // NOVO: Nome do arquivo
                proof_mime_type: item.proof_mime_type || null, // NOVO: Tipo MIME
                created_by: item.created_by,
                created_at: item.created_at
            }));
            hasLoadedCustomEntryData = true; // Define a flag como true em caso de sucesso
            console.log(`DEBUG: loadCustomEntryData - ${customEntryData.length} Dados de Entrada Personalizados carregados com sucesso.`);
        } else {
            console.warn('AVISO: loadCustomEntryData - Nenhum dado de entrada personalizado encontrado ou falha na resposta da API.', data);
            customEntryData = [];
            hasLoadedCustomEntryData = false; // Define a flag como false em caso de erro
        }
    } catch (error) {
        console.error('ERRO: Erro de conexão ao carregar Dados de Entrada Personalizados:', error);
        customEntryData = [];
        hasLoadedCustomEntryData = false; // Define a flag como false em caso de erro
        showSystemMessage('Erro ao carregar Dados de Entrada Personalizados. Verifique o console.', 'error');
    } finally {
        hideLoadingOverlay(); // Esconde o overlay
    }
}

// NOVA FUNÇÃO: Popula o select de empresas para o formulário de Dados de Entrada Personalizados
function populateEntryCompaniesDatalist() {
    const selectElement = document.getElementById('entryCompany');
    const filterSelectElement = document.getElementById('filterCustomEntryCompany');
    
    // Limpa opções existentes, exceto a primeira (selecione...)
    if (selectElement) {
        selectElement.innerHTML = '<option value="">Selecione uma empresa...</option>';
    }
    if (filterSelectElement) {
        filterSelectElement.innerHTML = '<option value="">Todas</option>';
    }

    const companyNames = new Set();
    const fixedCompanies = ["Facilita Serviços", "T Santana", "Maia Silva", "DDSJ"]; // Suas empresas fixas
    fixedCompanies.forEach(company => companyNames.add(company));
    
    // Adiciona empresas das ordens existentes
    if (Array.isArray(fullOrdersList)) {
        fullOrdersList.forEach(order => {
            if (order.company && typeof order.company === 'string' && order.company.trim() !== '') {
                companyNames.add(order.company.trim());
            }
        });
    }

    // Adiciona empresas dos dados de entrada personalizados existentes
    if (Array.isArray(customEntryData)) {
        customEntryData.forEach(entry => {
            if (entry.company && typeof entry.company === 'string' && entry.company.trim() !== '') {
                companyNames.add(entry.company.trim());
            }
        });
    }

    const sortedCompanies = Array.from(companyNames).sort();
    
    sortedCompanies.forEach(company => {
        const option1 = document.createElement('option');
        option1.value = company;
        option1.textContent = company;
        if (selectElement) selectElement.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = company;
        option2.textContent = company;
        if (filterSelectElement) filterSelectElement.appendChild(option2);
    });
}

async function addCustomEntryData() {
    // ✅ VALIDAÇÃO 1: Verificar permissões
    if (!canManageCustomEntryData()) {
        alert('Você não tem permissão para cadastrar Dados de Entrada Personalizados.');
        console.warn('❌ Permissão negada para cadastrar dados de entrada');
        return;
    }
    
    try {
        // ✅ VALIDAÇÃO 2: Obter elementos do DOM
        const processElement = document.getElementById('entryProcess');
        const companyElement = document.getElementById('entryCompany');
        const valueElement = document.getElementById('entryValue');
        const dateElement = document.getElementById('entryDate');
        const observationElement = document.getElementById('entryObservation');
        
        // Verificar se todos os elementos existem
        if (!processElement || !companyElement || !valueElement || !dateElement) {
            console.error('❌ ERRO CRÍTICO: Um ou mais elementos do formulário não existem no DOM');
            alert('ERRO: Formulário incompleto. Recarregue a página e tente novamente.');
            return;
        }
        
        // ✅ VALIDAÇÃO 3: Extrair e limpar valores
        const process = processElement.value.trim();
        const company = companyElement.value.trim();
        const valueFormatted = valueElement.value.trim();
        const entryDate = dateElement.value.trim();
        const observation = observationElement ? observationElement.value.trim() : '';
        
        // Desformatar valor monetário
        const value = unformatMonetaryValue(valueFormatted);
        
        console.log('📝 Dados capturados:', {
            process,
            company,
            valueFormatted,
            value,
            entryDate,
            observation
        });
        
        // ✅ VALIDAÇÃO 4: Validar campos obrigatórios
        if (!process) {
            alert('Por favor, preencha o campo "Processo".');
            processElement.focus();
            return;
        }
        
        if (!company) {
            alert('Por favor, selecione uma "Empresa".');
            companyElement.focus();
            return;
        }
        
        if (isNaN(value) || value <= 0) {
            alert('Por favor, insira um "Valor da Nota" válido (maior que zero).');
            valueElement.focus();
            return;
        }
        
        if (!entryDate) {
            alert('Por favor, selecione uma "Data de Registro".');
            dateElement.focus();
            return;
        }
        
        // ✅ VALIDAÇÃO 5: Verificar usuário autenticado
        if (!currentUser || !currentUser.username) {
            alert('Erro: Usuário atual não identificado. Por favor, faça login novamente.');
            console.error('❌ Usuário não autenticado');
            return;
        }
        
        // ✅ CRIAR OBJETO DE ENTRADA
        const newEntry = {
            id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            process: process,
            company: company,
            value: value,
            entry_date: entryDate,
            observation: observation,
            status: 'Pendente',
            created_by: currentUser.username,
            created_at: new Date().toISOString(),
            notas: [] // Array para armazenar notas associadas
        };
        
        console.log('✓ Objeto de entrada criado:', newEntry);
        
        // ✅ ATUALIZAÇÃO OTIMISTA: Adicionar à tabela IMEDIATAMENTE (feedback visual)
        showLoadingOverlay('Cadastrando Dado de Entrada...');
        
        // Adicionar localmente
        if (!customEntryData) {
            customEntryData = [];
        }
        customEntryData.unshift(newEntry);
        
        // Atualizar UI imediatamente
        displayCustomEntryData();
        clearCustomEntryForm();
        
        console.log('✓ Adicionado à interface local. Total de registros:', customEntryData.length);
        
        // ✅ ENVIAR PARA O BACKEND
        try {
            const response = await fetch(`${API_BASE_URL}/add_entry_data_custom.php?_=${new Date().getTime()}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(newEntry)
            });
            
            const data = await response.json();
            
            hideLoadingOverlay();
            
            if (data.success) {
                console.log('✅ [Backend] Dado de Entrada cadastrado com sucesso!');
                
                // Se o backend retorna um ID real, atualiza o item local
                if (data.newId) {
                    const localIndex = customEntryData.findIndex(e => e.id === newEntry.id);
                    if (localIndex !== -1) {
                        customEntryData[localIndex].id = data.newId;
                        console.log(`✓ ID atualizado: ${newEntry.id} → ${data.newId}`);
                    }
                }
                
                // Notificação de sucesso
                showModernSuccessNotification('✓ Dado de Entrada cadastrado com sucesso!');
                
                // Atualizar datalists
                populateEntryCompaniesDatalist();
                populateProcessesDatalist();
                
                // Atualizar contadores
                updateCounters();
                updateDetailedCounters();
                
                // Recarregar a tabela para refletir mudanças
                setTimeout(() => {
                    displayCustomEntryData();
                }, 500);
                
            } else {
                console.error('❌ [Backend] Erro ao cadastrar:', data.error);
                showModernErrorNotification('Erro ao cadastrar: ' + (data.error || 'Erro desconhecido'));
                
                // Reverter atualização otimista
                customEntryData = customEntryData.filter(e => e.id !== newEntry.id);
                displayCustomEntryData();
            }
            
        } catch (error) {
            hideLoadingOverlay();
            console.error('❌ [Conexão] Erro ao conectar ao servidor:', error);
            showModernErrorNotification('Erro de conexão ao cadastrar. Verifique sua internet.');
            
            // Reverter atualização otimista
            customEntryData = customEntryData.filter(e => e.id !== newEntry.id);
            displayCustomEntryData();
        }
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('❌ ERRO ao processar dados:', error);
        alert('ERRO ao processar formulário:\n\n' + error.message);
    }
}

// ===== VARIÁVEL DE CONTROLE DE ESTADO =====
let isFirstNoteRegistered = false;

// ===== CADASTRAR NOTA COM TRANSIÇÃO =====
function cadastrarNotaComTransicao() {
    // Validar dados
    const mes = document.getElementById('mesInput').value.trim();
    const valor = document.getElementById('valorNotaInput').value.trim();
    const data = document.getElementById('dataNotaInput').value.trim();
    
    if (!mes || !valor || !data) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    // Desformatar valor
    const valorNumerico = unformatMonetaryValue(valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
        alert('Valor inválido.');
        return;
    }
    
    // ✅ REGISTRAR NOTA
    const novaNota = {
        mes: mes,
        valor: valorNumerico,
        data: data,
        id: `temp_${Date.now()}`
    };
    
    notasTemporarias.push(novaNota);
    console.log('✓ Nota cadastrada:', novaNota);
    
    // ✅ EXIBIR NOTA NA LISTA
    document.getElementById('containerNotasMultiplas').style.display = 'block';
    adicionarLinhaNotaEmExibicao(novaNota);
    
    // ✅ TRANSIÇÃO DE ESTADO
    if (!isFirstNoteRegistered) {
        isFirstNoteRegistered = true;
        atualizarEstadoBotao();
    }
    
    // ✅ PREPARAR PRÓXIMA ENTRADA
    selecionarProximoMesAutomaticamente(mes);
    limparCamposFormulario(); // Limpa apenas os campos, não o mês
    
    // ✅ FEEDBACK VISUAL
    mostrarNotificacaoSucesso(`Nota de ${mes} cadastrada com sucesso!`);
    
    // ✅ RETORNAR FOCO
    setTimeout(() => {
        document.getElementById('valorNotaInput').focus();
    }, 300);
}

// ===== ATUALIZAR ESTADO DO BOTÃO =====
function atualizarEstadoBotao() {
    const botao = document.getElementById('btnCadastrarNota');
    
    // Transição suave
    botao.style.transition = 'all 0.3s ease';
    
    // Atualizar conteúdo
    botao.innerHTML = '<i class="fas fa-plus"></i> Adicionar Outra Nota';
    
    // Manter classes CSS (classe btn-success permanece)
    // Adicionar classe opcional para diferenciar visualmente
    botao.classList.add('btn-multiple-add');
}

// ===== SELECIONAR PRÓXIMO MÊS AUTOMATICAMENTE =====
function selecionarProximoMesAutomaticamente(mesAtual) {
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    const indexAtual = meses.indexOf(mesAtual);
    const indexProximo = (indexAtual + 1) % 12; // Volta a janeiro se dezembro
    
    const selectMes = document.getElementById('mesInput');
    
    // ✅ FEEDBACK VISUAL DE SELEÇÃO AUTOMÁTICA
    selectMes.value = meses[indexProximo];
    selectMes.style.backgroundColor = '#e3f2fd'; // Azul claro suave
    
    // Remover feedback após 2 segundos
    setTimeout(() => {
        selectMes.style.backgroundColor = '';
    }, 2000);
    
    console.log(`✓ Próximo mês selecionado: ${meses[indexProximo]}`);
}

// ===== LIMPAR APENAS OS CAMPOS DE ENTRADA (NÃO O MÊS) =====
function limparCamposFormulario() {
    document.getElementById('valorNotaInput').value = '';
    document.getElementById('dataNotaInput').value = '';
}

// ===== REMOVER NOTA TEMPORÁRIA =====
function removerNotaTemporaria(notaId) {
    notasTemporarias = notasTemporarias.filter(nota => nota.id !== notaId);
    const elemento = document.querySelector(`[data-nota-id="${notaId}"]`);
    
    if (elemento) {
        elemento.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => elemento.remove(), 300);
    }
    
    if (notasTemporarias.length === 0) {
        document.getElementById('containerNotasMultiplas').style.display = 'none';
        resetarEstadoBotao();
    }
}

// ===== RESETAR ESTADO DO BOTÃO (quando todas as notas são removidas) =====
function resetarEstadoBotao() {
    isFirstNoteRegistered = false;
    const botao = document.getElementById('btnCadastrarNota');
    botao.innerHTML = '<i class="fas fa-check"></i> Cadastrar Nota';
    botao.classList.remove('btn-multiple-add');
}


// Exemplo de implementação
const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
               'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function selecionarProximoMes(mesAtual) {
    const indexAtual = meses.indexOf(mesAtual);
    
    // Se dezembro, volta para janeiro (próximo ano)
    const indexProximo = (indexAtual + 1) % 12;
    
    document.getElementById('mesInput').value = meses[indexProximo];
    
    // Aplicar feedback visual
    document.getElementById('mesInput').style.backgroundColor = '#e3f2fd';
    setTimeout(() => {
        document.getElementById('mesInput').style.backgroundColor = '#ffffff';
    }, 2000);
}

function toggleAddCustomEntryDataForm() {
    const formContainer = document.getElementById('addCustomEntryDataFormContainer');
    const toggleBtn = document.getElementById('toggleAddCustomEntryDataFormBtn');
    
    if (!formContainer || !toggleBtn) {
        console.warn('Elementos do formulário de dados de entrada ou botão "Cadastrar Novo Dado de Entrada" não encontrados no DOM.');
        return;
    }
    
    const isCurrentlyVisible = formContainer.style.display !== 'none';
    
    if (isCurrentlyVisible) {
        // Esconder formulário
        formContainer.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-plus"></i> Cadastrar Novo Dado de Entrada';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-success');
        if (typeof clearCustomEntryForm === 'function') {
            clearCustomEntryForm();
        }
    } else {
        // Mostrar formulário
        formContainer.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-times"></i> Fechar Formulário';
        toggleBtn.classList.remove('btn-success');
        toggleBtn.classList.add('btn-secondary');
        
        // Limpar o formulário e definir a data atual
        if (typeof clearCustomEntryForm === 'function') {
            clearCustomEntryForm();
        }
        const entryDateField = document.getElementById('entryDate');
        if (entryDateField) {
            entryDateField.value = new Date().toISOString().split('T')[0];
        }
        populateEntryCompaniesDatalist(); // Popula o select de empresas no formulário
        populateProcessesDatalist();      // Popula o datalist de processos
    }
}

// MODIFICADO: Abre o modal para registrar o pagamento de um Dado de Entrada Personalizado
async function payCustomEntryData(entryId) {
    if (!canManageCustomEntryData()) {
        alert('Você não tem permissão para pagar Dados de Entrada Personalizados.');
        return;
    }

    const entry = customEntryData.find(e => e.id === entryId);
    if (!entry) {
        alert('Dado de Entrada não encontrado.');
        return;
    }

    if (entry.status === 'Pago') {
        alert('Este Dado de Entrada já está pago.');
        return;
    }

    currentCustomEntryDataId = entryId; // Armazena o ID globalmente

    // Preenche os detalhes no modal
    const customEntryPaymentDetails = document.getElementById('customEntryPaymentDetails');
    customEntryPaymentDetails.innerHTML = `
        <strong>Processo:</strong> ${escapeForHTML(entry.process)}<br>
        <strong>Empresa:</strong> ${escapeForHTML(entry.company)}<br>
        <strong>Valor:</strong> ${formatCurrency(entry.value)}
    `;

    // Preenche o valor do pagamento (que é o valor do dado de entrada)
    document.getElementById('customEntryPaymentAmount').value = entry.value.toFixed(2);
    // Preenche a data com a data atual
    document.getElementById('customEntryPaymentDate').value = new Date().toLocaleDateString('en-CA');

    // Abre o modal
    document.getElementById('customEntryPaymentModal').style.display = 'block';

    // Configura o botão de confirmação do modal
    const confirmBtn = document.getElementById('confirmCustomEntryPaymentBtn');
    if (confirmBtn) {
        // Remove qualquer listener anterior para evitar duplicatas
        confirmBtn.onclick = null;
        // Adiciona o novo listener para chamar a função de processamento
        confirmBtn.onclick = () => processCustomEntryPaymentWithProof(entryId);
    }
}

// NOVA FUNÇÃO: Processa o pagamento e comprovante de um Dado de Entrada
async function processCustomEntryPaymentWithProof(entryId) {
    const fileInput = document.getElementById('customEntryProofFile');
    const observationInput = document.getElementById('customEntryPaymentObservation');
    const paymentDateInput = document.getElementById('customEntryPaymentDate');
    const paymentAmountInput = document.getElementById('customEntryPaymentAmount');

    // Validar se arquivo foi selecionado
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Por favor, selecione um arquivo de comprovante!');
        return;
    }
    // Validar se a data foi selecionada
    if (!paymentDateInput.value) {
        alert('Por favor, selecione a data de pagamento!');
        return;
    }

    const file = fileInput.files[0];
    const observation = observationInput.value.trim();
    const paymentDate = paymentDateInput.value;
    const paymentAmount = parseFloat(paymentAmountInput.value);

    const maxSize = 30 * 1024 * 1024; // 30MB em bytes
    if (file.size > maxSize) {
        alert('O arquivo é muito grande! Tamanho máximo: 30MB');
        return;
    }
    
    // Validar tipo do arquivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
        alert('Tipo de arquivo não permitido! Use apenas PDF, JPG, JPEG ou PNG.');
        return;
    }

    // Desabilitar botão para evitar cliques duplos e mostrar loading
    const confirmBtn = document.getElementById('confirmCustomEntryPaymentBtn');
    const originalButtonText = confirmBtn ? confirmBtn.innerHTML : '💰 Confirmar Pagamento';

    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    }
    

    try {
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        
        const payload = {
            id: entryId,
            status: 'Pago',
            payment_date: paymentDate,
            payment_observation: observation,
            proof_data: base64Data,
            proof_file_name: file.name,
            proof_mime_type: file.type
        };
        
        const response = await fetch(`${API_BASE_URL}/update_entry_data_custom.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            showModernSuccessNotification('Dado de Entrada marcado como PAGO com sucesso!');
            closeCustomEntryPaymentModal(); // Fecha o modal
            
            // Recarrega todos os dados afetados para garantir a consistência
            await loadCustomEntryData(); // Recarrega os dados de entrada
            displayCustomEntryData();    // Atualiza a exibição da tabela de Dados de Entrada

            // ATUALIZAÇÃO CRÍTICA: Recarrega os dados do Dashboard de Saída
            await loadDashboardData();
            renderDashboard();
            
            // Recarrega contadores gerais e detalhados
            updateCounters();
            updateDetailedCounters();

        } else {
            console.error('Erro na API:', data.error);
            showModernErrorNotification('Erro ao processar pagamento: ' + (data.error || 'Erro desconhecido'));
        }

    } catch (error) {
        console.error('Erro ao processar pagamento:', error); 
        showModernErrorNotification('Erro ao processar pagamento. Verifique o console.');
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalButtonText; // Restaurar texto original
        }
        hideLoadingOverlay();
    }
}

// NOVA FUNÇÃO: Fechar o modal de pagamento de Dado de Entrada
function closeCustomEntryPaymentModal() {
    document.getElementById('customEntryPaymentModal').style.display = 'none';
    document.getElementById('customEntryPaymentForm').reset(); // Limpa o formulário
    currentCustomEntryDataId = null; // Limpa o ID global
}

function clearCustomEntryForm() {
    try {
        const form = document.getElementById('entryDataForm');
        
        if (form) {
            form.reset();
        }
        
        // Limpar campos específicos explicitamente
        const fields = [
            'entryProcess', 
            'entryCompany', 
            'entryValue',      // ← NOVO CAMPO
            'entryObservation'
        ];
        
        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = '';
            }
        });
        
        // Definir data atual como padrão
        const dateElement = document.getElementById('entryDate');
        if (dateElement) {
            dateElement.value = new Date().toISOString().split('T')[0];
        }
        
        console.log('✓ Formulário limpo com sucesso');
        
    } catch (error) {
        console.error('Erro ao limpar formulário:', error);
    }
}

function validateFormElementsExist() {
    const requiredFields = [
        'entryProcess',
        'entryCompany',
        'entryValue',      // ← NOVO CAMPO
        'entryDate',
        'entryObservation'
    ];
    
    const missingFields = [];
    
    requiredFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (!element) {
            missingFields.push(fieldId);
            console.error(`❌ ELEMENTO NÃO ENCONTRADO: #${fieldId}`);
        } else {
            console.log(`✓ Elemento encontrado: #${fieldId}`);
        }
    });
    
    if (missingFields.length > 0) {
        alert(`ERRO: Os seguintes campos não foram encontrados no formulário:\n\n${missingFields.join('\n')}\n\nVerifique o HTML.`);
        return false;
    }
    
    return true;
}

// ===== FORMATAÇÃO DE VALOR MONETÁRIO =====
function formatMonetaryInput(event) {
    let value = event.target.value;
    
    // Remove caracteres não numéricos exceto vírgula e ponto
    value = value.replace(/[^\d,.-]/g, '');
    
    // Se estiver vazio ou for apenas "R$", deixa em branco
    if (!value || value === '-') {
        event.target.value = '';
        return;
    }
    
    // Converte para número
    let numericValue = parseFloat(value.replace(',', '.'));
    
    // Se for um número válido, formata
    if (!isNaN(numericValue)) {
        event.target.value = 'R$ ' + numericValue.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}

// ===== REMOVER FORMATAÇÃO AO ENVIAR =====
function unformatMonetaryValue(formattedValue) {
    return parseFloat(
        formattedValue
            .replace('R$', '')
            .replace('.', '')
            .replace(',', '.')
            .trim()
    );
}

async function editCustomEntryData(entryId) {
    if (!canManageCustomEntryData()) {
        alert('Você não tem permissão para editar Dados de Entrada Personalizados.');
        return;
    }

    const entry = customEntryData.find(e => e.id === entryId);
    if (!entry) {
        alert('Dado de Entrada não encontrado.');
        return;
    }

    editingCustomEntryDataId = entryId;

    const editFormHtml = `
        <form id="editCustomEntryFormElement">
            <div class="form-row">
                <div class="form-group">
                    <label for="editEntryProcess">Processo <span class="required">*</span></label>
                    <input type="text" id="editEntryProcess" value="${escapeForHTML(entry.process)}" list="processesList" required>
                </div>
                <div class="form-group">
                    <label for="editEntryCompany">Empresa <span class="required">*</span></label>
                    <select id="editEntryCompany" name="editEntryCompany" class="form-control" required>
                        <!-- Opções serão inseridas aqui via JS -->
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="editEntryValue">Valor da Nota (R$) <span class="required">*</span></label>
                    <input type="number" id="editEntryValue" step="0.01" value="${entry.value}" required>
                </div>
                <div class="form-group">
                    <label for="editEntryDate">Data de Registro <span class="required">*</span></label>
                    <input type="date" id="editEntryDate" value="${entry.entry_date}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Status:</label>
                <span class="status-badge status-${entry.status.toLowerCase()}">${escapeForHTML(entry.status)}</span>
                <!-- O campo de status foi removido para não ser editável, mas seu valor é exibido -->
            </div>
            <!-- NOVO CAMPO DE OBSERVAÇÃO NO MODAL DE EDIÇÃO -->
            <div class="form-group">
                <label for="editEntryObservation">Observação</label>
                <textarea id="editEntryObservation" placeholder="Observações adicionais (opcional)" rows="3" style="width: 100%; resize: vertical;">${escapeForHTML(entry.observation || '')}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-success" onclick="saveEditCustomEntryData()">Salvar Alterações</button>
                <button type="button" class="btn btn-secondary" onclick="closeEditCustomEntryDataModal()">Cancelar</button>
            </div>
        </form>
    `;
    
    const editModal = document.createElement('div');
    editModal.id = 'editCustomEntryDataModal';
    editModal.className = 'modal';
    editModal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeEditCustomEntryDataModal()">&times;</span>
            <h2>Editar Dado de Entrada</h2>
            <div id="editCustomEntryDataFormContainer">
                ${editFormHtml}
            </div>
        </div>
    `;
    document.body.appendChild(editModal);
    editModal.style.display = 'block';

// Popular o select de empresas no modal de edição
const companySelectElement = document.getElementById('editEntryCompany');
if (companySelectElement) {
    const companyNames = new Set();
    const fixedCompanies = ["Facilita Serviços", "T Santana", "Maia Silva", "DDSJ"];
    fixedCompanies.forEach(company => companyNames.add(company));
    if (Array.isArray(fullOrdersList)) {
        fullOrdersList.forEach(order => {
            if (order.company && typeof order.company === 'string' && order.company.trim() !== '') {
                companyNames.add(order.company.trim());
            }
        });
    }
    if (Array.isArray(customEntryData)) {
        customEntryData.forEach(e => {
            if (e.company && typeof e.company === 'string' && e.company.trim() !== '') {
                companyNames.add(e.company.trim());
            }
        });
    }

    companySelectElement.innerHTML = '<option value="">Selecione uma empresa...</option>';
    Array.from(companyNames).sort().forEach(companyName => {
        const option = document.createElement('option');
        option.value = companyName;
        option.textContent = companyName;
        if (companyName === entry.company) {
            option.selected = true;
        }
        companySelectElement.appendChild(option);
    });
}

// NOVO: Popular o datalist de processos no modal de edição
const processDatalist = document.getElementById('processesList');
if (processDatalist) {
    // Limpar datalist existente
    processDatalist.innerHTML = '';
    
    const processNames = new Set();
    
    // Adicionar processos de fullOrdersList
    if (Array.isArray(fullOrdersList)) {
        fullOrdersList.forEach(order => {
            if (order.process && typeof order.process === 'string' && order.process.trim() !== '') {
                processNames.add(order.process.trim());
            }
        });
    }
    
    // Adicionar processos de customEntryData
    if (Array.isArray(customEntryData)) {
        customEntryData.forEach(e => {
            if (e.process && typeof e.process === 'string' && e.process.trim() !== '') {
                processNames.add(e.process.trim());
            }
        });
    }
    
    // Adicionar processos fixos comuns (se houver)
    const commonProcesses = ["Marketing", "Vendas", "Administrativo", "Financeiro", "RH", "TI"];
    commonProcesses.forEach(process => processNames.add(process));
    
    // Popular o datalist
    Array.from(processNames).sort().forEach(processName => {
        const option = document.createElement('option');
        option.value = processName;
        processDatalist.appendChild(option);
    });
    
    console.log(`DEBUG: Datalist de processos populado com ${processNames.size} itens.`);
}
}

// Fecha o modal de edição de Dado de Entrada
function closeEditCustomEntryDataModal() {
    const modal = document.getElementById('editCustomEntryDataModal');
    if (modal) {
        modal.remove();
    }
    editingCustomEntryDataId = null;
}

// script.js
// APROX. LINHA 2772: async function saveEditCustomEntryData() {
async function saveEditCustomEntryData() {
    if (!editingCustomEntryDataId) return;

    const entryIndex = customEntryData.findIndex(e => e.id === editingCustomEntryDataId);
    if (entryIndex === -1) {
        alert('Dado de Entrada não encontrado.');
        return;
    }

    // --- INÍCIO DA ATUALIZAÇÃO OTTIMISTA ---
    // Salva uma cópia do estado original para reverter em caso de erro
    const originalEntryState = { ...customEntryData[entryIndex] };
    // --- FIM DA ATUALIZAÇÃO OTTIMISTA ---

    const process = document.getElementById('editEntryProcess').value.trim();
    const company = document.getElementById('editEntryCompany').value.trim();
    const value = parseFloat(document.getElementById('editEntryValue').value);
    const entryDate = document.getElementById('editEntryDate').value;
    const observation = document.getElementById('editEntryObservation').value.trim(); // NOVO CAMPO DE OBSERVAÇÃO

    if (!process || !company || isNaN(value) || value <= 0 || !entryDate) {
        alert('Por favor, preencha todos os campos obrigatórios (Processo, Empresa, Valor da Nota, Data de Registro).');
        return;
    }

    const updatedFields = {
        id: editingCustomEntryDataId,
        process: process,
        company: company,
        value: value,
        entry_date: entryDate,
        observation: observation // Inclui a observação no update
    };
    // Não edita o status, created_by, created_at, etc. por aqui

    // --- CONTINUAÇÃO DA ATUALIZAÇÃO OTTIMISTA ---
    // Aplica as mudanças no array local IMEDIATAMENTE
    Object.assign(customEntryData[entryIndex], updatedFields);
    displayCustomEntryData(); // Redesenha a tabela para mostrar as mudanças
    closeEditCustomEntryDataModal(); // Fecha o modal instantaneamente
    // --- FIM DA ATUALIZAÇÃO OTTIMISTA ---

    try {
        const response = await fetch(`${API_BASE_URL}/update_entry_data_custom.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedFields)
        });
        const data = await response.json();

        if (data.success) {
            showModernSuccessNotification('Dado de Entrada atualizado com sucesso!');
            populateEntryCompaniesDatalist(); // Re-popula datalists/selects
        } else {
            console.warn('Erro ao atualizar Dado de Entrada na API:', data.error);
            showModernErrorNotification('Erro ao atualizar Dado de Entrada: ' + (data.error || 'Erro desconhecido. Item revertido.'));
            
            // --- REVERTER ATUALIZAÇÃO OTTIMISTA ---
            Object.assign(customEntryData[entryIndex], originalEntryState); // Reverte o item
            displayCustomEntryData(); // Redesenha a tabela
            // --- FIM DA REVERSÃO ---
        }
    } catch (error) {
        console.error('Erro de conexão ao atualizar Dado de Entrada:', error);
        showModernErrorNotification('Erro de conexão ao atualizar Dado de Entrada. Verifique sua internet. Item revertido.');
        
        // --- REVERTER ATUALIZAÇÃO OTTIMISTA ---
        Object.assign(customEntryData[entryIndex], originalEntryState); // Reverte o item
        displayCustomEntryData(); // Redesenha a tabela
        // --- FIM DA REVERSÃO ---
    } finally {
        hideLoadingOverlay();
    }
}
async function deleteCustomEntryData(entryId) {
    if (!canManageCustomEntryData()) {
        alert('Você não tem permissão para excluir Dados de Entrada Personalizados.');
        return;
    }

    const entry = customEntryData.find(e => e.id === entryId);
    if (!entry) {
        alert('Dado de Entrada não encontrado.');
        return;
    }

    if (!confirm(`Tem certeza que deseja EXCLUIR o dado de entrada para "${entry.company}" (Valor: R\$ ${entry.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})})?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }

    // --- INÍCIO DA ATUALIZAÇÃO OTTIMISTA DA UI ---
    console.log(`[DEBUG DELETE] Tentando remover visualmente item com entryId: ${entryId}`); // <--- NOVO LOG
    const rowElement = document.querySelector(`tr[data-entry-id="${entryId}"]`);
    
    if (rowElement) {
        console.log(`[DEBUG DELETE] Elemento TR encontrado para entryId: ${entryId}`); // <--- NOVO LOG
        rowElement.style.opacity = '0'; // Começa a animação de fade-out
        rowElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out'; // Animação de fade e slide
        rowElement.style.transform = 'translateX(100%)'; // Move para a direita
        console.log(`UI: Dado de entrada ${entryId} removido otimisticamente do display.`);
    } else {
        console.warn(`[DEBUG DELETE] Elemento TR NÃO encontrado para entryId: ${entryId}. A remoção visual instantânea não ocorrerá.`); // <--- NOVO LOG
        // Se o elemento não for encontrado, a animação não pode ser aplicada.
        // A exclusão ainda ocorrerá após a resposta do servidor, mas não será instantânea.
    }
    // --- FIM DA ATUALIZAÇÃO OTTIMISTA DA UI ---

    try {
        const response = await fetch(`${API_BASE_URL}/delete_entry_data_custom.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: entryId })
        });
        const data = await response.json();

        if (data.success) {
            showModernSuccessNotification('Dado de Entrada excluído com sucesso!');
            
            // Remove o item do array local customEntryData para refletir a mudança
            customEntryData = customEntryData.filter(e => e.id !== entryId);

            // Re-renderiza a tabela (isso irá remover a linha faded-out e atualizar contadores/paginação)
            displayCustomEntryData();
            populateEntryCompaniesDatalist();

        } else {
            console.warn('Erro ao sincronizar exclusão com API:', data.error);
            showModernErrorNotification('Atenção: Houve um erro ao sincronizar a exclusão com o servidor: ' + data.error);
            
            // --- REVERTER ATUALIZAÇÃO OTTIMISTA EM CASO DE ERRO ---
            if (rowElement) {
                rowElement.style.opacity = '1';
                rowElement.style.transform = 'translateX(0)';
                console.log(`UI: Revertendo remoção otimista para ${entryId} devido a erro da API.`);
                displayCustomEntryData(); // Chama displayCustomEntryData para garantir que o estado da tabela seja restaurado
            } else {
                displayCustomEntryData(); // Força uma atualização para refletir o estado do backend
            }
            // --- FIM DA REVERSÃO ---
        }
    } catch (error) {
        console.error('Erro de conexão ao excluir Dado de Entrada:', error);
        showModernErrorNotification('Atenção: Erro de conexão ao tentar excluir Dado de Entrada. Verifique sua internet.');
        
        // --- REVERTER ATUALIZAÇÃO OTTIMISTA EM CASO DE ERRO DE CONEXÃO ---
        if (rowElement) {
            rowElement.style.opacity = '1';
            rowElement.style.transform = 'translateX(0)';
            console.log(`UI: Revertendo remoção otimista para ${entryId} devido a erro de conexão.`);
            displayCustomEntryData(); // Chama displayCustomEntryData para garantir que o estado da tabela seja restaurado
        } else {
             displayCustomEntryData(); // Força uma atualização para refletir o estado do backend
        }
        // --- FIM DA REVERSÃO ---
    } finally {
        hideLoadingOverlay(); // Esconde o overlay de carregamento
    }
}

function createCustomEntryDataRow(entry) {
    const row = document.createElement('tr');
    row.setAttribute('data-entry-id', entry.id);
    row.classList.add('entry-data-row');

    let actionButtons = '';

    // ✅ Botão ÚNICO "Adicionar Nota" - APENAS NA COLUNA AÇÕES
    actionButtons += `<button class="btn btn-warning btn-small" 
        onclick="abrirSecaoNotas('${entry.id}', '${escapeForHTML(entry.process)}', '${escapeForHTML(entry.company)}')"
        title="Adicionar notas para este processo">
        <i class="fas fa-plus"></i> Nota
    </button>`;

    if (entry.status === 'Pendente' && canManageCustomEntryData()) {
        actionButtons += `<button class="btn btn-success btn-small" onclick="payCustomEntryData('${entry.id}')">
            <i class="fas fa-money-bill-wave"></i> Pagar
        </button>`;
    }

    if (canManageCustomEntryData()) {
        actionButtons += `<button class="btn btn-info btn-small" onclick="editCustomEntryData('${entry.id}')">
            <i class="fas fa-edit"></i> Editar
        </button>`;
        actionButtons += `<button class="btn btn-danger btn-small" onclick="deleteCustomEntryData('${entry.id}')">
            <i class="fas fa-trash"></i> Remover
        </button>`;
    }

    row.innerHTML = `
        <td>${escapeForHTML(entry.process)}</td>
        <td>${escapeForHTML(entry.company)}</td>
        <td>${escapeForHTML(entry.observation || '-')}</td>
        <td>${formatDate(entry.entry_date)}</td>
        <td><span class="status-badge status-${entry.status.toLowerCase()}">${escapeForHTML(entry.status)}</span></td>
        <td>
            <div class="action-buttons">
                ${actionButtons}
            </div>
        </td>
    `;

    return row;
}

// ✅ Função para abrir seção de notas (MANTÉM ASSOCIAÇÃO COM PROCESSO)
function abrirSecaoNotas(entryDataId, processo, empresa) {
    entryDataIdAtual = entryDataId;
    entryDataAtual = customEntryData.find(entry => entry.id === entryDataId);
    notasTemporarias = [];
    
    // Preenchem informações do processo específico
    document.getElementById('infoProcesso').textContent = processo;
    document.getElementById('infoEmpresa').textContent = empresa;
    
    const secao = document.getElementById('secaoAdicionarNota');
    secao.style.display = 'block';
    document.getElementById('containerNotasMultiplas').style.display = 'none';
    
    limparFormularioNota();
    
    // Rola para deixar a seção de notas visível no contexto da tabela
    secao.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    document.getElementById('mesInput').focus();
    
    console.log(`✓ Adicionando notas para: ${processo} (${empresa})`);
}

// Função principal para exibir Dados de Entrada Personalizados na tabela
function displayCustomEntryData() {
    console.log('DEBUG: displayCustomEntryData - Iniciada.');
    
    const tbody = document.getElementById('entryDataTableBody');
    if (!tbody) {
        console.error('ERRO: displayCustomEntryData - Elemento entryDataTableBody não encontrado.');
        return;
    }
    
    tbody.innerHTML = ''; // Limpa a tabela

    if (!canManageCustomEntryData()) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Você não tem permissão para visualizar Dados de Entrada Personalizados.</td></tr>';
        return;
    }

    // 1. Obter dados filtrados
    console.log(`DEBUG: displayCustomEntryData - customEntryData (antes de filtrar): ${customEntryData.length} itens. Primeiro item:`, customEntryData[0]);
    let filteredEntries = getFilteredCustomEntryData();
    console.log(`DEBUG: displayCustomEntryData - ${filteredEntries.length} itens após filtros.`);
    console.log(`DEBUG: displayCustomEntryData - Primeiro item filtrado:`, filteredEntries[0]);

    // 2. Aplicar ordenação
    filteredEntries = sortCustomEntryData(filteredEntries, customEntryDataCurrentFilters.sortBy);
    console.log(`DEBUG: displayCustomEntryData - ${filteredEntries.length} itens após ordenação.`);
    console.log(`DEBUG: displayCustomEntryData - Primeiro item ordenado:`, filteredEntries[0]);

    // 3. Aplicar paginação
    let paginatedEntries = [];
    if (customEntryDataShowAllItemsMode) {
        paginatedEntries = filteredEntries;
        customEntryDataTotalItemsInSystem = filteredEntries.length;
    } else {
        customEntryDataTotalItemsInSystem = filteredEntries.length;
        customEntryDataTotalPages = Math.ceil(customEntryDataTotalItemsInSystem / customEntryDataItemsPerPage);
        if (customEntryDataCurrentPage > customEntryDataTotalPages) customEntryDataCurrentPage = customEntryDataTotalPages > 0 ? customEntryDataTotalPages : 1;
        if (customEntryDataCurrentPage < 1) customEntryDataCurrentPage = 1;

        const startIndex = (customEntryDataCurrentPage - 1) * customEntryDataItemsPerPage;
        const endIndex = startIndex + customEntryDataItemsPerPage;
        paginatedEntries = filteredEntries.slice(startIndex, endIndex);
    }
    console.log(`DEBUG: displayCustomEntryData - ${paginatedEntries.length} itens após paginação.`);
    console.log(`DEBUG: displayCustomEntryData - Primeiro item paginado:`, paginatedEntries[0]);

    if (paginatedEntries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Nenhum Dado de Entrada Personalizado encontrado com os filtros aplicados.</td></tr>'; // Ajustado para 6
    } else {
        paginatedEntries.forEach(entry => {
            const row = createCustomEntryDataRow(entry);
            tbody.appendChild(row);
        });
    }
    
    updateCustomEntryDataFilterResults(paginatedEntries, customEntryDataTotalItemsInSystem);
    updateCustomEntryDataPaginationControls();
    console.log('DEBUG: displayCustomEntryData - Função concluída.');
}

function getFilteredCustomEntryData() {
    console.log('DEBUG: getFilteredCustomEntryData - Aplicando filtros...');
    const filters = customEntryDataCurrentFilters;
    console.log('DEBUG: getFilteredCustomEntryData - Filters applied:', filters); // NOVO LOG
    console.log('DEBUG: getFilteredCustomEntryData - customEntryData before filtering:', customEntryData.length); // NOVO LOG

    const filtered = customEntryData.filter(entry => {
        // Processo
        const matchesProcess = !filters.process || (entry.process && entry.process.toLowerCase().includes(filters.process.toLowerCase()));
        if (!matchesProcess) return false;

        // Empresa
        const matchesCompany = !filters.company || (entry.company && entry.company === filters.company);
        if (!matchesCompany) return false;

        // Status
        const matchesStatus = !filters.status || (entry.status && entry.status === filters.status);
        if (!matchesStatus) return false;

        // Data
        let matchesDate = true;
        const entryDate = criarDataLocal(entry.entry_date);
        if (!isNaN(entryDate.getTime())) {
            if (filters.dateStart) {
                const filterStartDate = criarDataLocal(filters.dateStart);
                if (entryDate < filterStartDate) matchesDate = false;
            }
            if (matchesDate && filters.dateEnd) {
                const filterEndDate = criarDataLocal(filters.dateEnd);
                if (entryDate > filterEndDate) matchesDate = false;
            }
        } else {
            matchesDate = false;
        }
        if (!matchesDate) return false;

        // Valor
        const entryValue = parseFloat(entry.value);
        const matchesValue = (isNaN(parseFloat(filters.valueMin)) || entryValue >= parseFloat(filters.valueMin)) &&
                             (isNaN(parseFloat(filters.valueMax)) || entryValue <= parseFloat(filters.valueMax));
        if (!matchesValue) return false;

        // Termo de Busca (Agora focado em processo e empresa)
        const matchesSearch = !filters.searchTerm ||
                              (entry.process && entry.process.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
                              (entry.company && entry.company.toLowerCase().includes(filters.searchTerm.toLowerCase()));
        if (!matchesSearch) return false;

    return true;
    });
    console.log(`DEBUG: getFilteredCustomEntryData - ${filtered.length} itens após filtros.`); // NOVO LOG
    return filtered;
}


// Lógica de Ordenação para Dados de Entrada Personalizados
function sortCustomEntryData(entriesArray, sortBy) {
    return entriesArray.sort((a, b) => {
        switch (sortBy) {
            case 'entryDate_desc':
                return criarDataLocal(b.entry_date) - criarDataLocal(a.entry_date);
            case 'entryDate_asc':
                return criarDataLocal(a.entry_date) - criarDataLocal(b.entry_date);
            case 'value_desc':
                return parseFloat(b.value || 0) - parseFloat(a.value || 0);
            case 'value_asc':
                return parseFloat(a.value || 0) - parseFloat(b.value || 0);
            case 'company':
                return (a.company || '').localeCompare(b.company || '');
            case 'process':
                return (a.process || '').localeCompare(b.process || '');
            case 'status': // Nova opção de ordenação
                return (a.status || '').localeCompare(b.status || '');
            default:
                return 0;
        }
    });
}

function applyCustomEntryDataFilters() {
    customEntryDataCurrentFilters.process = document.getElementById('filterCustomEntryProcess').value;
    customEntryDataCurrentFilters.company = document.getElementById('filterCustomEntryCompany').value;
    customEntryDataCurrentFilters.status = document.getElementById('filterCustomEntryStatus').value; // Novo filtro de status
    customEntryDataCurrentFilters.dateStart = document.getElementById('filterCustomEntryDateStart').value;
    customEntryDataCurrentFilters.dateEnd = document.getElementById('filterCustomEntryDateEnd').value;
    customEntryDataCurrentFilters.valueMin = parseFloat(document.getElementById('filterCustomEntryValueMin').value) || '';
    customEntryDataCurrentFilters.valueMax = parseFloat(document.getElementById('filterCustomEntryValueMax').value) || '';
    customEntryDataCurrentFilters.searchTerm = document.getElementById('searchCustomEntryTerm').value;
    customEntryDataCurrentFilters.sortBy = document.getElementById('sortCustomEntryBy').value;
    customEntryDataCurrentPage = 1; // Volta para a primeira página ao aplicar filtros
    displayCustomEntryData();
}

function clearCustomEntryDataFilters() {
    console.log('DEBUG: clearCustomEntryDataFilters - Limpando filtros de Dados de Entrada personalizados.'); // NOVO LOG AQUI
    document.getElementById('filterCustomEntryProcess').value = '';
    document.getElementById('filterCustomEntryCompany').value = '';
    document.getElementById('filterCustomEntryStatus').value = ''; // Resetar filtro de status
    document.getElementById('filterCustomEntryDateStart').value = '';
    document.getElementById('filterCustomEntryDateEnd').value = '';
    document.getElementById('filterCustomEntryValueMin').value = '';
    document.getElementById('filterCustomEntryValueMax').value = '';
    document.getElementById('searchCustomEntryTerm').value = '';
    document.getElementById('sortCustomEntryBy').value = 'entryDate_desc';
    
    customEntryDataCurrentFilters = {
        process: '', company: '', status: '', dateStart: '', dateEnd: '',
        valueMin: '', valueMax: '', searchTerm: '', sortBy: 'entryDate_desc'
    };
    customEntryDataCurrentPage = 1;
    displayCustomEntryData();
}

// Alterna a visibilidade dos filtros avançados
function toggleCustomEntryDataAdvancedFilters() {
    const filtersContainer = document.getElementById('customEntryDataAdvancedFiltersContainer');
    const toggleBtn = document.getElementById('toggleCustomEntryDataFiltersBtn');
    
    if (!filtersContainer || !toggleBtn) { return; }
    
    const isCurrentlyVisible = filtersContainer.style.display !== 'none';
    
    if (isCurrentlyVisible) {
        filtersContainer.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-filter"></i> Filtros';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-primary');
        } else {
        filtersContainer.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-times"></i> Fechar Filtros';
        toggleBtn.classList.remove('btn-primary');
        toggleBtn.classList.add('btn-secondary');
    
        // Popula os selects/datalists de filtros
        populateEntryCompaniesDatalist(); 
        populateProcessesDatalist();     
        populateCustomEntryDataStatusFilter(); // <--- Nova função para popular o status
    }
}

// Funções de Paginação para Dados de Entrada Personalizados
function customEntryDataGoToPage(page) {
    if (page < 1 || page > customEntryDataTotalPages) { return; }
    customEntryDataCurrentPage = page;
    displayCustomEntryData();
}
function customEntryDataNextPage() {
    if (customEntryDataCurrentPage < customEntryDataTotalPages) {
        customEntryDataCurrentPage++;
        displayCustomEntryData();
    }
}
function customEntryDataPrevPage() {
    if (customEntryDataCurrentPage > 1) {
        customEntryDataCurrentPage--;
        displayCustomEntryData();
    }
}
function updateCustomEntryDataPaginationControls() {
    const paginationContainer = document.getElementById('customEntryDataPaginationControls');
    if (!paginationContainer) { return; }

    if (customEntryDataShowAllItemsMode) {
        paginationContainer.style.display = 'none';
    } else {
        if (customEntryDataTotalPages > 1) {
            paginationContainer.style.display = 'flex'; 
        } else {
            paginationContainer.style.display = 'none';
        }
    }

    const prevBtn = document.getElementById('customEntryDataPrevPageBtn');
    const nextBtn = document.getElementById('customEntryDataNextPageBtn');
    const pageInfo = document.getElementById('customEntryDataPageInfo');

    if (prevBtn) prevBtn.disabled = (customEntryDataCurrentPage === 1);
    if (nextBtn) nextBtn.disabled = (customEntryDataCurrentPage === customEntryDataTotalPages || customEntryDataTotalPages === 0);
    if (pageInfo) pageInfo.textContent = `Página ${customEntryDataCurrentPage} de ${customEntryDataTotalPages === 0 ? 1 : customEntryDataTotalPages}`;
}

function populateCustomEntryDataStatusFilter() {
    const select = document.getElementById('filterCustomEntryStatus');
    if (!select) {
        console.warn('Elemento #filterCustomEntryStatus não encontrado.');
        return;
    }
    // Limpa opções existentes, exceto a primeira ("Todos")
    while (select.options.length > 1) {
        select.remove(1);
    }

    const statuses = ['Pendente', 'Pago', 'Cancelado'];
    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        select.appendChild(option);
    });
}

// Função para atualizar o contador de resultados do filtro para Dados de Entrada Personalizados
function updateCustomEntryDataFilterResults(filteredEntries, totalEntriesInSystem) {
    const tab = document.getElementById('entryDataTab');
    if (!tab) return;

    const existingInfoBox = tab.querySelector('.filtered-info-box');
    if (existingInfoBox) { existingInfoBox.remove(); }

    const currentDisplayCount = filteredEntries.length;
    const itemText = currentDisplayCount === 1 ? 'dado de entrada' : 'dados de entrada';

    const totalValueFiltered = filteredEntries.reduce((sum, entry) => {
        return sum + (parseFloat(entry.value) || 0);
    }, 0);
    const formattedTotalValueFiltered = totalValueFiltered.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' });

    let messageContent;
    messageContent = `<strong>${currentDisplayCount}</strong> ${itemText} exibido(s) nesta página (de <strong>${totalEntriesInSystem}</strong> total).`;
    messageContent += `<br>Valor Total Exibido nesta página: <strong>${formattedTotalValueFiltered}</strong>`;

    const infoBoxHtml = `
        <div class="filtered-info-box">
            <span class="text-content">
                ${messageContent}
            </span>
        </div>
    `;

    const filtersContainer = tab.querySelector('#customEntryDataAdvancedFiltersContainer');
    const exportButtons = tab.querySelector('.export-buttons');

    if (filtersContainer && filtersContainer.parentElement && exportButtons) {
        filtersContainer.parentElement.insertBefore(document.createRange().createContextualFragment(infoBoxHtml), exportButtons);
    } else if (tab) {
        tab.insertBefore(document.createRange().createContextualFragment(infoBoxHtml), tab.querySelector('div[style*="overflow-x: auto;"]') || tab.lastChild);
    }
}

// Exportar Dados de Entrada Personalizados para Excel
function exportCustomEntryDataToExcel() {
    const filteredEntries = getFilteredCustomEntryData();

    if (filteredEntries.length === 0) {
        alert('Nenhum dado de entrada personalizado para exportar após os filtros.');
        return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,%EF%BB%BF';
    const delimiter = ';';

    csvContent += [
        'Processo', 'Empresa', 'Valor da Nota', 'Data de Registro', 'Status',
        'Criado Por', 'Criado Em', 'Atualizado Por', 'Atualizado Em'
    ].map(header => `"${header}"`).join(delimiter) + '\n';
    
    filteredEntries.forEach(entry => {
        const fields = [
            entry.process || '',
            entry.company || '',
            parseFloat(entry.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, useGrouping: false }),
            formatDate(entry.entry_date),
            entry.status || '',
            entry.created_by || '',
            entry.created_at ? new Date(entry.created_at).toLocaleString('pt-BR') : '',
            entry.updated_by || '',
            entry.updated_at ? new Date(entry.updated_at).toLocaleString('pt-BR') : ''
        ];

        const row = fields.map(field => {
            const stringField = String(field);
            return `"${stringField.replace(/"/g, '""')}"`;
        }).join(delimiter) + '\n';
        
        csvContent += row;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dados_entrada_personalizados_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showDownloadFeedback(`Dados de Entrada.csv`);
}

// Exportar Dados de Entrada Personalizados para PDF
function exportCustomEntryDataToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const filteredEntries = getFilteredCustomEntryData();
    
    if (filteredEntries.length === 0) {
        alert('Nenhum dado de entrada personalizado para exportar após os filtros para gerar o PDF.');
        return;
    }
    
    doc.setFontSize(16);
    doc.text('Relatório de Dados de Entrada Personalizados', 20, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 30);

    const tableData = filteredEntries.map(entry => [
        entry.process || '',
        entry.company || '',
        formatCurrency(entry.value),
        formatDate(entry.entry_date),
        entry.status || ''
    ]);
    
    doc.autoTable({
        head: [['Processo', 'Empresa', 'Valor da Nota', 'Data de Registro', 'Status']],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [52, 73, 94] }
    });
    
    const totalValue = filteredEntries.reduce((sum, entry) => sum + parseFloat(entry.value || 0), 0);
    let finalY = doc.autoTable.previous.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Valor Total dos Dados de Entrada: ${formatCurrency(totalValue)}`, 20, finalY);
    
    doc.save(`dados_entrada_personalizados_${new Date().toISOString().split('T')[0]}.pdf`);
}

function populatePaidFavoredFilter() {
    const select = document.getElementById('paidFavoredFilter');
    if (!select) {
        console.warn('populatePaidFavoredFilter: Elemento paidFavoredFilter não encontrado.');
        return;
    }
    while (select.options.length > 1) { select.remove(1); } // Limpa exceto a primeira

    const uniqueNames = new Set();
    // Favorecidos de Ordens
    if (Array.isArray(fullOrdersList)) {
        fullOrdersList.filter(order => order.status === 'Paga' && order.favoredName)
                       .forEach(order => uniqueNames.add(order.favoredName.trim()));
    }
    // Fornecedores de Boletos (totalmente pagos ou parcelas pagas)
    if (Array.isArray(boletos)) {
        boletos.forEach(boleto => {
            if (boleto.vendor && boleto.parcels && boleto.parcels.some(p => p.isPaid)) {
                uniqueNames.add(boleto.vendor.trim());
            }
        });
    }
    // Favorecidos de Salários
    if (Array.isArray(salaries)) {
        salaries.forEach(salary => {
            if (salary.favoredName) uniqueNames.add(salary.favoredName.trim());
        });
    }
    
    const sortedNames = Array.from(uniqueNames).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    sortedNames.forEach(name => {
        if (name) { 
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        }
    });
}

// NOVA: Função para popular o filtro de SOLICITANTE na aba de Ordens Pagas
function populatePaidSolicitantFilter() { 
    const select = document.getElementById('paidSolicitantFilter'); // << ID DO NOVO SELECT SOLICITANTE
    if (!select) {
        console.warn('populatePaidSolicitantFilter: Elemento paidSolicitantFilter (Solicitante) não encontrado.');
        return;
    }
    
    // Limpar opções existentes (exceto a primeira "Todos os solicitantes")
    while (select.options.length > 1) {
        select.remove(1);
    }

    const uniqueNames = new Set();

    // 1. Adicionar solicitantes da lista hardcoded de "Cadastrar Ordem" (os que você mencionou)
    const hardcodedSolicitants = ["Djael Jr", "Rafael Sagrilo", "Lucas Silva", "Verônica Barbosa", "Rafael Sayd", "Maurício Sena"]; 
    hardcodedSolicitants.forEach(name => uniqueNames.add(name));

    // 2. Coletar nomes de solicitantes de TODAS as ordens em fullOrdersList
    if (typeof fullOrdersList !== 'undefined' && fullOrdersList && Array.isArray(fullOrdersList)) {
        fullOrdersList.forEach(order => {
            // Adiciona apenas se o nome do solicitante existe, não é vazio e não é "Outro" (que é um placeholder)
            if (order.solicitant && order.solicitant.trim() !== '' && order.solicitant.trim().toLowerCase() !== 'outro') {
                uniqueNames.add(order.solicitant.trim());
            }
        });
    } 
    
    // Ordenar alfabeticamente e adicionar as opções ao select
    const sortedNames = Array.from(uniqueNames).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    
    sortedNames.forEach(name => {
        if (name) { 
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        }
    });
}

let currentYear = new Date().getFullYear();
if (isNaN(currentYear)) {
    currentYear = 'XXXX'; // Fallback para ano desconhecido
    console.warn('Ano atual não pôde ser determinado. Usando "XXXX" como fallback.');
}
month = `13º ${currentYear}`;

// ===================================================================
// FUNÇÃO createOrderRow - PARA ABAS DE ORDENS NÃO PAGAS (general, diretoria, financeiro, pending)
// ===================================================================

function canAddOrder() {
    return currentUser && ['Geral', 'Diretoria', 'Financeiro', 'Comum', 'RH'].includes(currentUser.role);
}
function canDeletePaidBoleto() {
    return currentUser && currentUser.role === 'Geral';
}
function canApproveDiretoria() {
    return currentUser && ['Geral', 'Diretoria'].includes(currentUser.role);
}
function canApproveFinanceiro() {
    return currentUser && ['Geral', 'Financeiro'].includes(currentUser.role);
}
function canRegisterPayment() {
    return currentUser && ['Geral', 'Financeiro', 'Pagador'].includes(currentUser.role);
}
function canEditOrder(order) {
    if (!currentUser) return false;

    if (order.status === 'Paga') {
        return currentUser.role === 'Geral';
    }

    if (currentUser.role === 'Geral') {
        return true;
    }

    if (order.approvedByDiretoria) {
        return false;
    }
 
    return ['Diretoria', 'Financeiro', 'Comum', 'RH'].includes(currentUser.role);
}
function canDeleteOrder(order) {
    if (!currentUser || !currentUser.role) return false;
    if (currentUser.role === 'Geral') return true;
    if (order && order.approvedByDiretoria === true) return false;
    if (currentUser.role === 'RH') return true;
    return false;
}

// Verificador genérico de duplicatas — reutilizável para qualquer coleção
function findDuplicateInCollection(collection, matchPredicate) {
    const existing = collection.find(matchPredicate);
    return existing
        ? { isDuplicate: true, existing }
        : { isDuplicate: false };
}

// Verifica duplicidade de Ordem — recebe a coleção por parâmetro (sem acesso a global)
function checkDuplicateOrder(favoredName, paymentValue, paymentForecast, process) {
    return findDuplicateInCollection(fullOrdersList, order =>
        order.favoredName === favoredName &&
        parseFloat(order.paymentValue) === parseFloat(paymentValue) &&
        order.paymentForecast === paymentForecast &&
        order.process === process &&
        order.status !== 'Paga'
    );
}

// Verifica duplicidade de Boleto
function checkDuplicateBoleto(vendor, totalValue, process, firstDueDate) {
    return findDuplicateInCollection(boletos, boleto =>
        boleto.vendor === vendor &&
        parseFloat(boleto.totalValue) === parseFloat(totalValue) &&
        boleto.process === process &&
        boleto.firstDueDate === firstDueDate &&
        !boleto.isFullyPaid
    );
}

function showDuplicateBoletoAlert(existingBoleto, callback) {
    // Formata o status para exibição
    const boletoStatus = existingBoleto.isFullyPaid ? 'Totalmente Pago' : 'Pendente';
    const formattedTotalValue = parseFloat(existingBoleto.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const formattedFirstDueDate = existingBoleto.firstDueDate ? formatDate(existingBoleto.firstDueDate) : 'Não informada';

    const message = `⚠️ ATENÇÃO: Boleto Duplicado Detectado!\n\n` +
                   `Já existe um boleto com as mesmas características:\n` +
                   `• Fornecedor: ${existingBoleto.vendor}\n` +
                   `• Valor Total: R$ ${formattedTotalValue}\n` +
                   `• Processo: ${existingBoleto.process || 'Não informado'}\n` +
                   `• Primeiro Vencimento: ${formattedFirstDueDate}\n` +
                   `\nDetalhes do Boleto Existente:\n` +
                   `  Status: ${boletoStatus}\n` +
                   `  Total de Parcelas: ${existingBoleto.parcels ? existingBoleto.parcels.length : 'N/A'}\n\n` +
                   `Deseja continuar com o cadastro mesmo assim?`;
    
    if (confirm(message)) {
        callback(true); // Continuar
    } else {
        callback(false); // Cancelar
    }
}

async function _proceedWithAddBoleto(formData) {
    try {
        showLoadingOverlay(); // Mostrar loading durante envio
        
        const response = await fetch('api/add_boleto.php', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showModernSuccessNotification('Boleto cadastrado com sucesso!');
            
            // ✅ Extrair dados do FormData para logs e histórico
            const vendorName = formData.get('vendor') || 'Não informado';
            const companyName = formData.get('company') || 'Não informada';
            const generationDate = formData.get('generationDate') || 'Não informada';
            
            console.log('✅ Boleto cadastrado:', { id: data.id, vendor: vendorName, generationDate });
            
            // Adicionar à história de autocomplete (se função existir)
            if (typeof addEntryToAutocompleteHistory === 'function') {
                addEntryToAutocompleteHistory('fornecedoresHistory', vendorName);
                populateAutocompleteDatalist('fornecedorSugestoes', 'fornecedoresHistory');
            }
            
            // Fechar modal se estiver aberto
            const modal = document.getElementById('registerBoletoModal');
            if (modal && modal.style.display === 'block') {
                modal.style.display = 'none';
            }
            
            // OTIMIZAÇÃO: Adicionar boleto diretamente ao array (sem recarregar API)
            if (data.id && data.boleto) { // Assumindo que o backend retorna o boleto completo
                const newBoleto = {
                    ...data.boleto, // Dados do servidor
                    generationDate: generationDate, // ✅ Garantir data fixa
                    parcels: JSON.parse(formData.get('parcels') || '[]')
                };
                
                // Inicializar array se necessário
                if (!Array.isArray(boletos)) {
                    boletos = [];
                }
                
                boletos.unshift(newBoleto);
                highlightNewBoletoId = data.id;
                
                console.log(`✨ Novo boleto adicionado ao array: ${highlightNewBoletoId} (Data: ${generationDate})`);
                
                // Atualizar UI localmente
                displayBoletos();
                updateCounters();
                
                // Popular datalists
                if (typeof populateBoletoVendorsDatalist === 'function') {
                    populateBoletoVendorsDatalist();
                }
                if (typeof populateBoletoCompanySelect === 'function') {
                    populateBoletoCompanySelect();
                }
                
                console.log(`✅ Boleto cadastrado e UI atualizada. Empresa: "${companyName}"`);
            } else {
                // Fallback: Recarregar da API
                console.warn('⚠️ Dados do boleto não retornados. Recarregando...');
                await loadBoletos(true);
                displayBoletos();
            }
        } else {
            showModernErrorNotification('Erro ao cadastrar boleto: ' + (data.error || 'Erro desconhecido'));
            await loadBoletos(true);
            displayBoletos();
        }
    } catch (error) {
        console.error('💥 Erro ao cadastrar boleto:', error);
        showModernErrorNotification('Erro ao cadastrar boleto. Verifique a conexão e tente novamente.');
        await loadBoletos(true); // Recarregar para consistência
        displayBoletos();
    } finally {
        hideLoadingOverlay(); // Sempre esconder loading
    }
}

function canDeleteOrder(order) {
    if (!currentUser || !currentUser.role) {
        return false;
    }

    if (currentUser.role === 'Geral') {
        return true;
    }

    if (order && order.approvedByDiretoria === true) {
        return false;
    }

    if (currentUser.role === 'RH') {
        return true;
    }

    return false;
}

function canManageSalaries() {
    return currentUser && ['Geral', 'RH'].includes(currentUser.role);
}

function canManageSalariesBackup() {
    if (typeof currentUser === 'undefined' || !currentUser || !currentUser.role) {
        return false;
    }
    
    const allowedRoles = ['Geral', 'RH'];
    return allowedRoles.includes(currentUser.role);
}

function canManageBackup() {
    return currentUser && ['Geral', 'Diretoria', 'Financeiro'].includes(currentUser.role);
}

function canReproveOwnApproval(order, userRole) {
    if (userRole === 'Geral') return true;
    if (userRole === 'Diretoria' && order.approvedByDiretoria) return true;
    if (userRole === 'Financeiro' && order.approvedByFinanceiro) return true;
    return false;
}

function updatePermissionChecks() {
    const addOrderCheck = document.getElementById('addOrderPermissionCheck');
    if (addOrderCheck) {
        if (!canAddOrder()) {
            addOrderCheck.innerHTML = '<div class="permission-warning">⚠️ Você não tem permissão para cadastrar ordens de pagamento.</div>';
            const addOrderBtn = document.getElementById('addOrderBtn');
            const orderForm = document.getElementById('orderForm');
            if (addOrderBtn) addOrderBtn.disabled = true;
            if (orderForm) {
                orderForm.style.opacity = '0.5';
                orderForm.style.pointerEvents = 'none';
            }
        } else {
            addOrderCheck.innerHTML = '';
            const addOrderBtn = document.getElementById('addOrderBtn');
            const orderForm = document.getElementById('orderForm');
            if (addOrderBtn) addOrderBtn.disabled = false;
            if (orderForm) {
                orderForm.style.opacity = '1';
                orderForm.style.pointerEvents = 'auto';
            }
        }
    }

    const diretoriaCheck = document.getElementById('diretoriaPermissionCheck');
    if (diretoriaCheck && !canApproveDiretoria()) {
        diretoriaCheck.innerHTML = '<div class="permission-warning">ℹ️ Você pode visualizar as ordens, mas não pode aprovar pela Diretoria.</div>';
    }

    const financeiroCheck = document.getElementById('financeiroPermissionCheck');
    if (financeiroCheck && !canApproveFinanceiro()) {
        financeiroCheck.innerHTML = '<div class="permission-warning">ℹ️ Você pode visualizar as ordens, mas não pode aprovar pelo Financeiro.</div>';
    }

    const pendingCheck = document.getElementById('pendingPermissionCheck');
    if (pendingCheck && !canRegisterPayment()) {
        pendingCheck.innerHTML = '<div class="permission-warning">ℹ️ Você pode visualizar as ordens, mas não pode registrar pagamentos.</div>';
    }

    const salariesCheck = document.getElementById('salariesPermissionCheck');
    const toggleAddSalaryFormBtn = document.getElementById('toggleAddSalaryFormBtn'); // Novo botão
    const addSalaryFormContainer = document.getElementById('addSalaryFormContainer'); // Novo contêiner do formulário

    if (salariesCheck && toggleAddSalaryFormBtn && addSalaryFormContainer) {
        if (!canManageSalaries()) {
            salariesCheck.innerHTML = '<div class="permission-warning">ℹ️ Você pode visualizar os salários/auxílios, mas não pode cadastrar ou editar.</div>';
            toggleAddSalaryFormBtn.disabled = true; // Desabilita o novo botão
            toggleAddSalaryFormBtn.classList.remove('btn-success');
            toggleAddSalaryFormBtn.classList.add('btn-secondary'); // Estilo de desabilitado/neutro
            toggleAddSalaryFormBtn.innerHTML = '<i class="fas fa-ban"></i> Sem Permissão';

            addSalaryFormContainer.style.display = 'none'; // Garante que o formulário esteja oculto
        } else {
            salariesCheck.innerHTML = '';
            toggleAddSalaryFormBtn.disabled = false; // Habilita o botão
            toggleAddSalaryFormBtn.classList.remove('btn-secondary');
            toggleAddSalaryFormBtn.classList.add('btn-success'); // Estilo habilitado/ativo
            toggleAddSalaryFormBtn.innerHTML = '<i class="fas fa-plus"></i> Cadastrar Salário/Auxílio';

            // O formulário começa oculto por padrão (display: none no HTML) e será controlado pelo botão.
        }
    } else if (salariesCheck) { 
        console.warn('⚠️ updatePermissionChecks: Elementos toggleAddSalaryFormBtn ou addSalaryFormContainer não encontrados para a aba Salários. Verifique os IDs no HTML.');
    }
    const toggleBackupBtn = document.getElementById('toggleBackupBtn');
    if (toggleBackupBtn) {
        toggleBackupBtn.style.display = canManageBackup() ? 'inline-block' : 'none';
    }

}

function updateUserInterface() {
    if (currentUser) {
        const userRoleElement = document.getElementById('currentUserRole');
        if (userRoleElement) {
            userRoleElement.textContent = currentUser.role;
        }
    }
}


async function loadOrders() {
    console.log('🔄 [loadOrders] Tentando carregar ordens do banco (página ' + currentPage + ')...');

    const offset = (currentPage - 1) * itemsPerPage;
    
    // --- CONSTRUÇÃO DA URL COM TODOS OS PARÂMETROS DE FILTRO ---
    let urlParams = new URLSearchParams();
    urlParams.append('limit', itemsPerPage);
    urlParams.append('offset', offset);
    urlParams.append('_', new Date().getTime()); // Para cache busting

    // Adicionar filtros do objeto currentFilters
    if (currentFilters.status && currentFilters.status.length > 0) {
        currentFilters.status.forEach(s => urlParams.append('status[]', s)); // Envia como array de status
    }
    if (currentFilters.priority && currentFilters.priority !== '') { 
        urlParams.append('priority', currentFilters.priority);
    }
    if (currentFilters.paymentType && currentFilters.paymentType !== '') {
        urlParams.append('paymentType', currentFilters.paymentType);
    }
    if (currentFilters.direction) {
        urlParams.append('direction', currentFilters.direction);
    }
    if (currentFilters.solicitant) {
        urlParams.append('solicitant', currentFilters.solicitant);
    }
    if (currentFilters.company) { // <--- NOVO: Adicione esta condição
        urlParams.append('company', currentFilters.company);
    }
    if (currentFilters.process) {
        urlParams.append('process', currentFilters.process);
    }
    if (currentFilters.searchTerm && currentFilters.searchTerm !== '') { // Buscar Favorecido, processo, referência, observação
        urlParams.append('searchTerm', currentFilters.searchTerm);
    }
    if (currentFilters.valueMin > 0) {
        urlParams.append('valueMin', currentFilters.valueMin);
    }
    if (currentFilters.valueMax < Infinity) { 
        urlParams.append('valueMax', currentFilters.valueMax);
    }
    if (currentFilters.dateStart && currentFilters.dateStart !== '') {
        urlParams.append('dateStart', currentFilters.dateStart);
    }
    if (currentFilters.dateEnd && currentFilters.dateEnd !== '') {
        urlParams.append('dateEnd', currentFilters.dateEnd);
    }
    if (currentFilters.forecastDateStart && currentFilters.forecastDateStart !== '') {
        urlParams.append('forecastDateStart', currentFilters.forecastDateStart);
    }
    if (currentFilters.forecastDateEnd && currentFilters.forecastDateEnd !== '') {
        urlParams.append('forecastDateEnd', currentFilters.forecastDateEnd);
    }
    // Adicionar ordenação ao backend
    if (currentFilters.sortBy && currentFilters.sortBy !== '') {
        // Assume que 'priority_date' é um caso especial tratado pelo backend
        // Outros são "campo_direcao" ou apenas "campo" (que o backend pode interpretar como DESC)
        let sortField = currentFilters.sortBy;
        let sortDirection = 'desc'; // Padrão
        
        if (sortField.includes('_')) { // Se for tipo "paymentValue_asc"
            const parts = sortField.split('_');
            sortField = parts[0];
            if (parts[1] === 'asc') sortDirection = 'asc';
        }
        
        urlParams.append('sortBy', sortField);
        urlParams.append('sortDirection', sortDirection);
    }
    // --- FIM DA CONSTRUÇÃO DA URL COM PARÂMETROS DE FILTRO ---

    const url = `${API_BASE_URL}/get_orders.php?${urlParams.toString()}`;
    console.log(' [loadOrders] URL da Requisição:', url); // DEBUG: Veja a URL completa com filtros

    try {
        const response = await fetch(url, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
            orders = data.data.map(order => {
                order.paymentValue = parseFloat(order.paymentValue || 0);
                order.approvedByDiretoria = Boolean(Number(order.approvedByDiretoria));
                order.approvedByFinanceiro = Boolean(Number(order.approvedByFinanceiro));
                order.isPaid = Boolean(Number(order.isPaid));
                
                if (typeof order.payments === 'string') {
                    try {
                        order.payments = JSON.parse(order.payments);
                    } catch (e) {
                        console.error("Erro ao parsear payments JSON (API) para ordem:", order.id, e, order.payments);
                        order.payments = []; 
                    }
                }
                order.payments = Array.isArray(order.payments) ? order.payments : [];
                return order; 
            });

            totalOrdersInSystem = data.total_filtered_records || 0; // Agora usa o total_filtered_records do backend
            totalPages = Math.ceil(totalOrdersInSystem / itemsPerPage);
            
            console.log(`✅ [loadOrders] Ordens carregadas do servidor (página ${currentPage} de ${totalPages}). Total de ${totalOrdersInSystem} registros FILTRADOS.`);

        } else {
            console.warn('[loadOrders] Nenhuma ordem encontrada na API ou falha na resposta (success: false ou dados inválidos).', data);
            orders = [];
            totalOrdersInSystem = 0;
            totalPages = 1;
        }
    } catch (error) {
        console.error('[loadOrders] Erro ao carregar ordens do banco (API - conexão ou parsing JSON):', error);
        orders = [];
        totalOrdersInSystem = 0;
        totalPages = 1;
    } finally {
        // hideLoadingOverlay(); // <--- REMOVIDA AQUI para o fluxo de filtragem
    }
}

function toggleShowAllOrders() {
    const toggleButton = document.getElementById('toggleOrdersShowAllItemsBtn'); // Referência ao NOVO ID do botão

    showAllOrdersMode = !showAllOrdersMode; // Inverte o modo: de paginação para mostrar tudo, ou vice-versa

    if (showAllOrdersMode) {
        // Se estamos indo para o modo "Mostrar Tudo"
        let filteredCount = getFilteredOrders().length; // Obtém a contagem de ordens atualmente filtradas
        itemsPerPage = filteredCount > 0 ? filteredCount : 1; // Ajusta itemsPerPage para mostrar todas as filtradas
        currentPage = 1; // Sempre volta para a primeira página no novo modo (seja ela qual for)

        if (toggleButton) {
            toggleButton.innerHTML = '<i class="fas fa-columns"></i> Voltar para Paginação'; // Altera texto e ícone do botão
        }
    } else {
        // Se estamos voltando para o modo paginado
        itemsPerPage = DEFAULT_ITEMS_PER_PAGE; // Restaura o padrão de itens por página
        currentPage = 1; // Sempre volta para a primeira página no novo modo

        if (toggleButton) {
            toggleButton.innerHTML = '<i class="fas fa-list-alt"></i> Mostrar todas as ordens'; // Altera texto e ícone do botão de volta
        }
    }
    displayOrders(); // Re-renderiza a tabela de ordens para aplicar o novo modo
}

// Função para alternar entre mostrar todos os itens pagos ou usar paginação
function togglePaidShowAllItems() {
    paidShowAllItemsMode = !paidShowAllItemsMode; // Inverte o modo

    const toggleButton = document.getElementById('togglePaidShowAllItemsBtn'); // Referência ao seu novo botão

    if (paidShowAllItemsMode) {
        // Se estamos indo para o modo "Mostrar Tudo"
        // PRECISAMOS CALCULAR O TOTAL DE ITENS FILTRADOS PARA DEFINIR paidItemsPerPage
        const allPaidItemsAfterFilters = getPaidFilteredItemsForExport(); // <<<< Nome da função CORRIGIDO >>>>
        paidItemsPerPage = allPaidItemsAfterFilters.length > 0 ? allPaidItemsAfterFilters.length : 1; 
        paidCurrentPage = 1; // Sempre volta para a primeira página no novo modo

        if (toggleButton) {
            toggleButton.textContent = 'Voltar para Paginação'; // Muda o texto do botão
        }
    } else {
        // Se estamos voltando para o modo paginado
        paidItemsPerPage = PAID_DEFAULT_ITEMS_PER_PAGE; // Restaura o padrão de itens por página
        paidCurrentPage = 1; // Sempre volta para a primeira página no novo modo

        if (toggleButton) {
            toggleButton.textContent = 'Mostrar todos os itens pagos'; // Muda o texto do botão de volta
        }
    }
    // Re-renderiza a tabela de ordens pagas para aplicar o novo modo
    displayPaidOrders(); 
}

// === NOVAS FUNÇÕES DE PAGINAÇÃO E CONTROLES PARA ORDENS PAGAS ===

function paidGoToPage(page) {
    if (page < 1 || page > paidTotalPages) {
        console.warn(`Tentativa de ir para página inválida de itens pagos: ${page}. Total de páginas: ${paidTotalPages}.`);
        return;
    }
    paidCurrentPage = page;
    displayPaidOrders(); // Recarrega os itens pagos para a nova página
}

function paidNextPage() {
    if (paidCurrentPage < paidTotalPages) {
        paidCurrentPage++;
        displayPaidOrders();
    }
}

function paidPrevPage() {
    if (paidCurrentPage > 1) {
        paidCurrentPage--;
        displayPaidOrders();
    }
}

function updatePaidPaginationControls() {
    const paginationContainer = document.getElementById('paidPaginationControls');
    if (!paginationContainer) {
        console.warn('Elemento #paidPaginationControls não encontrado no DOM. Paginação não será exibida.');
        return;
    }

    if (paidShowAllItemsMode) {
        paginationContainer.style.display = 'none';
    } else {
        if (paidTotalPages > 1) {
            paginationContainer.style.display = 'flex'; 
        } else {
            paginationContainer.style.display = 'none'; // Oculta se só há 1 página
        }
    }

    const prevBtn = document.getElementById('paidPrevPageBtn');
    const nextBtn = document.getElementById('paidNextPageBtn');
    const pageInfo = document.getElementById('paidPageInfo');

    if (prevBtn) prevBtn.disabled = (paidCurrentPage === 1);
    if (nextBtn) nextBtn.disabled = (paidCurrentPage === paidTotalPages || paidTotalPages === 0);
    if (pageInfo) pageInfo.textContent = `Página ${paidCurrentPage} de ${paidTotalPages === 0 ? 1 : paidTotalPages}`;
}

// === NOVAS FUNÇÕES DE PAGINAÇÃO E CONTROLES PARA ORDENS PAGAS ===

function paidGoToPage(page) {
    if (page < 1 || page > paidTotalPages) {
        console.warn(`Tentativa de ir para página inválida de itens pagos: ${page}. Total de páginas: ${paidTotalPages}.`);
        return;
    }
    paidCurrentPage = page;
    displayPaidOrders(); // Recarrega os itens pagos para a nova página
}

function paidNextPage() {
    if (paidCurrentPage < paidTotalPages) {
        paidCurrentPage++;
        displayPaidOrders();
    }
}

function paidPrevPage() {
    if (paidCurrentPage > 1) {
        paidCurrentPage--;
        displayPaidOrders();
    }
}

function updatePaidPaginationControls() {
    const paginationContainer = document.getElementById('paidPaginationControls');
    if (!paginationContainer) {
        console.warn('Elemento #paidPaginationControls não encontrado no DOM. Paginação não será exibida.');
        return;
    }

    if (paidShowAllItemsMode) {
        paginationContainer.style.display = 'none';
    } else {
        // Exibe os controles de paginação apenas se houver mais de uma página no modo paginado
        if (paidTotalPages > 1) {
            paginationContainer.style.display = 'flex'; 
        } else {
            paginationContainer.style.display = 'none'; // Oculta se só há 1 página
        }
    }

    const prevBtn = document.getElementById('paidPrevPageBtn');
    const nextBtn = document.getElementById('paidNextPageBtn');
    const pageInfo = document.getElementById('paidPageInfo');

    if (prevBtn) prevBtn.disabled = (paidCurrentPage === 1);
    if (nextBtn) nextBtn.disabled = (paidCurrentPage === paidTotalPages || paidTotalPages === 0);
    if (pageInfo) pageInfo.textContent = `Página ${paidCurrentPage} de ${paidTotalPages === 0 ? 1 : paidTotalPages}`;
}

// =======================================================
// FUNÇÕES DE PAGINAÇÃO (SUBSTITUA A SUA VERSÃO ATUAL)
// =======================================================
function updateUIComponentsAfterLoad() {
    requestAnimationFrame(async () => {
        hasLoadedFullOrdersList = false;

        updateCounters();
        updateDetailedCounters();
        populateFavoredNamesDatalist();
        populateProcessesDatalist();
        populateBoletoVendorsDatalist();
        populateCompanyFilter();

        const currentActiveTabButton = document.querySelector('.tab-button.active');
        if (currentActiveTabButton) {
            const onclickAttr = currentActiveTabButton.getAttribute('onclick');
            const match = onclickAttr.match(/showTab\('(.*?)'/);
            if (match && match[1]) {
                const activeTabName = match[1];
                await showTab(activeTabName, null);
                console.log(`🔄 UI: Redesenhando a aba ativa: ${activeTabName}`);
            }
        } else {
            await showTab('orders', null);
            console.warn(`⚠️ UI: Nenhuma aba ativa encontrada. Redesenhando aba 'orders' como padrão.`);
        }
        console.log('✅ [updateUIComponentsAfterLoad] Todos os componentes da UI foram atualizados com o estado local.');

        // **ADICIONE ESTAS DUAS LINHAS AQUI:**
        updateBulkActionButtonsState('diretoria');
        updateBulkActionButtonsState('financeiro');
    });
}

function goToPage(page) {
    if (page < 1 || page > totalPages) {
        console.warn(`Tentativa de ir para página inválida: ${page}. Total de páginas: ${totalPages}.`);
        return;
    }
    currentPage = page;
    displayOrders(); // <--- MUDANÇA CRÍTICA: Chama displayOrders() para redesenhar a página atual
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        displayOrders(); // <--- MUDANÇA CRÍTICA: Chama displayOrders() para avançar a página
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayOrders(); // <--- MUDANÇA CRÍTICA: Chama displayOrders() para avançar a página
    }
}

// Função para atualizar a visibilidade e estado dos controles de paginação
function updatePaginationControls() {
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) {
        console.warn('Elemento #paginationControls não encontrado no DOM. Paginação não será exibida.');
        return;
    }

    // Se estiver no modo "Mostrar Todas", oculta os controles de paginação
    if (showAllOrdersMode) {
        paginationContainer.style.display = 'none';
        return; // Sai da função
    }

    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');

    if (prevBtn) prevBtn.disabled = (currentPage === 1);
    if (nextBtn) nextBtn.disabled = (currentPage === totalPages);
    if (pageInfo) pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;

    // Mostra os controles de paginação apenas se houver mais de uma página no modo paginado
    if (totalPages > 1) {
        paginationContainer.style.display = 'flex'; // ou 'block', dependendo do seu CSS
    } else {
        paginationContainer.style.display = 'none';
    }
}


function loadOrdersFromLocalStorage() {
    const savedOrders = localStorage.getItem('orders');
    if (savedOrders) {
        try {
            let parsedOrders = JSON.parse(savedOrders);
            orders = parsedOrders;
            allOrders = [...parsedOrders];

        } catch (error) {
            console.error('Erro ao carregar ordens do localStorage:', error);
        }
    }
}

// Função auxiliar para salvar as ordens no localStorage
function saveOrders() {
    try {
        // Criar uma cópia das ordens para remover os dados grandes
        const lightweightOrders = orders.map(order => {
            const newOrder = { ...order };
            // Remover proofData e boletoData para não exceder a quota do localStorage
            if (newOrder.payments) {
                newOrder.payments = newOrder.payments.map(payment => {
                    const newPayment = { ...payment };
                    delete newPayment.proofData; // Não armazenar Base64 no localStorage
                    return newPayment;
                });
            }
            delete newOrder.boletoData; // Não armazenar Base64 do boleto no localStorage
            // Adicione outros campos grandes se existirem e não forem necessários localmente
            return newOrder;
        });

        localStorage.setItem('orders', JSON.stringify(lightweightOrders));
        console.log('✅ Ordens (versão leve) salvas no localStorage.');
    } catch (error) {
        console.error('❌ Erro ao salvar ordens no localStorage:', error);
        // Mensagem mais informativa para o usuário
        alert('Atenção: Houve um erro ao salvar dados localmente (limite de armazenamento excedido). Os dados foram enviados ao servidor, mas podem não aparecer imediatamente após fechar e reabrir o navegador se a conexão falhar. Por favor, recarregue a página se tiver problemas.');
    }
}


async function loadFullOrdersList(forceReload = false) {
    if (hasLoadedFullOrdersList && !forceReload) {
        console.log('⏳ [fullOrdersList] Lista completa já carregada. Pulando recarregamento.');
        return; 
    }
    
    console.log('   [fullOrdersList] Iniciando carregamento de TODAS as ordens do banco de dados...');
    
    try {
        let url = `${API_BASE_URL}/get_orders.php?all=true&_=${new Date().getTime()}`;
        console.log('   [fullOrdersList] URL da requisição:', url);
        
        const response = await fetch(url, {
            headers: { 
                'Cache-Control': 'no-cache, no-store, must-revalidate', 
                'Pragma': 'no-cache', 
                'Expires': '0' 
            }
        });

        // NOVO: Verificar status HTTP
        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }

        // NOVO: Ler como texto primeiro para debug
        const textResponse = await response.text();
        
        if (!textResponse || textResponse.trim() === '') {
            throw new Error('API retornou resposta vazia');
        }

        console.log('[fullOrdersList] Resposta da API (primeiros 500 caracteres):', textResponse.substring(0, 500));

        // Agora fazer parse como JSON
        let data;
        try {
            data = JSON.parse(textResponse);
        } catch (parseError) {
            console.error('❌ [fullOrdersList] Erro ao fazer parse do JSON:', parseError);
            console.error('Resposta completa:', textResponse);
            throw new Error(`JSON inválido recebido: ${parseError.message}`);
        }

        // Validar se a resposta tem sucesso
        if (!data.success) {
            console.warn('⚠️ [fullOrdersList] API retornou success: false. Erro:', data.error || 'Erro desconhecido');
            fullOrdersList = [];
            hasLoadedFullOrdersList = false;
            showSystemMessage(`Erro ao carregar ordens: ${data.error || 'Erro desconhecido'}`, 'error', 5000);
            return;
        }

        // Validar se data.data é um array
        if (!Array.isArray(data.data)) {
            console.warn('⚠️ [fullOrdersList] data.data não é um array. Tipo recebido:', typeof data.data);
            fullOrdersList = [];
            hasLoadedFullOrdersList = false;
            return;
        }

        // Processar os dados
        fullOrdersList = data.data.map(order => {
            order.paymentValue = parseFloat(order.paymentValue || 0);
            order.approvedByDiretoria = Boolean(Number(order.approvedByDiretoria));
            order.approvedByFinanceiro = Boolean(Number(order.approvedByFinanceiro));
            order.isPaid = Boolean(Number(order.isPaid));
            
            if (typeof order.payments === 'string') {
                try { 
                    order.payments = JSON.parse(order.payments); 
                } catch (e) { 
                    console.error("Erro ao parsear payments JSON (API) para ordem:", order.id, e, order.payments); 
                    order.payments = []; 
                }
            }
            
            order.payments = Array.isArray(order.payments) ? order.payments : [];
            return order;
        });

        hasLoadedFullOrdersList = true;
        console.log(`✅ [fullOrdersList] Carregada com ${fullOrdersList.length} ordens totais do servidor.`);
        
        // Atualizar os contadores agora que os dados estão carregados
        updateCounters();
        updateDetailedCounters();

    } catch (error) {
        console.error('❌ [fullOrdersList] Erro ao carregar todas as ordens:', error.message);
        console.error('Stack:', error.stack);
        fullOrdersList = [];
        hasLoadedFullOrdersList = false;
        showSystemMessage(`Erro ao carregar ordens: ${error.message}`, 'error', 5000);
    } 
    if (document.getElementById('boletoCompany')) {
        populateBoletoCompanySelect();
    }
    setTimeout(() => {
        populateBoletoCompanySelect();
    }, 200);
}
async function loadSalaries(forceReload = false) { // Adiciona forceReload
    if (hasLoadedSalaries && !forceReload) {
        console.log('⏳ [loadSalaries] Salários já carregados. Pulando recarregamento da API.');
        return; // Retorna imediatamente se já carregado
    }

    console.log('🔄 [loadSalaries] Tentando carregar salários do banco...');

    try {
        const response = await fetch(`${API_BASE_URL}/get_salaries.php?_=${new Date().getTime()}`);
        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
            salaries = data.data.map(salary => {
                salary.value = parseFloat(salary.value || 0);
                salary.isBackedUp = Boolean(Number(salary.isBackedUp));
                return salary;
            });
            localStorage.setItem('salaries', JSON.stringify(salaries)); // Salva no localStorage como cache
            hasLoadedSalaries = true; // Define a flag como true em caso de sucesso
            console.log(`✅ [loadSalaries] ${salaries.length} salários carregados do servidor.`);
        } else {
            console.warn('loadSalaries: ⚠️ Nenhum salário encontrado na API ou falha na resposta (success: false).', data);
            salaries = [];
            localStorage.removeItem('salaries');
            hasLoadedSalaries = false; // Define a flag como false em caso de erro
        }
    } catch (error) {
        console.error('loadSalaries: ❌ Erro ao carregar salários da API (conexão ou servidor):', error);
        salaries = [];
        localStorage.removeItem('salaries');
        hasLoadedSalaries = false; // Define a flag como false em caso de erro
    } finally {
        hideLoadingOverlay(); // Esconde o overlay
    }
}
function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    
    autoRefreshInterval = setInterval(async () => {
        if (authToken && currentUser) {
            updateCounters();
            updateDetailedCounters();
            
        }
    }, 30000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// APROX. LINHA 4005: displayOrders = async function() {
displayOrders = async function() { 
    console.log('🎯 displayOrders iniciada');
    await loadOrders(); 

    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) {
        console.log('❌ [displayOrders] Elemento ordersTableBody não encontrado.');
        // hideLoadingOverlay(); // Não esconde aqui, loadOrders já faz isso, mas removemos para o fluxo de filtro
        return;
    }
    
    tbody.innerHTML = ''; // Limpa a tabela antes de popular

    let ordersToDisplay = orders; 
    
    if (!ordersToDisplay || ordersToDisplay.length === 0) {
        console.log('⚠️ [displayOrders] O array de ordens está vazio ou não há resultados para os filtros.');
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">Nenhuma ordem encontrada com os filtros aplicados.</td></tr>';
        updateFilterResults(0); // Passar 0 para indicar que não há resultados na página
        updatePaginationControls(); 
        
        const ordersTabHeader = document.querySelector('#ordersTab h2'); 
        if (ordersTabHeader) {
            const existingAlertsContainer = ordersTabHeader.parentNode.querySelector('.soft-alerts-container');
            if (existingAlertsContainer) {
                existingAlertsContainer.remove();
            }
        }
        // hideLoadingOverlay(); // <--- REMOVIDA AQUI para o fluxo de filtragem
        return;
    }
    
    // A ordenação ainda pode ser feita no cliente se o backend não a suporta ou para um controle mais fino.
    // MAS, idealmente, se sortBy for enviado ao backend, a ordenação já virá de lá.
    // Manter aqui por segurança, caso o backend não ordene tudo como esperado.
    const finalSortedOrders = sortOrders(ordersToDisplay, currentFilters.sortBy);
    console.log(`✅ [displayOrders] Ordens finais para exibição: ${finalSortedOrders.length} itens.`);

    console.log(`📝 [displayOrders] Criando ${finalSortedOrders.length} linhas da tabela...`);
    finalSortedOrders.forEach(order => {
        const row = createOrderRow(order, 'general');
        tbody.appendChild(row);
    });
    
    // updateFilterResults agora deve usar o total_filtered_records do backend (totalOrdersInSystem)
    updateFilterResults(finalSortedOrders, totalOrdersInSystem); 
    updatePaginationControls();
    updateDiscreteLegend(); 
    // hideLoadingOverlay(); // <--- REMOVIDA AQUI para o fluxo de filtragem
    console.log('🏁 [displayOrders] Função displayOrders concluída.');

    // --- POSIÇÃO CORRETA PARA displaySoftOrderAlerts ---
    // A chamada para displaySoftOrderAlerts deve ocorrer DEPOIS que ordersToDisplay está definida.
    const ordersTabHeader = document.querySelector('#ordersTab h2'); 
    if (ordersTabHeader) {
        displaySoftOrderAlerts(ordersToDisplay, ordersTabHeader); 
    } else {
        console.warn('H2 da ordersTab não encontrado para inserir soft alerts. Verifique o HTML.');
    }
    // --- FIM DA POSIÇÃO CORRETA ---

    if (highlightEditedOrderId) {
        applyHighlightToRowById(highlightEditedOrderId, 'highlight-edited-order');
        highlightEditedOrderId = null; // Limpa a variável global após o uso
    }

    if (highlightNewOrderId) {
        console.log(`✨ [displayOrders] Tentando destacar nova ordem com ID: ${highlightNewOrderId}`);
        setTimeout(() => {
            const newOrderElement = document.getElementById(`order-${highlightNewOrderId}`); 
            if (newOrderElement) {
                newOrderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                newOrderElement.classList.add('highlight-new-order');
                setTimeout(() => {
                    newOrderElement.classList.remove('highlight-new-order');
                }, 2000); 
            } else {
                console.warn(`⚠️ [displayOrders] Elemento da nova ordem com ID ${highlightNewOrderId} não encontrado para destacar.`);
            }
            highlightNewOrderId = null;
        }, 500);
    }
};

// NOVO: getFilteredOrdersForDisplay para filtrar o array 'orders' da página atual
function getFilteredOrdersForDisplay(ordersToFilter) {
    console.log('⚙️ [getFilteredOrdersForDisplay] Aplicando filtros à página atual de ordens...');
    const selectedStatuses = currentFilters.status;
    const priorityFilter = currentFilters.priority;
    const searchTerm = currentFilters.searchTerm ? currentFilters.searchTerm.toLowerCase() : ''; 
    const paymentTypeFilter = currentFilters.paymentType;
    const directionFilter = currentFilters.direction;
    const solicitantFilter = currentFilters.solicitant;
    const processFilter = currentFilters.process;
    const valueMin = parseFloat(currentFilters.valueMin) || 0;
    const valueMax = parseFloat(currentFilters.valueMax) || Infinity;
    
    const generationDateStart = currentFilters.dateStart; 
    const generationDateEnd = currentFilters.dateEnd;     

    const forecastDateStart = currentFilters.forecastDateStart; 
    const forecastDateEnd = currentFilters.forecastDateEnd;     

    const filtered = ordersToFilter.filter(order => {
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(order.status);
        if (!matchesStatus) return false;

        const matchesPriority = !priorityFilter || order.priority === priorityFilter;
        if (!matchesPriority) return false;

        const matchesPaymentType = !paymentTypeFilter || order.paymentType === paymentTypeFilter;
        if (!matchesPaymentType) return false;

        const matchesDirection = !directionFilter || (order.direction && order.direction.toLowerCase() === directionFilter.toLowerCase());
        if (!matchesDirection) return false;

        const matchesSolicitant = !solicitantFilter || (order.solicitant && order.solicitant.toLowerCase() === solicitantFilter.toLowerCase());
        if (!matchesSolicitant) return false;

        const matchesProcess = !processFilter || (order.process && order.process.toLowerCase().includes(processFilter.toLowerCase()));
        if (!matchesProcess) return false;

        const orderValue = parseFloat(order.paymentValue) || 0;
        const matchesValue = orderValue >= valueMin && orderValue <= valueMax;
        if (!matchesValue) return false;

        let matchesGenerationDate = true;
        if (generationDateStart || generationDateEnd) {
            const orderGenerationDate = order.generationDate; 
            if (generationDateStart && orderGenerationDate < generationDateStart) { matchesGenerationDate = false; }
            if (matchesGenerationDate && generationDateEnd && orderGenerationDate > generationDateEnd) { matchesGenerationDate = false; }
        }
        if (!matchesGenerationDate) return false;

        let matchesPaymentForecastDate = true;
        if (forecastDateStart || forecastDateEnd) {
            const orderPaymentForecast = order.paymentForecast;
            if (!orderPaymentForecast) { 
                matchesPaymentForecastDate = false; 
            } else {
                if (forecastDateStart && orderPaymentForecast < forecastDateStart) { matchesPaymentForecastDate = false; }
                if (matchesPaymentForecastDate && forecastDateEnd && orderPaymentForecast > forecastDateEnd) { matchesPaymentForecastDate = false; }
            }
        }
        if (!matchesPaymentForecastDate) return false;

        const matchesSearch = !searchTerm || 
                              (order.favoredName && order.favoredName.toLowerCase().includes(searchTerm)) ||
                              (order.process && order.process.toLowerCase().includes(searchTerm)) ||
                              (order.reference && order.reference.toLowerCase().includes(searchTerm)) ||
                              (order.observation && order.observation.toLowerCase().includes(searchTerm));
        if (!matchesSearch) return false;

        return true;
    });
    console.log(`✅ [getFilteredOrdersForDisplay] ${filtered.length} ordens resultantes após filtros na página atual.`);
    return filtered;
}
// =======================================================
// LÓGICA ESPECÍFICA PARA A ABA 'DADOS DE ENTRADA' (entryDataTab)
// =======================================================

function populateEntryDataCompanyFilter() {
    const select = document.getElementById('entryDataFilterCompany');
    if (!select) return;

    while (select.options.length > 1) { select.remove(1); } // Limpa exceto a primeira opção

    const uniqueCompanies = new Set();
    // Itera sobre toda a fullOrdersList e adiciona apenas empresas válidas
    fullOrdersList.forEach(order => {
        if (order.status !== 'Paga' && typeof order.company === 'string' && order.company.trim() !== '') {
            uniqueCompanies.add(order.company.trim());
        }
    });
    
    Array.from(uniqueCompanies).sort().forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        option.textContent = company;
        select.appendChild(option);
    });
}

function populateEntryDataProcessFilter() {
    const select = document.getElementById('entryDataFilterProcess');
    if (!select) return;

    while (select.options.length > 1) { select.remove(1); } // Limpa exceto a primeira opção

    const uniqueProcesses = new Set();
    // Itera sobre toda a fullOrdersList e adiciona apenas processos válidos
    fullOrdersList.forEach(order => {
        if (order.status !== 'Paga' && typeof order.process === 'string' && order.process.trim() !== '') {
            uniqueProcesses.add(order.process.trim());
        }
    });

    Array.from(uniqueProcesses).sort().forEach(process => {
        const option = document.createElement('option');
        option.value = process;
        option.textContent = process;
        select.appendChild(option);
    });
}

function populateEntryDataSolicitantFilter() {
    const select = document.getElementById('entryDataFilterSolicitant');
    if (!select) return;

    while (select.options.length > 1) { select.remove(1); } // Limpa exceto a primeira opção

    const uniqueSolicitants = new Set();
    const hardcodedSolicitants = ["Djael Jr", "Rafael Sagrilo", "Lucas Silva", "Verônica Barbosa", "Rafael Sayd", "Maurício Sena"]; 
    hardcodedSolicitants.forEach(name => uniqueSolicitants.add(name));

    // Itera sobre toda a fullOrdersList e adiciona apenas solicitantes válidos
    fullOrdersList.forEach(order => {
        // Verifica status, tipo string, e que não seja vazio/Outro (placeholder)
        if (order.status !== 'Paga' && typeof order.solicitant === 'string' && order.solicitant.trim() !== '' && order.solicitant.trim().toLowerCase() !== 'outro') {
            uniqueSolicitants.add(order.solicitant.trim());
        }
    });
    
    Array.from(uniqueSolicitants).sort().forEach(solicitant => {
        const option = document.createElement('option');
        option.value = solicitant;
        option.textContent = solicitant;
        select.appendChild(option);
    });
}
// --- LÓGICA DE FILTRAGEM ---
function getEntryDataFilteredOrders() {
    console.log('⚙️ [getEntryDataFilteredOrders] Aplicando filtros...');
    console.log('   Filtros atuais para Dados de Entrada:', entryDataCurrentFilters);

    const selectedStatuses = entryDataCurrentFilters.status;
    const priorityFilter = entryDataCurrentFilters.priority;
    const paymentTypeFilter = entryDataCurrentFilters.paymentType;
    const directionFilter = entryDataCurrentFilters.direction;
    const solicitantFilter = entryDataCurrentFilters.solicitant;
    const processFilter = entryDataCurrentFilters.process;
    const searchTerm = entryDataCurrentFilters.searchTerm ? entryDataCurrentFilters.searchTerm.toLowerCase() : ''; 
    const valueMin = parseFloat(entryDataCurrentFilters.valueMin) || 0;
    const valueMax = parseFloat(entryDataCurrentFilters.valueMax) || Infinity;
    const dateStart = entryDataCurrentFilters.dateStart; // Data de Geração Inicial
    const dateEnd = entryDataCurrentFilters.dateEnd;     // Data de Geração Final

    const filtered = fullOrdersList.filter(order => {
        // Exibir apenas ordens NÃO PAGAS
        if (order.status === 'Paga') return false;

        // Status
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(order.status);
        if (!matchesStatus) return false;

        // Priority
        const matchesPriority = !priorityFilter || order.priority === priorityFilter;
        if (!matchesPriority) return false;

        // Payment Type
        const matchesPaymentType = !paymentTypeFilter || order.paymentType === paymentTypeFilter;
        if (!matchesPaymentType) return false;

        // Direction (case-insensitive)
        const matchesDirection = !directionFilter || (order.direction && order.direction.toLowerCase() === directionFilter.toLowerCase());
        if (!matchesDirection) return false;

        // Solicitant (case-insensitive)
        const matchesSolicitant = !solicitantFilter || (order.solicitant && order.solicitant.toLowerCase() === solicitantFilter.toLowerCase());
        if (!matchesSolicitant) return false;

        // Process (case-insensitive)
        const matchesProcess = !processFilter || (order.process && order.process.toLowerCase().includes(processFilter.toLowerCase()));
        if (!matchesProcess) return false;

        // Value Range
        const orderValue = parseFloat(order.paymentValue) || 0;
        const matchesValue = orderValue >= valueMin && orderValue <= valueMax;
        if (!matchesValue) return false;

        // Date Range for GENERATION DATE
        let matchesGenerationDate = true;
        if (dateStart || dateEnd) {
            const orderGenerationDate = order.generationDate; 
            if (dateStart && orderGenerationDate < dateStart) { matchesGenerationDate = false; }
            if (matchesGenerationDate && dateEnd && orderGenerationDate > dateEnd) { matchesGenerationDate = false; }
        }
        if (!matchesGenerationDate) return false;

        // Search Term (case-insensitive on FavoredName, Reference, Observation)
        const matchesSearch = !searchTerm ||
                              (order.favoredName && order.favoredName.toLowerCase().includes(searchTerm)) ||
                              (order.reference && order.reference.toLowerCase().includes(searchTerm)) ||
                              (order.observation && order.observation.toLowerCase().includes(searchTerm));
        if (!matchesSearch) return false;

        return true; // Se passou por todos os filtros
    });
    console.log(`✅ [getEntryDataFilteredOrders] ${filtered.length} ordens resultantes após filtros.`);
    return filtered;
}

// --- FUNÇÃO DE ORDENAÇÃO ---
function sortEntryDataOrders(ordersArray, sortBy) {
    return ordersArray.sort((a, b) => {
        switch (sortBy) {
            case 'generationDate_desc':
                return new Date(b.generationDate) - new Date(a.generationDate);
            case 'generationDate_asc':
                return new Date(a.generationDate) - new Date(b.generationDate);
            case 'priority_date': // Reutilizando a lógica existente para prioridade + data de vencimento
                const priorityOrderMap = { 'Emergencia': 3, 'Urgencia': 2, 'Normal': 1 };
                const aPriority = priorityOrderMap[a.priority] || 0; 
                const bPriority = priorityOrderMap[b.priority] || 0;
                if (aPriority !== bPriority) { return bPriority - aPriority; }
                const aDate = criarDataLocal(a.paymentForecast || a.generationDate);
                const bDate = criarDataLocal(b.paymentForecast || b.generationDate);
                return aDate - bDate; 
            case 'paymentValue_desc':
                return parseFloat(b.paymentValue || 0) - parseFloat(a.paymentValue || 0);
            case 'paymentValue_asc':
                return parseFloat(a.paymentValue || 0) - parseFloat(b.paymentValue || 0);
            case 'favoredName':
                return (a.favoredName || '').localeCompare(b.favoredName || '');
            case 'process':
                return (a.process || '').localeCompare(b.process || '');
            default:
                return 0;
        }
    });
}

// --- FUNÇÃO PARA CRIAR LINHA DA TABELA 'DADOS DE ENTRADA' ---
function createEntryDataOrderRow(order) {
    const row = document.createElement('tr');
    
    // As ordens em Dados de Entrada são sempre pendentes, então vamos usar essa lógica de alerta
    const isEmergency = order.priority && (order.priority.toLowerCase() === 'emergencia' || order.priority.toLowerCase() === 'emergência');
    let overdueIcon = '';
    let upcomingIcon = '';
    let emergencyIcon = '';

    if (isEmergency) {
        row.classList.add('order-emergency');
        emergencyIcon = '🚨';
    } else if (order.paymentForecast) {
        const today = getTodayCorrect();
        const forecastDate = createLocalDate(order.paymentForecast);
        const diffDays = Math.ceil((forecastDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
            row.classList.add('order-overdue');
            overdueIcon = '🚩 ';
        } else if (diffDays >= 0 && diffDays <= 4) {
            row.classList.add('order-upcoming');
            upcomingIcon = '⚠️ ';
        }
    }

    let statusDisplay = order.status || 'Pendente';
    const statusClass = statusDisplay.toLowerCase().replace(/\s+/g, '-');
    const statusBadgeHtml = `<span class="status-badge status-${statusClass}">${statusDisplay}</span>`;

    const orderCompany = order.company || 'N/A';
    const orderProcess = order.process || 'N/A';
    const orderValue = parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2});
    const orderDate = formatDate(order.generationDate || '');

    // Botões de Ação
    let actionButtons = `<button class="btn btn-info btn-small btn-icon-label" onclick="viewOrder('${order.id}')"><i class="fas fa-eye"></i> Ver</button>`;
    if (canRegisterPayment()) { // Pagar
        actionButtons += `<button class="btn btn-success btn-small pay-order-btn" data-order-id="${order.id}"><i class="fas fa-money-bill-wave"></i> Pagar</button>`;
    }
    if (canEditOrder(order)) { // Editar
        actionButtons += `<button class="btn btn-info btn-small" onclick="editOrder('${order.id}')"><i class="fas fa-edit"></i> Editar</button>`;
    }
    if (canDeleteOrder(order)) { // Excluir
        actionButtons += `<button class="btn btn-danger btn-small" onclick="deleteOrder('${order.id}')"><i class="fas fa-trash"></i> Excluir</button>`;
    }
    
    row.innerHTML = `
        <td>${emergencyIcon}${overdueIcon}${upcomingIcon}${escapeForHTML(orderCompany)}</td>
        <td>${escapeForHTML(orderProcess)}</td>
        <td>R$ ${orderValue}</td>
        <td>${orderDate}</td>
        <td>${statusBadgeHtml}</td>
        <td>
            <div class="action-buttons">
                ${actionButtons}
            </div>
        </td>
    `;
    return row;
}

// --- FUNÇÃO PRINCIPAL DE EXIBIÇÃO 'DADOS DE ENTRADA' ---
function displayEntryDataOrders() {
    console.log('🎯 [displayEntryDataOrders] Iniciada.');
    
    const tbody = document.getElementById('entryDataTableBody');
    if (!tbody) {
        console.log('❌ [displayEntryDataOrders] Elemento entryDataTableBody não encontrado.');
        return;
    }
    
    tbody.innerHTML = ''; // Limpa a tabela antes de popular

    // 1. Obter ordens filtradas a partir da lista COMPLETA (`fullOrdersList`)
    let filteredOrders = getEntryDataFilteredOrders();
    console.log(`🔎 [displayEntryDataOrders] Ordens filtradas de fullOrdersList: ${filteredOrders.length} itens.`);

    // 2. Aplicar paginação client-side na lista filtrada
    let paginatedAndFilteredOrders = [];
    if (entryDataShowAllItemsMode) {
        paginatedAndFilteredOrders = filteredOrders;
        entryDataTotalItemsInSystem = filteredOrders.length;
    } else {
        entryDataTotalItemsInSystem = filteredOrders.length;
        entryDataTotalPages = Math.ceil(entryDataTotalItemsInSystem / entryDataItemsPerPage);
        if (entryDataCurrentPage > entryDataTotalPages) entryDataCurrentPage = entryDataTotalPages > 0 ? entryDataTotalPages : 1;
        if (entryDataCurrentPage < 1) entryDataCurrentPage = 1;

        const startIndex = (entryDataCurrentPage - 1) * entryDataItemsPerPage;
        const endIndex = startIndex + entryDataItemsPerPage;
        paginatedAndFilteredOrders = filteredOrders.slice(startIndex, endIndex);
    }
    console.log(`📄 [displayEntryDataOrders] Ordens após paginação: ${paginatedAndFilteredOrders.length} itens.`);
    
    // 3. Ordenar a lista paginada e filtrada
    const finalSortedOrders = sortEntryDataOrders(paginatedAndFilteredOrders, entryDataCurrentFilters.sortBy);
    console.log(`✅ [displayEntryDataOrders] Ordens finais para exibição: ${finalSortedOrders.length} itens.`);

    if (finalSortedOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Nenhuma ordem pendente encontrada com os filtros aplicados.</td></tr>';
    } else {
        finalSortedOrders.forEach(order => {
            const row = createEntryDataOrderRow(order);
            tbody.appendChild(row);
        });
    }
    
    // Atualiza a mensagem de resultados de filtro e os controles de paginação
    updateEntryDataFilterResults(finalSortedOrders);
    updateEntryDataPaginationControls();
    // updateDiscreteLegend(); // Se precisar de indicadores de alerta específicos para esta aba

    console.log('🏁 [displayEntryDataOrders] Função displayEntryDataOrders concluída.');
}

// --- LÓGICA DE PAGINAÇÃO ---
function entryDataGoToPage(page) {
    if (page < 1 || page > entryDataTotalPages) {
        console.warn(`Tentativa de ir para página inválida de Dados de Entrada: ${page}. Total de páginas: ${entryDataTotalPages}.`);
        return;
    }
    entryDataCurrentPage = page;
    displayEntryDataOrders();
}

function entryDataNextPage() {
    if (entryDataCurrentPage < entryDataTotalPages) {
        entryDataCurrentPage++;
        displayEntryDataOrders();
    }
}

function entryDataPrevPage() {
    if (entryDataCurrentPage > 1) {
        entryDataCurrentPage--;
        displayEntryDataOrders();
    }
}

function updateEntryDataPaginationControls() {
    const paginationContainer = document.getElementById('entryDataPaginationControls');
    if (!paginationContainer) {
        console.warn('Elemento #entryDataPaginationControls não encontrado no DOM. Paginação não será exibida.');
        return;
    }

    if (entryDataShowAllItemsMode) {
        paginationContainer.style.display = 'none';
    } else {
        if (entryDataTotalPages > 1) {
            paginationContainer.style.display = 'flex'; 
        } else {
            paginationContainer.style.display = 'none';
        }
    }

    const prevBtn = document.getElementById('entryDataPrevPageBtn');
    const nextBtn = document.getElementById('entryDataNextPageBtn');
    const pageInfo = document.getElementById('entryDataPageInfo');

    if (prevBtn) prevBtn.disabled = (entryDataCurrentPage === 1);
    if (nextBtn) nextBtn.disabled = (entryDataCurrentPage === entryDataTotalPages || entryDataTotalPages === 0);
    if (pageInfo) pageInfo.textContent = `Página ${entryDataCurrentPage} de ${entryDataTotalPages === 0 ? 1 : entryDataTotalPages}`;
}

function toggleEntryDataShowAllItems() {
    entryDataShowAllItemsMode = !entryDataShowAllItemsMode;
    const toggleButton = document.getElementById('toggleEntryDataShowAllItemsBtn');

    if (entryDataShowAllItemsMode) {
        entryDataItemsPerPage = entryDataTotalItemsInSystem > 0 ? entryDataTotalItemsInSystem : 1;
        entryDataCurrentPage = 1;
        if (toggleButton) {
            toggleButton.innerHTML = '<i class="fas fa-columns"></i> Voltar para Paginação';
        }
    } else {
        entryDataItemsPerPage = ENTRY_DATA_DEFAULT_ITEMS_PER_PAGE;
        entryDataCurrentPage = 1;
        if (toggleButton) {
            toggleButton.innerHTML = '<i class="fas fa-list-alt"></i> Mostrar todas as ordens';
        }
    }
    displayEntryDataOrders();
}

// --- LÓGICA DE FILTROS AVANÇADOS ---
function applyEntryDataFilters() {
    // Capturar valores dos filtros
    const statusSelect = document.getElementById('entryDataFilterStatus');
    entryDataCurrentFilters.status = Array.from(statusSelect.selectedOptions).map(option => option.value);
    entryDataCurrentFilters.priority = document.getElementById('entryDataFilterPriority').value;
    entryDataCurrentFilters.paymentType = document.getElementById('entryDataFilterPaymentType').value;
    entryDataCurrentFilters.direction = document.getElementById('entryDataFilterDirection').value;
    entryDataCurrentFilters.solicitant = document.getElementById('entryDataFilterSolicitant').value;
    entryDataCurrentFilters.process = document.getElementById('entryDataFilterProcess').value;
    entryDataCurrentFilters.searchTerm = document.getElementById('entryDataSearchTerm').value.toLowerCase();
    entryDataCurrentFilters.valueMin = parseFloat(document.getElementById('entryDataFilterValueMin').value) || 0;
    entryDataCurrentFilters.valueMax = parseFloat(document.getElementById('entryDataFilterValueMax').value) || Infinity;
    entryDataCurrentFilters.dateStart = document.getElementById('entryDataFilterDateStart').value;
    entryDataCurrentFilters.dateEnd = document.getElementById('entryDataFilterDateEnd').value;
    entryDataCurrentFilters.sortBy = document.getElementById('entryDataSortBy').value;
    
    displayEntryDataOrders();
}

function clearEntryDataFilters() {
    document.getElementById('entryDataFilterStatus').selectedIndex = -1;
    document.getElementById('entryDataFilterPriority').value = '';
    document.getElementById('entryDataFilterPaymentType').value = '';
    document.getElementById('entryDataFilterDirection').value = '';
    document.getElementById('entryDataFilterSolicitant').value = '';
    document.getElementById('entryDataFilterProcess').value = '';
    document.getElementById('entryDataSearchTerm').value = '';
    document.getElementById('entryDataFilterValueMin').value = '';
    document.getElementById('entryDataFilterValueMax').value = '';
    document.getElementById('entryDataFilterDateStart').value = '';
    document.getElementById('entryDataFilterDateEnd').value = '';
    document.getElementById('entryDataSortBy').value = 'generationDate_desc';
    
    entryDataCurrentFilters = { // Resetar objeto de filtros
        status: [], priority: '', paymentType: '', direction: '', solicitant: '', process: '',
        searchTerm: '', valueMin: '', valueMax: '', dateStart: '', dateEnd: '',
        sortBy: 'generationDate_desc'
    };
    
    displayEntryDataOrders();
}

function toggleEntryDataAdvancedFilters() {
    const filtersContainer = document.getElementById('entryDataAdvancedFiltersContainer');
    const toggleBtn = document.getElementById('toggleEntryDataFiltersBtn');
    
    if (!filtersContainer || !toggleBtn) { return; }
    
    const isCurrentlyVisible = filtersContainer.style.display !== 'none';
    
    if (isCurrentlyVisible) {
        filtersContainer.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-filter"></i> Filtros';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-primary');
    } else {
        filtersContainer.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-filter"></i> Fechar Filtros';
        toggleBtn.classList.remove('btn-primary');
        toggleBtn.classList.add('btn-secondary');
    }
}

// --- FUNÇÃO PARA ATUALIZAR CONTADOR DE RESULTADOS ---
function updateEntryDataFilterResults(filteredOrders) {
    const tab = document.getElementById('entryDataTab');
    if (!tab) return;

    const existingInfoBox = tab.querySelector('.filtered-info-box');
    if (existingInfoBox) { existingInfoBox.remove(); }

    const filteredCount = filteredOrders.length;
    const orderText = filteredCount === 1 ? 'ordem pendente' : 'ordens pendentes';

    const totalValueFiltered = filteredOrders.reduce((sum, order) => {
        return sum + (parseFloat(order.paymentValue) || 0);
    }, 0);
    const formattedTotalValueFiltered = totalValueFiltered.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' });

    let messageContent;
    if (entryDataShowAllItemsMode) {
        if (filteredCount === 0) {
            messageContent = `Nenhuma ${orderText} encontrada com os filtros aplicados.`;
        } else {
            messageContent = `Mostrando <strong>todas</strong> as <strong>${filteredCount}</strong> ${orderText}.`;
            messageContent += `<br>Valor Total: <strong>${formattedTotalValueFiltered}</strong>`;
        }
    } else { // Modo de Paginação
        if (filteredCount === 0) {
            messageContent = `Nenhuma ${orderText} encontrada nesta página com os filtros aplicados.`;
        } else {
            messageContent = `<strong>${filteredCount}</strong> ${orderText} exibida(s) nesta página.`;
            messageContent += `<br>Valor Total Exibido nesta página: <strong>${formattedTotalValueFiltered}</strong>`;
        }
    }

    const infoBoxHtml = `
        <div class="filtered-info-box">
            <span class="text-content">
                ${messageContent}
            </span>
        </div>
    `;

    const filtersContainer = tab.querySelector('.filters-container');
    if (filtersContainer && filtersContainer.parentElement) {
        filtersContainer.parentElement.insertBefore(document.createRange().createContextualFragment(infoBoxHtml), filtersContainer.nextElementSibling);
    } else if (tab) {
        tab.insertBefore(document.createRange().createContextualFragment(infoBoxHtml), tab.firstChild);
    }
}

// --- EXPORTAÇÃO PARA EXCEL ---
function exportEntryDataToExcel() {
    console.log('%c[DEBUG_EXPORT] Preparing Entry Data Excel export...', 'color: green; font-weight: bold;');
    const filteredOrders = getEntryDataFilteredOrders();

    if (filteredOrders.length === 0) {
        alert('Nenhuma ordem pendente para exportar após os filtros.');
        return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,%EF%BB%BF';
    const delimiter = ';';

    csvContent += [
        'Empresa',
        'Processo',
        'Valor',
        'Data Criacao',
        'Status',
        'Favorecido',
        'Tipo Pagamento',
        'Prioridade',
        'Direcionamento',
        'Solicitante',
        'Referencia',
        'Observacao'
    ].map(header => `"${header}"`).join(delimiter) + '\n';

    filteredOrders.forEach(order => {
        const fields = [
            order.company || '',
            order.process || '',
            parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, useGrouping: false }),
            formatDate(order.generationDate),
            order.status,
            order.favoredName,
            order.paymentType,
            order.priority,
            order.direction || '',
            order.solicitant || '',
            order.reference || '',
            order.observation || ''
        ];

        const row = fields.map(field => {
            const stringField = String(field);
            return `"${stringField.replace(/"/g, '""')}"`;
        }).join(delimiter) + '\n';
        
        csvContent += row;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dados_entrada_pendentes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('%c[DEBUG_EXPORT] Entry Data Excel export initiated.', 'color: green;');
}

function getAllPendingParcels(orders) {
    console.log('DEBUG - Extraindo parcelas pendentes...');
    
    const allParcels = [];
    
    if (!orders || !Array.isArray(orders)) {
        console.warn('⚠️ Orders não é um array válido');
        return allParcels;
    }
    
    orders.forEach(order => {
        if (order.boletos && Array.isArray(order.boletos)) {
            order.boletos.forEach(boleto => {
                if (boleto.parcelas && Array.isArray(boleto.parcelas)) {
                    boleto.parcelas.forEach(parcela => {
                        if (parcela.status !== 'Paga') {
                            allParcels.push({
                                orderId: order.id,
                                favoredName: order.favoredName,
                                week: parcela.dueDate || order.paymentForecast || 'N/A',
                                amount: parseFloat(parcela.value || 0),
                                status: parcela.status
                            });
                        }
                    });
                }
            });
        }
    });
    
    console.log('✅ Total de parcelas pendentes extraídas:', allParcels.length);
    return allParcels;
}

function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // ===== CONSTANTES DE LAYOUT =====
    const LAYOUT = {
        MARGIN_TOP: 20,
        MARGIN_LEFT: 20,
        MARGIN_RIGHT: 15,
        PAGE_HEIGHT: doc.internal.pageSize.height,
        PAGE_WIDTH: doc.internal.pageSize.width,
        COLORS: {
            TABLE_HEADER: [41, 128, 185],
            TABLE_HEADER_ALT: [52, 73, 94],
            TABLE_TEXT: [50, 50, 50],
            TEXT_WHITE: [255, 255, 255]
        },
        FONTS: {
            TITLE: 16,
            SUBTITLE: 12,
            TEXT: 10,
            TEXT_SMALL: 8
        },
        SPACING: {
            BETWEEN_SECTIONS: 8,
            AFTER_TABLE: 8,
            AFTER_LINE: 5
        }
    };

    // ===== FUNÇÕES AUXILIARES =====
    const addSectionTitle = (title, yPos) => {
        doc.setFontSize(LAYOUT.FONTS.SUBTITLE);
        doc.setFont("helvetica", "bold");
        doc.text(title, LAYOUT.MARGIN_LEFT, yPos);
        return yPos + LAYOUT.SPACING.AFTER_LINE;
    };

    const addSummaryText = (text, yPos, isBold = false) => {
        doc.setFontSize(LAYOUT.FONTS.TEXT);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.text(text, LAYOUT.MARGIN_LEFT, yPos);
        return yPos + LAYOUT.SPACING.AFTER_LINE;
    };

    const addSectionSpacing = (yPos) => {
        return yPos + LAYOUT.SPACING.BETWEEN_SECTIONS;
    };

    const addInfoText = (text, yPos) => {
        doc.setFontSize(LAYOUT.FONTS.TEXT_SMALL);
        doc.setFont("helvetica", "italic");
        doc.text(text, LAYOUT.MARGIN_LEFT, yPos);
        return yPos + LAYOUT.SPACING.AFTER_LINE;
    };

    const addPageNumber = (data) => {
        let str = "Página " + doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(str, data.settings.margin.left, LAYOUT.PAGE_HEIGHT - 10);
    };

    // ===== 1. OBTER ORDENS FILTRADAS =====
    const filteredOrders = getFilteredOrders();

    if (!filteredOrders || filteredOrders.length === 0) {
        showModernInfoNotification('Nenhuma ordem encontrada com os filtros aplicados para exportar.');
        return;
    }

    // ===== PÁGINA 1: TÍTULO, FILTROS E TABELA PRINCIPAL =====
    doc.setFont("helvetica");
    doc.setFontSize(LAYOUT.FONTS.TITLE);
    doc.setFont("helvetica", "bold");
    doc.text('Relatório de Ordens de Pagamento (Filtrado)', LAYOUT.MARGIN_LEFT, LAYOUT.MARGIN_TOP);

    doc.setFontSize(LAYOUT.FONTS.TEXT);
    doc.setFont("helvetica", "normal");
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, LAYOUT.MARGIN_LEFT, LAYOUT.MARGIN_TOP + 8);

    // Exibir filtros aplicados
    let currentY = LAYOUT.MARGIN_TOP + 18;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text('Filtros Aplicados:', LAYOUT.MARGIN_LEFT, currentY);
    currentY += 5;
    doc.setFont("helvetica", "normal");

    const filters = {
        'Status': document.getElementById('filterStatus')?.value || 'Todos',
        'Prioridade': document.getElementById('filterPriority')?.value || 'Todas',
        'Tipo de Pagamento': document.getElementById('filterPaymentType')?.value || 'Todos',
        'Data Geração (Início)': document.getElementById('filterDateStart')?.value || 'Todas',
        'Data Geração (Fim)': document.getElementById('filterDateEnd')?.value || 'Todas',
        'Previsão Pagamento (Início)': document.getElementById('filterPaymentForecastStartDate')?.value || 'Todas',
        'Previsão Pagamento (Fim)': document.getElementById('filterPaymentForecastEndDate')?.value || 'Todas',
        'Empresa': document.getElementById('filterCompany')?.value || 'Todas',
        'Processo': document.getElementById('filterProcess')?.value || 'Todos',
        'Solicitante': document.getElementById('filterSolicitant')?.value || 'Todos'
    };

    let filterText = '';
    let currentLineLength = 0;
    const maxLineLength = 100;

    for (const [key, value] of Object.entries(filters)) {
        if (value !== 'Todos' && value !== 'Todas' && value !== '') {
            const item = `${key}: ${value}; `;
            if (currentLineLength + item.length > maxLineLength) {
                doc.text(filterText, LAYOUT.MARGIN_LEFT, currentY);
                currentY += 4;
                filterText = item;
                currentLineLength = item.length;
            } else {
                filterText += item;
                currentLineLength += item.length;
            }
        }
    }
    if (filterText) {
        doc.text(filterText, LAYOUT.MARGIN_LEFT, currentY);
        currentY += 4;
    }
    currentY += LAYOUT.SPACING.BETWEEN_SECTIONS;

    // Preparar dados da tabela principal
    const headers = [['Favorecido', 'Valor', 'Tipo', 'Prioridade', 'Status', 'Data', 'Processo']];
    const body = filteredOrders.map(order => [
        order.favoredName || 'N/A',
        `R$ ${parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        order.paymentType || 'N/A',
        order.priority || 'Normal',
        order.status || 'Pendente',
        new Date(order.created_at).toLocaleDateString('pt-BR'),
        order.process || 'N/A'
    ]);

    doc.autoTable({
        startY: currentY,
        head: headers,
        body: body,
        theme: 'striped',
        headStyles: {
            fillColor: LAYOUT.COLORS.TABLE_HEADER,
            textColor: LAYOUT.COLORS.TEXT_WHITE,
            fontStyle: 'bold',
            fontSize: LAYOUT.FONTS.TEXT_SMALL
        },
        bodyStyles: {
            fontSize: LAYOUT.FONTS.TEXT_SMALL,
            textColor: LAYOUT.COLORS.TABLE_TEXT
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        margin: { top: 10, left: LAYOUT.MARGIN_LEFT, right: LAYOUT.MARGIN_RIGHT },
        didDrawPage: addPageNumber
    });

    currentY = doc.autoTable.previous.finalY + LAYOUT.SPACING.AFTER_TABLE;

    // ===== SEÇÃO 2: RESUMO FINANCEIRO GERAL =====
    const totalPendingValue = filteredOrders.reduce((sum, order) => sum + parseFloat(order.paymentValue || 0), 0);
    
    currentY = addSectionTitle('2. Resumo Financeiro Geral', currentY);
    currentY = addSummaryText(`Total Geral (no período filtrado): R$ ${totalPendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, currentY, true);
    currentY = addSectionSpacing(currentY);

    // ===== SEÇÃO 3: SOMATÓRIOS POR DIRECIONAMENTO =====
    const directionSums = new Map();
    filteredOrders.forEach(order => {
        const direction = order.direction || 'Sem Direcionamento';
        const value = parseFloat(order.paymentValue || 0);
        const current = directionSums.get(direction) || 0;
        directionSums.set(direction, current + value);
    });

    if (directionSums.size > 0) {
        doc.addPage();
        currentY = LAYOUT.MARGIN_TOP;

        currentY = addSectionTitle('3. Somatórios por Direcionamento', currentY);

        const directionSummaryTableData = [];
        
        // Tiago e Lotérica primeiro, se existirem
        if (directionSums.has('Tiago')) {
            directionSummaryTableData.push(['Tiago', `R$ ${directionSums.get('Tiago').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]);
            directionSums.delete('Tiago');
        }
        if (directionSums.has('Lotérica')) {
            directionSummaryTableData.push(['Lotérica', `R$ ${directionSums.get('Lotérica').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]);
            directionSums.delete('Lotérica');
        }
        
        // Outros direcionamentos ordenados alfabeticamente
        Array.from(directionSums.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([dirName, sum]) => {
            directionSummaryTableData.push([dirName, `R$ ${sum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]);
        });

        doc.autoTable({
            head: [['Direcionamento', 'Valor Total']],
            body: directionSummaryTableData,
            startY: currentY,
            styles: {
                fontSize: LAYOUT.FONTS.TEXT_SMALL,
                cellPadding: 3
            },
            headStyles: {
                fillColor: LAYOUT.COLORS.TABLE_HEADER_ALT,
                textColor: LAYOUT.COLORS.TEXT_WHITE,
                fontSize: LAYOUT.FONTS.TEXT_SMALL,
                fontStyle: 'bold'
            },
            didDrawPage: addPageNumber
        });
        currentY = doc.autoTable.previous.finalY + LAYOUT.SPACING.AFTER_TABLE;
    } else {
        doc.addPage();
        currentY = LAYOUT.MARGIN_TOP;
        currentY = addSectionTitle('3. Somatórios por Direcionamento', currentY);
        currentY = addInfoText('Nenhum valor pendente por direcionamento encontrado.', currentY);
        currentY += LAYOUT.SPACING.BETWEEN_SECTIONS;
    }

    // ===== SEÇÃO 4: SOMATÓRIOS POR PROCESSO =====
    const processPendingSums = new Map();
    filteredOrders.forEach(order => {
        const process = order.process || 'Sem Processo';
        const value = parseFloat(order.paymentValue || 0);
        const current = processPendingSums.get(process) || 0;
        processPendingSums.set(process, current + value);
    });

    if (processPendingSums.size > 0) {
        doc.addPage();
        currentY = LAYOUT.MARGIN_TOP;

        currentY = addSectionTitle('4. Somatórios por Processo', currentY);

        const processSummaryTableData = Array.from(processPendingSums.keys()).sort().map(processName => {
            const sum = processPendingSums.get(processName);
            return [
                processName,
                `R$ ${sum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            ];
        });

        doc.autoTable({
            head: [['Processo', 'Valor Total']],
            body: processSummaryTableData,
            startY: currentY,
            styles: {
                fontSize: LAYOUT.FONTS.TEXT_SMALL,
                cellPadding: 3
            },
            headStyles: {
                fillColor: LAYOUT.COLORS.TABLE_HEADER_ALT,
                textColor: LAYOUT.COLORS.TEXT_WHITE,
                fontSize: LAYOUT.FONTS.TEXT_SMALL,
                fontStyle: 'bold'
            },
            didDrawPage: addPageNumber
        });
        currentY = doc.autoTable.previous.finalY + LAYOUT.SPACING.AFTER_TABLE;
    } else {
        doc.addPage();
        currentY = LAYOUT.MARGIN_TOP;
        currentY = addSectionTitle('4. Somatórios por Processo', currentY);
        currentY = addInfoText('Nenhum valor pendente por processo encontrado.', currentY);
        currentY += LAYOUT.SPACING.BETWEEN_SECTIONS;
    }

    // ===== SALVAR PDF =====
    doc.save(`relatorio_ordens_pagamento_filtrado_${new Date().toISOString().split('T')[0]}.pdf`);
    showModernSuccessNotification('Relatório de Ordens de Pagamento exportado com sucesso!');
    console.log('✅ Relatório de Ordens de Pagamento exportado com sucesso.');
}
function updateOrdersTotalSummaryDisplay(count, totalValue) {
    console.log(`💰 [Orders Total] Atualizando display: ${count} ordens, R\$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    
    let ordersTotalSummaryContainer = document.getElementById('ordersTotalSummaryContainer');
    
    if (!ordersTotalSummaryContainer) {
        ordersTotalSummaryContainer = createOrdersTotalSummaryContainer();
    }
    
    // Se, por algum motivo, não conseguiu criar o container, aborta
    if (!ordersTotalSummaryContainer) {
        console.error('❌ [Orders Total] Não foi possível encontrar ou criar o container ordersTotalSummaryContainer.');
        return;
    }

    const formattedValue = totalValue.toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        style: 'currency', 
        currency: 'BRL' 
    });
    
    ordersTotalSummaryContainer.innerHTML = `
        <div class="orders-summary-card">
            <div class="summary-item">
                <i class="fas fa-list-alt text-primary"></i>
                <span class="summary-label">Ordens de Pagamento:</span>
                <span class="summary-count">${count}</span>
            </div>
            <div class="summary-item">
                <i class="fas fa-dollar-sign text-success"></i>
                <span class="summary-label">Valor Total das Ordens:</span>
                <span class="summary-value">${formattedValue}</span>
            </div>
            <div class="summary-item">
                <i class="fas fa-sync-alt text-info"></i>
                <span class="summary-label">Atualizado em:</span>
                <span class="summary-value">${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </div>
    `;
    
    ordersTotalSummaryContainer.style.transform = 'scale(1.02)';
    ordersTotalSummaryContainer.style.transition = 'transform 0.3s ease-out';
    setTimeout(() => {
        ordersTotalSummaryContainer.style.transform = 'scale(1)';
    }, 300);
}


function createOrdersTotalSummaryContainer() {
    console.log('🏗️ [Orders Total] Criando container do valor total para ordersTab...');
    
    const ordersTab = document.getElementById('ordersTab');
    if (!ordersTab) {
        console.warn('⚠️ [Orders Total] Aba de ordens de pagamento (#ordersTab) não encontrada para criar o container.');
        return null;
    }
    
    const container = document.createElement('div');
    container.id = 'ordersTotalSummaryContainer';
    container.className = 'orders-total-summary-container mb-4';

    const filtersContainer = ordersTab.querySelector('.filters-container');

    if (filtersContainer) {
        filtersContainer.parentNode.insertBefore(container, filtersContainer.nextSibling);
        return container;
    }
    

    ordersTab.prepend(container);
    console.warn('⚠️ [Orders Total] Container criado e adicionado no início da aba (fallback). Verifique o layout.');
    
    return container;
}


// FUNÇÕES DE EXIBIÇÃO DE ORDENS
// =======================================================
function displayDiretoriaOrders() {
    console.log('   [displayDiretoriaOrders] Iniciada.');
    
    const tbody = document.getElementById('diretoriaTableBody');
    if (!tbody) {
        console.log('❌ [displayDiretoriaOrders] Elemento diretoriaTableBody não encontrado.');
        return;
    }
    
    tbody.innerHTML = '';
    
    const diretoriaOrders = fullOrdersList.filter(order => order.status === 'Pendente'); 
    const sortedOrders = sortOrders(diretoriaOrders, 'priority_date');
    
    // NOVO: Adicionar os avisos suaves para ordens na aba Diretoria
    const diretoriaTabHeader = document.querySelector('#diretoriaTab h2');
    if (diretoriaTabHeader) {
        displaySoftOrderAlerts(sortedOrders, diretoriaTabHeader); 
    } else {
        console.warn('H2 da diretoriaTab não encontrado para inserir soft alerts. Verifique o HTML.');
    }
    
    // Criar e adicionar as linhas à tabela
    sortedOrders.forEach(order => {
        const row = createOrderRow(order, 'diretoria');
        tbody.appendChild(row);
    });
    
    console.log('DEBUG Destaque: Verificando highlightEditedOrderId em displayDiretoriaOrders():', highlightEditedOrderId);
    if (highlightEditedOrderId) {
        applyHighlightToRowById(highlightEditedOrderId, 'highlight-edited-order');
        console.log('DEBUG Destaque: applyHighlightToRowById chamado em displayDiretoriaOrders().');
        highlightEditedOrderId = null; // Limpa a variável global após o uso
    }
    
    if (highlightEditedOrderId) {
        applyHighlightToRowById(highlightEditedOrderId, 'highlight-edited-order');
        highlightEditedOrderId = null; // Limpa a variável global após o uso
    }
    
    console.log('   [displayDiretoriaOrders] Concluída.');
}

// FUNÇÕES DE EXIBIÇÃO DE ORDENS
// =======================================================
function displayFinanceiroOrders() {
    console.log('🎯 [displayFinanceiroOrders] Iniciada.');
    
    const tbody = document.getElementById('financeiroTableBody');
    if (!tbody) { return; }
    
    tbody.innerHTML = '';
    
    const financeiroOrders = fullOrdersList.filter(order => order.status === 'Aguardando Financeiro'); 
    const sortedOrders = sortOrders(financeiroOrders, 'priority_date');
    
    // NOVO: Adicionar os avisos suaves para ordens na aba Financeiro
    const financeiroTabHeader = document.querySelector('#financeiroTab h2');
    if (financeiroTabHeader) {
        displaySoftOrderAlerts(sortedOrders, financeiroTabHeader); 
    } else {
        console.warn('H2 da financeiroTab não encontrado para inserir soft alerts. Verifique o HTML.');
    }

    sortedOrders.forEach(order => {
        const row = createOrderRow(order, 'financeiro');
        tbody.appendChild(row);
    });
    
    if (highlightEditedOrderId) {
        applyHighlightToRowById(highlightEditedOrderId, 'highlight-edited-order');
        highlightEditedOrderId = null; // Limpa a variável global após o uso
    }
    
    console.log('🎯 [displayFinanceiroOrders] Concluída.');
}

// script.js
// APROX. LINHA 7168: function displayPendingOrders() {
function displayPendingOrders() {
    console.log('[DEBUG - displayPendingOrders] INICIADA.');
    console.log(`[DEBUG - displayPendingOrders] fullOrdersList.length no início da renderização: ${fullOrdersList.length}`);
    
    const tbody = document.getElementById('pendingTableBody');
    if (!tbody) {
        console.error('❌ Elemento pendingTableBody não encontrado');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (!fullOrdersList || fullOrdersList.length === 0) {
        console.log('[DEBUG - displayPendingOrders] fullOrdersList vazia.');
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">Nenhuma ordem encontrada.</td></tr>';
        
        // Se não há ordens, remove quaisquer alertas soft que possam estar presentes
        const pendingTabHeader = document.querySelector('#pendingTab h2'); 
        if (pendingTabHeader) {
            const existingAlertsContainer = pendingTabHeader.parentNode.querySelector('.soft-alerts-container');
            if (existingAlertsContainer) {
                existingAlertsContainer.remove();
            }
        }
        return;
    }
    
    // --- LÓGICA DE FILTRO REFORÇADA ---
    let pendingOrders = fullOrdersList.filter(order => {
        // Uma ordem é considerada "Pendente" para esta aba APENAS SE:
        // 1. Seu status for 'Aguardando Pagamento'.
        // 2. E a flag 'isPaid' for explicitamente FALSE.
        // 3. E ela tenha sido aprovada pela Diretoria E pelo Financeiro.
        const isAguardandoPagamento = order.status === 'Aguardando Pagamento';
        const isNotYetPaid = !order.isPaid; // Usa a flag booleana `isPaid`
        const isApprovedForPayment = order.approvedByDiretoria && order.approvedByFinanceiro;
        
        // Log detalhado para a ordem que está sendo testada (se `currentOrderId` estiver definido)
        if (currentOrderId && order.id === currentOrderId) {
            console.log(`%c[DEBUG displayPendingOrders Filter] Avaliando Ordem ${order.id} (${order.favoredName}):`, 'color: #007bff; background: #e3f2fd; padding: 2px 4px;');
            console.log(`  - order.status: '${order.status}' (Esperado 'Aguardando Pagamento') -> ${isAguardandoPagamento}`);
            console.log(`  - order.isPaid: ${order.isPaid} (Esperado false) -> ${isNotYetPaid}`);
            console.log(`  - approvedByDiretoria: ${order.approvedByDiretoria}, approvedByFinanceiro: ${order.approvedByFinanceiro} (Esperado true) -> ${isApprovedForPayment}`);
            console.log(`  - Resultado FINAL do filtro para esta ordem: ${isAguardandoPagamento && isNotYetPaid && isApprovedForPayment}`);
        }

        return isAguardandoPagamento && isNotYetPaid && isApprovedForPayment;
    });

    console.log(`%c[DEBUG - displayPendingOrders] Total de ordens PENDENTES filtradas de fullOrdersList para exibição: ${pendingOrders.length}`, 'color: #007bff; font-weight: bold;');
    
    pendingOrders = sortOrders(pendingOrders, 'priority_date');
    
    // NOVO: Adicionar os avisos suaves para ordens na aba Pendentes Pagamento
    const pendingTabHeader = document.querySelector('#pendingTab h2');
    if (pendingTabHeader) {
        displaySoftOrderAlerts(pendingOrders, pendingTabHeader); 
    } else {
        console.warn('H2 da pendingTab não encontrado para inserir soft alerts. Verifique o HTML.');
    }

    if (pendingOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">Nenhuma ordem aguardando pagamento encontrada.</td></tr>';
        return;
    }
    
    pendingOrders.forEach(order => {
        const row = createOrderRow(order, 'pending'); 
        tbody.appendChild(row);
    });
    
    if (highlightEditedOrderId) {
        applyHighlightToRowById(highlightEditedOrderId, 'highlight-edited-order');
        highlightEditedOrderId = null; // Limpa a variável global após o uso
    }
    
    console.log('[DEBUG - displayPendingOrders] CONCLUÍDA.');
}
updateEmergencyIndicator = function(count, context = 'general') {
   
    let tableContainer;
    let referenceElementForInsertion; // Este será o filho direto de tableContainer antes do qual inseriremos
    
    // Determinar tableContainer (a div da aba principal)
    if (context === 'boletos' || context.startsWith('boletos-')) {
        tableContainer = document.getElementById('boletosTab');
    } else if (context === 'diretoria') {
        tableContainer = document.getElementById('diretoriaTab');
    } else if (context === 'financeiro') {
        tableContainer = document.getElementById('financeiroTab');
    } else if (context === 'pending') {
        tableContainer = document.getElementById('pendingTab');
    } else { // 'general', 'emergency', 'overdue', 'upcoming' (para a aba principal de Ordens)
        tableContainer = document.getElementById('ordersTab');
    }
    
    if (!tableContainer) {
        console.warn(`❌ updateEmergencyIndicator: tableContainer não encontrado para context="${context}". Abortando.`);
        return;
    }
    
    // Tenta encontrar o wrapper comum da tabela dentro da aba (a div com overflow-x)
    // Isso assume a estrutura <tab-content> -> <div style="overflow-x: auto;"> -> <table>
    referenceElementForInsertion = tableContainer.querySelector('div[style*="overflow-x: auto;"]');
    
    // Se a div de overflow-x não for encontrada, tenta encontrar a tabela diretamente
    if (!referenceElementForInsertion) {
        referenceElementForInsertion = tableContainer.querySelector('.orders-table');
    }

    // Se ainda não for encontrado, como último recurso, tenta o H2 ou o primeiro filho da aba
    if (!referenceElementForInsertion) {
        referenceElementForInsertion = tableContainer.querySelector('h2') || tableContainer.firstChild;
    }

    // Remover indicadores existentes do mesmo tipo
    const existingIndicators = tableContainer.querySelectorAll(`.indicator-${context}`);
    existingIndicators.forEach(indicator => indicator.remove());
    
    // Criar novo indicador apenas se houver contagem maior que 0
    if (count > 0) {
        const indicator = document.createElement('div');
        indicator.className = `indicator indicator-${context}`;
        
        let message = '';
        let bgColor = '';
        let textColor = '';
        let borderColor = '';
        let icon = '';
        
        // Lógica para definir a mensagem e estilo do indicador
        if (context === 'emergency') {
            message = `${count} EMERGÊNCIA(S) PENDENTE(S)`;
            bgColor = '#f8d7da'; textColor = '#721c24'; borderColor = '#f5c6cb'; icon = '🚨';
        } else if (context === 'overdue') {
            message = `${count} ORDEM(NS) VENCIDA(S)`;
            bgColor = '#fff3cd'; textColor = '#856404'; borderColor = '#ffeeba'; icon = '🚩';
        } else if (context === 'upcoming') {
            message = `${count} ORDEM(NS) PRÓXIMA(S) DO VENCIMENTO`;
            bgColor = '#ffe6cc'; textColor = '#cc6600'; borderColor = '#ffcc99'; icon = '⚠️';
        } else if (context === 'diretoria') {
            message = `${count} EMERGÊNCIA(S) AGUARDANDO APROVAÇÃO DA DIRETORIA`;
            bgColor = '#f8d7da'; textColor = '#721c24'; borderColor = '#f5c6cb'; icon = '🚨';
        } else if (context === 'financeiro') {
            message = `${count} EMERGÊNCIA(S) AGUARDANDO APROVAÇÃO DO FINANCEIRO`;
            bgColor = '#f8d7da'; textColor = '#721c24'; borderColor = '#f5c6cb'; icon = '🚨';
        } else if (context === 'pending') {
            message = `${count} EMERGÊNCIA(S) AGUARDANDO PAGAMENTO`;
            bgColor = '#f8d7da'; textColor = '#721c24'; borderColor = '#f5c6cb'; icon = '🚨';
        } else if (context === 'boletos-overdue') { // Contexto para boletos vencidos
            message = `${count} PARCELA(S) DE BOLETO VENCIDA(S)`;
            bgColor = '#f8d7da'; textColor = '#721c24'; borderColor = '#f5c6cb'; icon = '🚩';
        } else if (context === 'boletos-upcoming') { // Contexto para boletos próximos
            message = `${count} PARCELA(S) DE BOLETO PRÓXIMA(S) DO VENCIMENTO`;
            bgColor = '#ffe6cc'; textColor = '#cc6600'; borderColor = '#ffcc99'; icon = '⚠️';
        } else if (context === 'boletos') { // Contexto geral para boletos (se usado)
            message = `${count} BOLETO(S) PENDENTE(S)`;
            bgColor = '#fff3cd'; textColor = '#856404'; borderColor = '#ffeaa7'; icon = '⚠️';
        } else {
            // Caso padrão (fallback) para qualquer outro contexto não mapeado
            message = `${count} ALERTA(S) PENDENTE(S) NO TOPO`;
            bgColor = '#fff3cd'; textColor = '#856404'; borderColor = '#ffeaa7'; icon = '⚠️';
            console.log(`⚠️ Usando caso padrão para context="${context}"`);
        }
        
        indicator.style.cssText = `
            background: ${bgColor}; color: ${textColor}; padding: 8px 15px; border-radius: 5px;
            margin-bottom: 10px; font-weight: bold; text-align: center; font-size: 14px;
            border: 1px solid ${borderColor}; animation: fadeIn 0.3s ease-in-out;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        indicator.innerHTML = `${icon} ${message}`;
        
        console.log(`📝 Criando indicador: "${icon} ${message}"`);
        
        // Inserir antes do elemento de referência identificado
        if (referenceElementForInsertion) {
            tableContainer.insertBefore(indicator, referenceElementForInsertion);
        } else if (tableContainer.firstChild) {
            // Fallback: insere antes do primeiro filho se nenhum elemento de referência específico for encontrado
            tableContainer.insertBefore(indicator, tableContainer.firstChild);
        } else {
            // Último recurso: adiciona ao final se o container estiver vazio
            tableContainer.appendChild(indicator);
        }
    }
};

// NOVA FUNÇÃO para criar linha de parcela individual
function createPaidBoletoRowIndividual(boletoComParcela) {
    const row = document.createElement('tr');
    const parcela = boletoComParcela.parcelaAtual;
    
    if (boletoComParcela.isParcelaIndividual) {
        row.classList.add('parcela-individual');
    }
    
    const valorFormatado = parseFloat(parcela.value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
    
    const formatarData = (data) => {
        if (!data) return 'N/A';
        if (data.includes('-') && data.length === 10) {
            const [ano, mes, dia] = data.split('-');
            return `${dia}/${mes}/${ano}`;
        }
        return data;
    };
    
    const descricao = `Boleto - Parcela ${parcela.parcelNumber}${boletoComParcela.isParcelaIndividual ? ' (Parcial)' : ''}`;
    
    // Extrair a empresa, com fallback para vazio se for nulo/indefinido/N/A
    const companyValue = (boletoComParcela.company && boletoComParcela.company.toUpperCase() !== 'N/A') ? boletoComParcela.company : '';

    row.innerHTML = `
        <td>${escapeForHTML(boletoComParcela.vendor)}</td>
        <td>${escapeForHTML(descricao)}</td>
        <td>${valorFormatado}</td>
        <td>${formatarData(parcela.dueDate)}</td>
        <td>${formatarData(parcela.paymentDate)}</td>
        <td><span class="status-badge status-paga">Paga</span></td>
        <td>Boleto</td>
        <td>-</td>
        <td>${escapeForHTML(companyValue)}</td> <!-- AQUI: Coluna Empresa adicionada -->
        <td>
            <button onclick="viewBoletoDetails(${boletoComParcela.id})" class="btn-action" title="Ver detalhes">
                <i class="fas fa-eye"></i>
            </button>
        </td>
    `;
    
    return row;
}

// Função para formatar moeda
function formatCurrency(value) {
    if (typeof value !== 'number') value = parseFloat(value);
    if (isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Função para formatar data (mais robusta para diferentes formatos de entrada e fuso horário de Brasília)
function formatDate(dateString) {
    if (!dateString || typeof dateString !== 'string' || dateString.trim() === '' || dateString === 'N/A') return 'N/A';
    try {
        let year, month, day;

        // Tenta extrair os componentes YYYY-MM-DD
        const matchYMD = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
        // Tenta extrair os componentes DD/MM/YYYY
        const matchDMY = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})/);

        if (matchYMD) {
            year = parseInt(matchYMD[1]);
            month = parseInt(matchYMD[2]) - 1; // JavaScript: mês é 0-indexado
            day = parseInt(matchYMD[3]);
        } else if (matchDMY) {
            year = parseInt(matchDMY[3]);
            month = parseInt(matchDMY[2]) - 1;
            day = parseInt(matchDMY[1]);
        } else {

            const tempDate = new Date(dateString);
            if (isNaN(tempDate.getTime())) return 'N/A';
            year = tempDate.getFullYear();
            month = tempDate.getMonth();
            day = tempDate.getDate();
        }


        const dateForBrasilia = new Date(Date.UTC(year, month, day, 3, 0, 0));

        if (!isNaN(dateForBrasilia.getTime())) {
            return new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                timeZone: 'America/Sao_Paulo' // Força a exibição para o horário de Brasília
            }).format(dateForBrasilia);
        }
    } catch (e) {
        console.error('Erro ao formatar data (formatDate) com Intl.DateTimeFormat:', dateString, e);
    }
    return 'N/A'; 
}

// Mapeia nomes de meses para números (e partes do 13º)
const MONTH_NAMES_MAP = {
    'Janeiro': '01', 'Fevereiro': '02', 'Março': '03', 'Abril': '04', 'Maio': '05', 'Junho': '06',
    'Julho': '07', 'Agosto': '08', 'Setembro': '09', 'Outubro': '10', 'Novembro': '11', 'Dezembro': '12',
    '13º Parte 1': '13-P1', '13º Parte 2': '13-P2'
};
const MONTH_NUMBERS_MAP = { // Inverso do anterior
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril', '05': 'Maio', '06': 'Junho',
    '07': 'Julho', '08': 'Agosto', '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
    '13-P1': '13º Parte 1', '13-P2': '13º Parte 2'
};


// Localize sua função extractYearAndMonthPartFromBackend
// Adicione estes logs detalhados:
function extractYearAndMonthPartFromBackend(monthBackendString) {
    if (!monthBackendString) {
        console.warn('[extractYearAndMonthPartFromBackend] monthBackendString é vazia ou nula. Retornando nulos.');
        return { year: null, monthPart: null, monthPartDisplay: null };
    }

    const parts = String(monthBackendString).split('-');
    const year = parseInt(parts[0]);
    let monthPart = parts[1];
    
    if (monthPart === '13' && parts.length === 3) {
        monthPart = '13-' + parts[2];
    }

    const monthPartDisplay = MONTH_NUMBERS_MAP[monthPart] || monthPart;
    
    console.log(`[extractYearAndMonthPartFromBackend] De '${monthBackendString}': Year=${year}, MonthPart='${monthPart}', Display='${monthPartDisplay}'`);
    return { year, monthPart, monthPartDisplay };
}

function formatMonthAndPartToBackend(year, monthPart) {
    if (!year || !monthPart) return null;
    return `${year}-${monthPart}`;
}

/**
 * Preenche um elemento <select> com as opções de meses e partes do 13º.
 * @param {string} selectElementId O ID do elemento <select>.
 */
function populateMonthSelect(selectElementId) {
    const select = document.getElementById(selectElementId);
    if (!select) {
        console.warn(`populateMonthSelect: Elemento '${selectElementId}' não encontrado.`);
        return;
    }
    
    // Salva a seleção atual para tentar restaurar
    const currentSelectedValue = select.value;

    select.innerHTML = '<option value="">Selecione o Mês</option>'; // Opção padrão
    
    // Adiciona Janeiro a Dezembro
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    for (let i = 0; i < 12; i++) {
        const monthValue = String(i + 1).padStart(2, '0');
        const option = document.createElement('option');
        option.value = monthValue;
        option.textContent = monthNames[i];
        select.appendChild(option);
    }

    // Adiciona as partes do 13º salário
    select.appendChild(createOption('13-P1', '13º Salário Parte 1'));
    select.appendChild(createOption('13-P2', '13º Salário Parte 2'));

    // Tenta restaurar a seleção
    if (currentSelectedValue && Array.from(select.options).some(opt => opt.value === currentSelectedValue)) {
        select.value = currentSelectedValue;
    }
}

/**
 * Preenche um elemento <select> com as opções de meses e partes do 13º salário, para filtros do dashboard.
 * @param {string} selectElementId O ID do elemento <select>.
 * @param {string} selectedValue O valor a ser pré-selecionado (ex: "01", "13-P1").
 */
function populateDashboardMonthSelect(selectElementId, selectedValue = '') {
    const select = document.getElementById(selectElementId);
    if (!select) {
        console.warn(`populateDashboardMonthSelect: Elemento '${selectElementId}' não encontrado.`);
        return;
    }
    
    select.innerHTML = '<option value="">Selecione o Mês</option>'; // Opção padrão
    
    // Adiciona Janeiro a Dezembro
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    for (let i = 0; i < 12; i++) {
        const monthValue = String(i + 1).padStart(2, '0');
        const option = document.createElement('option');
        option.value = monthValue;
        option.textContent = monthNames[i];
        select.appendChild(option);
    }

    // Adiciona as partes do 13º salário
    select.appendChild(createOption('13-P1', '13º Salário Parte 1'));
    select.appendChild(createOption('13-P2', '13º Salário Parte 2'));

    // Tenta restaurar a seleção
    if (selectedValue && Array.from(select.options).some(opt => opt.value === selectedValue)) {
        select.value = selectedValue;
    }
}


// Localize sua função criarDataFromYearMonthPart
// Substitua o corpo da função por este (mantendo os console.log para depuração):
function criarDataFromYearMonthPart(year, monthPart, isStartOfMonth) {
    if (isNaN(year) || !monthPart || (typeof monthPart !== 'string' && typeof monthPart !== 'number')) {
        console.warn(`[criarDataFromYearMonthPart] Dados inválidos recebidos: year=${year}, monthPart=${monthPart}. Retornando data inválida.`);
        return new Date(NaN); 
    }

    let date;
    if (monthPart.includes('13-P')) {
        // Assume Dezembro para fins de período.
        // CRÍTICO: Usar Date.UTC para criar a data em UTC.
        if (isStartOfMonth) {
            date = new Date(Date.UTC(year, 11, 1, 0, 0, 0, 0)); // 1º Dezembro, 00:00:00.000 (UTC)
        } else {
            date = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)); // 31 Dezembro, 23:59:59.999 (UTC)
        }
    } else {
        const monthIndex = parseInt(monthPart, 10) - 1; // Mês é 0-indexado
        if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
            console.warn(`[criarDataFromYearMonthPart] monthPart (${monthPart}) resultou em monthIndex inválido. Retornando data inválida.`);
            return new Date(NaN);
        }

        // CRÍTICO: Usar Date.UTC para criar a data em UTC.
        if (isStartOfMonth) {
            date = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0)); // 1º do Mês, 00:00:00.000 (UTC)
        } else {
            date = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999)); // Último dia do Mês, 23:59:59.999 (UTC)
        }
    }
    console.log(`[criarDataFromYearMonthPart] De (Y:${year}, M:'${monthPart}', Start:${isStartOfMonth}):`);
    console.log(`  - Objeto Date criado (UTC): ${date.toISOString()}`);
    console.log(`  - Time (ms desde Epoch): ${date.getTime()}`);
    return date;
}

// Helper para criar opções de select
function createOption(value, text) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    return option;
}

function escapeForHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Função auxiliar para converter valores em formato BRL (R$ 1.200,00) para float
function parseBRLToFloat(brlString) {
    if (!brlString || typeof brlString !== 'string') {
        return 0;
    }
    // Remove "R$" e espaços
    let cleaned = brlString.replace(/R\$\s*/g, '').trim();
    // Remove o separador de milhares (.)
    cleaned = cleaned.replace(/\./g, '');
    // Substitui a vírgula (decimal) por ponto
    cleaned = cleaned.replace(/,/g, '.');
    // Converte para float
    const value = parseFloat(cleaned);
    return isNaN(value) ? 0 : value;
}

async function viewFile(base64Data, mimeType, fileName = 'arquivo', parcelId = null) { // Adicionado parcelId
    let cleanedBase64Data = base64Data; // Por enquanto, usa o que já tem

    if (!cleanedBase64Data && parcelId) { // Se não tem dados e tem parcelId, busca do servidor
        try {
            showLoadingOverlay('Carregando comprovante...');
            const response = await fetch(`${API_BASE_URL}/get_proof_data.php?parcel_id=${parcelId}`);
            const result = await response.json();
            hideLoadingOverlay();

            if (result.success && result.data && result.data.proofData) {
                cleanedBase64Data = result.data.proofData;
                // O mimeType e fileName podem precisar ser atualizados aqui se o backend retornar
                // Por exemplo, result.data.proofFileName e inferir mimeType
                if (!mimeType && result.data.proofFileName) {
                    const ext = result.data.proofFileName.split('.').pop().toLowerCase();
                    if (ext === 'pdf') mimeType = 'application/pdf';
                    else if (['jpg', 'jpeg'].includes(ext)) mimeType = 'image/jpeg';
                    else if (ext === 'png') mimeType = 'image/png';
                }
                if (!fileName && result.data.proofFileName) fileName = result.data.proofFileName;

            } else {
                alert('Não foi possível carregar o comprovante do servidor: ' + (result.error || 'Erro desconhecido.'));
                return;
            }
        } catch (error) {
            hideLoadingOverlay();
            console.error('Erro ao buscar comprovante via API:', error);
            alert('Erro de conexão ao carregar comprovante. Verifique o console.');
            return;
        }
    }
    
    if (!cleanedBase64Data) {
        alert('Dados do arquivo não disponíveis para visualização.');
        return;
    }

    // ... (restante da sua função viewFile, usando cleanedBase64Data, mimeType e fileName) ...
    const newWindow = window.open('', '_blank');
     if (!newWindow) {
         alert('Seu navegador bloqueou o pop-up. Por favor, permita pop-ups para visualizar o arquivo.');
         return;
     }

     if (mimeType.includes('pdf')) {
         newWindow.document.write(`
             <html>
                 <head><title>${fileName}</title><style>body { margin: 0; }</style></head>
                 <body>
                     <embed src="${cleanedBase64Data}" type="application/pdf" width="100%" height="100%">
                 </body>
             </html>
         `);
     } else if (mimeType.includes('image')) {
         newWindow.document.write(`
             <html>
                 <head><title>${fileName}</title><style>body { margin: 0; text-align: center; background-color: #f0f0f0; }</style></head>
                 <body>
                     <img src="${cleanedBase64Data}" style="max-width: 100%; height: auto; display: block; margin: auto;">
                 </body>
             </html>
         `);
     } else {
         // Fallback para outros tipos, tenta baixar
         alert('Tipo de arquivo não suportado para visualização direta. Iniciando download.');
         downloadFile(cleanedBase64Data, mimeType, fileName);
         newWindow.close();
     }
     newWindow.document.close();
}

async function downloadFile(base64Data, mimeType, filename, parcelId = null) { // Adicionado parcelId
    let cleanedBase64Data = base64Data;

    if (!cleanedBase64Data && parcelId) { // Se não tem dados e tem parcelId, busca do servidor
        try {
            showLoadingOverlay('Baixando comprovante...');
            const response = await fetch(`${API_BASE_URL}/get_proof_data.php?parcel_id=${parcelId}`);
            const result = await response.json();
            hideLoadingOverlay();

            if (result.success && result.data && result.data.proofData) {
                cleanedBase64Data = result.data.proofData;
                if (!filename && result.data.proofFileName) filename = result.data.proofFileName; // Atualiza nome do arquivo
            } else {
                alert('Não foi possível baixar o comprovante do servidor: ' + (result.error || 'Erro desconhecido.'));
                return;
            }
        } catch (error) {
            hideLoadingOverlay();
            console.error('Erro ao buscar comprovante via API para download:', error);
            alert('Erro de conexão ao baixar comprovante. Verifique o console.');
            return;
        }
    }

    if (!cleanedBase64Data) {
        alert('Dados do arquivo não disponíveis para download.');
        return;
    }

    const cleanedFileName = filename.replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

    try {
        const link = document.createElement('a');
        link.href = cleanedBase64Data;
        link.download = cleanedFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showDownloadFeedback(cleanedFileName);
    } catch (e) {
        console.error("Erro ao iniciar download:", e);
        alert("Não foi possível iniciar o download do arquivo. Verifique o console para mais detalhes.");
    }
}

function getMimeTypeFromBase64(base64Data) {
    if (!base64Data) return 'application/octet-stream';
    const match = String(base64Data).match(/^data:(.*?);base64,/);
    return match ? match[1] : 'application/octet-stream';
}

function getMimeTypeFromFileName(fileName) {
    if (!fileName) return 'application/octet-stream';
    const ext = fileName.split('.').pop().toLowerCase();
    const mimeTypes = {
        'pdf': 'application/pdf',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

// Função para obter MIME type do Base64
function getFileSizeFromBase64(base64DataOrBytes) {
    if (!base64DataOrBytes) return '0 MB';
    // Se receber um número (bytes direto do servidor), converte diretamente
    if (typeof base64DataOrBytes === 'number') {
        if (isNaN(base64DataOrBytes) || base64DataOrBytes === 0) return '0 MB';
        return (base64DataOrBytes / (1024 * 1024)).toFixed(2);
    }
    // Se receber string Base64, calcula a partir do conteúdo
    const base64Content = String(base64DataOrBytes).split(',')[1];
    if (!base64Content) return '0 MB';
    const padding = base64Content.endsWith('==') ? 2 : (base64Content.endsWith('=') ? 1 : 0);
    const sizeInBytes = Math.floor((base64Content.length - padding) * 0.75);
    return (sizeInBytes / (1024 * 1024)).toFixed(2);
}

// Feedback visual de download
function showDownloadFeedback(fileName) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10001;
        font-family: Arial, sans-serif;
        max-width: 300px;
        opacity: 0; /* Começa invisível */
        transition: opacity 0.3s ease-in-out;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-check-circle" style="font-size: 18px;"></i>
            <div>
                <strong>Download Iniciado</strong><br>
                <small>${escapeForHTML(fileName)}</small>
            </div>
        </div>
    `;
    document.body.appendChild(notification);
    
    notification.offsetHeight; 
    notification.style.opacity = '1';

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.addEventListener('transitionend', () => notification.remove());
    }, 3000);
}

// Localize sua função criarDataLocal no script-sistema-ordem.txt
// Substitua o corpo da função por este (mantendo os console.log para depuração):
function criarDataLocal(dateString) {
    if (!dateString) {
        console.warn('[criarDataLocal] dateString é vazia ou nula. Retornando data inválida.');
        return new Date(NaN);
    }
    
    let year, month, day;

    // Tentativa 1: Formato YYYY-MM-DD (comum de inputs type="date")
    let parts = dateString.split('-');
    if (parts.length === 3 && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1; // Mês é 0-indexado
        day = parseInt(parts[2], 10);
        
        // CRÍTICO: Criar data em UTC (00:00:00Z)
        const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        console.log(`[criarDataLocal] Processado YYYY-MM-DD ('${dateString}'):`);
        console.log(`  - Objeto Date criado (UTC): ${date.toISOString()}`);
        console.log(`  - Time (ms desde Epoch): ${date.getTime()}`);
        return date;
    }

    // Tentativa 2: Formato DD/MM/YYYY (comum em displays ou outros backends)
    parts = dateString.split('/');
    if (parts.length === 3 && dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
        
        // CRÍTICO: Criar data em UTC (00:00:00Z)
        const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        console.log(`[criarDataLocal] Processado DD/MM/YYYY ('${dateString}'):`);
        console.log(`  - Objeto Date criado (UTC): ${date.toISOString()}`);
        console.log(`  - Time (ms desde Epoch): ${date.getTime()}`);
        return date;
    }

    // Tentativa 3: Parsear como string genérica (menos confiável, mas com setUTCHours)
    const genericDate = new Date(dateString);
    if (!isNaN(genericDate.getTime())) {
        genericDate.setUTCHours(0, 0, 0, 0); // Zera o horário em UTC
        console.log(`[criarDataLocal] Processado Genérico ('${dateString}'):`);
        console.log(`  - Objeto Date criado (UTC): ${genericDate.toISOString()}`);
        console.log(`  - Time (ms desde Epoch): ${genericDate.getTime()}`);
        return genericDate;
    }
    
    console.error(`[criarDataLocal] Falha total ao criar data a partir de '${dateString}'. Retornando data inválida.`);
    return new Date(NaN); // Retorna uma data inválida
}
// Função para obter o dia correto (sem hora)
function getTodayCorrect() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

// NOVO: Função para criar um objeto Date a partir de uma string YYYY-MM
// isStart: true para o primeiro dia do mês (00:00:00), false para o último dia do mês (23:59:59.999)
function criarDataLocalFromMonth(monthString, isStart) {
    if (!monthString || typeof monthString !== 'string' || monthString.trim() === '') {
        return new Date(NaN); // Retorna data inválida se a string for vazia ou inválida
    }
    const parts = monthString.split('-'); // Espera "YYYY-MM"
    if (parts.length !== 2) {
        console.warn(`criarDataLocalFromMonth: Formato inválido para mês "${monthString}". Esperado YYYY-MM.`);
        return new Date(NaN);
    }
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Mês é 0-indexado em JS (Jan = 0)
    
    // Validações básicas de ano e mês
    if (isNaN(year) || year < 1000 || isNaN(month) || month < 0 || month > 11) {
        console.warn(`criarDataLocalFromMonth: Ano ou mês inválido "${monthString}".`);
        return new Date(NaN);
    }

    if (isStart) {
        // Primeiro dia do mês, 00:00:00.000
        return new Date(year, month, 1, 0, 0, 0, 0); 
    } else {
        // Último dia do mês, 23:59:59.999
        // O dia 0 do próximo mês é o último dia do mês atual
        return new Date(year, month + 1, 0, 23, 59, 59, 999); 
    }
}

// Funções para download de comprovantes/boletos específicos (chamadas por createOrderRow)
function downloadProof(orderId, paymentIndex) {
    const order = fullOrdersList.find(o => o.id === orderId);
    if (!order || !order.payments || !order.payments[paymentIndex]) {
        alert('Comprovante não encontrado.');
        return;
    }
    const payment = order.payments[paymentIndex];
    downloadFile(payment.proofData, getMimeTypeFromBase64(payment.proofData), payment.proofFileName);
}

function downloadBoleto(orderId) {
    const order = fullOrdersList.find(o => o.id === orderId); // BUSCA NA LISTA COMPLETA
    if (!order || !order.boletoData) {
        alert('Boleto não encontrado ou sem dados anexados.');
        return;
    }
    downloadFile(order.boletoData, getMimeTypeFromBase64(order.boletoData), order.boletoFileName || `boleto_ordem_${orderId}.pdf`);
}

// Função displayProofAttachment (para o HTML da coluna de comprovante)
function displayProofAttachment(payment, orderId) { // orderId é para compatibilidade, mas não usado aqui
    if (!payment.proofData || !payment.proofFileName) {
        return '<div class="no-proof">Nenhum comprovante anexado</div>';
    }
    
    const sizeInMB = getFileSizeFromBase64(payment.proofData); // Usando a função auxiliar
    
    let fileTypeClass = 'file-type-pdf';
    let fileTypeText = 'PDF';
    if (getMimeTypeFromBase64(payment.proofData).includes('image/')) {
        fileTypeClass = 'file-type-image';
        fileTypeText = 'IMG';
    }
    
    return `
        <div class="proof-attachment">
            <div class="attachment-info">
                <i class="fas fa-paperclip"></i> 
                <strong>Comprovante Anexado</strong>
            </div>
            <div class="file-details">
                <strong>📄 ${escapeForHTML(payment.proofFileName)}</strong>
                <span class="file-type-indicator ${fileTypeClass}">${fileTypeText}</span>
                <br>
                <small class="text-muted">(${sizeInMB} MB)</small>
            </div>
            <div class="file-actions">
                <button class="btn btn-sm btn-outline-primary" 
                        onclick="viewFile('${escapeForHTML(payment.proofData)}', '${getMimeTypeFromBase64(payment.proofData)}', '${escapeForHTML(payment.proofFileName)}')">
                    <i class="fas fa-eye"></i> Exibir Comprovante
                </button>
                <button class="btn btn-sm btn-outline-success" 
                        onclick="downloadFile('${escapeForHTML(payment.proofData)}', '${getMimeTypeFromBase64(payment.proofData)}', '${escapeForHTML(payment.proofFileName)}')">
                    <i class="fas fa-download"></i> Baixar Comprovante
                </button>
            </div>
        </div>
    `;
}

function createUnifiedPaidRow(item) {
    // Adicionando LOG para ver o que a função recebe
    console.log(`[DEBUG CUPR] Recebido item ID: ${item.id}, Tipo: ${item.itemType}, Favorecido: ${item.favoredName}, Company no Item: '${item.company}'`); 
    
    const row = document.createElement('tr');
    row.setAttribute('data-id', item.id);
    row.classList.add(`paid-item-${item.itemType.toLowerCase()}`);

    // Inicializa variáveis com valores seguros
    let favoredName = item.favoredName || 'N/A';
    let displayedValue = parseFloat(item.paidAmount || item.value || 0);
    let type = item.paymentType || item.itemType;
    let priority = item.priority || 'Normal';
    let status = 'PAGA';
    let paymentDate = item.paymentDate ? formatDate(item.paymentDate) : 'N/A'; // Usando formatDate
    let process = item.process || 'N/A';
    let solicitant = item.solicitant || 'N/A';
    
    // LÓGICA REFINADA PARA A EMPRESA: Exibe string vazia se for null, undefined, "" ou "N/A" literal
    let company = (item.company && item.company.toUpperCase() !== 'N/A') ? item.company : ''; 
    
    // Adicionando LOG para ver o valor final da variável 'company' antes de ser inserida no HTML
    console.log(`[DEBUG CUPR] Item ID: ${item.id}, Variável 'company' para display: '${company}'`); 

    let actionButtonsHtml = '';

    // --- Botões de Ação ---
    if (item.itemType === 'boleto_parcel') {
        actionButtonsHtml += `<button class="btn btn-info btn-small" onclick="viewPaidItemDetails('${escapeForHTML(item.boletoId)}', '${item.itemType}', '${escapeForHTML(item.id)}')">
                                <i class="fas fa-info-circle"></i> Detalhes
                              </button>`;
    } else {
        actionButtonsHtml += `<button class="btn btn-info btn-small" onclick="viewPaidItemDetails('${escapeForHTML(item.id)}', '${item.itemType}')">
                                <i class="fas fa-info-circle"></i> Detalhes
                              </button>`;
    }

    // Lógica de exclusão/edição baseada no tipo e permissões
    if (item.itemType === 'order') {
        // canEditOrder e canDeleteOrder geralmente esperam o 'originalObject'
        if (canEditOrder(item.originalObject)) actionButtonsHtml += `<button class="btn btn-warning btn-small" onclick="editOrder('${escapeForHTML(item.id)}')">Editar</button>`;
        if (canDeleteOrder(item.originalObject)) actionButtonsHtml += `<button class="btn btn-danger btn-small" onclick="deleteOrder('${escapeForHTML(item.id)}')">Excluir</button>`;
    } else if (item.itemType === 'salary') {
        if (canManageSalaries()) {
            actionButtonsHtml += `<button class="btn btn-warning btn-small" onclick="editSalary('${escapeForHTML(item.id)}')">Editar</button>`;
            actionButtonsHtml += `<button class="btn btn-danger btn-small" onclick="deleteSalary('${escapeForHTML(item.id)}')">Excluir</button>`;
        }
    } else if (item.itemType === 'boleto_full') {
        if (canDeletePaidBoleto()) {
            actionButtonsHtml += `<button class="btn btn-warning btn-small" onclick="editBoleto('${escapeForHTML(item.id)}')">Editar</button>`;
            actionButtonsHtml += `<button class="btn btn-danger btn-small" onclick="deleteBoleto('${escapeForHTML(item.id)}')">Excluir</button>`;
        }
    } else if (item.itemType === 'boleto_parcel') {
        if (canDeletePaidBoleto()) {
            actionButtonsHtml += `<button class="btn btn-warning btn-small" onclick="editBoleto('${escapeForHTML(item.boletoId)}')">Editar</button>`;
            actionButtonsHtml += `<button class="btn btn-danger btn-small" onclick="deleteBoletoParcel('${escapeForHTML(item.boletoId)}', '${escapeForHTML(item.id)}', ${item.parcela?.parcelNumber || 0}, '${escapeForHTML(item.favoredName || 'N/A')}')">Excluir Parcela</button>`;
        }
    }
    // --- Estrutura da Linha (adaptada para boleto_full) ---
    // A ordem das <td> precisa corresponder EXATAMENTE à ordem dos <th> no seu HTML
    row.innerHTML = `
        <td>${escapeForHTML(favoredName)}</td>                 <!-- 1. Favorecido -->
        <td>${formatCurrency(displayedValue)}</td>              <!-- 2. Valor da Ordem -->
        <td>${escapeForHTML(type)}</td>                         <!-- 3. Tipo -->
        <td><span class="status-badge priority-${(priority || 'normal').toLowerCase()}">${escapeForHTML(priority)}</span></td> <!-- 4. Prioridade -->
        <td>${escapeForHTML(solicitant)}</td>                   <!-- 5. Solicitante -->
        <td>${escapeForHTML(process)}</td>                       <!-- 6. Processo -->
        <td>${escapeForHTML(company)}</td>                       <!-- 7. Empresa -->
        <td><span class="status-badge status-paga">${status}</span><br>${paymentDate}</td> <!-- 8. Status/Data -->
        <td>                                                     <!-- 9. Ações -->
            <div class="action-buttons">
                ${actionButtonsHtml}
            </div>
        </td>
    `;
    
    return row;
}

function updatePaidCounters(count, value) {
    const totalPaidOrdersElement = document.getElementById('totalPaidOrders');
    const totalPaidValueElement = document.getElementById('totalPaidValue');
    
    if (totalPaidOrdersElement) {
        totalPaidOrdersElement.textContent = count;
    }
    
    if (totalPaidValueElement) {
        totalPaidValueElement.textContent = formatCurrency(value);
    }
}

// Testar a nova função
displayPaidOrders();

// Manter as funções de data corretas
// Função auxiliar para criar data local (usada no sistema original para contagens)
function createLocalDate(dateString) {
    // Esta versão é mais simples e assume o formato YYYY-MM-DD para split
    if (!dateString) return new Date(NaN); // Retorna data inválida se não houver string
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

// APROX. LINHA 7035: createOrderRow = function(order, context) {
createOrderRow = function(order, context) {
    const row = document.createElement('tr');
    row.id = `order-${order.id}`; // CRÍTICO: Atribui um ID único à linha da ordem
    row.setAttribute('data-order-id', order.id); // Adiciona atributo para fácil seleção

    // Verificar emergência (funciona para qualquer contexto)
    const isEmergency = order.priority &&
                       (order.priority.toLowerCase() === 'emergencia' ||
                        order.priority.toLowerCase() === 'emergência');

    const isPaid = order.isPaid === true; // Usar diretamente a flag booleana `isPaid`

    let overdueIcon = '';   // Ícone para "Vencidas"
    let upcomingIcon = '';  // Ícone para "Próximas do Vencimento"
    let emergencyIcon = ''; // Ícone para "Emergência"

    // Define se o contexto atual é um que deve aplicar as classes de cor e ícones
    const applyVisualAlerts = !isPaid && (context === 'general' || context === 'diretoria' || context === 'financeiro' || context === 'pending');

    if (applyVisualAlerts) {
        if (isEmergency) {
            row.classList.add('order-emergency'); // Adiciona a classe de emergência
            emergencyIcon = '🚨';
        }
        else if (order.paymentForecast) {
            const today = getTodayCorrect();
            const forecastDate = createLocalDate(order.paymentForecast);

            const diffTime = forecastDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Diferença em dias

            if (diffDays < 0) {
                row.classList.add('order-overdue'); // Classe para vencido
                overdueIcon = '🚩 ';
            } else if (diffDays >= 0 && diffDays <= 4) {
                row.classList.add('order-upcoming'); // Classe para próximo
                upcomingIcon = '⚠️ ';
            }
        }
    }

    let actionButtons = `<button class="btn btn-info btn-small btn-icon-label" onclick="viewOrder('${order.id}')"><i class="fas fa-eye"></i> Ver Detalhes</button>`;

    if (order.payments && order.payments.length > 0) {
        order.payments.forEach((payment, index) => {
            if (payment.proofData) {
                actionButtons += `<button class="btn btn-success btn-small" onclick="downloadProof('${order.id}', ${index})" title="Baixar Comprovante ${index + 1}">Comprovante ${index + 1}</button>`;
            }
        });
    }

    if (order.paymentType === 'Boleto' && order.boletoData) {
        actionButtons += `<button class="btn btn-warning btn-small" onclick="downloadBoleto('${order.id}')" title="Baixar Boleto">Boleto</button>`;
    }

    if (context === 'general') {
        if (canEditOrder(order)) {
            actionButtons += `<button class="btn btn-info btn-small" onclick="editOrder('${order.id}')">Editar</button>`;
        }
        if (canDeleteOrder(order)) {
            actionButtons += `<button class="btn btn-danger btn-small" onclick="deleteOrder('${order.id}')">Excluir</button>`;
        }
} else { // Para diretoria, financeiro, pending

    // ========== DIRETORIA ==========
    if (context === 'diretoria' && canApproveDiretoria()) {
        actionButtons += `<button class="btn btn-warning btn-small" onclick="approveOrderDiretoria('${order.id}')">Aprovar</button>`;
    }

    if (context === 'diretoria' && canApproveDiretoria() && order.status === 'Pendente') {
        actionButtons += `<button class="btn btn-secondary btn-small" onclick="disapproveOrderDiretoria('${order.id}')">Reprovar</button>`;
    }

    // ========== FINANCEIRO ==========
    if (context === 'financeiro' && canApproveFinanceiro()) {
        actionButtons += `<button class="btn btn-warning btn-small" onclick="approveOrderFinanceiro(event, '${order.id}')">Aprovar</button>`;
    }
    
    if (context === 'financeiro' && canApproveFinanceiro() && order.status === 'Aguardando Financeiro') {
        actionButtons += `<button class="btn btn-secondary btn-small" onclick="disapproveOrderFinanceiro(event, '${order.id}')">Reprovar</button>`;
    }

    // ========== PENDENTES PAGAMENTO ==========
    if (context === 'pending' && canRegisterPayment()) {
        actionButtons += `<button class="btn btn-success btn-small pay-order-btn" data-order-id="${order.id}"><i class="fas fa-money-bill-wave"></i> Pagar</button>`;
    }

    if (context === 'pending') {
        if (order.paymentType === 'Boleto') {
            actionButtons += `<button class="btn btn-danger btn-small" onclick="deleteBoleto('${order.id}')" title="Excluir Boleto Completo">🗑️ Boleto</button>`;

            if (order.boletos && order.boletos.length > 0) {
                order.boletos.forEach((boleto, boletoIndex) => {
                    if (boleto.parcelas && boleto.parcelas.length > 1) {
                        boleto.parcelas.forEach((parcela, parcelaIndex) => {
                            if (parcela.status !== 'Paga') {
                                actionButtons += `<button class="btn btn-warning btn-small" onclick="deleteBoletoParcel('${boleto.id}', '${parcela.id}', ${parcelaIndex + 1}, '${order.favoredName}')" title="Excluir Parcela ${parcelaIndex + 1}">🗑️ P${parcelaIndex + 1}</button>`;
                            }
                        });
                    }
                });
            }
        }
    }

    // ========== AÇÕES GERAIS ==========
    if (canEditOrder(order)) {
        actionButtons += `<button class="btn btn-info btn-small" onclick="editOrder('${order.id}')">Editar</button>`;
    }

    if (canDeleteOrder(order)) {
        actionButtons += `<button class="btn btn-danger btn-small" onclick="deleteOrder('${order.id}')">Excluir</button>`;
    }
}
    let statusDisplay;
    const totalPaid = order.payments ? order.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0) : 0;
    const remaining = parseFloat(order.paymentValue || 0) - totalPaid;

    if (order.isPaid === true) {
        statusDisplay = 'Paga';
    }
    else if (remaining <= 0.001) {
        statusDisplay = 'Paga';
    }
    else if (order.payments && order.payments.length > 0 && remaining > 0) {
        statusDisplay = `${order.status || 'Pendente'} (Falta: R$ ${remaining.toLocaleString('pt-BR', {minimumFractionDigits: 2})})`;
    }
    else {
        statusDisplay = order.status || 'Pendente';
    }

    let paymentTypeDetails = order.paymentType;
    if (order.paymentType === 'PIX' && order.pixKey) {
        paymentTypeDetails += `<br><small>(${order.pixKeyType}: ${order.pixKey})</small>`;
    } else if (order.paymentType === 'Boleto' && order.linhaDigitavel) {
        paymentTypeDetails += `<br><small>(Linha: ${order.linhaDigitavel.substring(0, 20)}...)</small>`;
        if (order.boletoData) {
            paymentTypeDetails += `<br><small style="color: #007bff; font-weight: bold;">(Boleto Anexado)</small>`;
        }
    } else if (order.paymentType === 'Outros' && order.bankDetails) {
        paymentTypeDetails += `<br><small>(Detalhes Bancários...)</small>`;
    }

    let priorityBadgeHtml = `<span class="priority-badge priority-${(order.priority || 'normal').toLowerCase()}">${order.priority || 'Normal'}</span>`;
    let statusBadgeHtml = `<span class="status-badge status-${statusDisplay.toLowerCase().replace(/\s+/g, '-').replace(/\(falta.*?\)/g, '').trim()}">${statusDisplay}</span>`;

    // APLICAR ÍCONES E CLASSES VISUAIS (como antes)
    let favoredNameDisplay = order.favoredName;
    let forecastDateClass = '';

    if (applyVisualAlerts) {
        if (isEmergency) {
            favoredNameDisplay = emergencyIcon + favoredNameDisplay;
        } else if (row.classList.contains('order-overdue')) {
            favoredNameDisplay = overdueIcon + favoredNameDisplay;
        } else if (row.classList.contains('order-upcoming')) {
            favoredNameDisplay = upcomingIcon + favoredNameDisplay;
        }
        if (order.paymentForecast) {
            if (isEmergency) {
                forecastDateClass = 'due-date-emergency';
            } else if (row.classList.contains('order-upcoming')) {
                forecastDateClass = 'due-date-upcoming';
            } else if (row.classList.contains('order-overdue')) {
                forecastDateClass = 'due-date-overdue';
            }
        }
    }

    const generationDateValue = formatDate(order.generationDate);
    const forecastDateValue = order.paymentForecast ? formatDate(order.paymentForecast) : '-';

    // === ESTRUTURA HTML REVISADA COM CHECKBOX NA PRIMEIRA COLUNA ===
    let columnsHtml = '';

    // Lógica para adicionar checkbox apenas nas abas de Diretoria e Financeiro
    const addCheckboxColumn = (context === 'diretoria' || context === 'financeiro');
    const selectedSet = (context === 'diretoria' ? selectedOrdersDiretoria : selectedOrdersFinanceiro); // Para verificar se já está selecionado

    columnsHtml = `
        ${addCheckboxColumn ? `
            <td>
                <input type="checkbox" class="order-checkbox" data-order-id="${order.id}"
                       onchange="window.toggleOrderSelection('${order.id}', this.checked, '${context}')"
                       ${selectedSet.has(order.id) ? 'checked' : ''}>
            </td>
        ` : ''}
        <td>${favoredNameDisplay}</td>
        <td>R$ ${parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
        <td>${paymentTypeDetails}</td>
        <td>${priorityBadgeHtml}</td>
        <td>${statusBadgeHtml}</td>
        <td class="${forecastDateClass}">${forecastDateValue}</td>
        <td>${order.process || '-'}</td>
        <td>${order.company || '-'}</td>
    `;

    row.innerHTML = `
        ${columnsHtml}
        <td>
            <div class="action-buttons">
                ${actionButtons}
            </div>
        </td>
    `;

    return row;
};


window.toggleOrderSelection = function(orderId, isChecked, tabContext) { // ATENÇÃO AQUI: 'window.'
    console.log(`%c[DEBUG TOGGLE SELECTION] CHAMADO: orderId: ${orderId}, isChecked: ${isChecked}, tabContext: ${tabContext}`, 'color: purple; font-weight: bold;');
    
    if (window.isProgrammaticCheckboxChange) { // Usar window. aqui
        console.log(`%c[DEBUG TOGGLE SELECTION] isProgrammaticCheckboxChange é TRUE, ignorando.`, 'color: gray;');
        return;
    }

    let selectedSet;
    if (tabContext === 'diretoria') {
        selectedSet = selectedOrdersDiretoria;
    } else if (tabContext === 'financeiro') {
        selectedSet = selectedOrdersFinanceiro;
    } else {
        console.warn(`%c[DEBUG TOGGLE SELECTION] Contexto de aba '${tabContext}' desconhecido.`, 'color: orange;');
        return;
    }

    if (isChecked) {
        selectedSet.add(orderId);
        console.log(`%c[DEBUG TOGGLE SELECTION] Adicionado orderId: ${orderId}. selectedSet.size: ${selectedSet.size}`, 'color: green;');
    } else {
        selectedSet.delete(orderId);
        console.log(`%c[DEBUG TOGGLE SELECTION] Removido orderId: ${orderId}. selectedSet.size: ${selectedSet.size}`, 'color: red;');
    }
    
    updateBulkActionButtonsState(tabContext); // Esta linha chama a função que manipula o "disabled"
    console.log(`%c[DEBUG TOGGLE SELECTION] Final de execução. selectedSet para ${tabContext}:`, 'color: purple;', Array.from(selectedSet));
};

// APROX. LINHA 17500 (ou qualquer lugar lógico após outras funções)
let isProgrammaticCheckboxChange = false; // Declarada globalmente para evitar chamar toggleOrderSelection recursivamente

function toggleSelectAllOrders(checkbox, tabContext) {
    console.log(`%c[DEBUG SELECT ALL] CHAMADO para aba: ${tabContext}. Checked: ${checkbox.checked}`, 'color: darkgreen; font-weight: bold;');
    
    const tableBodyId = `${tabContext}TableBody`;
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) {
        console.warn(`%c[DEBUG SELECT ALL] Tbody com ID '${tableBodyId}' não encontrado.`, 'color: orange;');
        return;
    }

    const checkboxes = tbody.querySelectorAll('.order-checkbox');
    const selectedSet = (tabContext === 'diretoria' ? selectedOrdersDiretoria : selectedOrdersFinanceiro);

    isProgrammaticCheckboxChange = true; // Define a flag para indicar mudança programática

    selectedSet.clear(); // Limpa o set antes de preencher novamente

    checkboxes.forEach(cb => {
        // Apenas para checkboxes visíveis (se a linha da ordem não estiver ocultada por algum filtro)
        if (cb.closest('tr').style.display !== 'none') {
            cb.checked = checkbox.checked; // Define o estado do checkbox individual
            if (checkbox.checked) {
                selectedSet.add(cb.dataset.orderId); // Adiciona ao Set
            }
        }
    });

    isProgrammaticCheckboxChange = false; // Reseta a flag

    console.log(`%c[DEBUG SELECT ALL] selectedSet para ${tabContext} após 'Selecionar Tudo':`, 'color: darkgreen;', Array.from(selectedSet));
    updateBulkActionButtonsState(tabContext); // Atualiza o estado dos botões de ação em massa
}

function downloadProof(orderId, paymentIndex) {

    const order = orders.find(o => o.id === orderId);
    if (!order) {
        alert('Ordem não encontrada.');
        return;
    }
    
    if (!order.payments || !order.payments[paymentIndex]) {
        alert('Pagamento não encontrado.');
        return;
    }
    
    const payment = order.payments[paymentIndex];
    if (!payment.proofData) {
        alert('Comprovante não disponível.');
        return;
    }
    
    try {
        // Criar link de download
        const link = document.createElement('a');
        link.href = payment.proofData;
        link.download = payment.proofFileName || `comprovante_ordem_${orderId}_pag_${paymentIndex + 1}`;
        link.style.display = 'none';
        
        // Adicionar ao DOM, clicar e remover
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (error) {
        console.error('Erro no download:', error);
        // Fallback: abrir em nova aba
        const newWindow = window.open(payment.proofData, '_blank');
        if (!newWindow) {
            alert('Popup bloqueado. Permita popups para baixar o comprovante.');
        }
    }
}


// FUNÇÃO ESPECÍFICA PARA DOWNLOAD DE COMPROVANTE DE BOLETO
function downloadBoletoProof(proofData, fileName) {
    
    try {
        // Verificar se proofData existe e não está vazio
        if (!proofData || proofData.trim() === '') {
            alert('Comprovante não disponível para download.');
            return;
        }
        
        // Criar link temporário para download
        const link = document.createElement('a');
        link.href = proofData;
        link.download = fileName || 'comprovante_boleto.pdf';
        link.style.display = 'none';
        
        // Adicionar ao DOM, clicar e remover
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        

    } catch (error) {
        console.error('Erro ao baixar comprovante de boleto:', error);
        // Fallback: abrir em nova aba
        try {
            const newWindow = window.open(proofData, '_blank');
            if (!newWindow) {
                alert('Popup bloqueado. Permita popups para baixar o comprovante.');
            }
        } catch (fallbackError) {
            alert('Erro ao baixar comprovante. Verifique o console para mais detalhes.');
        }
    }
    
}

// FUNÇÃO ESPECÍFICA PARA DOWNLOAD DE BOLETO ANEXADO EM ORDEM
function downloadBoleto(orderId) {
    console.log(`📄 Tentando baixar boleto para ordem: ${orderId}`);
    
    // Procura a ordem tanto no array 'orders' quanto em 'allOrders' (para garantir que encontre)
    const order = orders.find(o => o.id === orderId) || allOrders.find(o => o.id === orderId);
    
    if (!order) {
        console.error('❌ Ordem não encontrada para o ID:', orderId);
        alert('Ordem não encontrada.');
        return;
    }
    
    if (!order.boletoData) {
        console.error('❌ Dados do boleto (boletoData) não encontrados para a ordem:', orderId);
        alert('Nenhum boleto anexado a esta ordem.');
        return;
    }

    try {
        const link = document.createElement('a');
        link.href = order.boletoData; // O boletoData já é o base64
        
        // Define um nome de arquivo padrão se não houver um nome salvo
        link.download = order.boletoFileName || `boleto_ordem_${orderId}.pdf`;
        
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (error) {
        console.error('❌ Erro ao iniciar download do boleto:', error);
        alert('Erro ao fazer download do boleto. Tente novamente.');
    }
}


// Adicionar o case 'boletos' na função existente updateEmergencyIndicator()
function updateEmergencyIndicator(emergencyCount, context = 'general') {
    let tableContainer;
    let tableSelector;
    
    // Definir seletores baseados no contexto
    switch (context) {
        case 'boletos':
            tableContainer = document.getElementById('boletosTableBody')?.closest('.tab-content');
            tableSelector = '#boletosTableBody';
            break;
        case 'diretoria':
            tableContainer = document.getElementById('diretoriaTableBody')?.closest('.tab-content');
            tableSelector = '#diretoriaTableBody';
            break;
        case 'financeiro':
            tableContainer = document.getElementById('financeiroTableBody')?.closest('.tab-content');
            tableSelector = '#financeiroTableBody';
            break;
        case 'general':
        default:
            tableContainer = document.querySelector('.orders-table')?.parentElement;
            tableSelector = '.orders-table';
            break;
    }
    
    if (!tableContainer) return;
    
    // Remover indicadores existentes para este contexto
    const existingIndicators = tableContainer.querySelectorAll(`.emergency-indicator-${context}`);
    existingIndicators.forEach(indicator => indicator.remove());
    
    // Criar novo indicador apenas se houver emergências
    if (emergencyCount > 0) {
        const indicator = document.createElement('div');
        indicator.className = `emergency-indicator emergency-indicator-${context}`;
        indicator.style.cssText = `
            background: #fff3cd;
            color: #856404;
            padding: 8px 15px;
            border-radius: 5px;
            margin-bottom: 10px;
            font-weight: bold;
            text-align: center;
            font-size: 14px;
            border: 1px solid #ffeaa7;
            animation: fadeIn 0.3s ease-in-out;
        `;
        
        // Personalizar mensagem baseada no contexto
        let message;
        switch (context) {
            case 'boletos':
                message = `🚨 ${emergencyCount} BOLETO(S) DE EMERGÊNCIA PENDENTE(S) NO TOPO`;
                break;
            case 'diretoria':
                message = `🚨 ${emergencyCount} EMERGÊNCIA(S) AGUARDANDO APROVAÇÃO DA DIRETORIA`;
                break;
            case 'financeiro':
                message = `🚨 ${emergencyCount} EMERGÊNCIA(S) AGUARDANDO APROVAÇÃO DO FINANCEIRO`;
                break;
            case 'general':
            default:
                message = `🚨 ${emergencyCount} EMERGÊNCIA(S) PENDENTE(S) NO TOPO`;
                break;
        }
        
        indicator.innerHTML = message;
        
        // Inserir no início do container
        const targetTable = tableContainer.querySelector(tableSelector);
        if (targetTable) {
            tableContainer.insertBefore(indicator, targetTable);
        } else {
            tableContainer.insertBefore(indicator, tableContainer.firstChild);
        }
    }
}


function displayPaidOrders() {
    console.log("DEBUG: [displayPaidOrders] Função displayPaidOrders() chamada.");
    const tbody = document.getElementById('paidOrdersTableBody');
    if (!tbody) {
        console.error("DEBUG: [displayPaidOrders] Elemento 'paidOrdersTableBody' não encontrado. Verifique seu HTML.");
        return;
    }
    
    tbody.innerHTML = '';

    let allPaidItemsAfterFilters = getPaidFilteredItemsForExport();
    console.log(`DEBUG RENDER: [displayPaidOrders] Recebido ${allPaidItemsAfterFilters.length} itens para renderizar após ordenação.`);

    // 2. Calcular o total de itens (linhas) para paginação, que é o número de itens após os filtros
    paidTotalItemsInSystem = allPaidItemsAfterFilters.length;

    // 3. Aplicar paginação ou modo "Mostrar Tudo"
    let paginatedAndFilteredItems = [];
    if (paidShowAllItemsMode) {
        paginatedAndFilteredItems = allPaidItemsAfterFilters;
        paidItemsPerPage = paidTotalItemsInSystem > 0 ? paidTotalItemsInSystem : 1; 
        paidCurrentPage = 1;
    } else {
        // Cálculo da paginação normal
        paidTotalPages = Math.ceil(paidTotalItemsInSystem / paidItemsPerPage);
        if (paidCurrentPage > paidTotalPages) paidCurrentPage = paidTotalPages > 0 ? paidTotalPages : 1;
        if (paidCurrentPage < 1) paidCurrentPage = 1;

        const startIndex = (paidCurrentPage - 1) * paidItemsPerPage;
        const endIndex = startIndex + paidItemsPerPage;
        paginatedAndFilteredItems = allPaidItemsAfterFilters.slice(startIndex, endIndex);
    }
    
    // 4. Renderiza os Itens Pagos na Tabela
    if (paginatedAndFilteredItems.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="9" class="text-center text-muted py-4"><i class="fas fa-inbox fa-2x mb-2"></i><br>Nenhum item pago encontrado com os filtros aplicados.</td>`;
        tbody.appendChild(emptyRow);
    } else {
        paginatedAndFilteredItems.forEach(item => {
            const row = createUnifiedPaidRow(item); 
            tbody.appendChild(row);
        });
    }

    // 5. Calcular e atualizar contadores e mensagem de resumo
    let totalValueDisplayed = paginatedAndFilteredItems.reduce((sum, item) => sum + (parseFloat(item.paidAmount) || 0), 0);
    updatePaidCounters(paginatedAndFilteredItems.length, totalValueDisplayed);

    // Adicionar a mensagem de resumo de filtro
    const containerElement = document.getElementById('paidTab');
    
    addPaidFilterSummaryMessage(
        paginatedAndFilteredItems.length,   // currentDisplayCount: quantidade de itens exibidos na página atual
        allPaidItemsAfterFilters.length,    // totalFilteredItemsCount: quantidade total de itens filtrados (antes da paginação)
        totalValueDisplayed,                // totalValueDisplayedOnPage: valor total dos itens exibidos na página atual
        containerElement
    );

    // 6. Atualizar controles de paginação
    updatePaidPaginationControls();
    
    if (highlightEditedOrderId) {
        // Assume que highlightEditedOrderId é no formato 'order-ID'
        applyHighlightToRowById(highlightEditedOrderId, 'highlight-edited-order');
        highlightEditedOrderId = null; // Limpa a variável global após o uso
    }

    // --- NOVO: Atualizar o texto do botão "Mostrar/Voltar Paginação" ---
    const toggleButton = document.getElementById('togglePaidShowAllItemsBtn');
    if (toggleButton) {
        if (paidShowAllItemsMode) {
            toggleButton.textContent = 'Voltar para Paginação';
        } else {
            toggleButton.textContent = 'Mostrar todos os itens pagos';
        }
    }
    // --- FIM NOVO ---


    // 7. Aplicar filtro de arquivamento (se houver)
    // CRÍTICO: Garantir que a aba esteja ativa para o filtro de arquivamento
    const paidTabElement = document.getElementById('paidTab');
    if (paidTabElement && !paidTabElement.classList.contains('active')) {
        // Isso pode acontecer se displayPaidOrders for chamada internamente
        // sem uma interação direta de clique na aba.
        paidTabElement.classList.add('active'); // Força a ativação para que o filtro funcione
        console.warn('⚠️ [displayPaidOrders] paidTab não estava ativa. Forçando a classe "active" para aplicar o filtro de arquivamento.');
    }
    aplicarFiltroArquivamento(); // Chama o filtro após garantir que a aba está "ativa"
}

function createPaidOrderRow(order) {
    const row = document.createElement('tr');
    const totalPaid = order.payments ? order.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0) : 0;
    
    let actionButtons = `<button class="btn btn-info btn-small" onclick="viewOrder('${order.id}')">Ver Detalhes</button>`;
    
    if (order.payments && order.payments.length > 0) {
        order.payments.forEach((payment, index) => {
            if (payment.proofData) {
                actionButtons += `<button class="btn btn-success btn-small" onclick="downloadProof('${order.id}', ${index})">Comprovante</button>`;
            }
        });
    }
    
    if (canDeleteOrder(order)) {
        actionButtons += `<button class="btn btn-danger btn-small" onclick="deleteOrder('${order.id}')">Excluir</button>`;
    }

    // Extrair a empresa, com fallback para vazio se for nulo/indefinido/N/A
    const companyValue = (order.company && order.company.toUpperCase() !== 'N/A') ? order.company : '';
    
    row.innerHTML = `
        <td>${order.favoredName}</td>
        <td>R$ ${parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
        <td>${order.paymentType}</td>
        <td><span class="status-badge priority-${(order.priority || 'normal').toLowerCase()}">${order.priority || 'Normal'}</span></td>
        <td><span class="status-badge status-paga">Paga</span></td>
        <td>${order.paymentCompletionDate ? formatDate(order.paymentCompletionDate) : '-'}</td>
        <td>R$ ${totalPaid.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
        <td>${order.process || '-'}</td>
        <td>${escapeForHTML(companyValue)}</td> <!-- AQUI: Coluna Empresa adicionada -->
        <td>
            <div class="action-buttons">
                ${actionButtons}
            </div>
        </td>
    `;
    
    return row;
}

function createPaidBoletoRow(boleto) {
    const row = document.createElement('tr');
    
    const totalPaid = parseFloat(boleto.totalValue || 0);

    let completionDate = boleto.firstDueDate;
    if (boleto.parcels && boleto.parcels.length > 0) {
        const paidParcels = boleto.parcels.filter(p => p.isPaid);
        if (paidParcels.length > 0) {
            const latestPaidAt = paidParcels.reduce((latest, p) => {
                const pDate = p.paidAt ? new Date(p.paidAt) : null;
                const latestDate = latest ? new Date(latest) : null;
                return (pDate && (!latestDate || pDate > latestDate)) ? p.paidAt : latest;
            }, null);
            if (latestPaidAt) {
                completionDate = latestPaidAt.split('T')[0];
            }
        }
    }
    
    let actionButtons = `<button class="btn btn-info btn-small" onclick="viewBoletoDetails('${boleto.id}')">Ver Detalhes</button>`;

    // Extrair a empresa, com fallback para vazio se for nulo/indefinido/N/A
    const companyValue = (boleto.company && boleto.company.toUpperCase() !== 'N/A') ? boleto.company : '';

    row.innerHTML = `
        <td>${boleto.vendor}</td>
        <td>R$ ${totalPaid.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
        <td>Boleto</td>
        <td><span class="status-badge priority-normal">Normal</span></td>
        <td><span class="status-badge status-paga">Paga</span></td>
        <td>${completionDate ? formatDate(completionDate) : '-'}</td>
        <td>R$ ${totalPaid.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
        <td>${boleto.process || '-'}</td>
        <td>${escapeForHTML(companyValue)}</td> <!-- AQUI: Coluna Empresa adicionada -->
        <td>
            <div class="action-buttons">
                ${actionButtons}
            </div>
        </td>
    `;
    
    return row;
}

// ===== FUNÇÃO: Obter Data Atual Formatada =====
function getCurrentDateFormatted() {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Retorna YYYY-MM-DD
}

// ===== FUNÇÃO: Obter Data Atual Formatada em pt-BR =====
function getCurrentDateFormattedBR() {
    const today = new Date();
    return today.toLocaleDateString('pt-BR'); // Retorna DD/MM/YYYY
}

// ===== FUNÇÃO: Inicializar Campo de Data de Geração (ao abrir modal/formulário) =====
function initializeBoletoGenerationDate() {
    const dateDisplayField = document.getElementById('boletoGenerationDateDisplay');
    if (dateDisplayField) {
        dateDisplayField.value = getCurrentDateFormattedBR();
        console.log('✅ Data de geração do boleto definida para:', getCurrentDateFormattedBR());
    }
}

// ===== FUNÇÃO: Obter Data de Geração para Salvar no Banco =====
function getBoletoGenerationDate() {
    return getCurrentDateFormatted(); // YYYY-MM-DD para banco de dados
}

// ATUALIZADA: Função para filtrar parcelas de boletos pagas na aba "Ordens Pagas" com TODOS os filtros
function getPaidFilteredBoletos(paidItemsArray) {
    const startDateRaw = document.getElementById('paidFilterStartDate')?.value || '';
    const endDateRaw = document.getElementById('paidFilterEndDate')?.value || '';
    const favoredFilter = document.getElementById('paidFavoredFilter')?.value || ''; // << ATUALIZADO: Filtro de Favorecido
    const paymentTypeFilter = document.getElementById('paidFilterPaymentType')?.value || '';
    const priorityFilter = document.getElementById('paidFilterPriority')?.value || '';
    const companyFilter = document.getElementById('paidFilterCompany')?.value || ''; 


    const filterStartDate = startDateRaw ? criarDataLocal(startDateRaw) : null;
    let filterEndDateInclusive = null;
    if (endDateRaw) {
        const tempEndDate = criarDataLocal(endDateRaw);
        if (!isNaN(tempEndDate.getTime())) {
            filterEndDateInclusive = new Date(tempEndDate);
            filterEndDateInclusive.setDate(tempEndDate.getDate() + 1); 
        }
    }

    return paidItemsArray.filter(item => {
        if (!item) {
            console.warn('getPaidFilteredBoletos: Item inválido (undefined ou null) encontrado no array. Ignorando.');
            return false;
        }

        // Filtro por Favorecido (para boletos, o 'vendor' é o que mais se aproxima de um favorecido)
        const matchesFavored = !favoredFilter || (item.vendor && item.vendor.trim() === favoredFilter.trim());
        if (!matchesFavored) return false;

        // FILTROS RE-ADICIONADOS: Process, Payment Type, Priority
        const matchesProcess = paidOrdersProcessFilterSelection.length === 0 || 
                       (item.process && paidOrdersProcessFilterSelection.includes(item.process.trim()));
        if (!matchesProcess) return false;

        const matchesPaymentType = !paymentTypeFilter || paymentTypeFilter === 'Boleto'; // Boleto é sempre Boleto
        if (!matchesPaymentType) return false;

        const itemPriority = item.priority || 'Normal';
        const matchesPriority = !priorityFilter || itemPriority === priorityFilter;
        if (!matchesPriority) return false;

        // NOVO: Filtro por Empresa (para boletos, se o campo 'company' existir nos itens normalizados)
        const matchesCompany = !companyFilter || (item.company && item.company.trim() === companyFilter.trim()); // <--- ADICIONE ESTA LINHA AQUI
        if (!matchesCompany) return false; // <--- ADICIONE ESTA LINHA AQUI
        
        // Filtro por data
        let matchesDate = true;
        if (filterStartDate || filterEndDateInclusive) {
            const completionDateForFilteringString = item.paymentDate || item.parcelaAtual?.paymentDate || item.parcelaAtual?.dueDate;
            const itemCompletionDate = completionDateForFilteringString ? criarDataLocal(completionDateForFilteringString) : null;
            if (!itemCompletionDate || isNaN(itemCompletionDate.getTime())) {
                matchesDate = false; 
            } else {
                if (filterStartDate && itemCompletionDate < filterStartDate) {
                    matchesDate = false;
                }
                if (matchesDate && filterEndDateInclusive && itemCompletionDate >= filterEndDateInclusive) {
                    matchesDate = false;
                }
            }
        }
        if (!matchesDate) return false;
        
        // Todos os filtros combinados
        return true;
    });
}

function getFilteredOrders() {
    console.log('⚙️ [getFilteredOrders] Aplicando filtros à FULL ORDERS LIST...');
    
    // ✅ Usar fullOrdersList como fonte de dados
    const dataSource = hasLoadedFullOrdersList && Array.isArray(fullOrdersList) ? fullOrdersList : orders || [];
    
    console.log(`DEBUG: [getFilteredOrders] Total de ordens na fonte: ${dataSource.length}`);
    
    if (dataSource.length === 0) {
        console.warn('⚠️ [getFilteredOrders] Nenhuma ordem encontrada na fonte de dados');
        return [];
    }
    
    // Obter valores dos filtros
    const searchTerm = document.getElementById('searchTerm')?.value?.trim().toLowerCase() || '';
    const favoredFilter = document.getElementById('filterFavored')?.value?.trim().toLowerCase() || '';
    const companyFilter = document.getElementById('filterCompany')?.value?.trim().toLowerCase() || '';
    const processFilter = document.getElementById('filterProcess')?.value?.trim().toLowerCase() || '';
    const directionFilter = document.getElementById('filterDirection')?.value?.trim().toLowerCase() || '';
    const statusFilter = document.getElementById('filterStatus')?.value?.trim().toLowerCase() || '';
    
    console.log(`DEBUG FILTROS: Search="${searchTerm}", Favored="${favoredFilter}", Company="${companyFilter}", Process="${processFilter}", Direction="${directionFilter}", Status="${statusFilter}"`);
    
    // Filtrar ordens
    let filtered = dataSource.filter(order => {
        // Se houver termo de busca, aplicar em todos os campos relevantes
        if (searchTerm) {
            const searchableContent = `
                ${order.favoredName || ''} 
                ${order.company || ''} 
                ${order.process || ''} 
                ${order.reference || ''}
            `.toLowerCase();
            
            if (!searchableContent.includes(searchTerm)) {
                return false;
            }
        }
        
        // Aplicar filtro de favorecido (busca parcial)
        if (favoredFilter && order.favoredName) {
            if (!order.favoredName.toLowerCase().includes(favoredFilter)) {
                return false;
            }
        }
        
        // Aplicar filtro de empresa (busca parcial)
        if (companyFilter && order.company) {
            if (!order.company.toLowerCase().includes(companyFilter)) {
                return false;
            }
        }
        
        // Aplicar filtro de processo (busca parcial)
        if (processFilter && order.process) {
            if (!order.process.toLowerCase().includes(processFilter)) {
                return false;
            }
        }
        
        // Aplicar filtro de direção (busca parcial)
        if (directionFilter && order.direction) {
            if (!order.direction.toLowerCase().includes(directionFilter)) {
                return false;
            }
        }
        
        // Aplicar filtro de status
        if (statusFilter && order.status) {
            if (order.status.toLowerCase() !== statusFilter) {
                return false;
            }
        }
        
        return true;
    });
    
    console.log(`✅ [getFilteredOrders] ${filtered.length} ordens resultantes após filtros da lista COMPLETA.`);
    
    return filtered;
}

function getPaidFilteredItemsForExport() {
    console.log("DEBUG INICIO: [getPaidFilteredItemsForExport] Função iniciada. @ " + new Date().toLocaleTimeString());
    let allPaidItems = [];
    
    // ===== SEÇÃO 1: PROCESSA APENAS ORDENS PAGAS (SEM SALÁRIOS) =====
    const regularPaidOrders = fullOrdersList.filter(order => order.status === 'Paga');
    const selectedFavored = document.getElementById('paidFavoredFilter')?.value?.trim() || '';
    const selectedCompany = document.getElementById('paidFilterCompany')?.value?.trim() || '';
    const selectedSolicitant = document.getElementById('paidSolicitantFilter')?.value?.trim() || '';
    const selectedPaymentType = document.getElementById('paidFilterPaymentType')?.value?.trim() || '';
    const selectedPriority = document.getElementById('paidFilterPriority')?.value?.trim() || '';
    const paidProcessFilter = Array.from(document.querySelectorAll('.paid-orders-process-filter-checkbox:checked')).map(cb => cb.value.trim()).filter(Boolean);
    const startDateRaw = document.getElementById('paidFilterStartDate')?.value || '';
    const endDateRaw = document.getElementById('paidFilterEndDate')?.value || '';
    
    const filteredRegularPaidOrders = regularPaidOrders.filter(order => {
        if (selectedFavored && !order.favoredName?.toLowerCase().includes(selectedFavored.toLowerCase())) return false;
        if (selectedCompany && !order.company?.toLowerCase().includes(selectedCompany.toLowerCase())) return false;
        if (selectedSolicitant && !order.solicitant?.toLowerCase().includes(selectedSolicitant.toLowerCase())) return false;
        if (selectedPaymentType && order.paymentType !== selectedPaymentType) return false;
        if (selectedPriority && order.priority !== selectedPriority) return false;
        if (paidProcessFilter.length > 0 && !paidProcessFilter.includes(order.process)) return false;
    
        if (startDateRaw || endDateRaw) {
            const orderDate = order.paymentCompletionDate ? criarDataLocal(order.paymentCompletionDate) : null;
            if (startDateRaw) {
                const start = criarDataLocal(startDateRaw);
                if (!orderDate || orderDate < start) return false;
            }
            if (endDateRaw) {
                const end = criarDataLocal(endDateRaw);
                end.setUTCHours(23, 59, 59, 999);
                if (!orderDate || orderDate > end) return false;
            }
        }
        return true;
    });
    
    console.log(`DEBUG: [getPaidFilteredItemsForExport] ${filteredRegularPaidOrders.length} ordens pagas regulares após filtro.`);
    
    filteredRegularPaidOrders.forEach(order => {
        const totalPaid = order.payments ? order.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0) : 0;
        allPaidItems.push({
            itemType: 'order',
            id: order.id,
            favoredName: order.favoredName,
            originalValue: parseFloat(order.paymentValue || 0),
            paymentType: order.paymentType,
            priority: order.priority || 'Normal',
            status: 'PAGA',
            paymentDate: order.paymentCompletionDate,
            paidAmount: totalPaid,
            process: order.process || '',
            solicitant: order.solicitant || '',
            company: order.company || '',
            proofs: order.payments?.filter(p => p.proofData) || [],
            originalObject: order
        });
    });
    
    
    // ===== SEÇÃO 2: PROCESSA BOLETOS PAGOS (PARCELAS) =====
    const paidParcelsToProcess = [];
    boletos.forEach(boleto => {
        boleto.parcels.forEach(parcela => {
            if (parcela.isPaid) {
                console.log('parcela original:', parcela); 
                
                const parcelPaymentDate = parcela.paidAt ? parcela.paidAt.split('T')[0] : parcela.dueDate;
                paidParcelsToProcess.push({
                    itemType: 'boleto_parcel',
                    id: parcela.id,
                    boletoId: boleto.id,
                    favoredName: boleto.vendor,
                    originalValue: parseFloat(parcela.value || 0),
                    paymentType: 'Boleto',
                    priority: 'Normal',
                    status: 'PAGA',
                    paymentDate: parcelPaymentDate,
                    paidAmount: parseFloat(parcela.value || 0),
                    process: boleto.process || '',
                    solicitant: '',
                    company: boleto.company || 'N/A',
                    proofs: parcela.proofData ? [parcela.proofData] : [],
                    originalObject: boleto,
                    parcela: {
                        ...parcela,
                        paymentDate: parcelPaymentDate
                    },
                    isParcelaIndividual: !boleto.isFullyPaid,
                    proofData: parcela.proofData || null,
                    proofFileName: parcela.proofFileName || null
                });
            }
        });
    });
    
    const filteredPaidParcels = getPaidFilteredBoletos(paidParcelsToProcess);
    console.log(`DEBUG: [getPaidFilteredItemsForExport] ${filteredPaidParcels.length} parcelas de boletos após filtro.`);
    
    // ===== UNIFICA APENAS ORDENS E BOLETOS (SEM SALÁRIOS) =====
    allPaidItems.push(...filteredPaidParcels);
    console.log(`DEBUG: [getPaidFilteredItemsForExport] Total de ${allPaidItems.length} itens pagos unificados (ORDENS + BOLETOS APENAS).`);
    
    // ===== ORDENAÇÃO =====
    const sortBy = document.getElementById('paidSortBy')?.value || 'paymentDate_desc';
    
    allPaidItems.sort((a, b) => {
        const dateA = new Date(a.paymentDate || 0);
        const dateB = new Date(b.paymentDate || 0);
        
        switch (sortBy) {
            case 'paymentDate_asc':
                return dateA - dateB;
            case 'paymentDate_desc':
                return dateB - dateA;
            case 'favoredName':
                return (a.favoredName || '').localeCompare(b.favoredName || '');
            case 'value_desc':
                return parseFloat(b.paidAmount || 0) - parseFloat(a.paidAmount || 0);
            case 'value_asc':
                return parseFloat(a.paidAmount || 0) - parseFloat(b.paidAmount || 0);
            default:
                return dateB - dateA;
        }
    });
    
    console.log(`DEBUG FIM: [getPaidFilteredItemsForExport] Total de itens para exibição: ${allPaidItems.length}`);
    return allPaidItems;
}

function populatePaidSolicitantNameFilter() {
    const select = document.getElementById('paidSolicitantNameFilter');
    if (!select) {
        console.warn('populatePaidSolicitantNameFilter: Elemento paidSolicitantNameFilter não encontrado.');
        return;
    }
    
    // Limpar opções existentes (exceto a primeira "Todos os solicitantes")
    while (select.options.length > 1) {
        select.remove(1);
    }

    const uniqueNames = new Set();

    // Coletar solicitantes das ordens pagas
    if (typeof fullOrdersList !== 'undefined' && fullOrdersList && Array.isArray(fullOrdersList)) {
        fullOrdersList.filter(order => order.status === 'Paga' && order.solicitant)
                      .forEach(order => uniqueNames.add(order.solicitant.trim()));
    } else {
        console.warn('populatePaidSolicitantNameFilter: Array global "fullOrdersList" não está disponível ou é inválido para coletar solicitantes.');
    }

    // Ordenar e adicionar ao select
    const sortedNames = Array.from(uniqueNames).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    sortedNames.forEach(name => {
        if (name) { 
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        }
    });
}

function openAddBoletoModal() {
    clearBoletoForm();
    
    initializeBoletoGenerationDate();
    
    populateBoletoCompanySelect();
    
    document.getElementById('registerBoletoModal').style.display = 'block';
    console.log('Modal de cadastro de boleto aberto com empresas carregadas');
}


function closeAddBoletoModal() {
    document.getElementById('addBoletoModal').style.display = 'none';
    console.log("DEBUG: Modal de cadastro de boleto fechado.");
}

function closeAddBoletoModal() {
    document.getElementById('addBoletoModal').style.display = 'none';
    console.log("DEBUG: Modal de cadastro de boleto fechado.");
}

// ATUALIZADA: Função para popular o filtro de Solicitante na aba de Ordens Pagas (com Solicitantes e Fornecedores)
function populatePaidSolicitantFilter() { 
    const select = document.getElementById('paidSolicitantFilter'); 
    if (!select) {
        console.warn('populatePaidSolicitantFilter: Elemento paidSolicitantFilter (Solicitante) não encontrado.');
        return;
    }
    
    // Limpar opções existentes (exceto a primeira "Todos os solicitantes")
    while (select.options.length > 1) {
        select.remove(1);
    }

    const uniqueNames = new Set();

    // 1. Adicionar solicitantes da lista hardcoded de "Cadastrar Ordem" (os que você mencionou)
    // ESTES SÃO OS NOMES DA SUA IMAGEM ANEXADA DE "CADASTRAR ORDEM"
    const hardcodedSolicitants = ["Djael Jr", "Rafael Sagrilo", "Lucas Silva", "Verônica Barbosa", "Rafael Sayd", "Maurício Sena"]; 
    hardcodedSolicitants.forEach(name => uniqueNames.add(name));

    // 2. Coletar nomes de solicitantes de TODAS as ordens em fullOrdersList
    // Isso garante que se um solicitante foi adicionado dinamicamente e não estava na lista hardcoded,
    // ele ainda aparecerá no filtro.
    if (typeof fullOrdersList !== 'undefined' && fullOrdersList && Array.isArray(fullOrdersList)) {
        fullOrdersList.forEach(order => {
            // Adiciona apenas se o nome do solicitante existe, não é vazio e não é "Outro" (que é um placeholder)
            if (order.solicitant && order.solicitant.trim() !== '' && order.solicitant.trim().toLowerCase() !== 'outro') {
                uniqueNames.add(order.solicitant.trim());
            }
        });
    } 
    
    // Ordenar alfabeticamente e adicionar as opções ao select
    const sortedNames = Array.from(uniqueNames).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    
    sortedNames.forEach(name => {
        if (name) { 
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        }
    });
}
// ATUALIZADA E OTIMIZADA: Função para popular o filtro de Processo na aba de Ordens Pagas
function populatePaidProcessFilter() {
    const processSelect = document.getElementById('paidProcessFilter');
    if (!processSelect) {
        console.warn('populatePaidProcessFilter: Elemento paidProcessFilter não encontrado.');
        return;
    }

    // Limpar opções existentes (exceto a primeira "Todos os processos")
    while (processSelect.children.length > 1) {
        processSelect.removeChild(processSelect.lastChild);
    }

    const uniqueProcessesMap = new Map(); // Usar um Map para garantir unicidade e preservar o case original

    // 1. Coletar processos de ordens de pagamento (status 'Paga')
    // Usar fullOrdersList como a fonte de dados mais abrangente para ordens
    if (typeof fullOrdersList !== 'undefined' && fullOrdersList && Array.isArray(fullOrdersList)) {
        fullOrdersList.filter(order => order.status === 'Paga' && order.process)
                      .forEach(order => {
                          const process = order.process.trim();
                          if (process) {
                              uniqueProcessesMap.set(process.toLowerCase(), process); // Key: lowercase para unicidade, Value: original para exibição
                          }
                      });
    } else {
        console.warn('populatePaidProcessFilter: Array global "fullOrdersList" não está disponível ou é inválido para coletar processos de ordens.');
    }

    // 2. Coletar processos de boletos (com pelo menos uma parcela paga)
    if (typeof boletos !== 'undefined' && boletos && Array.isArray(boletos)) {
        boletos.forEach(boleto => {
            // Verifica se o boleto tem um processo e se tem pelo menos uma parcela paga
            if (boleto.process && boleto.parcels && boleto.parcels.some(p => p.isPaid)) {
                const process = boleto.process.trim();
                if (process) {
                    uniqueProcessesMap.set(process.toLowerCase(), process);
                }
            }
        });
    } else {
        console.warn('populatePaidProcessFilter: Array global "boletos" não está disponível ou é inválido para coletar processos.');
    }

    // Converter para Array, ordenar alfabeticamente e adicionar ao select
    const sortedProcesses = Array.from(uniqueProcessesMap.values()).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    sortedProcesses.forEach(processName => {
        const option = document.createElement('option');
        option.value = processName;
        option.textContent = processName;
        processSelect.appendChild(option);
    });
}


// Re-adicionada: Função para popular o filtro de Prioridade na aba de Ordens Pagas
function populatePaidPriorityFilter() {
    const select = document.getElementById('paidFilterPriority');
    if (!select) {
        console.warn('populatePaidPriorityFilter: Elemento paidFilterPriority não encontrado.');
        return;
    }
    // As opções para Prioridade já estão estaticamente definidas no HTML.
}

function populatePaidPaymentTypeFilter() {
    const select = document.getElementById('paidFilterPaymentType');
    if (!select) return;
}

function populatePaidPriorityFilter() {
    const select = document.getElementById('paidFilterPriority');
    if (!select) return;
}

// ... (código existente) ...

/**
 * Cria ou atualiza o cartão de resumo de salários/auxílios filtrados na aba 'salariesTab'.
 * Adapta o estilo para ser idêntico ao da caixa de informações de Ordens de Pagamento.
 * @param {number} count O número de salários/auxílios filtrados.
 * @param {number} totalValue O valor total somado dos salários/auxílios filtrados.
 */
function updateSalariesTotalSummaryDisplay(count, totalValue) {
    console.log(`📊 [Salaries Summary] Atualizando display: ${count} salários/auxílios, R\$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    
    const salariesTab = document.getElementById('salariesTab');
    if (!salariesTab) {
        console.warn('⚠️ [Salaries Summary] Aba de salários/auxílios (#salariesTab) não encontrada.');
        return;
    }

    // Remove qualquer cartão de resumo existente para evitar duplicatas ao re-renderizar
    const existingSummaryBox = salariesTab.querySelector('.filtered-info-box');
    if (existingSummaryBox) {
        existingSummaryBox.remove();
    }

    // Não cria a caixa se não houver itens para exibir
    if (count === 0 && totalValue === 0) {
        return;
    }

    // Formata o valor total para exibição em moeda brasileira
    const formattedValue = totalValue.toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        style: 'currency', 
        currency: 'BRL' 
    });

    // Constrói o conteúdo da mensagem com o mesmo formato da aba de Ordens
    const salariesText = count === 1 ? 'salário/auxílio' : 'salários/auxílios';
    const messageContent = `Mostrando <strong>${count}</strong> ${salariesText} filtrado(s). Valor Total Filtrado: <strong>${formattedValue}</strong>`;

    // Constrói o HTML da caixa de resumo com a classe `.filtered-info-box`
    const summaryBoxHtml = `
        <div class="filtered-info-box-container">
            <div class="filtered-info-box">
                <span class="text-content">
                    ${messageContent}
                </span>
            </div>
        </div>
    `;

    // Localiza os botões de exportação, que serão o ponto de inserção
    const exportButtonsContainer = salariesTab.querySelector('.export-buttons');

    if (exportButtonsContainer && exportButtonsContainer.parentNode) {
        // Insere o novo cartão de resumo antes dos botões de exportação
        exportButtonsContainer.parentNode.insertBefore(document.createRange().createContextualFragment(summaryBoxHtml), exportButtonsContainer);
    } else {
        // Fallback: se os botões de exportação não forem encontrados, tenta inserir após a seção de filtros
        const filtersContainer = salariesTab.querySelector('.filters');
        if (filtersContainer && filtersContainer.parentNode) {
            filtersContainer.parentNode.insertBefore(document.createRange().createContextualFragment(summaryBoxHtml), filtersContainer.nextElementSibling);
        } else {
            // Último recurso: adiciona no início da aba, mas pode não ser a posição ideal
            salariesTab.prepend(document.createRange().createContextualFragment(summaryBoxHtml));
            console.warn('⚠️ [Salaries Summary] Contêiner de exportação e filtros não encontrados. Cartão de resumo adicionado no início da aba (fallback).');
        }
    }
}


function displaySalaries() {
    const tbody = document.getElementById('salariesTableBody');
    if (!tbody) {
        console.warn('displaySalaries: Elemento salariesTableBody não encontrado.');
        return;
    }

    tbody.innerHTML = '';
    clearAllSalarySelections(); 

    let filteredSalaries = getFilteredSalaries(); // Este array já contém os salários após aplicar os filtros.
    
    // --- Lógica para o Display de Sumário ---
    const totalFilteredValue = filteredSalaries.reduce((sum, salary) => sum + (parseFloat(salary.value) || 0), 0);
    const totalFilteredCount = filteredSalaries.length;
    
    // Chama a função para criar/atualizar o cartão de resumo
    updateSalariesTotalSummaryDisplay(totalFilteredCount, totalFilteredValue);
    // --- Fim da Lógica de Sumário ---

    if (filteredSalaries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 20px; color: #666;">
                    Nenhum salário/auxílio encontrado com os filtros aplicados.
                </td>
            </tr>
        `;
        return;
    }

    filteredSalaries.forEach(salary => {
        const row = createSalaryRow(salary);
        tbody.appendChild(row);
    });
}

// Excluir salários selecionados em massa
async function deleteSelectedSalaries() {
    if (selectedSalaryIds.size === 0) {
        showSystemMessage('Nenhum salário/auxílio selecionado para exclusão.', 'warning', 3000);
        return;
    }

    const confirmMessage = `Tem certeza que deseja EXCLUIR ${selectedSalaryIds.size} salário(s)/auxílio(s) selecionado(s)?\n\nEsta ação não pode ser desfeita.`;
    if (!confirm(confirmMessage)) {
        console.log('Exclusão em massa cancelada pelo usuário.');
        return;
    }

    let successfulDeletions = 0;
    const failedDeletions = [];

    // Converte Set para Array para iterar
    const idsToDelete = Array.from(selectedSalaryIds);
    const promises = []; // Para armazenar as promessas de cada requisição

    // --- INÍCIO DA ATUALIZAÇÃO OTTIMISTA DA UI ---
    console.log('%c[BULK DELETE SALARY] Iniciando remoção otimista da UI...', 'color: #dc3545; font-weight: bold;');
    idsToDelete.forEach(salaryId => {
        const rowElement = document.querySelector(`tr[data-salary-id="${salaryId}"]`);
        if (rowElement) {
            // Aplica uma animação de fade-out e slide-left
            rowElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            rowElement.style.opacity = '0';
            rowElement.style.transform = 'translateX(-100%)';

            // Remove o elemento do DOM após a animação
            setTimeout(() => {
                rowElement.remove();
                console.log(`UI: Salário ${salaryId} removido otimisticamente do display.`);
            }, 300); // Deve corresponder à duração da transição
        } else {
            console.warn(`[BULK DELETE SALARY] Linha da tabela para salário ID ${salaryId} não encontrada para remoção otimista.`);
        }
    });
    // Limpa imediatamente as seleções da UI, já que as linhas "sumiram"
    clearAllSalarySelections(); // Isso também atualiza o estado dos botões de ação em massa
    // --- FIM DA ATUALIZAÇÃO OTTIMISTA DA UI ---


    for (const salaryId of idsToDelete) {
        const promise = fetch(`${API_BASE_URL}/delete_salary.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: salaryId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                successfulDeletions++;
            } else {
                failedDeletions.push({ id: salaryId, error: data.error });
                // Se a exclusão falhou, a linha será re-adicionada à UI no `displaySalaries()` posterior
            }
        })
        .catch(error => {
            console.error(`Erro de conexão ao excluir salário ${salaryId}:`, error);
            failedDeletions.push({ id: salaryId, error: 'Erro de conexão/servidor.' });
            // Se a exclusão falhou por erro de conexão, a linha será re-adicionada à UI no `displaySalaries()` posterior
        });
        promises.push(promise);
    }

    // Espera todas as requisições terminarem
    await Promise.allSettled(promises);

    // Após todas as requisições, recarrega os dados e atualiza a UI para garantir consistência
    // Qualquer item que falhou na exclusão será re-exibido
    await loadSalaries(true); // Recarrega todos os salários do servidor para garantir consistência
    displaySalaries();   // Redesenha a tabela para refletir o estado final (incluindo rollbacks)

    let summaryMessage = `✅ ${successfulDeletions} salário(s)/auxílio(s) excluído(s) com sucesso.`;
    if (failedDeletions.length > 0) {
        summaryMessage += `\n❌ ${failedDeletions.length} falha(s) na exclusão.`;
        failedDeletions.forEach(fail => {
            summaryMessage += `\n- ID ${fail.id}: ${fail.error}`;
        });
        showSystemMessage(summaryMessage, 'error', 10000);
    } else {
        showSystemMessage(summaryMessage, 'success', 5000);
    }
    // `clearAllSalarySelections()` já foi chamado otimisticamente acima.
    displayReports2(); // Atualiza relatórios se necessário
}

// Abre o modal de edição em massa
function openBulkEditSalaryModal() {
    if (selectedSalaryIds.size === 0) {
        showSystemMessage('Nenhum salário/auxílio selecionado para edição em massa.', 'warning', 3000);
        return;
    }

    document.getElementById('bulkEditCount').textContent = selectedSalaryIds.size;
    document.getElementById('bulkEditSalaryModal').style.display = 'block';
    
    // Resetar o formulário do modal
    const bulkEditField = document.getElementById('bulkEditField');
    const bulkEditValueInput = document.getElementById('bulkEditValue');
    const bulkEditMonthSelect = document.getElementById('bulkEditMonthSelect');
    const bulkEditYearInput = document.getElementById('bulkEditYearInput');

    bulkEditField.value = '';
    bulkEditValueInput.value = '';
    bulkEditValueInput.type = 'text'; // Default para texto
    bulkEditValueInput.style.display = 'block';
    bulkEditMonthSelect.style.display = 'none';
    bulkEditYearInput.style.display = 'none';

    // Popula o select de meses para o bulkEditMonthSelect
    populateMonthSelect('bulkEditMonthSelect');
}

// Fecha o modal de edição em massa
function closeBulkEditSalaryModal() {
    document.getElementById('bulkEditSalaryModal').style.display = 'none';
    // Opcional: Limpar o formulário do modal
    document.getElementById('bulkEditSalaryForm').reset();
}

// Atualiza o tipo de campo de input/select no modal de edição em massa
function updateBulkEditValueField() {
    const bulkEditField = document.getElementById('bulkEditField').value;
    const bulkEditValueInput = document.getElementById('bulkEditValue');
    const bulkEditMonthSelect = document.getElementById('bulkEditMonthSelect');
    const bulkEditYearInput = document.getElementById('bulkEditYearInput');

    // Esconde todos os campos de valor primeiro
    bulkEditValueInput.style.display = 'none';
    bulkEditMonthSelect.style.display = 'none';
    bulkEditYearInput.style.display = 'none';

    // Resetar valores
    bulkEditValueInput.value = '';
    bulkEditMonthSelect.value = '';
    bulkEditYearInput.value = new Date().getFullYear(); // Ano atual como padrão

    // Mostra o campo correto
    if (bulkEditField === 'value' || bulkEditField === 'agency' || bulkEditField === 'account' || bulkEditField === 'operation') {
        bulkEditValueInput.type = 'number';
        if (bulkEditField === 'value') {
            bulkEditValueInput.step = '0.01';
            bulkEditValueInput.placeholder = 'Ex: 1500.00';
        } else {
            bulkEditValueInput.step = '1';
            bulkEditValueInput.placeholder = 'Ex: 1234';
        }
        bulkEditValueInput.style.display = 'block';
    } else if (bulkEditField === 'type' || bulkEditField === 'favoredName' || bulkEditField === 'bank' || bulkEditField === 'process') {
        bulkEditValueInput.type = 'text';
        bulkEditValueInput.placeholder = `Insira o novo ${bulkEditField}`;
        bulkEditValueInput.style.display = 'block';
    } else if (bulkEditField === 'month') {
        bulkEditMonthSelect.style.display = 'block';
        bulkEditYearInput.style.display = 'block';
        // Define o mês atual como padrão
        const today = new Date();
        const currentMonthFormatted = `${String(today.getMonth() + 1).padStart(2, '0')}`;
        bulkEditMonthSelect.value = currentMonthFormatted;
    }
}

// ===== RASTREAMENTO DE SELEÇÃO DE SALÁRIOS =====

// Função para atualizar checkboxes e selectedSalaryIds
function updateSalarySelection(salaryId, isChecked) {
    if (isChecked) {
        selectedSalaryIds.add(salaryId);
        console.log(`✅ Salário ${salaryId} adicionado à seleção. Total: ${selectedSalaryIds.size}`);
    } else {
        selectedSalaryIds.delete(salaryId);
        console.log(`❌ Salário ${salaryId} removido da seleção. Total: ${selectedSalaryIds.size}`);
    }
    
    updateReplicateButtonText();
}
// ===== ATUALIZAR CONTADOR DO BOTÃO DE REPLICAR =====

function updateReplicateButtonText() {
    const replicateCountSpan = document.getElementById('replicateCount');
    const replicateSalariesBtn = document.getElementById('replicateSalariesBtn');
    
    if (replicateCountSpan && replicateSalariesBtn) {
        const count = selectedSalaryIds.size;
        replicateCountSpan.textContent = count;
        
        // Habilitar/desabilitar botão baseado na seleção
        if (count > 0) {
            replicateSalariesBtn.disabled = false;
            replicateSalariesBtn.style.opacity = '1';
            replicateSalariesBtn.style.cursor = 'pointer';
        } else {
            replicateSalariesBtn.disabled = true;
            replicateSalariesBtn.style.opacity = '0.6';
            replicateSalariesBtn.style.cursor = 'not-allowed';
        }
    }
}

// Função para limpar todas as seleções
function clearAllSalarySelections() {
    selectedSalaryIds.clear();
    document.querySelectorAll('.salarycheckbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    console.log('🔄 Todas as seleções foram limpas');
    
    updateReplicateButtonText();
}

// Adicionar event listener para cada checkbox (delegação)
document.addEventListener('change', function(event) {
    if (event.target.classList.contains('salarycheckbox')) {
        const salaryId = event.target.getAttribute('data-salary-id');
        const isChecked = event.target.checked;
        updateSalarySelection(salaryId, isChecked);
    }
});

// Função para selecionar/desselecionar todos
function toggleSelectAllSalaries(selectAll = true) {
    document.querySelectorAll('.salarycheckbox').forEach(checkbox => {
        checkbox.checked = selectAll;
        const salaryId = checkbox.getAttribute('data-salary-id');
        updateSalarySelection(salaryId, selectAll);
    });
    const action = selectAll ? '✅ TODOS' : '❌ NENHUM';
    console.log(`${action} os salários foram selecionados. Total: ${selectedSalaryIds.size}`);
    
    updateReplicateButtonText();
}

// Aplica a edição em massa aos salários selecionados
async function applyBulkEditSalary() {
    if (selectedSalaryIds.size === 0) {
        showSystemMessage('Nenhum salário/auxílio selecionado para edição em massa.', 'warning', 3000);
        return;
    }

    const bulkEditField = document.getElementById('bulkEditField').value;
    let bulkEditValue;

    const bulkEditValueInput = document.getElementById('bulkEditValue');
    const bulkEditMonthSelect = document.getElementById('bulkEditMonthSelect');
    const bulkEditYearInput = document.getElementById('bulkEditYearInput');

    if (!bulkEditField) {
        showSystemMessage('Por favor, selecione um campo para editar.', 'error', 3000);
        return;
    }

    // Lógica para obter o valor com base no tipo de campo
    if (bulkEditField === 'month') {
        const year = parseInt(bulkEditYearInput.value);
        const monthPart = bulkEditMonthSelect.value;
        if (isNaN(year) || !monthPart) {
            showSystemMessage('Por favor, insira um ano e selecione um mês/parte válidos.', 'error', 3000);
            return;
        }
        bulkEditValue = formatMonthAndPartToBackend(year, monthPart); // Formata para o backend
    } else if (bulkEditField === 'value') {
        bulkEditValue = parseFloat(bulkEditValueInput.value);
        if (isNaN(bulkEditValue) || bulkEditValue <= 0) {
            showSystemMessage('Por favor, insira um valor válido para o salário.', 'error', 3000);
            return;
        }
    } else {
        bulkEditValue = bulkEditValueInput.value.trim();
        if (!bulkEditValue) {
            showSystemMessage('Por favor, insira um novo valor.', 'error', 3000);
            return;
        }
    }

    const confirmMessage = `Tem certeza que deseja aplicar a edição em massa para ${selectedSalaryIds.size} salário(s)/auxílio(s)?\n\nCampo: ${bulkEditField}\nNovo Valor: ${bulkEditValue}`;
    if (!confirm(confirmMessage)) {
        console.log('Edição em massa cancelada pelo usuário.');
        return;
    }

    // Fecha o modal de edição em massa imediatamente após a confirmação
    closeBulkEditSalaryModal();

    let successfulEdits = 0;
    const failedEdits = [];

    const idsToEdit = Array.from(selectedSalaryIds);
    const promises = []; // Para armazenar as promessas de cada requisição
    
    // Armazena uma cópia do estado original dos salários afetados para possível rollback
    const originalSalariesState = {};
    idsToEdit.forEach(salaryId => {
        const salaryIndex = salaries.findIndex(s => s.id === salaryId);
        if (salaryIndex !== -1) {
            originalSalariesState[salaryId] = { ...salaries[salaryIndex] }; // Copia o objeto original
        }
    });

    // --- INÍCIO DA ATUALIZAÇÃO OTTIMISTA DA UI ---
    console.log('%c[BULK EDIT SALARY] Iniciando atualização otimista da UI...', 'color: #007bff; font-weight: bold;');
    idsToEdit.forEach(salaryId => {
        const salaryIndex = salaries.findIndex(s => s.id === salaryId);
        if (salaryIndex !== -1) {
            // Aplica a mudança no array local
            salaries[salaryIndex][bulkEditField] = bulkEditValue;
            
            // Adiciona uma classe de "processando" à linha
            const rowElement = document.querySelector(`tr[data-salary-id="${salaryId}"]`);
            if (rowElement) {
                rowElement.classList.add('optimistic-update-pending');
            }
        }
    });
    displaySalaries(); // Re-renderiza a tabela imediatamente com as alterações otimistas
    // --- FIM DA ATUALIZAÇÃO OTTIMISTA DA UI ---


    for (const salaryId of idsToEdit) {
        const updatePayload = {
            id: salaryId,
            [bulkEditField]: bulkEditValue // Define dinamicamente a propriedade a ser atualizada
        };

        const promise = fetch(`${API_BASE_URL}/update_salary.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
        })
        .then(response => response.json())
        .then(data => {
            const rowElement = document.querySelector(`tr[data-salary-id="${salaryId}"]`);
            if (rowElement) {
                rowElement.classList.remove('optimistic-update-pending'); // Remove o indicador de processamento
            }
            if (data.success) {
                successfulEdits++;
            } else {
                failedEdits.push({ id: salaryId, error: data.error });
                // Reverte a alteração local se a API falhar
                const salaryIndex = salaries.findIndex(s => s.id === salaryId);
                if (salaryIndex !== -1 && originalSalariesState[salaryId]) {
                    Object.assign(salaries[salaryIndex], originalSalariesState[salaryId]);
                }
            }
        })
        .catch(error => {
            console.error(`Erro de conexão ao editar salário ${salaryId}:`, error);
            failedEdits.push({ id: salaryId, error: 'Erro de conexão/servidor.' });
            // Reverte a alteração local se a requisição falhar
            const rowElement = document.querySelector(`tr[data-salary-id="${salaryId}"]`);
            if (rowElement) {
                rowElement.classList.remove('optimistic-update-pending'); // Remove o indicador de processamento
            }
            const salaryIndex = salaries.findIndex(s => s.id === salaryId);
            if (salaryIndex !== -1 && originalSalariesState[salaryId]) {
                Object.assign(salaries[salaryIndex], originalSalariesState[salaryId]);
            }
        });
        promises.push(promise);
    }

    // Espera todas as requisições terminarem
    await Promise.allSettled(promises);

    // Após todas as requisições (sejam sucesso ou falha), re-renderiza para refletir qualquer rollback
    // e garantir a consistência final com o servidor.
    await loadSalaries(true); // Recarrega todos os salários do servidor para garantir consistência
    displaySalaries(); // Redesenha a tabela para refletir o estado final (incluindo rollbacks)

    let summaryMessage = `✅ ${successfulEdits} salário(s)/auxílio(s) editado(s) com sucesso.`;
    if (failedEdits.length > 0) {
        summaryMessage += `\n❌ ${failedEdits.length} falha(s) na edição.`;
        failedEdits.forEach(fail => {
            summaryMessage += `\n- ID ${fail.id}: ${fail.error}`;
        });
        showSystemMessage(summaryMessage, 'error', 10000);
    } else {
        showSystemMessage(summaryMessage, 'success', 5000);
    }
    clearAllSalarySelections(); // Limpa a seleção após a ação
    displayReports2(); // Atualiza relatórios se necessário
}
function createSalaryRow(salary) {
    const row = document.createElement('tr');
    row.setAttribute('data-salary-id', salary.id);
    
    // Adiciona uma classe para facilitar a seleção
    row.classList.add('salary-row-item');

    let actionButtons = '';
    if (canManageSalaries()) {
        actionButtons = `
            <button class="btn btn-info btn-small" onclick="editSalary('${salary.id}')">Editar</button>
            <button class="btn btn-danger btn-small" onclick="deleteSalary('${salary.id}')">Excluir</button>
        `;
    }

    // NOVO: Extrai ano e mês/parte para exibição
    const { year, monthPartDisplay } = extractYearAndMonthPartFromBackend(salary.month);

    row.innerHTML = `
        <td><input type="checkbox" class="salary-checkbox" data-salary-id="${salary.id}" 
                   onchange="toggleSalarySelection(this.dataset.salaryId, this.checked)" 
                   ${selectedSalaryIds.has(salary.id) ? 'checked' : ''}></td> <!-- NOVA CÉLULA -->
        <td><span class="status-badge type-${salary.type.toLowerCase()}">${salary.type}</span></td>
        <td>${salary.favoredName}</td>
        <td>${salary.bank}</td>
        <td>${salary.agency}</td>
        <td>${salary.account}</td>
        <td>${salary.operation || '-'}</td>
        <td>${salary.process || '-'}</td>
        <td>R$ ${salary.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
        <td>${formatMonthAndYearForTableDisplay(monthPartDisplay, year)}</td>
        <td>
            <div class="action-buttons">
                ${actionButtons}
            </div>
        </td>
    `;

    return row;
}

// Gerencia a seleção individual de um salário
function toggleSalarySelection(salaryId, isChecked) {
    if (isChecked) {
        selectedSalaryIds.add(salaryId);
        console.log(`✅ Salário ${salaryId} adicionado à seleção. Total: ${selectedSalaryIds.size}`);
    } else {
        selectedSalaryIds.delete(salaryId);
        console.log(`❌ Salário ${salaryId} removido da seleção. Total: ${selectedSalaryIds.size}`);
    }
    
    // ===== ATUALIZAR ESTADO DA INTERFACE =====
    updateBulkActionButtonsState();      // Atualiza botões de editar/excluir
    updateReplicateButtonText();          // ✅ NOVO: Atualiza contador de replicar
}

// ===== ATUALIZAR CONTADOR DO BOTÃO DE REPLICAR =====

function updateReplicateButtonText() {
    const replicateCountSpan = document.getElementById('replicateCount');
    const replicateSalariesBtn = document.getElementById('replicateSalariesBtn');
    
    if (replicateCountSpan && replicateSalariesBtn) {
        const count = selectedSalaryIds.size;
        replicateCountSpan.textContent = count;
        
        // Habilitar/desabilitar botão baseado na seleção
        if (count > 0) {
            replicateSalariesBtn.disabled = false;
            replicateSalariesBtn.style.opacity = '1';
            replicateSalariesBtn.style.cursor = 'pointer';
            console.log(`✅ Botão de replicar habilitado. Selecionados: ${count}`);
        } else {
            replicateSalariesBtn.disabled = true;
            replicateSalariesBtn.style.opacity = '0.6';
            replicateSalariesBtn.style.cursor = 'not-allowed';
            console.log(`❌ Botão de replicar desabilitado. Selecionados: ${count}`);
        }
    } else {
        console.warn(`❌ Elementos não encontrados - replicateCountSpan: ${!!replicateCountSpan}, replicateSalariesBtn: ${!!replicateSalariesBtn}`);
    }
}

// Atualiza o estado dos botões de edição/exclusão em massa
// APROX. LINHA 17600 (ou qualquer lugar lógico após outras funções)
function updateBulkActionButtonsState(tabContext) {
    console.log(`%c[DEBUG UPDATE STATE] CHAMADO para aba: ${tabContext ? tabContext : 'Salários'}`, 'color: blue; font-weight: bold;');
    
    if (tabContext === 'diretoria' || tabContext === 'financeiro') {
        let selectedSet;
        if (tabContext === 'diretoria') {
            selectedSet = selectedOrdersDiretoria;
        } else if (tabContext === 'financeiro') {
            selectedSet = selectedOrdersFinanceiro;
        }

        const count = selectedSet.size;
        const isDisabled = count === 0; 
        console.log(`%c[DEBUG UPDATE STATE] Tamanho do selectedSet para ${tabContext}: ${count}. isDisabled: ${isDisabled}`, 'color: blue;');

        const bulkEditBtn = document.getElementById(`bulkEditOrdersBtn_${tabContext}`);
        const bulkDeleteBtn = document.getElementById(`bulkDeleteOrdersBtn_${tabContext}`);
        const bulkApproveBtn = document.getElementById(`bulkApproveOrdersBtn_${tabContext}`);
        const bulkReproveBtn = document.getElementById(`bulkReproveOrdersBtn_${tabContext}`);

        const selectedCountEditSpan = document.getElementById(`selectedOrdersCount_${tabContext}`);
        const selectedCountDeleteSpan = document.getElementById(`selectedOrdersCountDelete_${tabContext}`);
        const selectedCountApproveSpan = document.getElementById(`selectedOrdersCountApprove_${tabContext}`);
        const selectedCountReproveSpan = document.getElementById(`selectedOrdersCountReprove_${tabContext}`);

        if (bulkEditBtn) {
            bulkEditBtn.disabled = isDisabled; 
            if (selectedCountEditSpan) selectedCountEditSpan.textContent = count;
        }
        if (bulkDeleteBtn) {
            bulkDeleteBtn.disabled = isDisabled; 
            if (selectedCountDeleteSpan) selectedCountDeleteSpan.textContent = count;
        }
        if (bulkApproveBtn) {
            bulkApproveBtn.disabled = isDisabled; 
            if (selectedCountApproveSpan) selectedCountApproveSpan.textContent = count;
        }
        if (bulkReproveBtn) {
            bulkReproveBtn.disabled = isDisabled; 
            if (selectedCountReproveSpan) selectedCountReproveSpan.textContent = count;
        }

        const selectAllCheckbox = document.getElementById(`selectAllCheckbox_${tabContext}`);
        if (selectAllCheckbox) {
            const allIndividualCheckboxes = document.querySelectorAll(`#${tabContext}TableBody .order-checkbox`);
            const visibleIndividualCheckboxes = Array.from(allIndividualCheckboxes).filter(cb => cb.closest('tr').style.display !== 'none');
            
            const totalVisible = visibleIndividualCheckboxes.length;
            const totalSelected = selectedSet.size;

            if (totalVisible === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else {
                selectAllCheckbox.checked = (totalSelected === totalVisible);
                selectAllCheckbox.indeterminate = (totalSelected > 0 && totalSelected < totalVisible);
            }
        }
    } else { // Se não é diretoria nem financeiro, assumimos que é para a aba de Salários/Auxílios
        updateSalaryBulkActionButtonsState();
    }
    console.log(`%c[DEBUG UPDATE STATE] FIM da execução.`, 'color: blue;');
}

// NOVA FUNÇÃO: Dedicada para atualizar o estado dos botões de ação em massa da aba de Salários/Auxílios
function updateSalaryBulkActionButtonsState() {
    console.log(`%c[DEBUG UPDATE STATE - SALARIES] CHAMADO.`, 'color: green; font-weight: bold;');

    const bulkEditBtn = document.getElementById('bulkEditSalariesBtn');
    const bulkDeleteBtn = document.getElementById('bulkDeleteSalariesBtn');
    const selectedCountSpan = document.getElementById('selectedSalariesCount'); // Span para o botão de editar
    const selectedCountDeleteSpan = document.getElementById('selectedSalariesCountDelete'); // Span para o botão de excluir

    const count = selectedSalaryIds.size;
    const isDisabled = count === 0;

    // Botão de Editar Selecionados
    if (bulkEditBtn) {
        bulkEditBtn.disabled = isDisabled;
        if (selectedCountSpan) selectedCountSpan.textContent = count;
        console.log(`  bulkEditSalariesBtn.disabled: ${isDisabled}, Count: ${count}`);
    } else {
        console.warn(`  bulkEditSalariesBtn (ID: bulkEditSalariesBtn) NÃO ENCONTRADO.`);
    }

    // Botão de Excluir Selecionados
    if (bulkDeleteBtn) {
        bulkDeleteBtn.disabled = isDisabled;
        if (selectedCountDeleteSpan) selectedCountDeleteSpan.textContent = count;
        console.log(`  bulkDeleteSalariesBtn.disabled: ${isDisabled}, Count: ${count}`);
    } else {
        console.warn(`  bulkDeleteSalariesBtn (ID: bulkDeleteSalariesBtn) NÃO ENCONTRADO.`);
    }

    // Lógica para o checkbox "Selecionar Tudo" (da aba de salários)
    const selectAllCheckbox = document.getElementById('selectAllSalariesCheckbox');
    if (selectAllCheckbox) {
        const allIndividualCheckboxes = document.querySelectorAll('#salariesTableBody .salary-checkbox');
        const visibleIndividualCheckboxes = Array.from(allIndividualCheckboxes).filter(cb => cb.closest('tr').style.display !== 'none');

        const totalVisible = visibleIndividualCheckboxes.length;
        const totalSelected = selectedSalaryIds.size;

        if (totalVisible === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = (totalSelected === totalVisible);
            selectAllCheckbox.indeterminate = (totalSelected > 0 && totalSelected < totalVisible);
        }
        console.log(`  selectAllSalariesCheckbox: checked=${selectAllCheckbox.checked}, indeterminate=${selectAllCheckbox.indeterminate}`);
    } else {
        console.warn(`  Checkbox 'Selecionar Tudo' para Salários NÃO ENCONTRADO. (ID: selectAllSalariesCheckbox)`);
    }
    console.log(`%c[DEBUG UPDATE STATE - SALARIES] FIM da execução.`, 'color: green;');
}

// Helper para obter o Set de IDs selecionados para uma aba
function getSelectedSetForTab(tabContext) {
    if (tabContext === 'diretoria') {
        return selectedOrdersDiretoria;
    } else if (tabContext === 'financeiro') {
        return selectedOrdersFinanceiro;
    }
    return new Set(); // Retorna um set vazio se o contexto não for reconhecido
}

// Helper para limpar seleções de uma aba
function clearAllOrdersSelections(tabContext) {
    const selectedSet = getSelectedSetForTab(tabContext);
    if (selectedSet) {
        selectedSet.clear();
        const tableBody = document.getElementById(`${tabContext}TableBody`);
        if (tableBody) {
            tableBody.querySelectorAll('.order-checkbox').forEach(cb => cb.checked = false);
        }
        const selectAllCheckbox = document.getElementById(`selectAllCheckbox_${tabContext}`);
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    }
    updateBulkActionButtonsState(tabContext);
}

// --- Funções de Ação em Massa (APROVAR) ---
async function bulkApproveOrders(tabContext) {
    const selectedSet = getSelectedSetForTab(tabContext);
    if (selectedSet.size === 0) {
        showModernWarningNotification('Nenhuma ordem selecionada para aprovação.');
        return;
    }

    const confirmMessage = `Tem certeza que deseja APROVAR ${selectedSet.size} ordem(ns) selecionada(s)?`;
    if (!confirm(confirmMessage)) {
        console.log('Aprovação em massa cancelada pelo usuário.');
        return;
    }

    let successfulApprovals = 0;
    const failedApprovals = [];

    const idsToApprove = Array.from(selectedSet);

    for (const orderId of idsToApprove) {
        try {
            // Reutiliza a lógica de aprovação individual, mas sem o confirm interno
            let order = fullOrdersList.find(o => o.id === orderId);
            if (!order) {
                failedApprovals.push({ id: orderId, error: 'Ordem não encontrada localmente.' });
                continue;
            }

            const oldStatus = order.status;
            let payload = { id: orderId };
            let newStatus;
            let successMessage;

            if (tabContext === 'diretoria') {
                order.approvedByDiretoria = true;
                newStatus = 'Aguardando Financeiro';
                order.approvalDateDiretoria = new Date().toLocaleDateString('en-CA');
                payload.approvedByDiretoria = true;
                payload.status = newStatus;
                payload.approvalDateDiretoria = order.approvalDateDiretoria;
                successMessage = 'Ordem aprovada pela Diretoria!';
            } else if (tabContext === 'financeiro') {
                order.approvedByFinanceiro = true;
                newStatus = 'Aguardando Pagamento';
                order.approvalDateFinanceiro = new Date().toISOString().split('T')[0];
                payload.approvedByFinanceiro = true;
                payload.status = newStatus;
                payload.approvalDateFinanceiro = order.approvalDateFinanceiro;
                successMessage = 'Ordem aprovada pelo Financeiro!';
            } else {
                failedApprovals.push({ id: orderId, error: 'Contexto de aba inválido para aprovação em massa.' });
                continue;
            }
            order.status = newStatus; // Atualiza status localmente

            const response = await fetch(`${API_BASE_URL}/update_order.php?_=${new Date().getTime()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (data.success) {
                successfulApprovals++;
                showModernSuccessNotification(`${successMessage} (ID: ${orderId})`, 1500);
                if (typeof notifyBotStatusChange === 'function' && currentUser) {
                     notifyBotStatusChange(order, oldStatus, newStatus, currentUser.username);
                }
            } else {
                failedApprovals.push({ id: orderId, error: data.error || 'Erro desconhecido da API.' });
            }
        } catch (error) {
            console.error(`Erro de conexão/API ao aprovar ordem ${orderId}:`, error);
            failedApprovals.push({ id: orderId, error: 'Erro de conexão/servidor.' });
        }
    }

    hideLoadingOverlay();
    await loadFullOrdersList(true); // Recarrega do servidor
    updateUIComponentsAfterLoad(); // Redesenha a UI
    clearAllOrdersSelections(tabContext); // Limpa as seleções após a ação

    let summaryMessage = `✅ ${successfulApprovals} ordem(ns) aprovada(s) com sucesso.`;
    if (failedApprovals.length > 0) {
        summaryMessage += `\n❌ ${failedApprovals.length} falha(s) na aprovação.`;
        failedApprovals.forEach(fail => {
            summaryMessage += `\n- ID ${fail.id}: ${fail.error}`;
        });
        showModernErrorNotification(summaryMessage, 10000);
    } else {
        showModernSuccessNotification(summaryMessage, 5000);
    }
}

// --- Funções de Ação em Massa (REPROVAR) ---
async function bulkReproveOrders(tabContext) {
    const selectedSet = getSelectedSetForTab(tabContext);
    if (selectedSet.size === 0) {
        showModernWarningNotification('Nenhuma ordem selecionada para reprovação.');
        return;
    }

    const confirmMessage = `Tem certeza que deseja REPROVAR ${selectedSet.size} ordem(ns) selecionada(s)?`;
    if (!confirm(confirmMessage)) {
        console.log('Reprovação em massa cancelada pelo usuário.');
        return;
    }

    const reason = prompt('Motivo da reprovação em massa:');
    if (!reason || reason.trim() === '') {
        showModernWarningNotification('Motivo da reprovação é obrigatório. Operação cancelada.');
        return;
    }

    let successfulReprovations = 0;
    const failedReprovations = [];

    const idsToReprove = Array.from(selectedSet);

    for (const orderId of idsToReprove) {
        try {
            let order = fullOrdersList.find(o => o.id === orderId);
            if (!order) {
                failedReprovations.push({ id: orderId, error: 'Ordem não encontrada localmente.' });
                continue;
            }

            const oldStatus = order.status;
            let payload = { id: orderId, status: 'Pendente', reprovedByDiretoriaReason: reason };

            if (tabContext === 'diretoria') {
                payload.approvedByDiretoria = false;
                payload.approvedByFinanceiro = false; // Resetar Financeiro também
                order.approvedByDiretoria = false;
                order.approvedByFinanceiro = false;
                order.reprovedByDiretoriaReason = reason;
            } else if (tabContext === 'financeiro') {
                payload.approvedByFinanceiro = false;
                payload.reprovedByFinanceiroReason = reason;
                order.approvedByFinanceiro = false;
                order.reprovedByFinanceiroReason = reason;
            } else {
                failedReprovations.push({ id: orderId, error: 'Contexto de aba inválido para reprovação em massa.' });
                continue;
            }
            order.status = 'Pendente'; // Define status para Pendente localmente

            const response = await fetch(`${API_BASE_URL}/update_order.php?_=${new Date().getTime()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (data.success) {
                successfulReprovations++;
                showModernSuccessNotification(`Ordem reprovada com sucesso! (ID: ${orderId})`, 1500);
                if (typeof notifyBotStatusChange === 'function' && currentUser) {
                     notifyBotStatusChange(order, oldStatus, 'Pendente', currentUser.username, reason);
                }
            } else {
                failedReprovations.push({ id: orderId, error: data.error || 'Erro desconhecido da API.' });
            }
        } catch (error) {
            console.error(`Erro de conexão/API ao reprovar ordem ${orderId}:`, error);
            failedReprovations.push({ id: orderId, error: 'Erro de conexão/servidor.' });
        }
    }

    hideLoadingOverlay();
    await loadFullOrdersList(true);
    updateUIComponentsAfterLoad();
    clearAllOrdersSelections(tabContext);

    let summaryMessage = `✅ ${successfulReprovations} ordem(ns) reprovada(s) com sucesso.`;
    if (failedReprovations.length > 0) {
        summaryMessage += `\n❌ ${failedReprovations.length} falha(s) na reprovação.`;
        failedReprovations.forEach(fail => {
            summaryMessage += `\n- ID ${fail.id}: ${fail.error}`;
        });
        showModernErrorNotification(summaryMessage, 10000);
    } else {
        showModernSuccessNotification(summaryMessage, 5000);
    }
}

// --- Funções de Ação em Massa (EDITAR) ---
async function bulkEditOrders(tabContext) {
    const selectedSet = getSelectedSetForTab(tabContext);
    if (selectedSet.size === 0) {
        showModernWarningNotification('Nenhuma ordem selecionada para edição em massa.');
        return;
    }

    // Por simplicidade, para edição em massa, vamos focar em campos básicos
    // Pode ser expandido para um modal mais complexo se necessário
    const fieldToEdit = prompt(`Qual campo você deseja editar para as ${selectedSet.size} ordens?\n\nOpções: 'prioridade', 'processo', 'direcionamento', 'observacao'`);
    if (!fieldToEdit || fieldToEdit.trim() === '') {
        showModernWarningNotification('Campo para edição não informado. Operação cancelada.');
        return;
    }

    const validFields = ['prioridade', 'processo', 'direcionamento', 'observacao'];
    if (!validFields.includes(fieldToEdit.toLowerCase())) {
        showModernErrorNotification(`Campo '${fieldToEdit}' não suportado para edição em massa. Use uma das opções válidas.`);
        return;
    }

    const newValue = prompt(`Informe o NOVO valor para o campo '${fieldToEdit}':`);
    if (newValue === null) { // Usuário clicou em cancelar no segundo prompt
        showModernWarningNotification('Novo valor não informado. Edição em massa cancelada.');
        return;
    }

    const confirmMessage = `Tem certeza que deseja aplicar a edição em massa para ${selectedSet.size} ordem(ns)?\n\nCampo: ${fieldToEdit}\nNovo Valor: ${newValue || '[Vazio]'}`;
    if (!confirm(confirmMessage)) {
        console.log('Edição em massa cancelada pelo usuário.');
        return;
    }

    let successfulEdits = 0;
    const failedEdits = [];

    const idsToEdit = Array.from(selectedSet);

    for (const orderId of idsToEdit) {
        try {
            let order = fullOrdersList.find(o => o.id === orderId);
            if (!order) {
                failedEdits.push({ id: orderId, error: 'Ordem não encontrada localmente.' });
                continue;
            }

            let payload = { id: orderId };
            // Atualiza o objeto local e o payload para a API
            switch (fieldToEdit.toLowerCase()) {
                case 'prioridade':
                    payload.priority = newValue || 'Normal';
                    order.priority = newValue || 'Normal';
                    break;
                case 'processo':
                    payload.process = newValue || null;
                    order.process = newValue || null;
                    break;
                case 'direcionamento':
                    payload.direction = newValue || null;
                    order.direction = newValue || null;
                    break;
                case 'observacao':
                    payload.observation = newValue || null;
                    order.observation = newValue || null;
                    break;
            }

            const response = await fetch(`${API_BASE_URL}/update_order.php?_=${new Date().getTime()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (data.success) {
                successfulEdits++;
            } else {
                failedEdits.push({ id: orderId, error: data.error || 'Erro desconhecido da API.' });
            }
        } catch (error) {
            console.error(`Erro de conexão/API ao editar ordem ${orderId}:`, error);
            failedEdits.push({ id: orderId, error: 'Erro de conexão/servidor.' });
        }
    }

    hideLoadingOverlay();
    await loadFullOrdersList(true);
    updateUIComponentsAfterLoad();
    clearAllOrdersSelections(tabContext);

    let summaryMessage = `✅ ${successfulEdits} ordem(ns) editada(s) com sucesso.`;
    if (failedEdits.length > 0) {
        summaryMessage += `\n❌ ${failedEdits.length} falha(s) na edição.`;
        failedEdits.forEach(fail => {
            summaryMessage += `\n- ID ${fail.id}: ${fail.error}`;
        });
        showModernErrorNotification(summaryMessage, 10000);
    } else {
        showModernSuccessNotification(summaryMessage, 5000);
    }
}

// --- Funções de Ação em Massa (EXCLUIR) ---
async function bulkDeleteOrders(tabContext) {
    const selectedSet = getSelectedSetForTab(tabContext);
    if (selectedSet.size === 0) {
        showModernWarningNotification('Nenhuma ordem selecionada para exclusão em massa.');
        return;
    }

    const confirmMessage = `Tem certeza que deseja EXCLUIR ${selectedSet.size} ordem(ns) selecionada(s)?\n\nEsta ação não pode ser desfeita.`;
    if (!confirm(confirmMessage)) {
        console.log('Exclusão em massa cancelada pelo usuário.');
        return;
    }

    let successfulDeletions = 0;
    const failedDeletions = [];

    const idsToDelete = Array.from(selectedSet);

    for (const orderId of idsToDelete) {
        try {
            // Reutiliza a lógica de exclusão individual, mas sem o confirm interno
            const response = await fetch(`${API_BASE_URL}/delete_order.php?_=${new Date().getTime()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: orderId })
            });
            const data = await response.json();

            if (data.success) {
                successfulDeletions++;
                showModernSuccessNotification(`Ordem excluída com sucesso! (ID: ${orderId})`, 1500);
                if (typeof window.whatsappScheduler !== 'undefined') {
                    window.whatsappScheduler.cleanupEmergencyNotifications(orderId);
                }
            } else {
                failedDeletions.push({ id: orderId, error: data.error || 'Erro desconhecido da API.' });
            }
        } catch (error) {
            console.error(`Erro de conexão/API ao excluir ordem ${orderId}:`, error);
            failedDeletions.push({ id: orderId, error: 'Erro de conexão/servidor.' });
        }
    }

    hideLoadingOverlay();
    await loadFullOrdersList(true);
    updateUIComponentsAfterLoad();
    clearAllOrdersSelections(tabContext);

    let summaryMessage = `✅ ${successfulDeletions} ordem(ns) excluída(s) com sucesso.`;
    if (failedDeletions.length > 0) {
        summaryMessage += `\n❌ ${failedDeletions.length} falha(s) na exclusão.`;
        failedDeletions.forEach(fail => {
            summaryMessage += `\n- ID ${fail.id}: ${fail.error}`;
        });
        showModernErrorNotification(summaryMessage, 10000);
    } else {
        showModernSuccessNotification(summaryMessage, 5000);
    }
}

// Selecionar/Deselecionar todos os salários visíveis
function toggleSelectAllSalaries(checkbox) {
    const isChecked = checkbox.checked;
    const allSalariesCheckboxes = document.querySelectorAll('.salary-checkbox');
    selectedSalaryIds.clear(); // Limpa a seleção atual para reconstruir
    allSalariesCheckboxes.forEach(cb => {
        // Apenas para salários visíveis
        if (cb.closest('tr').style.display !== 'none') {
            cb.checked = isChecked;
            if (isChecked) {
                selectedSalaryIds.add(cb.dataset.salaryId);
            }
        }
    });
    updateBulkActionButtonsState();
    updateReplicateButtonText();  // ✅ NOVO: Atualizar contador de replicar
}

// Limpa todas as seleções de salário
function clearAllSalarySelections() {
    selectedSalaryIds.clear();
    const allCheckboxes = document.querySelectorAll('.salary-checkbox');
    allCheckboxes.forEach(cb => cb.checked = false);
    updateBulkActionButtonsState();
    updateReplicateButtonText();  // ✅ NOVO: Atualizar contador de replicar
    const selectAllCheckbox = document.getElementById('selectAllSalariesCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
}

// NOVA FUNÇÃO: Formata o mês e ano para exibição na tabela de salários
function formatMonthAndYearForTableDisplay(monthPartDisplay, year) {
    if (!monthPartDisplay || !year) return 'N/A';
    
    // Se for 13º, quebra a linha para melhor visualização
    if (monthPartDisplay.includes('13º')) {
        return `${monthPartDisplay.replace('13º', '13º<br>')}<br>${year}`;
    }
    return `${monthPartDisplay}<br>${year}`;
}

// FUNÇÕES DE RELATÓRIO
function generateReportData(paidOrders) {
    const reportMap = new Map();

    paidOrders.forEach(order => {
        if (!order.process || !order.paymentCompletionDate) {
            console.warn(`Ordem ${order.id} (${order.favoredName}) ignorada: 'process' ou 'paymentCompletionDate' ausente/inválida. Processo: '${order.process}', Data: '${order.paymentCompletionDate}'`);
            return;
        }

        const date = criarDataLocal(order.paymentCompletionDate);
        if (isNaN(date.getTime())) {
            console.warn(`Ordem ${order.id} (${order.favoredName}) ignorada: 'paymentCompletionDate' não é uma data válida. Data: '${order.paymentCompletionDate}'`);
            return;
        }

        const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        const key = `${order.process}-${monthYear}`;


        if (!reportMap.has(key)) {
            reportMap.set(key, {
                process: order.process,
                monthYear: monthYear,
                count: 0,
                totalValue: 0,
                avgValue: 0
            });
        }

        const report = reportMap.get(key);
        report.count++;
        report.totalValue += parseFloat(order.paymentValue || 0);
        report.avgValue = Math.round((report.totalValue / report.count) * 100) / 100;
    });

    return Array.from(reportMap.values());
}

function generateSalaryReportData(salariesSource) { // Adicionada 'salariesSource' como parâmetro
    const reportMap = new Map();
    
    salariesSource.forEach(salary => { // Usar 'salariesSource' aqui
        const monthYear = formatMonth(salary.month);
        const key = `${salary.type}-${salary.bank}-${salary.process || 'N/A'}-${monthYear}`;
        
        if (!reportMap.has(key)) {
            reportMap.set(key, {
                type: salary.type,
                bank: salary.bank,
                process: salary.process || 'N/A',
                month: monthYear,
                count: 0,
                totalValue: 0
            });
        }
        
        const report = reportMap.get(key);
        report.count++;
        report.totalValue += parseFloat(salary.value || 0);
    });
    
    return Array.from(reportMap.values());
}

function getFilteredReports(reportData) {
    const processFilter = document.getElementById('reportFilterProcess')?.value.toLowerCase() || '';
    const monthFilter = document.getElementById('reportFilterMonth')?.value || '';
    const yearFilter = document.getElementById('reportFilterYear')?.value || '';
    
    return reportData.filter(report => {
        const matchesProcess = !processFilter || report.process.toLowerCase().includes(processFilter);
        const matchesMonth = !monthFilter || report.monthYear.includes(monthFilter.replace('-', '/'));
        const matchesYear = !yearFilter || report.monthYear.includes(yearFilter);
        
        return matchesProcess && matchesMonth && matchesYear;
    });
}

function getFilteredReports2(reportData) {
    const typeFilter = document.getElementById('reports2FilterType')?.value || '';
    const processFilter = document.getElementById('reports2FilterProcess')?.value.toLowerCase() || '';
    const bankFilter = document.getElementById('reports2FilterBank')?.value.toLowerCase() || '';
    const monthFilter = document.getElementById('reports2FilterMonth')?.value || '';

    return reportData.filter(report => {
        const matchesType = !typeFilter || report.type === typeFilter;
        const matchesProcess = !processFilter || report.process.toLowerCase().includes(processFilter);
        const matchesBank = !bankFilter || report.bank.toLowerCase().includes(bankFilter);
        const matchesMonth = !monthFilter || report.month.includes(formatMonth(monthFilter));

        return matchesType && matchesProcess && matchesBank && matchesMonth;
    });
}

async function displayReports() {
    const tbody = document.getElementById('reportsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    await fetchPaidOrdersForReports(); // Garante que os dados mais recentes estão carregados do DB
    const reportData = generateReportData(allPaidOrdersForReports); // Usa os dados completos do DB
    let filteredReports = getFilteredReports(reportData); // Aplica os filtros
    
    filteredReports.forEach(report => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${report.process}</td>
            <td>${report.monthYear}</td>
            <td>${report.count}</td>
            <td>R$ ${report.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td>R$ ${report.avgValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
        `;
        tbody.appendChild(row);
    });
}

async function displayReports2() {
    const tbody = document.getElementById('reports2TableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    await fetchSalariesForReports(); // Busca dados frescos do banco
    const reportData = generateSalaryReportData(allSalariesForReports);
    let filteredReports = getFilteredReports2(reportData);
    
    filteredReports.forEach(report => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="status-badge type-${report.type.toLowerCase()}">${report.type}</span></td>
            <td>${report.bank}</td>
            <td>${report.process}</td>
            <td>${report.month}</td>
            <td>${report.count}</td>
            <td>R$ ${report.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
        `;
        tbody.appendChild(row);
    });
}


// Função para alternar visibilidade do seletor de período personalizado
function toggleCustomDateRange() {
    const periodSelect = document.getElementById('dashboardPeriodSelect');
    const customRangeDiv = document.getElementById('dashboardCustomDateRange');
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthPart = String(today.getMonth() + 1).padStart(2, '0'); // Ex: "01" para Janeiro

    if (periodSelect.value === 'custom') {
        customRangeDiv.style.display = 'flex';
        // Popula os selects de mês APENAS SE AINDA NÃO ESTÃO POPULADOS
        if (document.getElementById('dashboardStartMonthSelect').options.length <= 1) { 
            populateDashboardMonthSelect('dashboardStartMonthSelect', currentMonthPart);
            populateDashboardMonthSelect('dashboardEndMonthSelect', currentMonthPart);
        }
        // Define anos padrão
        if (!document.getElementById('dashboardStartYearInput').value) {
            document.getElementById('dashboardStartYearInput').value = currentYear;
        }
        if (!document.getElementById('dashboardEndYearInput').value) {
            document.getElementById('dashboardEndYearInput').value = currentYear;
        }
    } else {
        customRangeDiv.style.display = 'none';
    }
}

// Função para calcular o intervalo de datas com base nos seletores de Mês/Ano
function calculateDateRange() { // Não recebe mais 'period' como parâmetro
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthPart = String(today.getMonth() + 1).padStart(2, '0');

    // Lê os valores dos seletores de Mês/Ano do HTML
    // Adicionado tratamento defensivo para elementos que podem ser nulos
    const startYearInputElem = document.getElementById('dashboardStartYearInput');
    const startMonthSelectElem = document.getElementById('dashboardStartMonthSelect');
    const endYearInputElem = document.getElementById('dashboardEndYearInput');
    const endMonthSelectElem = document.getElementById('dashboardEndMonthSelect');

    const startYearInput = startYearInputElem ? parseInt(startYearInputElem.value) : NaN;
    const startMonthSelect = startMonthSelectElem ? startMonthSelectElem.value : '';
    const endYearInput = endYearInputElem ? parseInt(endYearInputElem.value) : NaN;
    const endMonthSelect = endMonthSelectElem ? endMonthSelectElem.value : '';

    let startDate, endDate;

    // Se Mês Inicial e Ano Inicial não forem selecionados, usa o mês atual como padrão para o início
    if (isNaN(startYearInput) || !startMonthSelect) {
        startDate = criarDataFromYearMonthPart(currentYear, currentMonthPart, true);
    } else {
        startDate = criarDataFromYearMonthPart(startYearInput, startMonthSelect, true);
    }

    // Se Mês Final e Ano Final não forem selecionados, usa o mês atual como padrão para o fim
    if (isNaN(endYearInput) || !endMonthSelect) {
        endDate = criarDataFromYearMonthPart(currentYear, currentMonthPart, false);
    } else {
        endDate = criarDataFromYearMonthPart(endYearInput, endMonthSelect, false);
    }

    // Se a data final for anterior à data inicial, inverte-as ou ajusta
    if (startDate > endDate) {
        console.warn("[Dashboard Filter DEBUG] Data inicial maior que a data final. Ajustando data final para ser igual à inicial.");
        // Ajusta endDate para o final do mês inicial, usando o mesmo ano/mês inicial
        endDate = criarDataFromYearMonthPart(startYearInput, startMonthSelect, false); 
    }

    // Retorna as datas como objetos Date com horários definidos
    return {
        startDate: startDate,
        endDate: endDate
    };
}

// Função para popular os filtros de Processo e Empresa do Dashboard (separada dos filtros de Ordens de Pagamento)
async function populateDashboardFilters() {
    populateDashboardCompanyCheckboxes();
    populateDashboardProcessCheckboxes();
}

function getNormalizedPaidItems(allPaidOrders, allSalaries, allBoletos, allCustomEntryData) { // NOVO PARÂMETRO
    const normalizedItems = [];

    // Adicionar Ordens Pagas
    allPaidOrders.forEach(order => {
        normalizedItems.push({
            itemType: 'order',
            id: order.id,
            favoredName: order.favoredName || '',
            paymentType: order.paymentType || '',
            priority: order.priority || 'Normal',
            process: order.process || '',
            solicitant: order.solicitant || '',
            company: order.company || '',
            status: 'PAGA',
            value: parseFloat(order.paymentValue || 0),
            paidAmount: order.payments
                ? order.payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
                : parseFloat(order.paymentValue || 0),
            paymentDate: order.paymentCompletionDate || order.createdAt || '',
            originalObject: order,
        });
    });

    // Adicionar Salários/Auxílios Pagos
    allSalaries.forEach(salary => {
        normalizedItems.push({
            itemType: 'salary',
            id: salary.id,
            value: parseFloat(salary.value || 0),
            paidAmount: parseFloat(salary.value || 0), // ✅ adicionado
            date: `${salary.month.split('-')[0]}-${(salary.month.includes('13-P')) ? '12' : salary.month.split('-')[1]}-28`,
            company: 'N/A',
            process: salary.process || 'N/A',
            favoredName: salary.favoredName || 'N/A',
            paymentType: salary.type || 'N/A', // ✅ adicionado
        });
    });

    // Adicionar Parcelas de Boletos Pagos
    allBoletos.forEach(boleto => {
        boleto.parcels.forEach(parcel => {
            if (parcel.isPaid) {
                normalizedItems.push({
                    itemType: 'boleto_parcel',
                    id: parcel.id, // ID da parcela
                    boletoId: boleto.id, // ID do boleto pai
                    value: parseFloat(parcel.value || 0),
                    date: parcel.paidAt ? parcel.paidAt.split('T')[0] : parcel.dueDate, // Usa data de pagamento ou vencimento
                    company: 'N/A', // Boletos geralmente não têm campo 'company' direto
                    process: boleto.process || 'N/A',
                    favoredName: boleto.vendor || 'N/A', // Usa o fornecedor como equivalente a favorecido
                });
            }
        });
    });


    // Opcional: Ordenar por data para consistência
    normalizedItems.sort((a, b) => new Date(a.date) - new Date(b.date));

    return normalizedItems;
}

// Função para aplicar os filtros do dashboard e renderizar
async function applyDashboardFilters() {
    await renderDashboard();
    updateTotalEntradasByProcess();
    renderDashboard();

}

// Função para limpar os filtros do dashboard
async function clearDashboardFilters() {
    // Limpa seleção dos novos inputs/selects de mês/ano
    document.getElementById('dashboardStartYearInput').value = '';
    document.getElementById('dashboardStartMonthSelect').value = '';
    document.getElementById('dashboardEndYearInput').value = '';
    document.getElementById('dashboardEndMonthSelect').value = '';

    // Reinicializa o objeto de filtros para o estado padrão
    dashboardCurrentFilters = {
        processes: [],
        companies: []
    };
    console.log(`[DEBUG FILTERS] clearDashboardFilters() - dashboardCurrentFilters resetado para:`, dashboardCurrentFilters);

    await renderDashboard(); // Renderiza o dashboard com filtros limpos e re-popula checkboxes (que agora serão marcados como 'Todos')
    updateTotalEntradasByProcess();
    renderDashboard();
}

// Função para debug - execute no console do navegador
function debugDashboardFilters() {
    const processCheckboxes = document.querySelectorAll('input[name="dashboardProcessCheckbox"]:checked');
    const companyCheckboxes = document.querySelectorAll('input[name="dashboardCompanyCheckbox"]:checked');
    
    console.log('Processos selecionados:', processCheckboxes.length);
    processCheckboxes.forEach(cb => console.log('  - ' + cb.value));
    
    console.log('Empresas selecionadas:', companyCheckboxes.length);
    companyCheckboxes.forEach(cb => console.log('  - ' + cb.value));
    
    console.log('Total de customEntryData:', customEntryData.length);
    console.log('Dados customEntryData:', customEntryData);
}

// Função para anexar event listeners aos checkboxes do Dashboard de forma dinâmica
function attachDashboardCheckboxEventListeners() {
    // Checkboxes de Empresa
    const companyCheckboxes = document.querySelectorAll('.dashboard-filter-company-checkbox');
    companyCheckboxes.forEach(cb => {
        // Remove listeners antigos para evitar duplicação se a função for chamada múltiplas vezes
        if (cb._dashboardCompanyListener) { // _dashboardCompanyListener é uma propriedade customizada para rastrear o listener
            cb.removeEventListener('change', cb._dashboardCompanyListener);
        }
        // Anexa o novo listener e guarda a referência para futura remoção/prevenção de duplicação
        cb._dashboardCompanyListener = function() { handleDashboardCompanyCheckboxChange(this); };
        cb.addEventListener('change', cb._dashboardCompanyListener);
    });

    // Checkboxes de Processo
    const processCheckboxes = document.querySelectorAll('.dashboard-filter-process-checkbox');
    processCheckboxes.forEach(cb => {
        if (cb._dashboardProcessListener) { // _dashboardProcessListener é uma propriedade customizada para rastrear o listener
            cb.removeEventListener('change', cb._dashboardProcessListener);
        }
        cb._dashboardProcessListener = function() { handleDashboardProcessCheckboxChange(this); };
        cb.addEventListener('change', cb._dashboardProcessListener);
    });
    console.log('[DEBUG ATTACH] Event listeners de checkboxes do dashboard anexados.');
}

async function loadDashboardData(forceReload = false) { // Adiciona forceReload
    // loadDashboardData não tem uma flag própria, mas verifica as flags das suas fontes de dados.
    // Se todas as fontes já estiverem carregadas e não houver forceReload, pode-se otimizar.
    if (hasLoadedAllPaidOrdersForReports && hasLoadedAllSalariesForReports && 
        hasLoadedBoletos && hasLoadedDeposits && hasLoadedCustomEntryData && !forceReload) {
        console.log('⏳ [loadDashboardData] Todos os dados para o dashboard já carregados. Pulando recarregamento da API.');
        return;
    }

    console.log('DEBUG: loadDashboardData - Carregando dados brutos para o dashboard...');

    try {
        await fetchPaidOrdersForReports(forceReload); // Popula allPaidOrdersForReports
        await fetchSalariesForReports(forceReload); // Popula allSalariesForReports
        await loadBoletos(forceReload); // Popula boletos (contém parcelas pendentes e pagas)
        await loadDepositsFromDB(forceReload); // Popula deposits
        await loadCustomEntryData(forceReload); // Carrega todos os Dados de Entrada Personalizados

        dashboardAllPaidItems = getNormalizedPaidItems(allPaidOrdersForReports, allSalariesForReports, boletos, customEntryData);
        dashboardAllDeposits = deposits; 

        console.log('✅ [Dashboard] Dados brutos para o dashboard carregados e normalizados com sucesso.');
    } catch (error) {
        console.error('❌ [Dashboard] Erro ao carregar dados brutos para o dashboard:', error);
        dashboardAllPaidItems = [];
        dashboardAllDeposits = [];
        showSystemMessage('Erro ao carregar dados para o dashboard. Verifique o console.', 'error');
    } finally {
        hideLoadingOverlay(); // Esconde o overlay
    }
}
function handleDashboardCompanyCheckboxChange(changedCheckbox) {
    console.log(`[DEBUG CHECKBOX] handleDashboardCompanyCheckboxChange chamado para:`, changedCheckbox.value, `Checked:`, changedCheckbox.checked);
    
    const allCompanyCheckboxes = document.querySelectorAll('.dashboard-filter-company-checkbox');
    const allCompaniesCheckbox = document.querySelector('.dashboard-filter-company-checkbox[value=""]'); // O checkbox 'Todas as Empresas'

    if (changedCheckbox.value === '') { // Se o checkbox 'Todas as Empresas' foi alterado
        if (changedCheckbox.checked) {
            console.log(`[DEBUG CHECKBOX] 'Todas as Empresas' foi marcado. Desmarcando outros.`);
            allCompanyCheckboxes.forEach(cb => {
                if (cb.value !== '') cb.checked = false;
            });
            // Se 'Todas' foi marcado, o filtro de empresas deve estar vazio (nenhuma específica)
            dashboardCurrentFilters.companies = []; 
        }
    } else { // Se um checkbox de empresa específica foi alterado
        if (changedCheckbox.checked) {
            console.log(`[DEBUG CHECKBOX] Empresa específica '${changedCheckbox.value}' foi marcado. Desmarcando 'Todas'.`);
            // Se um específico foi marcado, desmarcar 'Todas as Empresas'
            if (allCompaniesCheckbox) allCompaniesCheckbox.checked = false;
        } else {
            console.log(`[DEBUG CHECKBOX] Empresa específica '${changedCheckbox.value}' foi desmarcado.`);
            // Se um específico foi desmarcado e nenhum outro específico está marcado, marcar 'Todas as Empresas'
            const anyOtherSpecificChecked = Array.from(allCompanyCheckboxes).some(cb => cb.value !== '' && cb.checked);
            if (!anyOtherSpecificChecked && allCompaniesCheckbox) {
                console.log(`[DEBUG CHECKBOX] Nenhuma outra empresa específica marcada. Marcando 'Todas'.`);
                allCompaniesCheckbox.checked = true;
            }
        }
    }

    // ATUALIZA dashboardCurrentFilters.companies APÓS A LÓGICA DE SELEÇÃO
    dashboardCurrentFilters.companies = Array.from(document.querySelectorAll('.dashboard-filter-company-checkbox:checked'))
                                       .map(cb => cb.value.trim()); // Não converte para lowercase aqui, pois já o fazemos na filtragem
    
    // Se 'Todas as Empresas' está marcado, o array de empresas selecionadas deve ser vazio para o filtro
    if (document.querySelector('.dashboard-filter-company-checkbox[value=""]').checked) {
        dashboardCurrentFilters.companies = [];
    }
    console.log(`[DEBUG CHECKBOX] dashboardCurrentFilters.companies atualizado para:`, dashboardCurrentFilters.companies);

    applyDashboardFilters(); // Re-aplica os filtros após a mudança
    console.log(`[DEBUG CHECKBOX] applyDashboardFilters() foi chamado para a Empresa.`); // Log de confirmação
}

/**
 * Lida com a mudança de estado de um checkbox de Processo no Dashboard.
 * Gerencia a lógica de 'Todos' vs. específico e salva o estado selecionado.
 * @param {HTMLInputElement} changedCheckbox O checkbox que teve seu estado alterado.
 */
function handleDashboardProcessCheckboxChange(changedCheckbox) {
    console.log(`[DEBUG CHECKBOX] handleDashboardProcessCheckboxChange chamado para:`, changedCheckbox.value, `Checked:`, changedCheckbox.checked);

    const allProcessCheckboxes = document.querySelectorAll('.dashboard-filter-process-checkbox');
    const allProcessesCheckbox = document.querySelector('.dashboard-filter-process-checkbox[value=""]'); // O checkbox 'Todos os Processos'

    if (changedCheckbox.value === '') { // Se o checkbox 'Todos os Processos' foi alterado
        if (changedCheckbox.checked) {
            console.log(`[DEBUG CHECKBOX] 'Todos os Processos' foi marcado. Desmarcando outros.`);
            allProcessCheckboxes.forEach(cb => {
                if (cb.value !== '') cb.checked = false;
            });
            // Se 'Todos' foi marcado, o filtro de processos deve estar vazio (nenhum específico)
            dashboardCurrentFilters.processes = [];
        }
    } else { // Se um checkbox de processo específico foi alterado
        if (changedCheckbox.checked) {
            console.log(`[DEBUG CHECKBOX] Processo específico '${changedCheckbox.value}' foi marcado. Desmarcando 'Todos'.`);
            // Se um específico foi marcado, desmarcar 'Todos os Processos'
            if (allProcessesCheckbox) allProcessesCheckbox.checked = false;
        } else {
            console.log(`[DEBUG CHECKBOX] Processo específico '${changedCheckbox.value}' foi desmarcado.`);
            // Se um específico foi desmarcado e nenhum outro específico está marcado, marcar 'Todos os Processos'
            const anyOtherSpecificChecked = Array.from(allProcessCheckboxes).some(cb => cb.value !== '' && cb.checked);
            if (!anyOtherSpecificChecked && allProcessesCheckbox) {
                console.log(`[DEBUG CHECKBOX] Nenhuma outra processo específica marcada. Marcando 'Todos'.`);
                allProcessesCheckbox.checked = true;
            }
        }
    }

    // ATUALIZA dashboardCurrentFilters.processes APÓS A LÓGICA DE SELEÇÃO
    // Esta é a parte que coleta os valores dos checkboxes *realmente* marcados no DOM naquele momento.
    // A regeneração do DOM que ocorre após applyDashboardFilters() fará com que o estado salvo em dashboardCurrentFilters seja o "verdadeiro".
    dashboardCurrentFilters.processes = Array.from(document.querySelectorAll('.dashboard-filter-process-checkbox:checked'))
                                       .map(cb => cb.value.trim()); 
    
    // Se 'Todas os Processos' está marcado, o array de processos selecionados deve ser vazio para o filtro
    if (document.querySelector('.dashboard-filter-process-checkbox[value=""]').checked) {
        dashboardCurrentFilters.processes = [];
    }
    console.log(`[DEBUG CHECKBOX] dashboardCurrentFilters.processes atualizado para:`, dashboardCurrentFilters.processes);
    // NOVO LOG: Verifique o estado COMPLETO do objeto de filtros ANTES de aplicar
    console.log(`[DEBUG CHECKBOX] State of dashboardCurrentFilters before applyDashboardFilters (Process):`, JSON.parse(JSON.stringify(dashboardCurrentFilters))); 

    applyDashboardFilters(); // Re-aplica os filtros após a mudança
    console.log(`[DEBUG CHECKBOX] applyDashboardFilters() foi chamado para o Processo.`); // Log de confirmação
}

// --- FIM: FUNÇÕES AUXILIARES PARA MANIPULAÇÃO DOS CHECKBOXES DO DASHBOARD ---
// Função para popular os checkboxes de Empresa no Dashboard
function populateDashboardCompanyCheckboxes() {
    const companyListContainer = document.getElementById('dashboardFilterCompanyList');
    if (!companyListContainer) {
        console.warn('populateDashboardCompanyCheckboxes: Elemento dashboardFilterCompanyList não encontrado no DOM. Verifique o HTML.');
        return;
    }

    companyListContainer.innerHTML = ''; 

    const uniqueCompanies = new Set();
    dashboardAllPaidItems.filter(item => item.itemType === 'order' && item.company && item.company !== 'N/A').forEach(item => {
        uniqueCompanies.add(item.company);
    });

    console.log(`[DEBUG POPULATE] populateDashboardCompanyCheckboxes - Empresas únicas encontradas: ${uniqueCompanies.size}. Empresas:`, Array.from(uniqueCompanies));
    if (uniqueCompanies.size === 0) {
        console.warn('[DEBUG POPULATE] Nenhuma empresa única encontrada em dashboardAllPaidItems para gerar checkboxes. Adicionando apenas a opção "Nenhuma".');
        companyListContainer.innerHTML = '<div class="list-item">Nenhuma empresa encontrada para filtrar.</div>';
    }

    // ADIÇÃO: Verificando se "Todas as Empresas" deve ser marcado na regeneração
    const isAllCompaniesChecked = dashboardCurrentFilters.companies.length === 0;

    // Adicionar "Todas as Empresas" como uma opção
    const allOption = document.createElement('label');
    allOption.className = 'list-item';
    allOption.innerHTML = `
        <input type="checkbox" class="dashboard-filter-company-checkbox" value="" ${isAllCompaniesChecked ? 'checked' : ''}>
        Todas as Empresas
    `;
    companyListContainer.appendChild(allOption);

    // Adiciona as empresas únicas, ordenadas alfabeticamente
    Array.from(uniqueCompanies).sort().forEach(company => {
        const label = document.createElement('label');
        label.className = 'list-item';
        // ADIÇÃO: Verificando se esta empresa específica deve ser marcada na regeneração
        const isChecked = dashboardCurrentFilters.companies.includes(company.trim());
        label.innerHTML = `
            <input type="checkbox" class="dashboard-filter-company-checkbox" value="${escapeForHTML(company)}" ${isChecked ? 'checked' : ''}>
            ${escapeForHTML(company)}
        `;
        companyListContainer.appendChild(label);
    });
    console.log('[DEBUG POPULATE] Checkboxes de Empresa gerados com sucesso no DOM.');

    // Anexar event listeners APÓS os elementos estarem no DOM
    attachDashboardCheckboxEventListeners();
}

// Função para popular os checkboxes de Processo no Dashboard
function populateDashboardProcessCheckboxes() {
    const processListContainer = document.getElementById('dashboardFilterProcessList');
    if (!processListContainer) {
        console.warn('populateDashboardProcessCheckboxes: Elemento dashboardFilterProcessList não encontrado no DOM. Verifique o HTML.');
        return;
    }

    processListContainer.innerHTML = ''; 

    const uniqueProcesses = new Set();
    dashboardAllPaidItems.forEach(item => {
        if (item.process && item.process !== 'N/A') uniqueProcesses.add(item.process);
    });

    console.log(`[DEBUG POPULATE] populateDashboardProcessCheckboxes - Processos únicos encontrados: ${uniqueProcesses.size}. Processos:`, Array.from(uniqueProcesses));
    if (uniqueProcesses.size === 0) {
        console.warn('[DEBUG POPULATE] Nenhum processo único encontrado em dashboardAllPaidItems para gerar checkboxes. Adicionando apenas a opção "Nenhuma".');
        processListContainer.innerHTML = '<div class="list-item">Nenhum processo encontrado para filtrar.</div>';
    }

    // ADIÇÃO: Verificando se "Todos os Processos" deve ser marcado na regeneração
    const isAllProcessesChecked = dashboardCurrentFilters.processes.length === 0;

    // Adicionar "Todos os Processos" como uma opção
    const allOption = document.createElement('label');
    allOption.className = 'list-item';
    allOption.innerHTML = `
        <input type="checkbox" class="dashboard-filter-process-checkbox" value="" ${isAllProcessesChecked ? 'checked' : ''}>
        Todos os Processos
    `;
    processListContainer.appendChild(allOption);

    // Adiciona os processos únicos, ordenados alfabeticamente
    Array.from(uniqueProcesses).sort().forEach(process => {
        const label = document.createElement('label');
        label.className = 'list-item';
        // ADIÇÃO: Verificando se este processo específico deve ser marcado na regeneração
        const isChecked = dashboardCurrentFilters.processes.includes(process.trim()); // Usa .includes() para verificar o estado salvo
        label.innerHTML = `
            <input type="checkbox" class="dashboard-filter-process-checkbox" value="${escapeForHTML(process)}" ${isChecked ? 'checked' : ''}>
            ${escapeForHTML(process)}
        `;
        processListContainer.appendChild(label);
    });
    console.log('[DEBUG POPULATE] Checkboxes de Processo gerados com sucesso no DOM.');

    // Anexar event listeners APÓS os elementos estarem no DOM
    attachDashboardCheckboxEventListeners(); // Certifique-se que esta função está definida ANTES

    // Marcar 'Todos os Processos' por padrão ao carregar, se nada estiver selecionado
    // Esta lógica já foi refeita e encapsulada no `isAllProcessesChecked` e `isChecked` acima.
    // Remova a repetição abaixo se existir, ou mantenha-a para o caso do filtro estar "limpo"
    const anySpecificProcessChecked = Array.from(document.querySelectorAll('.dashboard-filter-process-checkbox')).some(cb => cb.value !== '' && cb.checked);
    const allProcessesCheckbox = document.querySelector('.dashboard-filter-process-checkbox[value=""]');
    if (!anySpecificProcessChecked && allProcessesCheckbox) {
        allProcessesCheckbox.checked = true;
    }
}

function getFilteredDashboardData() {
    // 1. Obter o range de datas
    const { startDate, endDate } = calculateDateRange(); 
    const filterStartDate = startDate; 
    const filterEndDate = endDate;     

    console.log(`DEBUG: getFilteredDashboardData - Período de Filtro Efetivo:`);
    console.log(`DEBUG: getFilteredDashboardData -   Início: ${filterStartDate.toLocaleString('pt-BR')}`);
    console.log(`DEBUG: getFilteredDashboardData -   Fim:    ${filterEndDate.toLocaleString('pt-BR')}`);

    // 2. Ler os filtros de Empresa e Processo (checkboxes customizados)
    const selectedCompanies = dashboardCurrentFilters.companies.map(c => c.toLowerCase());
    const selectedProcesses = dashboardCurrentFilters.processes.map(p => p.toLowerCase());
    
    console.log(`DEBUG: getFilteredDashboardData - Filtros de Empresa Selecionados (normalizados):`, selectedCompanies);
    console.log(`DEBUG: getFilteredDashboardData - Filtros de Processo Selecionados (normalizados):`, selectedProcesses);

    // Logs para dashboardAllPaidItems (saídas)
    console.log(`DEBUG: getFilteredDashboardData - dashboardAllPaidItems total antes de filtrar: ${dashboardAllPaidItems.length}`);
    if (dashboardAllPaidItems.length > 0) {
        console.log(`DEBUG: getFilteredDashboardData - Primeiro item de dashboardAllPaidItems:`, dashboardAllPaidItems[0]);
    }

    // 3. Filtrar Itens Pagos (Ordens, Boletos, Salários) - SAÍDAS
    const filteredPaidItems = dashboardAllPaidItems.filter(item => {
        const itemDate = criarDataLocal(item.date); 
        // Salários são frequentemente referenciados ao final do mês para relatórios
        if (item.itemType === 'salary') { 
             itemDate.setHours(23, 59, 59, 999); 
        } else { 
             itemDate.setHours(0, 0, 0, 0); 
        }
        
        // --- Aplica Filtro de Data ---
        const matchesDate = !isNaN(itemDate.getTime()) && itemDate >= filterStartDate && itemDate <= filterEndDate;
        if (!matchesDate) { return false; }

        // --- Aplica Filtro de Processo ---
        let matchesProcess = true;
        if (selectedProcesses.length > 0) {
            matchesProcess = selectedProcesses.includes(item.process?.trim().toLowerCase());
        }
        if (!matchesProcess) { return false; }
        
        // --- Aplica Filtro de Empresa ---
        let matchesCompany = true;
        if (selectedCompanies.length > 0) {
            if (item.itemType === 'order') { // Filtra ordens pelo campo 'company'
                matchesCompany = selectedCompanies.includes(item.company?.trim().toLowerCase());
            } else {
                matchesCompany = false; // Salários e boletos só aparecem se NENHUM filtro de empresa estiver ativo
            }
        }
        if (!matchesCompany) { return false; }

        return true; // Se passou por todos os filtros
    });

    // 4. Filtrar Depósitos (Entradas) - Pelo range de datas
    console.log(`DEBUG: getFilteredDashboardData - dashboardAllDeposits antes de filtrar (Total: ${dashboardAllDeposits.length}):`, dashboardAllDeposits); 
    const filteredDeposits = dashboardAllDeposits.filter(deposit => {
        const depositDate = criarDataLocal(deposit.deposit_date);
        // Assumindo deposit.date é YYYY-MM-DD
        depositDate.setHours(0, 0, 0, 0); // Garante que depositDate é comparável ao início do dia (00:00:00)
        
        const matchesDate = !isNaN(depositDate.getTime()) && depositDate >= filterStartDate && depositDate <= filterEndDate;
        return matchesDate;
    });

    console.log(`DEBUG: getFilteredDashboardData - Resultado Final - Depósitos Filtrados (${filteredDeposits.length}):`, filteredDeposits); 
    
    // 5. Filtrar Ordens Pendentes com os filtros do Dashboard - PENDENTES (SAÍDAS FUTURAS)
    const filteredPendingOrders = fullOrdersList.filter(order => {
        // Excluir ordens já pagas
        if (order.status === 'Paga') return false;

        // --- Aplica Filtro de Data ---
        // Para ordens pendentes, a data mais relevante é a previsão de pagamento ou a data de geração.
        // Vamos considerar a 'paymentForecast' primeiro, se não, a 'generationDate'.
        const orderDate = order.paymentForecast ? criarDataLocal(order.paymentForecast) : criarDataLocal(order.generationDate);
        orderDate.setHours(0, 0, 0, 0); // Zera a hora para comparação
        
        const matchesDate = !isNaN(orderDate.getTime()) && orderDate >= filterStartDate && orderDate <= filterEndDate;
        if (!matchesDate) return false;

        // --- Aplica Filtro de Processo ---
        let matchesProcess = true;
        if (selectedProcesses.length > 0) {
            matchesProcess = selectedProcesses.includes(order.process?.trim().toLowerCase());
        }
        if (!matchesProcess) return false;
        
        // --- Aplica Filtro de Empresa ---
        let matchesCompany = true;
        if (selectedCompanies.length > 0) {
            matchesCompany = selectedCompanies.includes(order.company?.trim().toLowerCase());
        }
        if (!matchesCompany) return false;

        return true; // Se passou por todos os filtros
    });
    console.log(`DEBUG: getFilteredDashboardData - Resultado Final - Ordens Pendentes Filtradas (${filteredPendingOrders.length}):`, filteredPendingOrders);

    // 6. NOVO: Filtrar Dados de Entrada Personalizados (apenas os pagos) com os filtros do Dashboard - ENTRADAS
    const filteredCustomEntryDataInflows = customEntryData.filter(entry => {
        // Apenas itens pagos são considerados como entrada para o dashboard
        if (entry.status !== 'Pago') return false;

        // --- Aplica Filtro de Data ---
        // A data relevante é a 'entry_date' ou 'payment_date' se existir. Usaremos 'entry_date' para consistência.
        const entryDate = criarDataLocal(entry.entry_date);
        entryDate.setHours(0, 0, 0, 0); // Zera a hora para comparação
        
        const matchesDate = !isNaN(entryDate.getTime()) && entryDate >= filterStartDate && entryDate <= filterEndDate;
        if (!matchesDate) return false;

        // --- Aplica Filtro de Processo ---
        let matchesProcess = true;
        if (selectedProcesses.length > 0) {
            matchesProcess = selectedProcesses.includes(entry.process?.trim().toLowerCase());
        }
        if (!matchesProcess) return false;
        
        // --- Aplica Filtro de Empresa ---
        let matchesCompany = true;
        if (selectedCompanies.length > 0) {
            matchesCompany = selectedCompanies.includes(entry.company?.trim().toLowerCase());
        }
        if (!matchesCompany) return false;

        return true; // Se passou por todos os filtros
    });
    console.log(`DEBUG: getFilteredDashboardData - Resultado Final - Dados de Entrada Personalizados Pagos Filtrados (${filteredCustomEntryDataInflows.length}):`, filteredCustomEntryDataInflows);


    return { filteredPaidItems, filteredDeposits, filteredPendingOrders, filteredCustomEntryDataInflows }; // NEW: Return filteredCustomEntryDataInflows
}

async function renderDashboard() {
    console.log('🎨 [Dashboard] Renderizando Dashboard de Dados de Saída...');
    showLoadingOverlay();

    try {
        // Garante que os dados brutos estejam carregados.
        if (dashboardAllPaidItems.length === 0 || dashboardAllDeposits.length === 0) {
            console.log('DEBUG: renderDashboard - dashboardAllPaidItems ou dashboardAllDeposits vazios. Chamando loadDashboardData().');
            await loadDashboardData(); 
        } else {
            console.log('DEBUG: renderDashboard - Dados do dashboard já carregados. Pulando loadDashboardData().');
        }

        // Popula os checkboxes de Empresa e Processo
        populateDashboardCompanyCheckboxes();
        populateDashboardProcessCheckboxes();

        // Popula e define valores padrão para os seletores de mês/ano
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonthPart = String(today.getMonth() + 1).padStart(2, '0');

        // Popula e define o valor atual para o select de Mês Inicial/Final e Ano
        const dashboardStartMonthSelectElem = document.getElementById('dashboardStartMonthSelect');
        const dashboardEndMonthSelectElem = document.getElementById('dashboardEndMonthSelect');
        const dashboardStartYearInputElem = document.getElementById('dashboardStartYearInput');
        const dashboardEndYearInputElem = document.getElementById('dashboardEndYearInput');
        
        let totalCost = 0;
        let orderCost = 0;
        let boletoCost = 0;
        let salaryCost = 0;
        let customEntryDataCost = 0; // AGORA DECLARADO AQUI, ANTES DE SER USADO ABAIXO
        let totalTransactions = 0; // Inicializado aqui, mas seu valor será definido após o filtro

        if (dashboardStartMonthSelectElem && dashboardStartMonthSelectElem.options.length <= 1) { // Só popula se não estiver populado
            populateDashboardMonthSelect('dashboardStartMonthSelect', currentMonthPart);
        }
        if (dashboardStartYearInputElem && !dashboardStartYearInputElem.value) {
            dashboardStartYearInputElem.value = currentYear;
        }
        
        if (dashboardEndMonthSelectElem && dashboardEndMonthSelectElem.options.length <= 1) {
            populateDashboardMonthSelect('dashboardEndMonthSelect', currentMonthPart);
        }
        if (dashboardEndYearInputElem && !dashboardEndYearInputElem.value) {
            dashboardEndYearInputElem.value = currentYear;
        }
        // FIM: Popula e define valores padrão para os seletores de mês/ano

        // CHAVE: Agora getFilteredDashboardData retorna também as ordens pendentes filtradas
        const { filteredPaidItems, filteredDeposits, filteredPendingOrders } = getFilteredDashboardData();

        // ATENÇÃO: totalTransactions precisa ser calculado após o filtro
        totalTransactions = filteredPaidItems.length; // Contagem de saídas pagas filtradas

        // CÁLCULO PARA O CARD 'TOTAL ENTRADAS' (Depósitos Filtrados por Data)
        const income = customEntryData.reduce((sum, entry) => sum + parseFloat(entry.value || 0), 0);
        
        // CÁLCULO PARA OS CARDS 'VALOR ORDENS PENDENTES' E 'QTD. ORDENS PENDENTES' (Ordens Pendentes Filtradas por Data/Empresa/Processo)
        let totalPendingOrdersValue = filteredPendingOrders.reduce((sum, order) => sum + parseFloat(order.paymentValue || 0), 0);
        let totalPendingOrdersCount = filteredPendingOrders.length;

        // Soma dos custos das saídas (ordens, boletos, salários, dados de entrada - PAGAS e FILTRADAS)
        filteredPaidItems.forEach(item => {
            totalCost += item.value;
            if (item.itemType === 'order') {
                orderCost += item.value;
            } else if (item.itemType === 'boleto_parcel') {
                boletoCost += item.value;
            } else if (item.itemType === 'salary') {
                salaryCost += item.value;
            } else if (item.itemType === 'custom_entry_data') { // NOVO: Contabiliza Dados de Entrada
                customEntryDataCost += item.value;
            }
        });

        const difference = income - totalCost; // Diferença é recalculada com base nos valores filtrados

        console.log(`DEBUG_DASHBOARD: renderDashboard - Custo Total Calculado:`, totalCost); // NOVO LOG AQUI
        console.log(`DEBUG_DASHBOARD: renderDashboard - Custo de Ordens Calculado:`, orderCost); // NOVO LOG AQUI
        console.log(`DEBUG_DASHBOARD: renderDashboard - Custo de Boletos Calculado:`, boletoCost); // NOVO LOG AQUI
        console.log(`DEBUG_DASHBOARD: renderDashboard - Custo de Salários Calculado:`, salaryCost); // NOVO LOG AQUI
        console.log(`DEBUG_DASHBOARD: renderDashboard - Custo custom_entry_data Calculado:`, customEntryDataCost); // NOVO LOG AQUI

        // --- Atualizar Cards de Métricas (com verificações de existência) ---
        // As mensagens de erro para elementos não encontrados foram adicionadas anteriormente nos DEBUGS
        document.getElementById('dashboardTotalCost').textContent = formatCurrency(totalCost);
        document.getElementById('dashboardOrderCost').textContent = formatCurrency(orderCost);
        document.getElementById('dashboardBoletoCost').textContent = formatCurrency(boletoCost);
        document.getElementById('dashboardSalaryCost').textContent = formatCurrency(salaryCost);
        document.getElementById('dashboardTotalTransactions').textContent = totalTransactions;
        
        // Atualiza o card "Total Entradas" com o valor calculado dos depósitos FILTRADOS
        document.getElementById('dashboardIncome').textContent = formatCurrency(income);

        // Atualiza os cards de Ordens Pendentes com os valores FILTRADOS
        document.getElementById('dashboardPendingOrdersValue').textContent = formatCurrency(totalPendingOrdersValue);
        document.getElementById('dashboardPendingOrdersCount').textContent = totalPendingOrdersCount;

        // ... (código existente da função renderDashboard) ...

        // Formatar e aplicar cor à Diferença
        const differenceElement = document.getElementById('dashboardDifference');
        if (differenceElement) {
            differenceElement.textContent = formatCurrency(difference);
            differenceElement.classList.remove('positive', 'negative');
            if (difference >= 0) {
                differenceElement.classList.add('positive');
            } else {
                differenceElement.classList.add('negative');
            }
        }

        // NOVO CONJUNTO DE LOGS FINAIS PARA VERIFICAR OS VALORES DOS CARDS
        console.log('--- DEBUG_DASHBOARD_FINAL ---');
        console.log(`Custo Total (dashboardTotalCost): ${formatCurrency(totalCost)}`);
        console.log(`Custo Ordens Pagamento (dashboardOrderCost): ${formatCurrency(orderCost)}`);
        console.log(`Custo Boletos (dashboardBoletoCost): ${formatCurrency(boletoCost)}`);
        console.log(`Custo Salários/Auxílios (dashboardSalaryCost): ${formatCurrency(salaryCost)}`);
        console.log(`Custo Dados Entrada Personalizados (dashboardCustomEntryCost): ${formatCurrency(customEntryDataCost)}`); // Verifique se este card existe no HTML
        console.log(`Total Entradas (dashboardIncome - SOMATÓRIO DE TODOS OS DADOS DE ENTRADA): ${formatCurrency(income)}`);        console.log(`Diferença (Entradas - Saídas) (dashboardDifference): ${formatCurrency(difference)}`);
        console.log('-----------------------------');

        console.log('✅ [Dashboard] Dashboard de Dados de Saída renderizado.');
    } catch (error) {
        console.error('❌ [Dashboard] Erro ao renderizar o dashboard:', error);
        showSystemMessage('Erro ao carregar o dashboard. Verifique o console.', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

// --- Funções de Renderização dos Cards de Resumo ---
function renderSummaryCards(orders, salaries) {
    let totalPaid = 0;
    orders.forEach(order => totalPaid += parseFloat(order.paymentValue || 0));
    salaries.forEach(salary => totalPaid += parseFloat(salary.value || 0));

    const totalOrders = orders.length;
    const totalSalaries = salaries.length;
    const totalTransactions = totalOrders + totalSalaries;
    const averageTransactionValue = totalTransactions > 0 ? totalPaid / totalTransactions : 0;

    document.getElementById('dashboardTotalPaid').textContent = formatCurrency(totalPaid);
    document.getElementById('dashboardTotalTransactions').textContent = totalTransactions;
    document.getElementById('dashboardTotalOrders').textContent = totalOrders;
    document.getElementById('dashboardTotalSalaries').textContent = totalSalaries;
    document.getElementById('dashboardAverageTransactionValue').textContent = formatCurrency(averageTransactionValue);

    // Comparativo (simples: apenas mostra uma mensagem de exemplo por enquanto)
    document.getElementById('dashboardTotalPaidComparison').textContent = 'Comparativo: +5% vs. Mês Anterior (exemplo)';
}

// --- Funções de Renderização de Gráficos (Plotly.js - Esqueletos) ---
// NOTA: A implementação detalhada de cada gráfico exigiria uma análise profunda dos seus dados
// e a lógica exata de agrupamento. Abaixo estão esqueletos que você pode preencher.

function renderProcessSpendingChart(orders, salaries) {
    const dataByProcess = new Map();
    orders.forEach(order => {
        const process = order.process || 'N/A';
        dataByProcess.set(process, (dataByProcess.get(process) || 0) + parseFloat(order.paymentValue || 0));
    });
    salaries.forEach(salary => {
        const process = salary.process || 'N/A';
        dataByProcess.set(process, (dataByProcess.get(process) || 0) + parseFloat(salary.value || 0));
    });

    const labels = Array.from(dataByProcess.keys());
    const values = Array.from(dataByProcess.values());

    const data = [{
        x: values,
        y: labels,
        type: 'bar',
        orientation: 'h',
        marker: {
            color: 'rgb(49,130,189)'
        }
    }];

    const layout = {
        title: 'Distribuição de Gastos por Processo',
        xaxis: { title: 'Valor Pago (R$)' },
        yaxis: { title: 'Processo' },
        margin: {l: 150, r: 20, t: 50, b: 50} // Ajusta margem para labels longas
    };

    Plotly.newPlot('chartProcessSpending', data, layout);
}

function renderExpenseTypeDistributionChart(orders, salaries) {
    const orderValue = orders.reduce((sum, order) => sum + parseFloat(order.paymentValue || 0), 0);
    const salaryValue = salaries.reduce((sum, salary) => sum + parseFloat(salary.value || 0), 0);
    // Adicionar outros tipos de despesa se aplicável (ex: boletos de outras origens)

    const data = [{
        values: [orderValue, salaryValue],
        labels: ['Ordens de Pagamento', 'Salários/Auxílios'],
        type: 'pie',
        hoverinfo: 'label+percent+value',
        textinfo: 'percent',
        marker: {
            colors: ['rgb(255,165,0)', 'rgb(0,128,0)']
        }
    }];

    const layout = {
        title: 'Distribuição de Gastos por Tipo de Despesa'
    };

    Plotly.newPlot('chartExpenseTypeDistribution', data, layout);
}

function renderTopFavoredChart(orders, salaries) {
    const dataByFavored = new Map();
    orders.forEach(order => {
        const name = order.favoredName || 'N/A';
        dataByFavored.set(name, (dataByFavored.get(name) || 0) + parseFloat(order.paymentValue || 0));
    });
    salaries.forEach(salary => {
        const name = salary.favoredName || 'N/A';
        dataByFavored.set(name, (dataByFavored.get(name) || 0) + parseFloat(salary.value || 0));
    });

    const sortedFavored = Array.from(dataByFavored.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const labels = sortedFavored.map(item => item[0]);
    const values = sortedFavored.map(item => item[1]);

    const data = [{
        x: values,
        y: labels,
        type: 'bar',
        orientation: 'h',
        marker: {
            color: 'rgb(255,99,71)'
        }
    }];

    const layout = {
        title: 'Top 10 Favorecidos/Fornecedores Mais Pagos',
        xaxis: { title: 'Valor Pago (R$)' },
        yaxis: { title: 'Favorecido/Fornecedor' },
        margin: {l: 150, r: 20, t: 50, b: 50}
    };

    Plotly.newPlot('chartTopFavored', data, layout);
}

function renderCompanySpendingChart(orders) {
    const dataByCompany = new Map();
    orders.forEach(order => {
        const company = order.company || 'N/A';
        dataByCompany.set(company, (dataByCompany.get(company) || 0) + parseFloat(order.paymentValue || 0));
    });

    const labels = Array.from(dataByCompany.keys());
    const values = Array.from(dataByCompany.values());

    const data = [{
        values: values,
        labels: labels,
        type: 'pie',
        hoverinfo: 'label+percent+value',
        textinfo: 'percent',
        marker: {
            colors: ['#2ca02c', '#9467bd', '#ff7f0e', '#17becf', '#d62728', '#bcbd22']
        }
    }];

    const layout = {
        title: 'Gastos por Empresa'
    };

    Plotly.newPlot('chartCompanySpending', data, layout);
}

function renderDirectionSpendingChart(orders) {
    const dataByDirection = new Map();
    orders.forEach(order => {
        const direction = order.direction || 'N/A';
        dataByDirection.set(direction, (dataByDirection.get(direction) || 0) + parseFloat(order.paymentValue || 0));
    });

    const labels = Array.from(dataByDirection.keys());
    const values = Array.from(dataByDirection.values());

    const data = [{
        x: labels,
        y: values,
        type: 'bar',
        marker: {
            color: 'rgb(100,149,237)'
        }
    }];

    const layout = {
        title: 'Gastos por Direcionamento',
        xaxis: { title: 'Direcionamento' },
        yaxis: { title: 'Valor Pago (R$)' }
    };

    Plotly.newPlot('chartDirectionSpending', data, layout);
}

function renderMonthlySpendingEvolutionChart(orders, salaries) {
    const monthlyData = new Map(); // Key: YYYY-MM

    orders.forEach(order => {
        if (order.paymentCompletionDate) {
            const date = new Date(order.paymentCompletionDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + parseFloat(order.paymentValue || 0));
        }
    });
    salaries.forEach(salary => {
        if (salary.month && salary.month.match(/^\d{4}-\d{2}$/)) { // AAAA-MM
            monthlyData.set(salary.month, (monthlyData.get(salary.month) || 0) + parseFloat(salary.value || 0));
        }
    });

    const sortedMonths = Array.from(monthlyData.keys()).sort();
    const values = sortedMonths.map(month => monthlyData.get(month));

    const data = [{
        x: sortedMonths,
        y: values,
        type: 'scatter',
        mode: 'lines+markers',
        line: { shape: 'spline' },
        marker: { size: 8 }
    }];

    const layout = {
        title: 'Evolução Mensal de Gastos Totais',
        xaxis: { title: 'Mês' },
        yaxis: { title: 'Valor Pago (R$)' }
    };

    Plotly.newPlot('chartMonthlySpendingEvolution', data, layout);
}

function renderSalaryEvolutionChart(salaries) {
    const monthlySalaryData = new Map(); // Key: YYYY-MM
    salaries.forEach(salary => {
        if (salary.month && salary.month.match(/^\d{4}-\d{2}$/)) { // AAAA-MM
            monthlySalaryData.set(salary.month, (monthlySalaryData.get(salary.month) || 0) + parseFloat(salary.value || 0));
        }
    });

    const sortedMonths = Array.from(monthlySalaryData.keys()).sort();
    const values = sortedMonths.map(month => monthlySalaryData.get(month));

    const data = [{
        x: sortedMonths,
        y: values,
        type: 'scatter',
        mode: 'lines+markers',
        line: { shape: 'spline', color: 'rgb(0,128,0)' },
        marker: { size: 8, color: 'rgb(0,128,0)' }
    }];

    const layout = {
        title: 'Evolução Mensal de Gastos com Salários/Auxílios',
        xaxis: { title: 'Mês' },
        yaxis: { title: 'Valor Pago (R$)' }
    };

    Plotly.newPlot('chartSalaryEvolution', data, layout);
}

function renderPaymentStatusEvolutionChart(orders) {
    // Esta é uma ideia mais complexa, pois exige um histórico de status,
    // o que não está facilmente disponível nos dados atuais do `orders`.
    // Poderia ser um gráfico de colunas empilhadas (Pago no Prazo, Pago Atrasado)
    // Se não houver dados específicos de atraso, pode mostrar apenas o número de ordens pagas por mês.
    const monthlyPaidOrders = new Map(); // Key: YYYY-MM
    orders.forEach(order => {
        if (order.status === 'Paga' && order.paymentCompletionDate) {
            const date = new Date(order.paymentCompletionDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyPaidOrders.set(monthKey, (monthlyPaidOrders.get(monthKey) || 0) + 1);
        }
    });

    const sortedMonths = Array.from(monthlyPaidOrders.keys()).sort();
    const values = sortedMonths.map(month => monthlyPaidOrders.get(month));

    const data = [{
        x: sortedMonths,
        y: values,
        type: 'bar',
        marker: {
            color: 'rgb(0,191,255)'
        }
    }];

    const layout = {
        title: 'Número de Ordens Pagas por Mês',
        xaxis: { title: 'Mês' },
        yaxis: { title: 'Quantidade de Ordens' }
    };

    Plotly.newPlot('chartPaymentStatusEvolution', data, layout);
}


function renderSalaryTypeDistributionChart(salaries) {
    const dataByType = new Map();
    salaries.forEach(salary => {
        const type = salary.type || 'N/A';
        dataByType.set(type, (dataByType.get(type) || 0) + parseFloat(salary.value || 0));
    });

    const labels = Array.from(dataByType.keys());
    const values = Array.from(dataByType.values());

    const data = [{
        values: values,
        labels: labels,
        type: 'pie',
        hoverinfo: 'label+percent+value',
        textinfo: 'percent',
        marker: {
            colors: ['rgb(255,192,203)', 'rgb(128,0,128)']
        }
    }];

    const layout = {
        title: 'Distribuição de Salários/Auxílios por Tipo'
    };

    Plotly.newPlot('chartSalaryTypeDistribution', data, layout);
}

function renderSalaryBankDistributionChart(salaries) {
    const dataByBank = new Map();
    salaries.forEach(salary => {
        const bank = salary.bank || 'N/A';
        dataByBank.set(bank, (dataByBank.get(bank) || 0) + parseFloat(salary.value || 0));
    });

    const sortedBanks = Array.from(dataByBank.entries()).sort((a, b) => b[1] - a[1]);
    const labels = sortedBanks.map(item => item[0]);
    const values = sortedBanks.map(item => item[1]);

    const data = [{
        x: values,
        y: labels,
        type: 'bar',
        orientation: 'h',
        marker: {
            color: 'rgb(255,215,0)'
        }
    }];

    const layout = {
        title: 'Distribuição de Salários/Auxílios por Banco',
        xaxis: { title: 'Valor Pago (R$)' },
        yaxis: { title: 'Banco' },
        margin: {l: 150, r: 20, t: 50, b: 50}
    };

    Plotly.newPlot('chartSalaryBankDistribution', data, layout);
}

// =======================================================
// FIM DAS NOVAS VARIÁVEIS E FUNÇÕES PARA O DASHBOARD
// =======================================================

function populateYearFilter() {
    const yearSelect = document.getElementById('reportFilterYear');
    if (!yearSelect) return;
    
    while (yearSelect.children.length > 1) {
        yearSelect.removeChild(yearSelect.lastChild);
    }
    
    const years = new Set();
    orders.filter(order => order.status === 'Paga' && order.paymentCompletionDate)
          .forEach(order => {
              const year = criarDataLocal(order.paymentCompletionDate).getFullYear();
              years.add(year);
          });
    
    Array.from(years).sort((a, b) => b - a).forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}


const HISTORY_MAX_LENGTH = 15; // Limita o histórico a X itens mais recentes

function loadAutocompleteHistory(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
        console.error(`Erro ao carregar histórico '${key}' do localStorage:`, e);
        return [];
    }
}

function saveAutocompleteHistory(key, historyArray) {
    try {
        localStorage.setItem(key, JSON.stringify(historyArray));
    } catch (e) {
        console.error(`Erro ao salvar histórico '${key}' no localStorage:`, e);
    }
}

function addEntryToAutocompleteHistory(key, newEntry) {
    newEntry = String(newEntry).trim();
    if (!newEntry) return;

    let history = loadAutocompleteHistory(key);

    history = history.filter(entry => entry !== newEntry);
    history.unshift(newEntry);

    if (history.length > HISTORY_MAX_LENGTH) {
        history = history.slice(0, HISTORY_MAX_LENGTH);
    }

    saveAutocompleteHistory(key, history);
}

function populateAutocompleteDatalist(datalistId, historyKey) {
    const datalist = document.getElementById(datalistId);
    if (!datalist) return;

    const history = loadAutocompleteHistory(historyKey);
    datalist.innerHTML = ''; // Limpa as opções existentes

    history.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry;
        datalist.appendChild(option);
    });
}

function formatDateForDisplay(dateString) {
    if (!dateString || dateString === '' || dateString === '-' || dateString === 'N/A') {
        return 'N/A'; 
    }
    
    // YYYY-MM-DD → DD/MM/YYYY (manipulação direta de string, sem Date ou timezone)
    const ymdMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
        const day = ymdMatch[3];
        const month = ymdMatch[2];
        const year = ymdMatch[1];
        return `${day}/${month}/${year}`; // Ex: "2026-03-26" → "26/03/2026" (exato, sem atraso)
    }
    
    // DD/MM/YYYY já formatado (retorna como está)
    const dmyMatch = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (dmyMatch) {
        return dateString;
    }
    
    // Fallback para outros formatos (usar Date apenas se necessário)
    try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('pt-BR');
        }
    } catch (error) {
        console.error('Erro ao formatar data para exibição (formatDateForDisplay):', dateString, error);
    }
    
    return dateString; // Retorna original se falhar
}

function _createSinglePendingParcelRowHTML(boleto, parcela) {
    const row = document.createElement('tr');
    row.setAttribute('data-boleto-id', boleto.id); 
    row.setAttribute('data-parcel-id', parcela.id);
    const dueDateDisplay = formatDate(parcela.dueDate);
    
    const today = new Date();
    today.setHours(0,0,0,0); // Zera a hora para comparação de datas

    const dueDateObj = criarDataLocal(parcela.dueDate);
    let statusClass = '';
    let statusText = '';

    if (isNaN(dueDateObj.getTime())) {
        statusText = 'Data Inválida';
    } else {
        const diffTime = dueDateObj.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Diferença em dias

        if (diffDays < 0) {
            statusText = 'Vencido';
            row.classList.add('order-overdue'); // Adiciona classe para linha vencida
        } else if (diffDays >= 0 && diffDays <= 4) { // Vencendo hoje ou nos próximos 4 dias
            statusText = diffDays === 0 ? 'Vence Hoje!' : `Faltam ${diffDays}d`;
            row.classList.add('order-upcoming'); // Adiciona classe para linha próxima do vencimento
        } else {
            statusText = 'Pendente';
        }
    }
    
    const totalParcelsNoBoletoOriginal = boleto.parcels.length;
    const ordinais = ['PRIMEIRA', 'SEGUNDA', 'TERCEIRA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÉTIMA', 'OITAVA', 'NONA', 'DÉCIMA', 'DÉCIMA PRIMEIRA', 'DÉCIMA SEGUNDA'];
    let parcelaTexto;
    if (totalParcelsNoBoletoOriginal === 1) {
        parcelaTexto = 'ÚNICA';
    } else {
        const numeroParcelaAtual = parcela.parcelNumber;
        parcelaTexto = ordinais[numeroParcelaAtual - 1] || `${numeroParcelaAtual}ª`;
    }

    const valorFormatado = parseFloat(parcela.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // Escapar caracteres para onclick (para evitar problemas com aspas em strings)
    const safeVendor = escapeForHTML(boleto.vendor);
    const safeBoletoId = escapeForHTML(boleto.id);
    const safeParcelId = escapeForHTML(parcela.id);

    // CONTEÚDO DOS BOTÕES DE AÇÃO
    let actionButtons = `
        <button class="btn btn-info btn-small" onclick="visualizarBoleto('${safeBoletoId}')" title="Visualizar detalhes do boleto">
            🔍️ Visualizar
        </button>
        <button class="btn btn-warning btn-small" onclick="payBoletoParcel('${safeBoletoId}', '${safeParcelId}', ${parcela.parcelNumber}, ${parcela.value}, '${safeVendor}')" title="Pagar esta parcela">
            💰 Pagar
        </button>
        <button class="btn btn-info btn-small" onclick="editBoletoParcel('${safeBoletoId}', '${safeParcelId}')" title="Editar esta parcela">
            ✏️ Editar
        </button>
    `;

    // Botões de exclusão
    if (totalParcelsNoBoletoOriginal === 1) {
        actionButtons += `
            <button class="btn btn-danger btn-small" onclick="deleteBoleto('${safeBoletoId}')" title="Excluir boleto completo">
                ❌ Excluir Boleto
            </button>
        `;
    } else {
        actionButtons += `
            <button class="btn btn-danger btn-small" onclick="deleteBoletoParcel('${safeBoletoId}', '${safeParcelId}', ${parcela.parcelNumber}, '${safeVendor}')" title="Excluir apenas esta parcela">
                  ️ Excluir Parcela
            </button>
            <button class="btn btn-secondary btn-small" onclick="deleteBoleto('${safeBoletoId}')" title="Excluir boleto completo">
                ❌ Excluir Boleto
            </button>
        `;
    }

    
    row.innerHTML = `
        <td>${boleto.vendor}</td>                                  <!-- 1. Fornecedor -->
        <td>${parcelaTexto}</td>                                   <!-- 2. Parcela -->
        <td>${valorFormatado}</td>                                 <!-- 3. Valor Parcela -->
        <td>${dueDateDisplay}</td>                                 <!-- 4. Vencimento -->
        <td>${boleto.process || '-'}</td>                           <!-- 5. Processo -->
        <td>${boleto.direction || '-'}</td>                         <!-- 6. Direcionamento -->
        <td>${boleto.company || 'N/A'}</td>                         <!-- 7. Empresa -->
        <td><span class="status-badge status-${statusText.toLowerCase().replace(/[^a-z0-9]/g, '')}">${statusText}</span></td> <!-- 8. Status Pagamento -->
        <td> <!-- 9. Ações -->
            <div class="action-buttons">
                ${actionButtons}
            </div>
        </td>
    `;
    
    return row;
}

// Função para formatar o valor do mês para exibição na UI e em relatórios
function formatMonth(monthString) {
    if (!monthString) return '';
    
    // NOVO: Se é o formato "YYYY-13-P1" ou "YYYY-13-P2" (backend)
    const match13thPart = monthString.match(/^(\d{4})-13-(P[12])$/);
    if (match13thPart) {
        const year = match13thPart[1];
        const part = match13thPart[2] === 'P1' ? 'Parte 1' : 'Parte 2';
        return `13º ${year} - ${part}`;
    }

    // Se já for "13º YYYY - Parte X" (já formatado para exibição)
    if (monthString.startsWith('13º ') && monthString.includes('Parte')) {
        return monthString;
    }
    
    // Se for "13º YYYY" (formato antigo para 13º Salário genérico)
    const matchOld13thDisplay = monthString.match(/^13º (\d{4})$/);
    if (matchOld13thDisplay) {
        return monthString;
    }

    // Se for "YYYY-13" (formato antigo para 13º Salário no backend)
    const matchOld13thBackend = monthString.match(/^(\d{4})-13$/);
    if (matchOld13thBackend) {
        return `13º ${matchOld13thBackend[1]}`;
    }

    // Lógica original para YYYY-MM
    const [year, month] = monthString.split('-');
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthIndex = parseInt(month) - 1;
    if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
        return `Mês inválido ${monthString}`;
    }
    return `${monthNames[monthIndex]} ${year}`;
}
// Função auxiliar para formatar o mês especificamente para exibição em tabelas HTML
function formatMonthForTableDisplay(monthString) {
    // NOVO: Se o mês está no formato "13º YYYY - Parte X" (depois de formatMonth)
    const match13thPartDisplay = monthString.match(/^(13º \d{4}) - (Parte [12])$/);
    if (match13thPartDisplay) {
        return `${match13thPartDisplay[1].replace(' ', '<br>')}<br>${match13thPartDisplay[2]}`; // Ex: "13º<br>2026<br>Parte 1"
    }
    
    // Se o mês está no formato "13º YYYY" (genérico)
    if (monthString.startsWith('13º ')) {
        const year = monthString.substring(3).trim();
        return `13<br>${year}`; // Ex: "13<br>2026"
    }
    
    // Para outros formatos (ex: Janeiro 2024), retorne como está
    return monthString;
}

// --- FUNÇÕES DE BUSCA DE DADOS PARA RELATÓRIOS ---
// A PARTIR DAQUI, SUBSTITUA NO SEU SCRIPT.JS

// Função para buscar ordens pagas para relatórios
async function fetchPaidOrdersForReports() {
    try {
        console.log('DEBUG: fetchPaidOrdersForReports - Chamado para buscar ordens pagas para relatório.');
        const response = await fetch(`${API_BASE_URL}/get_paid_orders_for_report.php?_=${new Date().getTime()}`);
        const data = await response.json();
        if (data.success && data.data) {
            allPaidOrdersForReports = data.data.map(order => {
                try {
                    // CORREÇÃO: Verificar se payments já é um objeto ou string
                    let parsedPayments = [];
                    if (order.payments) {
                        if (typeof order.payments === 'string') {
                            // Se for string, tentar fazer parse
                            try {
                                parsedPayments = JSON.parse(order.payments);
                            } catch (parseError) {
                                console.warn(`AVISO: Erro ao parsear payments JSON para ordem ${order.id}:`, parseError);
                                parsedPayments = [];
                            }
                        } else if (Array.isArray(order.payments)) {
                            // Se já for array, usar diretamente
                            parsedPayments = order.payments;
                        } else if (typeof order.payments === 'object') {
                            // Se for objeto, converter para array
                            parsedPayments = [order.payments];
                        }
                    }
                    return {
                        ...order,
                        payments: parsedPayments
                    };
                } catch (error) {
                    console.error(`ERRO: Ao processar ordem de relatório (ID: ${order.id}):`, error, order);
                    return {
                        ...order,
                        payments: []
                    };
                }
            });
            console.log(`DEBUG: fetchPaidOrdersForReports - ${allPaidOrdersForReports.length} ordens pagas carregadas para relatório.`);
            
            // Adicione uma verificação para ordens com dados problemáticos
            const problematicOrders = allPaidOrdersForReports.filter(order => !order.process || !order.paymentCompletionDate || isNaN(criarDataLocal(order.paymentCompletionDate).getTime()));
            if (problematicOrders.length > 0) {
                console.warn(`AVISO: fetchPaidOrdersForReports - ${problematicOrders.length} ordens podem causar problemas na geração do relatório devido a 'process' ou 'paymentCompletionDate' ausentes/inválidas. Exemplos:`, problematicOrders.slice(0, 5));
            }

        } else {
            console.warn('ERRO: Ao carregar ordens pagas para relatórios: ', data.error || 'Dados inválidos ou API retornou false.');
            allPaidOrdersForReports = [];
        }
    } catch (error) {
        console.error('ERRO CRÍTICO: fetchPaidOrdersForReports - Erro na requisição:', error);
        allPaidOrdersForReports = [];
    }
}

// Função para gerar dados agregados do relatório
function generateReportData(paidOrders) {
    console.log(`DEBUG: generateReportData - Recebido ${paidOrders.length} ordens para gerar relatório.`);
    const reportMap = new Map();

    paidOrders.forEach(order => {
        if (!order.process || !order.paymentCompletionDate) {
            console.warn(`AVISO: Ordem ${order.id} (${order.favoredName}) ignorada em generateReportData: 'process' ou 'paymentCompletionDate' ausente/inválida. Processo: '${order.process}', Data: '${order.paymentCompletionDate}'`);
            return; // Ignora esta ordem se dados essenciais estiverem faltando
        }

        const date = criarDataLocal(order.paymentCompletionDate);
        if (isNaN(date.getTime())) {
            console.warn(`AVISO: Ordem ${order.id} (${order.favoredName}) ignorada em generateReportData: 'paymentCompletionDate' não é uma data válida. Data: '${order.paymentCompletionDate}'`);
            return; // Ignora esta ordem se a data for inválida
        }

        const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        const key = `${order.process}-${monthYear}`;

        if (!reportMap.has(key)) {
            reportMap.set(key, {
                process: order.process,
                monthYear: monthYear,
                count: 0,
                totalValue: 0,
                avgValue: 0
            });
        }

        const report = reportMap.get(key);
        report.count++;
        report.totalValue += parseFloat(order.paymentValue || 0);
        report.avgValue = Math.round((report.totalValue / report.count) * 100) / 100;
    });

    const finalReportData = Array.from(reportMap.values());
    console.log(`DEBUG: generateReportData - Gerado ${finalReportData.length} itens de relatório agregados.`);
    return finalReportData;
}

// Função para filtrar os dados agregados do relatório com base nos filtros da UI
function getFilteredReports(reportData) {
    console.log(`DEBUG: getFilteredReports - Recebido ${reportData.length} itens de relatório agregados para filtrar.`);
    const processFilter = document.getElementById('reportFilterProcess')?.value.toLowerCase() || '';
    const monthFilter = document.getElementById('reportFilterMonth')?.value || ''; // Formato YYYY-MM
    const yearFilter = document.getElementById('reportFilterYear')?.value || '';

    console.log(`DEBUG: getFilteredReports - Filtros aplicados: Process='${processFilter}', Mês Input='${monthFilter}', Ano Input='${yearFilter}'`);

    const filtered = reportData.filter(report => {
        const matchesProcess = !processFilter || report.process.toLowerCase().includes(processFilter);

        // O 'report.monthYear' está no formato MM/YYYY
        // O 'monthFilter' do input type="month" está no formato YYYY-MM
        let matchesMonth = true;
        if (monthFilter) {
            const [filterYear, filterMonth] = monthFilter.split('-'); // Divide YYYY-MM
            const monthFilterFormatted = `${filterMonth}/${filterYear}`; // Formata para MM/YYYY
            matchesMonth = report.monthYear === monthFilterFormatted; // Comparação exata
        }
        
        if (!canManageCustomEntryData()) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Você não tem permissão para visualizar Dados de Entrada Personalizados.</td></tr>'; // Ajustado para 6
        return;
        }
        // O 'report.monthYear' já contém o ano no formato MM/YYYY, então 'yearFilter' pode ser mais simples
        const reportYear = report.monthYear.split('/')[1]; // Extrai YYYY de MM/YYYY
        const matchesYear = !yearFilter || reportYear === yearFilter;

        const matchResult = matchesProcess && matchesMonth && matchesYear;
        // Se precisar de mais detalhes, descomente o log abaixo para ver cada item sendo filtrado
        // console.log(`DEBUG DETALHE FILTRO: Item: ${report.process} - ${report.monthYear}. Processo ok: ${matchesProcess}, Mês ok: ${matchesMonth}, Ano ok: ${matchesYear}. Resultado: ${matchResult}`);
        return matchResult;
    });
    console.log(`DEBUG: getFilteredReports - ${filtered.length} itens de relatório após filtragem.`);
    return filtered;
}

// Função principal para exibir o relatório
async function displayReports() {
    const tbody = document.getElementById('reportsTableBody');
    if (!tbody) {
        console.error('ERRO: displayReports - Elemento reportsTableBody não encontrado no DOM. Verifique o HTML.');
        return;
    }
    
    tbody.innerHTML = ''; // Limpa o corpo da tabela antes de preencher
    
    console.log('DEBUG: displayReports - Iniciando carregamento e processamento para a tabela de relatório.');
    await fetchPaidOrdersForReports(); // 1. Busca os dados brutos de ordens pagas
    console.log(`DEBUG: displayReports - allPaidOrdersForReports contém ${allPaidOrdersForReports.length} itens após fetch.`);
    
    const reportData = generateReportData(allPaidOrdersForReports); // 2. Agrega os dados em formato de relatório
    console.log(`DEBUG: displayReports - reportData contém ${reportData.length} itens após geração.`);
    
    let filteredReports = getFilteredReports(reportData); // 3. Aplica os filtros da UI
    console.log(`DEBUG: displayReports - filteredReports contém ${filteredReports.length} itens após filtragem.`);

    if (filteredReports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Nenhum dado de relatório encontrado com os filtros aplicados.</td></tr>';
        console.warn('AVISO: displayReports - Nenhum relatório para exibir na tabela.');
        return;
    }
    
    filteredReports.forEach(report => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${report.process}</td>
            <td>${report.monthYear}</td>
            <td>${report.count}</td>
            <td>R$ ${report.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td>R$ ${report.avgValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
        `;
        tbody.appendChild(row);
    });
    console.log('DEBUG: displayReports - Tabela de relatório preenchida com sucesso.');
}

async function fetchSalariesForReports(forceReload = false) { // Adiciona forceReload
    if (hasLoadedAllSalariesForReports && !forceReload) {
        console.log('⏳ [fetchSalariesForReports] Salários para relatório já carregados. Pulando recarregamento da API.');
        return; // Retorna imediatamente se já carregado
    }

    console.log('🔄 [fetchSalariesForReports] Buscando salários para relatórios...');

    try {
        const response = await fetch(`${API_BASE_URL}/get_salaries_for_report.php?_=${new Date().getTime()}`);
        const data = await response.json();
        if (data.success && data.data) {
            allSalariesForReports = data.data.map(salary => {
                salary.value = parseFloat(salary.value || 0);
                return salary;
            });
            hasLoadedAllSalariesForReports = true; // Define a flag como true em caso de sucesso
            console.log(`✅ [fetchSalariesForReports] ${allSalariesForReports.length} salários para relatório carregados.`);
            return allSalariesForReports;
        } else {
            console.warn('Nenhum dado de salário/auxílio encontrado para relatórios ou falha na API:', data.error);
            allSalariesForReports = [];
            hasLoadedAllSalariesForReports = false; // Define a flag como false em caso de erro
            return [];
        }
    } catch (error) {
        console.error('Erro ao buscar salários/auxílios para relatórios:', error);
        allSalariesForReports = [];
        hasLoadedAllSalariesForReports = false; // Define a flag como false em caso de erro
        return [];
    } finally {
        hideLoadingOverlay(); // Esconde o overlay
    }
}
// ATUALIZADA: getFilteredOrders para usar SEMPRE fullOrdersList
function getFilteredOrders() {
    console.log('⚙️ [getFilteredOrders] Aplicando filtros à FULL ORDERS LIST...');
    
    // Garante que fullOrdersList está carregada se esta função for chamada
    // Se esta função é chamada por exportação, é mais segura garantir a fullOrdersList
    if (!hasLoadedFullOrdersList) {
        console.warn('⚠️ [getFilteredOrders] fullOrdersList não carregada. Forçando carregamento...');
        // Esta chamada pode ser síncrona se não for um contexto async,
        // mas idealmente, as chamadas a getFilteredOrders deveriam vir de um contexto que já garantiu o carregamento.
        loadFullOrdersList(true); // Força o carregamento da lista completa
        // Note: Se o contexto não é async, 'loadFullOrdersList' não será 'awaited' aqui,
        // mas para fins de exportação, o usuário já esperaria um pequeno atraso.
    }


    const selectedStatuses = currentFilters.status;
    const priorityFilter = currentFilters.priority;
    const searchTerm = currentFilters.searchTerm ? currentFilters.searchTerm.toLowerCase() : ''; 
    const paymentTypeFilter = currentFilters.paymentType;
    const directionFilter = currentFilters.direction;
    const solicitantFilter = currentFilters.solicitant;
    const processFilter = currentFilters.process;
    const valueMin = parseFloat(currentFilters.valueMin) || 0;
    const valueMax = parseFloat(currentFilters.valueMax) || Infinity;
    
    const generationDateStart = currentFilters.dateStart; 
    const generationDateEnd = currentFilters.dateEnd;     

    const forecastDateStart = currentFilters.forecastDateStart; 
    const forecastDateEnd = currentFilters.forecastDateEnd;     


    const filtered = fullOrdersList.filter(order => { // Filtra a lista COMPLETA
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(order.status);
        if (!matchesStatus) return false;

        const matchesPriority = !priorityFilter || order.priority === priorityFilter;
        if (!matchesPriority) return false;

        const matchesPaymentType = !paymentTypeFilter || order.paymentType === paymentTypeFilter;
        if (!matchesPaymentType) return false;

        const matchesDirection = !directionFilter || (order.direction && order.direction.toLowerCase() === directionFilter.toLowerCase());
        if (!matchesDirection) return false;

        const matchesSolicitant = !solicitantFilter || (order.solicitant && order.solicitant.toLowerCase() === solicitantFilter.toLowerCase());
        if (!matchesSolicitant) return false;

        const matchesProcess = !processFilter || (order.process && order.process.toLowerCase().includes(processFilter.toLowerCase()));
        if (!matchesProcess) return false;

        const orderValue = parseFloat(order.paymentValue) || 0;
        const matchesValue = orderValue >= valueMin && orderValue <= valueMax;
        if (!matchesValue) return false;

        let matchesGenerationDate = true;
        if (generationDateStart || generationDateEnd) {
            const orderGenerationDate = order.generationDate; 
            if (generationDateStart && orderGenerationDate < generationDateStart) { matchesGenerationDate = false; }
            if (matchesGenerationDate && generationDateEnd && orderGenerationDate > generationDateEnd) { matchesGenerationDate = false; }
        }
        if (!matchesGenerationDate) return false;

        let matchesPaymentForecastDate = true;
        if (forecastDateStart || forecastDateEnd) {
            const orderPaymentForecast = order.paymentForecast;
            if (!orderPaymentForecast) { 
                matchesPaymentForecastDate = false; 
            } else {
                if (forecastDateStart && orderPaymentForecast < forecastDateStart) { matchesPaymentForecastDate = false; }
                if (matchesPaymentForecastDate && forecastDateEnd && orderPaymentForecast > forecastDateEnd) { matchesPaymentForecastDate = false; }
            }
        }
        if (!matchesPaymentForecastDate) return false;

        const matchesSearch = !searchTerm || 
                              (order.favoredName && order.favoredName.toLowerCase().includes(searchTerm)) ||
                              (order.process && order.process.toLowerCase().includes(searchTerm)) ||
                              (order.reference && order.reference.toLowerCase().includes(searchTerm)) ||
                              (order.observation && order.observation.toLowerCase().includes(searchTerm));
        if (!matchesSearch) return false;

        return true; 
    });
    console.log(`✅ [getFilteredOrders] ${filtered.length} ordens resultantes após filtros da lista COMPLETA.`);
    return filtered;
}
function getFilteredSalaries() {
    const typeFilter = document.getElementById('salaryFilterType')?.value || '';
    const processFilter = document.getElementById('salaryFilterProcess')?.value.toLowerCase() || '';
    const bankFilter = document.getElementById('salaryFilterBank')?.value.toLowerCase() || '';
    
    // NOVO: Leitura dos novos campos de ano e mês para o filtro
    const yearFilter = parseInt(document.getElementById('salaryFilterYearInput')?.value);
    const monthPartFilter = document.getElementById('salaryFilterMonthSelect')?.value || ''; // Ex: "01", "13-P1"

    return salaries.filter(salary => {
        const matchesType = !typeFilter || salary.type === typeFilter;
        const matchesProcess = !processFilter || (salary.process && salary.process.toLowerCase().includes(processFilter));
        const matchesBank = !bankFilter || salary.bank.toLowerCase().includes(bankFilter);

        // NOVO: Lógica de filtragem combinando ano e mês/parte do 13º
        let matchesMonthAndYear = true;
        if (!isNaN(yearFilter) || monthPartFilter) { // Se algum filtro de ano ou mês está ativo
            const { year: salaryYear, monthPart: salaryMonthPart } = extractYearAndMonthPartFromBackend(salary.month);
            
            // Compara o ano
            if (!isNaN(yearFilter) && salaryYear !== yearFilter) {
                matchesMonthAndYear = false;
            }
            // Compara o mês/parte
            if (matchesMonthAndYear && monthPartFilter && salaryMonthPart !== monthPartFilter) {
                matchesMonthAndYear = false;
            }
        }

        // Combina todas as condições de filtro
        return matchesType && matchesProcess && matchesBank && matchesMonthAndYear;
    });
}

function updateDetailedCounters() {
    // Verificar se fullOrdersList existe e é um array
    if (!fullOrdersList || !Array.isArray(fullOrdersList)) {
        console.warn('⚠️ [updateDetailedCounters] fullOrdersList não está disponível ou é inválida. Contadores detalhados não serão atualizados.');
        return;
    }

    // Filtra DIRETAMENTE do fullOrdersList (fonte de dados globais e não filtrada)
    const allPending = fullOrdersList.filter(order => order.status !== 'Paga'); // Filtra do fullOrdersList
    const totalPixPending = allPending.filter(o => o.paymentType === 'PIX');
    const totalBoletoPending = allPending.filter(o => o.paymentType === 'Boleto');
    const totalOthersPending = allPending.filter(o => o.paymentType === 'Outros');
    
    const totalPixValue = totalPixPending.reduce((sum, o) => sum + parseFloat(o.paymentValue || 0), 0);
    const totalBoletoValue = totalBoletoPending.reduce((sum, o) => sum + parseFloat(o.paymentValue || 0), 0);
    const totalOthersValue = totalOthersPending.reduce((sum, o) => sum + parseFloat(o.paymentValue || 0), 0);
    
    // Atualizar "Resumo por Tipo de Pagamento"
    const totalByTypeCard = document.querySelector('.detailed-counters .detailed-card:nth-child(1)'); 
    const totalPixPendingElem = document.getElementById('totalPixPending');
    const totalBoletoPendingElem = document.getElementById('totalBoletoPending');
    const totalOthersPendingElem = document.getElementById('totalOthersPending');

    if (totalByTypeCard && totalPixPendingElem && totalBoletoPendingElem && totalOthersPendingElem) {
        if (totalPixValue + totalBoletoValue + totalOthersValue === 0) {
            totalByTypeCard.style.display = 'none';
        } else {
            totalByTypeCard.style.display = 'block';
            totalPixPendingElem.textContent = `${totalPixPending.length} (R$ ${totalPixValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})})`;
            totalBoletoPendingElem.textContent = `${totalBoletoPending.length} (R$ ${totalBoletoValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})})`;
            totalOthersPendingElem.textContent = `${totalOthersPending.length} (R$ ${totalOthersValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})})`;
        }
    } else {
        console.warn("⚠️ [updateDetailedCounters] Elementos para 'Resumo por Tipo de Pagamento' não encontrados no DOM. Verifique o HTML.");
    }
    console.log('✅ [updateDetailedCounters] Contadores detalhados globais atualizados com base em fullOrdersList.');
}
// FUNÇÕES DE FILTRO
function applyFilters() {
    displayOrders();
}

function clearFilters() {
// Desmarca todas as opções no <select multiple> de Status
const statusSelect = document.getElementById('filterStatus');
Array.from(statusSelect.options).forEach(option => {
option.selected = false;
});


document.getElementById('filterPriority').value = '';
document.getElementById('searchTerm').value = '';
document.getElementById('filterPaymentType').value = '';
document.getElementById('filterDirection').value = '';
document.getElementById('filterSolicitant').value = '';


applyFilters();
}

function applySalaryFilters() {
    displaySalaries();
}


function clearSalaryFilters() {
    document.getElementById('salaryFilterType').value = '';
    document.getElementById('salaryFilterYearInput').value = ''; 
    document.getElementById('salaryFilterMonthSelect').value = ''; 
    document.getElementById('salaryFilterProcess').value = '';
    document.getElementById('salaryFilterBank').value = '';

    clearAllSalarySelections(); // NOVA LINHA: Limpa a seleção
    displaySalaries();
}


// ADICIONE ESTA LINHA:
const debouncedApplyPaidFilters = debounce(applyPaidFilters, 500); // Debounce para os filtros de Ordens Pagas

// APROX. LINHA 13612: function applyPaidFilters() {
// APROX. LINHA 13612: function applyPaidFilters() {
function applyPaidFilters() {
    console.log("DEBUG: [applyPaidFilters] Função applyPaidFilters() chamada.");
    
    // --- MOSTRA O LOADING OVERLAY IMEDIATAMENTE ---

    try {
        // --- EXECUTA O TRABALHO DE FILTRAGEM E RENDERIZAÇÃO ---
        // Como displayPaidOrders() e suas sub-funções são SÍNCRONAS,
        // elas bloquearão a thread principal até que terminem.
        // O loading overlay, no entanto, já foi "desenhado" pelo navegador.
        displayPaidOrders(); 
    } catch (error) {
        console.error("Erro ao aplicar filtros de Ordens Pagas:", error);
        showSystemMessage("Erro ao aplicar filtros. Verifique o console.", "error");
    } finally {
        // --- ESCONDE O LOADING OVERLAY APENAS QUANDO TODO O TRABALHO ESTIVER CONCLUÍDO ---
        // O 'finally' garante que hideLoadingOverlay() é chamado após displayPaidOrders() ter terminado,
        // independentemente de ter havido erro ou não.
        hideLoadingOverlay(); 
    }
}

function clearPaidFilters() {
    console.log("DEBUG: [clearPaidFilters] Limpando filtros de Ordens Pagas...");

    // NOVO: Limpar seleção do filtro de Processo para Ordens Pagas
    paidOrdersProcessFilterSelection = []; // Limpa a seleção interna
    document.querySelectorAll('.paid-orders-process-filter-checkbox').forEach(cb => {
        cb.checked = false; // Desmarca todos os checkboxes
        if (cb.value === '') { // Se for o checkbox "Todos os processos"
            cb.checked = true; // Garante que "Todos os processos" está marcado
        }
    });
    updatePaidOrdersProcessDisplay(); // Atualiza o display de texto para "Todos os processos"
    // FIM NOVO RESET DE PROCESSO

    // Reseta os campos de data
    document.getElementById('paidFilterStartDate').value = '';
    document.getElementById('paidFilterEndDate').value = '';
    
    // Reseta os campos de seleção (selects) para a primeira opção (value="")
    document.getElementById('paidFavoredFilter').value = '';
    document.getElementById('paidSolicitantFilter').value = '';
    // document.getElementById('paidProcessFilter').value = ''; // Esta linha não deve mais existir, pois o <select> foi removido
    document.getElementById('paidFilterCompany').value = '';
    document.getElementById('paidFilterPaymentType').value = '';
    document.getElementById('paidFilterPriority').value = '';
    
    // Reseta o campo de ordenação para o valor padrão (Data Pagamento (Mais Recente))
    document.getElementById('paidSortBy').value = 'paymentDate_desc';
    
    console.log("DEBUG: [clearPaidFilters] Filtros resetados. Chamando debouncedApplyPaidFilters().");
    debouncedApplyPaidFilters(); // Chama a função debounced para re-renderizar
}
function applyReportFilters() {
    displayReports();
}

function clearReportFilters() {
    document.getElementById('reportFilterProcess').value = '';
    document.getElementById('reportFilterMonth').value = '';
    document.getElementById('reportFilterYear').value = '';
    displayReports();
}

function applyReports2Filters() {
    displayReports2();
}

function clearReports2Filters() {
    document.getElementById('reports2FilterType').value = '';
    document.getElementById('reports2FilterProcess').value = '';
    document.getElementById('reports2FilterBank').value = '';
    document.getElementById('reports2FilterMonth').value = '';
    displayReports2();
}

// ===== VARIÁVEIS GLOBAIS PARA GERENCIAR NOTAS =====
let contadorNotasCadastradas = 0;
let entryDataIdAtual = null;
let notasTemporarias = [];
let entryDataAtual = null;

// ===== ABRIR SEÇÃO DE NOTAS =====
function abrirSecaoNotas(entryDataId, processo, empresa) {
    entryDataIdAtual = entryDataId;
    entryDataAtual = customEntryData.find(entry => entry.id === entryDataId);
    notasTemporarias = [];
    
    document.getElementById('infoProcesso').textContent = processo;
    document.getElementById('infoEmpresa').textContent = empresa;
    
    const secao = document.getElementById('secaoAdicionarNota');
    secao.style.display = 'block';
    document.getElementById('containerNotasMultiplas').style.display = 'none';
    
    limparFormularioNota();
    secao.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    console.log(`✓ Seção de notas aberta para: ${processo} - ${empresa}`);
}

// ===== FECHAR SEÇÃO DE NOTAS =====
function fecharSecaoNotas() {
    document.getElementById('secaoAdicionarNota').style.display = 'none';
    entryDataIdAtual = null;
    entryDataAtual = null;
    notasTemporarias = [];
    limparFormularioNota();
}

// ===== VALIDAR E CONVERTER VALOR MONETÁRIO =====
function validarValorMonetario(valor) {
    const limpo = valor.replace(/[^\d,.-]/g, '').trim();
    let numerico = limpo.replace(',', '.');
    numerico = parseFloat(numerico);
    return (isNaN(numerico) || numerico <= 0) ? null : numerico;
}

// ===== CADASTRAR NOTA (FUNÇÃO UNIFICADA COM MUDANÇA AUTOMÁTICA DE RÓTULO) =====
function cadastrarNota() {
    const mes = document.getElementById('mesInput').value.trim();
    const valor = document.getElementById('valorNotaInput').value.trim();
    const data = document.getElementById('dataNotaInput').value.trim();
    
    // Validar campos obrigatórios
    if (!mes || !valor || !data) {
        alert('Por favor, preencha todos os campos obrigatórios (Mês, Valor e Data).');
        return;
    }
    
    // Desformatar e validar valor
    const valorNumerico = parseFloat(valor.replace('R$', '').replace('.', '').replace(',', '.'));
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
        alert('Por favor, insira um valor válido (maior que zero).');
        return;
    }
    
    // Registrar nota no array temporário
    const novaNota = {
        mes: mes,
        valor: valorNumerico,
        data: data,
        id: `temp_${Date.now()}`
    };
    
    notasTemporarias.push(novaNota);
    console.log(`✓ Nota de ${mes} - R$ ${valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${data}`);
    
    // ✅ MUDANÇA 1: Mostrar seção de notas cadastradas na primeira adição
    if (notasTemporarias.length === 1) {
        document.getElementById('containerNotasMultiplas').style.display = 'block';
        
        // ✅ MUDANÇA 2: Alterar o rótulo do botão para "+ Adicionar Outra Nota"
        const botao = document.getElementById('btnCadastrarNota');
        botao.innerHTML = '<i class="fas fa-plus"></i> Adicionar Outra Nota';
        botao.style.transition = 'all 0.3s ease';
    }
    
    // Renderizar lista de notas
    renderizarNotasTemporarias();
    
    // ✅ MUDANÇA 3: Selecionar próximo mês automaticamente COM FEEDBACK VISUAL
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const indexAtual = meses.indexOf(mes);
    const indexProximo = (indexAtual + 1) % 12;
    
    const selectMes = document.getElementById('mesInput');
    selectMes.value = meses[indexProximo];
    
    // Feedback visual: cor de fundo suave indicando seleção automática
    selectMes.style.backgroundColor = '#e3f2fd';
    selectMes.style.transition = 'background-color 0.5s ease';
    setTimeout(() => { 
        selectMes.style.backgroundColor = ''; 
    }, 1500);
    
    console.log(`✓ Próximo mês selecionado automaticamente: ${meses[indexProximo]}`);
    
    // Limpar campos de valor e data (mês já foi atualizado)
    document.getElementById('valorNotaInput').value = '';
    document.getElementById('dataNotaInput').value = '';
    
    // Retornar foco para campo de valor para entrada rápida da próxima nota
    document.getElementById('valorNotaInput').focus();
    
    console.log(`✓ Total de notas cadastradas: ${notasTemporarias.length}`);
}

// ===== RENDERIZAR LISTA DE NOTAS CADASTRADAS =====
function renderizarNotasTemporarias() {
    const container = document.getElementById('linhasNotasAdicionais');
    container.innerHTML = ''; // Limpar lista anterior
    
    notasTemporarias.forEach((nota) => {
        const linhaDiv = document.createElement('div');
        linhaDiv.setAttribute('data-nota-id', nota.id);
        linhaDiv.style.cssText = `
            background: #f9f9f9; 
            padding: 12px 15px; 
            border-radius: 6px; 
            margin-bottom: 10px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            border-left: 4px solid #28a745;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        `;
        
        linhaDiv.innerHTML = `
            <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                <span><strong>Mês:</strong> ${nota.mes}</span>
                <span><strong>Valor:</strong> R$ ${nota.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span><strong>Data:</strong> ${nota.data}</span>
            </div>
            <button type="button" class="btn btn-danger btn-small" onclick="removerNotaTemporaria('${nota.id}')">
                <i class="fas fa-trash"></i> Remover
            </button>
        `;
        
        container.appendChild(linhaDiv);
    });
}

// ===== REMOVER NOTA TEMPORÁRIA =====
function removerNotaTemporaria(notaId) {
    notasTemporarias = notasTemporarias.filter(nota => nota.id !== notaId);
    const elemento = document.querySelector(`[data-nota-id="${notaId}"]`);
    
    if (elemento) {
        elemento.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => elemento.remove(), 300);
    }
    
    // Se não há mais notas, resetar ao estado inicial
    if (notasTemporarias.length === 0) {
        document.getElementById('containerNotasMultiplas').style.display = 'none';
        document.getElementById('linhasNotasAdicionais').innerHTML = '';
        
        // ✅ MUDANÇA 4: Resetar o rótulo do botão para "Cadastrar Nota"
        const botao = document.getElementById('btnCadastrarNota');
        botao.innerHTML = 'Cadastrar Nota';
    } else {
        renderizarNotasTemporarias();
    }
    
    console.log(`✓ Nota removida. Total restante: ${notasTemporarias.length}`);
}

// ===== LIMPAR FORMULÁRIO =====
function limparFormularioNota() {
    document.getElementById('mesInput').value = '';
    document.getElementById('valorNotaInput').value = '';
    document.getElementById('dataNotaInput').value = '';
    console.log('✓ Formulário limpo');
}

// ===== ADICIONAR OUTRA LINHA EM BRANCO =====
function adicionarLinhaEmBranco() {
    renderizarNotasTemporarias();
    console.log('✓ Nova linha em branco adicionada');
}

// ===== CONCLUIR CADASTRO DE NOTAS =====
function concluirCadastroNotas() {
    // Capturar dados da última linha em branco
    const ultimaMes = document.querySelector('.nova-nota-mes');
    const ultimaValor = document.querySelector('.nova-nota-valor');
    const ultimaData = document.querySelector('.nova-nota-data');
    
    if (ultimaMes.value && ultimaValor.value && ultimaData.value) {
        const valorNumerico = parseFloat(ultimaValor.value.replace('R$', '').replace('.', '').replace(',', '.'));
        
        if (!isNaN(valorNumerico) && valorNumerico > 0) {
            notasTemporarias.push({
                mes: ultimaMes.value,
                valor: valorNumerico,
                data: ultimaData.value
            });
        }
    }
    
    if (notasTemporarias.length === 0) {
        alert('Por favor, adicione pelo menos uma nota antes de concluir.');
        return;
    }
    
    // Aqui você pode adicionar as notas à tabela principal
    console.log('✓ Cadastro concluído. Total de notas:', notasTemporarias.length);
    console.log('Notas:', notasTemporarias);
    
    alert('Cadastro concluído com sucesso! Total de notas: ' + notasTemporarias.length);
    
    // Limpar e colapsar
    notasTemporarias = [];
    document.getElementById('secaoAdicionarNota').style.display = 'none';
    document.getElementById('iconAdicionarNota').textContent = '+';
    document.getElementById('containerNotasMultiplas').style.display = 'none';
    limparFormularioNota();
}

// ===== CANCELAR CADASTRO =====
function cancelarCadastroNotas() {
    notasTemporarias = [];
    document.getElementById('secaoAdicionarNota').style.display = 'none';
    document.getElementById('iconAdicionarNota').textContent = '+';
    document.getElementById('containerNotasMultiplas').style.display = 'none';
    limparFormularioNota();
    console.log('✓ Cadastro cancelado');
}

// ===== LIMPAR FORMULÁRIO DA NOTA =====
function limparFormularioNota() {
    document.getElementById('formAdicionarNota').reset();
    console.log('✓ Formulário de nota limpo');
}

// ===================================================================
// VALIDAÇÃO UNIFICADA DE CAMPOS OBRIGATÓRIOS — ÚNICA VERSÃO
// ===================================================================

function clearErrorStyle(fieldId) {
    const element = document.getElementById(fieldId);
    if (element) {
        element.style.borderColor = '';
        element.style.borderWidth = '';
        element.style.backgroundColor = '';
    }
}

function validateRequiredFields(fieldsToValidate) {
    const invalidFields = [];
    const caseErrorFields = [];
    
    fieldsToValidate.forEach(field => {
        const element = document.getElementById(field.id);
        if (!element) {
            console.warn(`Campo não encontrado: ${field.id}`);
            return;
        }

        let isValid = false;
        let value = element.value.trim();

        // Se o campo é um datalist (como Processo), validar contra as opções
        if (field.datalist) {
            const datalist = document.getElementById(field.datalist);
            if (datalist) {
                // ✅ SEM .toLowerCase() — validação case-sensitive exata
                const validOptions = Array.from(datalist.querySelectorAll('option'))
                    .map(opt => opt.value.trim()); // SEM toLowerCase()
                
                // Comparação EXATA: maiúsculas e minúsculas devem coincidir
                isValid = validOptions.includes(value) && value !== '';
                
                // Se falhou e não está vazio, verificar se é erro de case
                if (!isValid && value !== '') {
                    const caseInsensitiveMatch = validOptions.find(opt => 
                        opt.toLowerCase() === value.toLowerCase()
                    );
                    if (caseInsensitiveMatch) {
                        caseErrorFields.push({
                            field: field.label,
                            userValue: value,
                            correctValue: caseInsensitiveMatch,
                            fieldId: field.id
                        });
                    }
                }
            }
        } else {
            // Validação simples: apenas verificar se está preenchido
            isValid = value !== '';
        }

        // Aplicar estilos visuais — VERMELHO para inválido
        if (!isValid) {
            element.style.borderColor = '#c0392b';
            element.style.borderWidth = '2px';
            element.style.backgroundColor = '#ffe8e8';
            invalidFields.push({
                label: field.label,
                fieldId: field.id
            });
        } else {
            element.style.borderColor = '';
            element.style.borderWidth = '';
            element.style.backgroundColor = '';
        }
    });

    // Se houver campos inválidos, exibir mensagem clara
    if (invalidFields.length > 0 || caseErrorFields.length > 0) {
        let message = '';

        // Verificar se há erro específico no campo Processo
        const processError = invalidFields.find(f => 
            f.fieldId === 'process' || 
            f.fieldId === 'boletoProcess' || 
            f.fieldId === 'salaryProcess'
        );
        
        const processoCaseError = caseErrorFields.find(e => 
            e.fieldId === 'process' || 
            e.fieldId === 'boletoProcess' || 
            e.fieldId === 'salaryProcess'
        );

        // Se APENAS o campo Processo está inválido
        if (processError && invalidFields.length === 1 && caseErrorFields.length === 0) {
            message = 'Campo "Processo" é obrigatório. Selecione um processo existente no banco de dados ou solicite sua inclusão.';
            showSystemMessage(message, 'error', 5000);
            return false;
        }

        // Se há erro de case no Processo
        if (processoCaseError && invalidFields.length === 0) {
            message = `Campo "Processo" é obrigatório. Selecione um processo existente no banco de dados ou solicite sua inclusão.\n\nVocê digitou: "${processoCaseError.userValue}"\nValor correto: "${processoCaseError.correctValue}"`;
            showSystemMessage(message, 'error', 5000);
            return false;
        }

        // Se há múltiplos campos inválidos, mostrar mensagem geral
        if (invalidFields.length > 0) {
            const fieldList = invalidFields.map(f => `• ${f.label}`).join('\n');
            message += `Campos obrigatórios não preenchidos ou incorretos:\n\n${fieldList}`;
        }

        // Se há erros de case (maiúsculas/minúsculas)
        if (caseErrorFields.length > 0) {
            if (message) message += '\n\n';
            message += 'ATENÇÃO - Caracteres com maiúsculas/minúsculas incorretos:\n';
            caseErrorFields.forEach(error => {
                message += `\n• Campo "${error.field}"\n  Você digitou: "${error.userValue}"\n  Valor correto: "${error.correctValue}"`;
            });
        }

        message += '\n\nCampos marcados em vermelho devem ser corrigidos.';
        showSystemMessage(message, 'error', 6000);
        return false;
    }

    return true;
}
function setupFieldErrorListeners() {
    const fieldsWithListeners = [
        'orderType', 'favoredName', 'value', 'priority', 'process',
        'boletoVendor', 'boletoValue', 'boletoProcess',
        'salaryType', 'salaryFavoredName', 'salaryBank', 'salaryProcess'
    ];

    fieldsWithListeners.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.addEventListener('input', function() {
                if (this.style.borderColor === 'rgb(192, 57, 43)') {
                    clearErrorStyle(fieldId);
                }
            });
            element.addEventListener('change', function() {
                if (this.style.borderColor === 'rgb(192, 57, 43)') {
                    clearErrorStyle(fieldId);
                }
            });
        }
    });
}

// Inicializar ao carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFieldErrorListeners);
} else {
    setupFieldErrorListeners();
}

async function addOrder(event) { // <-- Recebe o 'event'
    event.preventDefault();

    // ✅ CHAMADA CORRETA — usa validateRequiredFields
    const isValid = validateRequiredFields([
        { id: 'orderType', label: 'Tipo de Ordem' },
        { id: 'favoredName', label: 'Favorecido' },
        { id: 'value', label: 'Valor' },
        { id: 'priority', label: 'Prioridade' },
        { id: 'process', label: 'Processo', datalist: 'processesList' }
    ]);

    if (!isValid) return; // Bloqueia antes de qualquer processamento
    
    event.preventDefault();     // <-- Agora 'event' não será undefined aqui
    console.log('✅ [DEBUG - addOrder] Função addOrder() foi chamada!'); 
    
    
    // --- 1. Exibir loading no botão imediatamente ---
    const addOrderBtn = document.getElementById('addOrderBtn');
    // Adicione uma verificação para garantir que o botão existe
    if (!addOrderBtn) {
        console.error('Botão #addOrderBtn não encontrado. Impossível prosseguir com o cadastro de ordem.');
        showModernErrorNotification('Erro interno: Botão de cadastro não encontrado.');
        return;
    }
    const originalButtonText = showButtonLoading(addOrderBtn, 'Cadastrando...'); // Exibe loading no botão
    // --- FIM 1 ---

    // 2. Verificação de Permissão Básica (MOVIDO APÓS showButtonLoading para ter feedback visual)
    if (!canAddOrder()) {
        showModernErrorNotification('Você não tem permissão para cadastrar ordens.');
        hideButtonLoading(addOrderBtn, originalButtonText); // Restaura o botão
        return;
    }
    
    // 3. Captura dos Valores dos Campos do Formulário
    const favoredName = document.getElementById('favoredName').value.trim();
    const paymentType = document.getElementById('paymentType').value;
    const paymentValue = parseFloat(document.getElementById('paymentValue').value);
    const generationDate = document.getElementById('generationDate').value;
    
    // NOVO: Captura a preferência de envio de comprovante via WhatsApp
    const sendProofToWhatsAppElement = document.querySelector('input[name="sendProofToWhatsApp"]:checked');
    const sendProofToWhatsApp = sendProofToWhatsAppElement ? sendProofToWhatsAppElement.value === 'yes' : false;
    console.log('DEBUG [addOrder]: Valor final de sendProofToWhatsApp antes de enviar para o backend:', sendProofToWhatsApp);

    // ----- NOVO CAMPO: Captura o valor da Empresa -----
    const companyElement = document.getElementById('company');
    if (!companyElement) {
        console.error('Campo #company não encontrado no DOM. Impossível prosseguir.');
        showModernErrorNotification('Erro: Campo "Empresa" não encontrado no formulário. Verifique o HTML.');
        hideButtonLoading(addOrderBtn, originalButtonText); // Restaura o botão
        return;
    }
    const company = companyElement.value;
    // ----------------------------------------------------
    
    // 4. Validações Essenciais dos Campos Principais (com restauração do botão)
    if (!favoredName) {
        showModernErrorNotification('Por favor, informe o nome do favorecido.');
        document.getElementById('favoredName').focus();
        hideButtonLoading(addOrderBtn, originalButtonText); // Restaura o botão
        return;
    }
    if (!paymentType) {
        showModernErrorNotification('Por favor, selecione o tipo de pagamento.');
        document.getElementById('paymentType').focus();
        hideButtonLoading(addOrderBtn, originalButtonText); // Restaura o botão
        return;
    }
    if (isNaN(paymentValue) || paymentValue <= 0) {
        showModernErrorNotification('Por favor, informe um valor válido para o pagamento.');
        document.getElementById('paymentValue').focus();
        hideButtonLoading(addOrderBtn, originalButtonText); // Restaura o botão
        return;
    }
    if (!generationDate) {
        showModernErrorNotification('Por favor, informe a data de geração.');
        document.getElementById('generationDate').focus();
        hideButtonLoading(addOrderBtn, originalButtonText); // Restaura o botão
        return;
    }

    // 5. Inicialização de Variáveis para Dados do Boleto
    let boletoData = null;
    let boletoFileName = null;
    let boletoMimeType = null;

    // 6. Lógica Condicional para Anexo de Boleto (com restauração do botão)
    if (paymentType === 'Boleto') {
        const boletoFileInput = document.getElementById('boletoFile');
        const boletoFile = boletoFileInput ? boletoFileInput.files[0] : null;

        if (!boletoFile) {
            showModernErrorNotification('Por favor, anexe o boleto em formato PDF.');
            hideButtonLoading(addOrderBtn, originalButtonText); // Restaura o botão
            return;
        }
        if (boletoFile.type !== 'application/pdf') {
            showModernErrorNotification('Por favor, anexe o boleto em formato PDF.');
            hideButtonLoading(addOrderBtn, originalButtonText); // Restaura o botão
            return;
        }
        
        const MAX_FILE_SIZE_MB = 10;
        if (boletoFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            showModernErrorNotification(`O arquivo do boleto é muito grande. O tamanho máximo permitido é ${MAX_FILE_SIZE_MB}MB.`);
            hideButtonLoading(addOrderBtn, originalButtonText); // Restaura o botão
            return;
        }

        try {
            await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    boletoData = e.target.result;
                    boletoFileName = boletoFile.name;
                    boletoMimeType = boletoFile.type;
                    resolve();
                };
                reader.onerror = (error) => {
                    console.error("❌ Erro na leitura do arquivo do boleto:", error);
                    reject(new Error("Erro ao carregar o arquivo do boleto. Por favor, tente novamente."));
                };
                reader.readAsDataURL(boletoFile);
            });
        } catch (error) {
            console.error("❌ Processamento do boleto interrompido devido a erro na leitura.", error);
            showModernErrorNotification(error.message);
            hideButtonLoading(addOrderBtn, originalButtonText); // Restaura o botão
            return;
        }

        if (!boletoData) { 
            showModernErrorNotification("Não foi possível carregar os dados do boleto. BoletoData está vazio.");
            hideButtonLoading(addOrderBtn, originalButtonText); // Restaura o botão
            return;
        }
    }

    // 7. Montar o objeto newOrder (usando `const` para imutabilidade inicial)
    const solicitantValue = document.getElementById('solicitant').value;
    const finalSolicitant = solicitantValue === 'Outro' ? 
                           document.getElementById('otherSolicitantName').value.trim() : 
                           solicitantValue;
    
    const selectedDirectionValue = document.getElementById('direction').value;

    const newOrder = {
        id: generateId(),
        favoredName: favoredName,
        paymentValue: paymentValue,
        paymentType: paymentType,
        priority: document.getElementById('priority').value || 'Normal',
        status: 'Pendente',
        generationDate: generationDate,
        paymentForecast: document.getElementById('paymentForecast').value || null,
        company: company, // ----- NOVO CAMPO INCLUÍDO NO OBJETO -----
        process: document.getElementById('process').value.trim() || null,
        direction: selectedDirectionValue, 
        reference: document.getElementById('reference').value.trim() || null,
        solicitant: finalSolicitant,
        otherSolicitantName: solicitantValue === 'Outro' ? document.getElementById('otherSolicitantName').value.trim() : null,
        observation: document.getElementById('observation').value.trim() || null,
        approvedByDiretoria: false,
        approvedByFinanceiro: false,
        isPaid: false,
        // Campos específicos de pagamento
        pixKeyType: paymentType === 'PIX' ? document.getElementById('pixKeyType').value : null,
        pixKey: paymentType === 'PIX' ? document.getElementById('pixKey').value.trim() : null,
        linhaDigitavel: paymentType === 'Boleto' ? document.getElementById('linhaDigitavel').value.trim() : null,
        bankDetails: paymentType === 'Outros' ? document.getElementById('bankDetails').value.trim() : null,
        payments: [],
        // Dados do boleto
        boletoData: boletoData,
        boletoFileName: boletoFileName,
        boletoMimeType: boletoMimeType,
        // === NOVO: Preferência de envio de comprovante via WhatsApp ===
        sendProofToWhatsApp: sendProofToWhatsApp
    };

    console.log('   Objeto `newOrder` final preparado para envio. Detalhes do boleto:', newOrder.boletoData ? `(${newOrder.boletoFileName}, ${ (newOrder.boletoData.length / 1024).toFixed(2) } KB)` : 'N/A');
    console.log(`✅ [addOrder] Preferência WhatsApp capturada: sendProofToWhatsApp = ${newOrder.sendProofToWhatsApp}`);


    // 8. Verificação de Duplicidade
    const newPaymentForecast = document.getElementById('paymentForecast').value || null;
    const newProcess = document.getElementById('process').value.trim() || null;
    const duplicateCheck = await checkDuplicateOrder(favoredName, paymentValue, newPaymentForecast, newProcess); 
    
    if (duplicateCheck.isDuplicate) {
        hideButtonLoading(addOrderBtn, originalButtonText); // Restaura o botão para a confirmação de duplicidade
        showDuplicateAlert(duplicateCheck.existingOrder, async (shouldContinue) => { // Callback assíncrono
            if (shouldContinue) {
                showButtonLoading(addOrderBtn, 'Cadastrando...'); // Re-exibe o loading no botão
                await proceedWithAddOrder(newOrder, addOrderBtn, originalButtonText); // Passa o botão e o texto original
            } else {
                hideButtonLoading(addOrderBtn, originalButtonText); // Garante que o botão seja restaurado se cancelar
                console.log('Cadastro de ordem duplicada cancelado pelo usuário.');
            }
        });
    } else {
        await proceedWithAddOrder(newOrder, addOrderBtn, originalButtonText); // Passa o botão e o texto original
    }
}
async function proceedWithAddOrder(orderData) {
    console.log(`[DEBUG - proceedWithAddOrder] INÍCIO para Order ID: ${orderData.id}`);
    console.log(`[DEBUG - proceedWithAddOrder] currentUser no início:`, currentUser); 
    console.log(`[DEBUG - proceedWithAddOrder] authToken no início:`, authToken);     
    
    try {
        console.log('⬆️ [proceedWithAddOrder] Enviando dados da ordem para a API:', orderData.id);
        const response = await fetch(`${API_BASE_URL}/add_order.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ [proceedWithAddOrder] Ordem sincronizada com API. Status: SUCCESS.');
            
            // --- MUDANÇA CRÍTICA: ADICIONA À fullOrdersList LOCALMENTE ---
            fullOrdersList.push(orderData); // Adiciona a nova ordem ao array local
            console.log(`✅ fullOrdersList local atualizada: Ordem ${orderData.id} adicionada.`);

            // Opcional: Recarregar salários e boletos se a adição de uma ordem PUDER afetar essas listas (raro, mas para segurança)
            // await loadSalaries();     
            // await loadBoletos();       

            // Popular datalists (eles lerão da fullOrdersList atualizada localmente)
            populateFavoredNamesDatalist();
            populateProcessesDatalist();
            populateBoletoVendorsDatalist(); // Se o processo/favorecido do boleto está ligado a ordem

            showModernSuccessNotification('Ordem cadastrada com sucesso!'); 
            
            // Chamada da função unificada para atualizar a UI
            updateUIComponentsAfterLoad();

            // Mudar para a aba 'orders' após sucesso
            const currentActiveTab = document.querySelector('.tab-content.active');
            if (currentActiveTab && currentActiveTab.id === 'addTab') { 
                 showTab('orders', null); 
                 console.log('🔄 [proceedWithAddOrder] Final: Redirecionado para a aba de Ordens (após sucesso e updates).');
            } else {
                 displayOrders(); 
                 console.log('[proceedWithAddOrder] Final: Aba de ordens atualizada.');
            }
            console.log(`[DEBUG - proceedWithAddOrder] currentUser ANTES de clearForm:`, currentUser); 
            console.log(`[DEBUG - proceedWithAddOrder] authToken ANTES de clearForm:`, authToken);     

        } else { // Caso a API retorne sucesso: false
            console.warn('⚠️ [proceedWithAddOrder] Erro ao sincronizar ordem com API. Status: FAIL. Detalhes:', data.error);
            showModernErrorNotification('Atenção: Ordem cadastrada, mas houve um erro ao sincronizar com o servidor: ' + data.error); 
            // Em caso de erro, recarregar tudo para garantir a consistência
            await loadFullOrdersList(); 
            updateUIComponentsAfterLoad();
            console.log(`[DEBUG - proceedWithAddOrder] currentUser após erro API:`, currentUser); 
            console.log(`[DEBUG - proceedWithAddOrder] authToken após erro API:`, authToken);     
        }
    } catch (error) { // Caso ocorra um erro de conexão
        console.error('❌ [proceedWithAddOrder] Erro de CONEXÃO ao enviar ordem para API:', error);
        showModernErrorNotification('Atenção: Ordem cadastrada, mas houve um erro de conexão com o servidor. Verifique sua internet.'); 
        // Em caso de erro de rede, recarregar tudo para restaurar dados do servidor
        await loadFullOrdersList();
        updateUIComponentsAfterLoad();
        console.log(`[DEBUG - proceedWithAddOrder] currentUser após erro CONEXÃO:`, currentUser); 
        console.log(`[DEBUG - proceedWithAddOrder] authToken após erro CONEXÃO:`, authToken);     
    } finally {
        // Oculta o overlay no sucesso ou falha
        hideLoadingOverlay();
    }
    
    clearForm(); // Limpa o formulário de cadastro
    console.log('   [proceedWithAddOrder] FIM do processo de adicionar ordem.');
}
// Função para mostrar alerta de duplicata (VERSÃO ATUALIZADA)
function showDuplicateAlert(existingOrder, callback) {
    const statusText = existingOrder.status === 'Paga' ? 'PAGA' : existingOrder.status || 'PENDENTE';
    const orderGenerationDate = existingOrder.generationDate ? formatDate(existingOrder.generationDate) : 'Não informada';
    const orderPaymentForecast = existingOrder.paymentForecast ? formatDate(existingOrder.paymentForecast) : 'Não informada'; // NOVO
    const orderProcess = existingOrder.process || 'Não informado'; // NOVO
    
    const message = `⚠️ ATENÇÃO: Ordem Duplicada Detectada!\n\n` +
                   `Já existe uma ordem com as mesmas características:\n` +
                   `• Favorecido: ${existingOrder.favoredName}\n` +
                   `• Valor: R$ ${parseFloat(existingOrder.paymentValue).toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n` +
                   `• Previsão: ${orderPaymentForecast}\n` + // NOVO
                   `• Processo: ${orderProcess}\n` + // NOVO
                   `\nDetalhes da Ordem Existente:\n` + // Adiciona mais contexto
                   `  Status: ${statusText}\n` +
                   `  Data Geração: ${orderGenerationDate}\n\n` +
                   `Deseja continuar com o cadastro mesmo assim?`;
    
    if (confirm(message)) {
        callback(true); // Continuar
    } else {
        callback(false); // Cancelar
    }
}

// FUNÇÕES DE FORMULÁRIO
function clearForm() {
    const form = document.getElementById('orderForm');
    if (form) {
        form.reset();
        document.getElementById('generationDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('pixFields').style.display = 'none';
        document.getElementById('boletoFields').style.display = 'none';
        document.getElementById('otherFields').style.display = 'none';
        document.getElementById('company').value = ''; // Adicione esta linha
        document.getElementById('otherSolicitantGroup').style.display = 'none';
        
        // === NOVO: Reset da preferência WhatsApp para 'Não' ===
        const sendProofNo = document.getElementById('sendProofNo');
        if (sendProofNo) {
            sendProofNo.checked = true;
        }
        // === FIM NOVO ===
    }
    const sendProofYes = document.getElementById('sendProofYes'); // Ou sendProofNo se for o padrão inicial
    if (sendProofYes) {
        sendProofYes.checked = true; // Define 'Sim' como padrão ao limpar o formulário
    }
}

function clearSalaryForm() {
    const form = document.getElementById('salaryForm');
    if (form) {
        form.reset();
    }
    // Define o ano atual como padrão e reseta o dropdown do mês
    document.getElementById('salaryYearInput').value = new Date().getFullYear();
    document.getElementById('salaryMonthSelect').value = '';
    console.log('clearSalaryForm: Formulário e campos de ano/mês resetados.');
}

function showPaymentFields() {
    const paymentType = document.getElementById('paymentType').value;
    
    document.getElementById('pixFields').style.display = 'none';
    document.getElementById('boletoFields').style.display = 'none';
    document.getElementById('otherFields').style.display = 'none';
    
    if (paymentType === 'PIX') {
        document.getElementById('pixFields').style.display = 'block';
    } else if (paymentType === 'Boleto') {
        document.getElementById('boletoFields').style.display = 'block';
    } else if (paymentType === 'Outros') {
        document.getElementById('otherFields').style.display = 'block';
    }
}

function toggleOtherSolicitant() {
    const solicitant = document.getElementById('solicitant').value;
    const otherGroup = document.getElementById('otherSolicitantGroup');
    
    if (solicitant === 'Outro') {
        otherGroup.style.display = 'block';
        document.getElementById('otherSolicitantName').required = true;
    } else {
        otherGroup.style.display = 'none';
        document.getElementById('otherSolicitantName').required = false;
        document.getElementById('otherSolicitantName').value = '';
    }
}

function viewOrder(orderId) {
    const order = fullOrdersList.find(o => String(o.id) === String(orderId)); // Garante comparação de string
    if (!order) {
        alert('Ordem não encontrada. ID: ' + (orderId || 'Vazio/Inválido'));
        console.error('ERRO: Ordem não encontrada para o ID:', orderId, 'na lista `fullOrdersList`.');
        return;
    }

    // Calcula total pago e pendente
    const totalPaidAmount = order.payments ? order.payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) : 0;
    // const pendingAmount = parseFloat(order.paymentValue || 0) - totalPaidAmount; // Não usado no HTML do modal, pode ser removido

    // --- Seção para o Boleto Anexado (se a ordem for do tipo Boleto e tiver anexo) ---
    let boletoAttachedSectionHtml = '';
    if (order.paymentType === 'Boleto' && order.boletoData && order.boletoFileName) {
        const mimeType = getMimeTypeFromBase64(order.boletoData);
        const fileSize = getFileSizeFromBase64(order.boletoData);
        boletoAttachedSectionHtml = `
            <div class="details-attachment-card">
                <h3><span class="icon-attachment"></span>Boleto Anexado</h3>
                <div class="details-attachment-info">
                    <span>📄 <span class="details-attachment-filename">${escapeForHTML(order.boletoFileName)}</span></span>
                    <span class="details-attachment-size">(${fileSize} MB)</span>
                </div>
                <div class="details-attachment-actions">
                    <button class="btn btn-view" onclick="viewFile('${escapeForHTML(order.boletoData)}', '${escapeForHTML(mimeType)}', '${escapeForHTML(order.boletoFileName)}')">Exibir Boleto</button>
                    <button class="btn btn-download" onclick="downloadFile('${escapeForHTML(order.boletoData)}', '${escapeForHTML(mimeType)}', '${escapeForHTML(order.boletoFileName)}')">Baixar Boleto</button>
                </div>
            </div>
        `;
    }

    // --- Seção para o Comprovante de Pagamento (último comprovante da ordem) ---
    let paymentProofSectionHtml = '';
    const lastPayment = order.payments && order.payments.length > 0 ? order.payments[order.payments.length - 1] : null;

    if (lastPayment && lastPayment.proofData && lastPayment.proofFileName) {
        const mimeType = getMimeTypeFromBase64(lastPayment.proofData);
        const fileSize = getFileSizeFromBase64(lastPayment.proofData);
        paymentProofSectionHtml = `
            <div class="details-attachment-card">
                <h3><span class="icon-attachment"></span>Comprovante de Pagamento</h3>
                <div class="details-attachment-info">
                    <span>📄 <span class="details-attachment-filename">${escapeForHTML(lastPayment.proofFileName)}</span></span>
                    <span class="details-attachment-size">(${fileSize} MB)</span>
                </div>
                <div class="details-attachment-actions">
                    <button class="btn btn-view" onclick="viewFile('${escapeForHTML(lastPayment.proofData)}', '${escapeForHTML(mimeType)}', '${escapeForHTML(lastPayment.proofFileName)}')">Exibir Comprovante</button>
                    <button class="btn btn-download" onclick="downloadFile('${escapeForHTML(lastPayment.proofData)}', '${escapeForHTML(mimeType)}', '${escapeForHTML(lastPayment.proofFileName)}')">Baixar Comprovante</button>
                </div>
            </div>
        `;
    } else if (order.status === 'Paga') { // Se a ordem está paga mas não tem comprovante anexado
        paymentProofSectionHtml = `
            <div class="details-attachment-card">
                <h3><span class="icon-attachment"></span>Comprovante de Pagamento</h3>
                <p>Nenhum comprovante de pagamento anexado.</p>
            </div>
        `;
    }

    // --- Tabela de histórico de pagamentos ---
    let paymentsHistoryHtml = '';
    if (order.payments && order.payments.length > 0) {
        paymentsHistoryHtml = `
            <div class="details-card-history">
                <h3><span class="icon-history"></span>Histórico de Pagamentos (${order.payments.length})</h3>
                <div style="overflow-x: auto;">
                    <table class="orders-table" style="font-size: 0.9em;">
                        <thead>
                            <tr>
                                <th>Valor</th>
                                <th>Data Pagamento</th>
                                <th>Descrição</th>
                                <th>Registrado por</th>
                                <th>Comprovante</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.payments.map((payment, index) => {
                                const paymentMimeType = getMimeTypeFromBase64(payment.proofData || '');
                                const paymentFileName = payment.proofFileName || `comprovante_${order.id}_${index+1}.pdf`;
                                return `
                                    <tr>
                                        <td>${formatCurrency(parseFloat(payment.amount || 0))}</td>
                                        <td>${formatDate(payment.date || '')}</td>
                                        <td>${escapeForHTML(payment.description || 'N/A')}</td>
                                        <td>${escapeForHTML(payment.registeredBy || 'N/A')}</td>
                                        <td>
                                            ${payment.proofData ? `
                                                <button class="btn btn-info btn-small" onclick="viewFile('${escapeForHTML(payment.proofData)}', '${escapeForHTML(paymentMimeType)}', '${escapeForHTML(paymentFileName)}')">Ver</button>
                                                <button class="btn btn-success btn-small" onclick="downloadFile('${escapeForHTML(payment.proofData)}', '${escapeForHTML(paymentMimeType)}', '${escapeForHTML(paymentFileName)}')">Baixar</button>
                                            ` : 'N/A'}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    const modalContentHtml = `
        <div class="details-modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
            <h2 class="modal-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-file-text">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Detalhes da Ordem de Pagamento
            </h2>
            <p class="order-summary-header">
                <span class="favored-name-highlight">${escapeForHTML(order.favoredName || 'N/A')}</span> |
                <span class="payment-value-highlight">${formatCurrency(parseFloat(order.paymentValue || 0))}</span>
            </p>

            <div class="details-grid">
                <div class="details-grid-item">
                    <span class="details-label">Tipo:</span>
                    <span class="details-value">${escapeForHTML(order.paymentType || 'N/A')}</span>
                </div>
                <div class="details-grid-item">
                    <span class="details-label">Status:</span>
                    <span class="details-value">${escapeForHTML(order.status || 'N/A')}</span>
                </div>

                ${order.paymentType === 'PIX' ? `
                    <div class="details-grid-item">
                        <span class="details-label">Tipo Chave PIX:</span>
                        <span class="details-value">${escapeForHTML(order.pixKeyType || 'N/A')}</span>
                    </div>
                    <div class="details-grid-item">
                        <span class="details-label">Chave PIX:</span>
                        <span class="details-value">${escapeForHTML(order.pixKey || 'N/A')}</span>
                    </div>
                ` : ''}

                ${order.paymentType === 'Boleto' ? `
                    <div class="details-grid-item">
                        <span class="details-label">Linha Digitável:</span>
                        <span class="details-value">${escapeForHTML(order.linhaDigitavel || 'N/A')}</span>
                    </div>
                ` : ''}

                ${order.paymentType === 'Outros' ? `
                    <div class="details-grid-item">
                        <span class="details-label">Detalhes Bancários:</span>
                        <span class="details-value">${escapeForHTML(order.bankDetails || 'N/A')}</span>
                    </div>
                ` : ''}

                <div class="details-grid-item">
                    <span class="details-label">Data Geração:</span>
                    <span class="details-value">${formatDate(order.generationDate || '')}</span>
                </div>
                <div class="details-grid-item">
                    <span class="details-label">Previsão Pagamento:</span>
                    <span class="details-value">${order.paymentForecast ? formatDate(order.paymentForecast) : 'N/A'}</span>
                </div>
                <div class="details-grid-item">
                    <span class="details-label">Processo:</span>
                    <span class="details-value">${escapeForHTML(order.process || 'N/A')}</span>
                </div>
                <!-- NOVO CAMPO DE VISUALIZAÇÃO: EMPRESA -->
                <div class="details-grid-item">
                    <span class="details-label">Empresa:</span>
                    <span class="details-value">${escapeForHTML(order.company || 'N/A')}</span>
                </div>
                <div class="details-grid-item">
                    <span class="details-label">Prioridade:</span>
                    <span class="details-value">${escapeForHTML(order.priority || 'N/A')}</span>
                </div>
                <div class="details-grid-item">
                    <span class="details-label">Direcionamento:</span>
                    <span class="details-value">${escapeForHTML(order.direction || 'N/A')}</span>
                </div>
                <div class="details-grid-item">
                    <span class="details-label">Solicitante:</span>
                    <span class="details-value">${escapeForHTML(order.solicitant || 'N/A')}</span>
                </div>
                ${(order.reference && String(order.reference).trim() !== '') ? `
                    <div class="details-grid-item full-width">
                        <span class="details-label">Referência:</span>
                        <span class="details-value">${escapeForHTML(order.reference)}</span>
                    </div>
                ` : ''}
                ${(order.observation && String(order.observation).trim() !== '') ? `
                    <div class="details-grid-item full-width">
                        <span class="details-label">Observação:</span>
                        <span class="details-value">${escapeForHTML(order.observation)}</span>
                    </div>
                ` : ''}
            </div>

            ${boletoAttachedSectionHtml}
            ${paymentProofSectionHtml}
            ${paymentsHistoryHtml}
        </div>
    `;

    document.getElementById('orderDetails').innerHTML = modalContentHtml;
    document.getElementById('orderModal').style.display = 'block';
}

// A função closeModal() deve ser a seguinte (se já não for):
function closeModal() {
    document.getElementById('orderModal').style.display = 'none';
    document.getElementById('orderDetails').innerHTML = ''; // Limpa o conteúdo
}
// A função closeModal() deve ser a seguinte (se já não for):
function closeModal() {
    document.getElementById('orderModal').style.display = 'none';
    document.getElementById('orderDetails').innerHTML = ''; // Limpa o conteúdo
}

function viewBoletoDetails(boletoId) {
    // Adicionar logs de depuração para entender o que está sendo passado
    console.log('DEBUG: viewBoletoDetails - Boleto ID recebido:', boletoId);
    // console.log('DEBUG: viewBoletoDetails - Conteúdo do array global boletos:', boletos); // Comente ou descomente para depurar

    // Garante comparação de string com string e que boletoId não seja vazio
    const boleto = boletos.find(b => String(b.id) === String(boletoId)); 
    if (!boleto) {
        alert('Boleto não encontrado. ID: ' + (boletoId || 'Vazio/Inválido'));
        console.error('ERRO: Boleto não encontrado para o ID:', boletoId, 'no array global `boletos`.');
        return;
    }

    let parcelsHtml = '';
    boleto.parcels.forEach(p => {
        let proofButton = '';
        if (p.isPaid && p.proofData) {
            proofButton = `<button class="btn btn-warning btn-small" onclick="downloadBoletoProof('${escapeForHTML(p.proofData)}', '${escapeForHTML(p.proofFileName || 'comprovante_boleto.pdf')}')" title="Baixar Comprovante">📄 Comprovante</button>`;
        }
        
        parcelsHtml += `
            <div style="background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 5px; border-left: 3px solid ${p.isPaid ? '#28a745' : '#ffc107'};">
                <strong>Parcela:</strong> R$ ${parseFloat(p.value || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}<br>
                <strong>Vencimento:</strong> ${formatDateForDisplay(p.dueDate || '')}<br> <!-- ✅ Corrigido: sem atraso -->
                <strong>Status:</strong> ${p.isPaid ? 'Paga' : 'Pendente'}<br>
                ${p.isPaid && p.paidAt ? `<strong>Data Pagamento:</strong> ${formatDateForDisplay(p.paidAt?.split('T')[0] || '')}<br>` : ''} <!-- ✅ Corrigido -->
                ${(p.paymentObservation && String(p.paymentObservation).trim() !== '') ? `<strong>Observação Pagamento:</strong> ${escapeForHTML(p.paymentObservation)}<br>` : ''}
                ${p.isPaid && p.paymentOrderId ? `<strong>Ordem Pagamento ID:</strong> ${escapeForHTML(p.paymentOrderId)} <button class="btn btn-info btn-small" onclick="viewOrder('${escapeForHTML(p.paymentOrderId)}')">Ver Ordem</button><br>` : ''}
                ${proofButton ? `<div style="margin-top: 8px;">${proofButton}</div>` : ''}
            </div>
        `;
    });
    
    let anexoSectionHtml = ''; // ✅ Garantido: inicializado como string vazia
    const temArquivo = boleto.hasFile || boleto.file_name || boleto.file_original_name || boleto.boletoFileName;

    if (temArquivo) {
        const nomeOriginal = boleto.file_original_name || boleto.boletoFileName || 'boleto.pdf';
        const tamanhoArquivo = boleto.file_size || boleto.boletoFileSize || 'Tamanho não disponível';
        anexoSectionHtml = `
            <div class="boleto-anexo-section boleto-anexo-disponivel" style="margin-top: 20px; padding: 15px; border-radius: 8px; background: #f0f8ff; border: 1px solid #cceeff;">
                <h3 style="color: #1976d2;">📎 Boleto Anexado</h3>
                <p><b>Nome do Arquivo:</b> ${escapeForHTML(nomeOriginal)}</p>
                <p><b>Tamanho:</b> ${escapeForHTML(tamanhoArquivo)}</p>
                <div class="anexo-actions" style="margin-top: 10px; display: flex; gap: 10px;">
                    <button class="btn btn-info btn-small" onclick="abrirAnexoBoleto('${escapeForHTML(boleto.id)}')" title="Exibir boleto em nova aba">
                        <i class="fas fa-eye"></i> Exibir Boleto
                    </button>
                    <button class="btn btn-success btn-small" onclick="baixarAnexoBoleto('${escapeForHTML(boleto.id)}')" title="Baixar boleto">
                        <i class="fas fa-download"></i> Baixar Boleto
                    </button>
                </div>
            </div>
        `;
    } else {
        anexoSectionHtml = `
            <div class="boleto-anexo-section boleto-anexo-indisponivel" style="margin-top: 20px; padding: 15px; border-radius: 8px; background: #fff3cd; border: 1px solid #ffeeba;">
                <h3 style="color: #856404;">⚠️ Boleto não anexado</h3>
                <p style="margin: 0; color: #666;">Nenhum arquivo de boleto foi anexado a este registro.</p>
            </div>
        `;
    }

    const detailsHtml = `
        <h2>📋 Detalhes do Boleto</h2>
        <div class="form-row">
            <div><strong>Fornecedor:</strong> ${escapeForHTML(boleto.vendor || 'N/A')}</div>
            <div><strong>Processo:</strong> ${escapeForHTML(boleto.process || 'N/A')}</div>
            <div><strong>Direcionamento:</strong> ${escapeForHTML(boleto.direction || 'N/A')}</div>
            <div><strong>Valor Total:</strong> R$ ${parseFloat(boleto.totalValue || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
        </div>
        <div class="form-row">
            <div><strong>Data Geração:</strong> ${formatDateForDisplay(boleto.generationDate || '')}</div> <!-- ✅ Corrigido -->
            <div><strong>Primeiro Vencimento:</strong> ${formatDateForDisplay(boleto.firstDueDate || '')}</div> <!-- ✅ Corrigido -->
        </div>
        ${(boleto.observation && String(boleto.observation).trim() !== '') ? `<div><strong>Observação:</strong> ${escapeForHTML(boleto.observation)}</div>` : ''}
        ${anexoSectionHtml}
        <h3>📦 Parcelas:</h3>
        ${parcelsHtml}
    `;
    
    // Remove qualquer modal de visualização de boleto anterior
    const existingBoletoModal = document.getElementById('visualizarBoletoModal');
    if (existingBoletoModal) {
        existingBoletoModal.remove();
    }

    // CRÍTICO: Cria o modal dinamicamente e o exibe
    const boletoModal = document.createElement('div');
    boletoModal.id = 'visualizarBoletoModal';
    boletoModal.className = 'modal';
    boletoModal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="fecharVisualizacaoBoleto()">&times;</span>
            ${detailsHtml}
        </div>
    `;
    document.body.appendChild(boletoModal);
    boletoModal.style.display = 'block'; // Torna o modal visível
}
// Também certifique-se que a função fecharVisualizacaoBoleto exista e esteja correta:
function fecharVisualizacaoBoleto() {
    const modal = document.getElementById('visualizarBoletoModal');
    if (modal) {
        modal.remove();
    }
}    
function closeModal() {
    document.getElementById('orderModal').style.display = 'none';
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
    currentOrderId = null; 
    
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm && typeof paymentForm.reset === 'function') {
        paymentForm.reset();
    }
    
    const proofFileInput = document.getElementById('proofOfPayment');
    if (proofFileInput) {
        proofFileInput.value = ''; 
    }

    const partialInfo = document.getElementById('partialPaymentInfo');
    if (partialInfo) partialInfo.innerHTML = '';

    // NOVO: Garantir que o botão de pagamento é reativado ao fechar o modal
    const payButton = document.getElementById('registerPaymentBtn');
    if (payButton) {
        payButton.disabled = false;
        payButton.innerHTML = 'Registrar Pagamento'; // Resetar texto original
    }
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    editingOrderId = null;
}

function closeEditSalaryModal() {
    document.getElementById('editSalaryModal').style.display = 'none';
    editingSalaryId = null;
    clearAllSalarySelections(); // NOVA LINHA: Limpa a seleção
}

async function deleteOrder(orderId) {
    // 1. Encontra a ordem na lista completa para exibir os detalhes na confirmação
    const orderToDelete = fullOrdersList.find(o => o.id === orderId);
    if (!orderToDelete) {
        showModernErrorNotification('Ordem não encontrada. Pode já ter sido excluída ou não carregada corretamente.');
        return;
    }

    const confirmMessage = `Tem certeza que deseja EXCLUIR a ordem de pagamento para "${orderToDelete.favoredName}" (Valor: R\$ ${parseFloat(orderToDelete.paymentValue).toLocaleString('pt-BR', {minimumFractionDigits: 2})})?\n\nEsta ação não pode ser desfeita.`;
    if (!confirm(confirmMessage)) {
        console.log('Exclusão de ordem cancelada pelo usuário.');
        return;
    }

    // --- REMOÇÃO OTIMISTA DA UI: Feita imediatamente para feedback rápido ---
    const possibleTableBodies = ['ordersTableBody', 'diretoriaTableBody', 'financeiroTableBody', 'pendingTableBody', 'paidOrdersTableBody'];
    possibleTableBodies.forEach(tbodyId => {
        const tbody = document.getElementById(tbodyId);
        if (tbody) {
            const row = tbody.querySelector(`tr[data-order-id="${orderId}"]`);
            if (row) {
                row.style.opacity = '0'; // Adiciona uma pequena animação de fade-out
                row.style.transition = 'opacity 0.3s ease-out';
                setTimeout(() => row.remove(), 300); // Remove após a animação
                console.log(`✅ UI: Ordem ${orderId} removida otimisticamente do display (${tbodyId}).`);
            }
        }
    });

    try {
        // 2. Envia a requisição de exclusão para o servidor
        const response = await fetch(`${API_BASE_URL}/delete_order.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: orderId })
        });
        const data = await response.json();

        if (data.success) {
            showModernSuccessNotification('Ordem excluída com sucesso!');
            
            // --- MUDANÇA CRÍTICA: ATUALIZA A fullOrdersList LOCALMENTE ---
            const index = fullOrdersList.findIndex(o => o.id === orderId);
            if (index !== -1) {
                fullOrdersList.splice(index, 1); // Remove o item do array local
                console.log(`✅ fullOrdersList local atualizada: Ordem ${orderId} removida.`);
            } else {
                console.warn(`⚠️ fullOrdersList local: Ordem ${orderId} não encontrada para remoção local.`);
            }
            // --- FIM DA MUDANÇA (REMOVE loadFullOrdersList() daqui) ---

            // 4. Limpeza de agendamentos do WhatsApp (se a ordem era de emergência)
            if (typeof window.whatsappScheduler !== 'undefined') {
                window.whatsappScheduler.cleanupEmergencyNotifications(orderId);
            }
            // Chama a função unificada de atualização de UI para redesenhar o que for necessário
            updateUIComponentsAfterLoad();

        } else {
            console.warn('Erro ao sincronizar exclusão com API:', data.error);
            showModernErrorNotification('Atenção: Houve um erro ao sincronizar a exclusão com o servidor: ' + data.error);
            // Em caso de erro do servidor, recarregar tudo para garantir a consistência
            await loadFullOrdersList(); // Re-sync frontend with backend
            updateUIComponentsAfterLoad(); // Redesenha com os dados corretos do backend
        }
    } catch (error) {
        console.error('Erro de conexão ao excluir ordem:', error);
        showModernErrorNotification('Atenção: Erro de conexão ao tentar excluir a ordem. Verifique sua internet.');
        // Em caso de erro de rede, recarregar tudo para restaurar dados do servidor
        await loadFullOrdersList(); // Re-sync frontend with backend
        updateUIComponentsAfterLoad(); // Redesenha com os dados corretos do backend
    } finally {
        hideLoadingOverlay(); // Esconde o overlay de carregamento
    }
}

async function editOrder(orderId) {
    console.log(`[DEBUG editOrder] Chamada para editar ORDEM com ID: ${orderId}`);
    
    const order = fullOrdersList.find(o => String(o.id) === String(orderId));
    if (!order) {
        alert('Ordem não encontrada.');
        return;
    }
    
    // Verificar permissão passando o objeto order
    if (!canEditOrder(order)) {
        alert('Você não tem permissão para editar esta ordem.');
        return;
    }
    
    editingOrderId = orderId;
    
    // --- NOVO CÓDIGO AQUI: Captura a aba ativa ---
    const currentActiveTabButton = document.querySelector('.tab-button.active');
    if (currentActiveTabButton) {
        const onclickAttr = currentActiveTabButton.getAttribute('onclick');
        const match = onclickAttr.match(/showTab\('(.*?)'/);
        if (match && match[1]) {
            lastActiveTabBeforeEdit = match[1]; // Armazena o nome da aba
            console.log(`[DEBUG editOrder] Aba ativa original capturada: ${lastActiveTabBeforeEdit}`);
        }
    } else {
        lastActiveTabBeforeEdit = 'orders'; // Fallback se não conseguir detectar
        console.warn(`[DEBUG editOrder] Não foi possível capturar a aba ativa. Usando fallback: ${lastActiveTabBeforeEdit}`);
    }
    
    // CRÍTICO: Escapar HTML para evitar problemas com aspas e caracteres especiais nos valores
    // do formulário de edição. Isso já está implementado em algumas partes, mas é bom garantir.
    const escapedFavoredName = escapeForHTML(order.favoredName || '');
    const escapedPaymentValue = escapeForHTML(order.paymentValue || '');
    const escapedPixKey = escapeForHTML(order.pixKey || '');
    const escapedLinhaDigitavel = escapeForHTML(order.linhaDigitavel || '');
    const escapedBankDetails = escapeForHTML(order.bankDetails || '');
    const escapedProcess = escapeForHTML(order.process || '');
    const escapedReference = escapeForHTML(order.reference || '');
    const escapedObservation = escapeForHTML(order.observation || '');
    const escapedCompany = escapeForHTML(order.company || ''); // Escapar o valor da empresa

    const editFormHtml = `
        <form id="editOrderForm">
            <div class="form-row">
                <div class="form-group">
                    <label for="editFavoredName">Nome do Favorecido <span class="required">*</span></label>
                    <input type="text" id="editFavoredName" value="${escapedFavoredName}" required>
                </div>
                <div class="form-group">
                    <label for="editPriority">Prioridade</label>
                    <select id="editPriority">
                        <option value="Normal" ${order.priority === 'Normal' ? 'selected' : ''}>Normal</option>
                        <option value="Urgencia" ${order.priority === 'Urgencia' ? 'selected' : ''}>Urgência</option>
                        <option value="Emergencia" ${order.priority === 'Emergencia' ? 'selected' : ''}>Emergência</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="editPaymentValue">Valor do Pagamento <span class="required">*</span></label>
                    <input type="number" id="editPaymentValue" step="0.01" value="${escapedPaymentValue}" required>
                </div>
                <div class="form-group">
                    <label for="editPaymentType">Tipo de Pagamento <span class="required">*</span></label>
                    <select id="editPaymentType" onchange="toggleEditPaymentFields()" required>
                        <option value="">Selecione...</option>
                        <option value="PIX" ${order.paymentType === 'PIX' ? 'selected' : ''}>PIX</option>
                        <option value="Boleto" ${order.paymentType === 'Boleto' ? 'selected' : ''}>Boleto</option>
                        <option value="Outros" ${order.paymentType === 'Outros' ? 'selected' : ''}>Outros</option>
                    </select>
                </div>
            </div>
            
            <!-- Campos específicos PIX -->
            <div id="editPixFields" style="display: ${order.paymentType === 'PIX' ? 'block' : 'none'};">
                <div class="form-row">
                    <div class="form-group">
                        <label for="editPixKeyType">Tipo de Chave PIX</label>
                        <select id="editPixKeyType">
                            <option value="">Selecione...</option>
                            <option value="CPF" ${order.pixKeyType === 'CPF' ? 'selected' : ''}>CPF</option>
                            <option value="CNPJ" ${order.pixKeyType === 'CNPJ' ? 'selected' : ''}>CNPJ</option>
                            <option value="Email" ${order.pixKeyType === 'Email' ? 'selected' : ''}>Email</option>
                            <option value="Telefone" ${order.pixKeyType === 'Telefone' ? 'selected' : ''}>Telefone</option>
                            <option value="Chave Aleatória" ${order.pixKeyType === 'Chave Aleatória' ? 'selected' : ''}>Chave Aleatória</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editPixKey">Chave PIX</label>
                        <input type="text" id="editPixKey" value="${escapedPixKey}">
                    </div>
                </div>
            </div>
            
            <!-- Campos específicos Boleto -->
            <div id="editBoletoFields" style="display: ${order.paymentType === 'Boleto' ? 'block' : 'none'};">
                <div class="form-row">
                    <div class="form-group">
                        <label for="editLinhaDigitavel">Linha Digitavel</label>
                        <input type="text" id="editLinhaDigitavel" value="${escapedLinhaDigitavel}">
                    </div>
                </div>
            </div>
            
            <!-- Campos específicos Outros -->
            <div id="editBankFields" style="display: ${order.paymentType === 'Outros' ? 'block' : 'none'};">
                <div class="form-row">
                    <div class="form-group">
                        <label for="editBankDetails">Detalhes Bancários</label>
                        <textarea id="editBankDetails" rows="3">${escapedBankDetails}</textarea>
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="editPaymentForecast">Previsão de Pagamento</label>
                    <input type="date" id="editPaymentForecast" value="${formatarDataParaInput(order.paymentForecast || '')}">
                </div>
                <!-- NOVO CAMPO DE EDIÇÃO: EMPRESA -->
                <div class="form-group">
                    <label for="editCompany">Empresa</label>
                    ${(() => {
                        const companyNames = new Set();
                        const fixedCompanies = ["Facilita Serviços", "T Santana", "Maia Silva", "DDSJ"];
                        fixedCompanies.forEach(company => companyNames.add(company));
                        if (Array.isArray(fullOrdersList)) {
                            fullOrdersList.forEach(order => {
                                if (order.company && typeof order.company === 'string' && order.company.trim() !== '') {
                                    companyNames.add(order.company.trim());
                                }
                            });
                        }
                        const sortedCompanies = Array.from(companyNames).sort();
                        let selectHtml = `<select id="editCompany" name="editCompany" class="form-control">`;
                        selectHtml += `<option value="">Selecione uma empresa...</option>`;
                        sortedCompanies.forEach(company => {
                            const selected = company === (order.company || '') ? 'selected' : '';
                            const escapedOption = escapeForHTML(company);
                            selectHtml += `<option value="${escapedOption}" ${selected}>${escapedOption}</option>`;
                        });
                        if (order.company && !sortedCompanies.includes(order.company)) {
                            const escapedOrderCompany = escapeForHTML(order.company);
                            selectHtml += `<option value="${escapedOrderCompany}" selected>${escapedOrderCompany}</option>`;
                        }
                        selectHtml += `</select>`;
                        return selectHtml;
                    })()}
                </div>
                <div class="form-group">
                    <label for="editProcess">Processo</label>
                    <input type="text" id="editProcess" value="${escapedProcess}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="editDirection">Direcionamento</label>
                    <select id="editDirection">
                        <option value="" ${order.direction === '' || !order.direction ? 'selected' : ''}>Selecione...</option>
                        <option value="Marina" ${order.direction === 'Marina' ? 'selected' : ''}>Marina</option>
                        <option value="Lucas" ${order.direction === 'Lucas' ? 'selected' : ''}>Lucas</option>
                        <option value="Gabriel" ${order.direction === 'Gabriel' ? 'selected' : ''}>Gabriel</option>
                        <option value="Lotérica" ${order.direction === 'Lotérica' ? 'selected' : ''}>Lotérica</option>
                        <option value="Tiago" ${order.direction === 'Tiago' ? 'selected' : ''}>Tiago</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editSolicitant">Solicitante</label>
                    <select id="editSolicitant">
                        <option value="" ${order.solicitant === '' || !order.solicitant ? 'selected' : ''}>Selecione...</option>
                        <option value="Djael Jr" ${order.solicitant === 'Djael Jr' ? 'selected' : ''}>Djael Jr</option>
                        <option value="Rafael Sagrilo" ${order.solicitant === 'Rafael Sagrilo' ? 'selected' : ''}>Rafael Sagrilo</option>
                        <option value="Lucas Silva" ${order.solicitant === 'Lucas Silva' ? 'selected' : ''}>Lucas Silva</option>
                        <option value="Verônica Barbosa" ${order.solicitant === 'Verônica Barbosa' ? 'selected' : ''}>Verônica Barbosa</option>
                        <option value="Rafael Sayd" ${order.solicitant === 'Rafael Sayd' ? 'selected' : ''}>Rafael Sayd</option>
                        <option value="Maurício Sena" ${order.solicitant === 'Maurício Sena' ? 'selected' : ''}>Maurício Sena</option>
                        <option value="Outro" ${order.solicitant === 'Outro' ? 'selected' : ''}>Outro</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="editReference">Referência</label>
                    <textarea id="editReference" rows="3">${escapedReference}</textarea>
                </div>
                <div class="form-group">
                    <label for="editObservation">Observação</label>
                    <textarea id="editObservation" rows="3">${escapedObservation}</textarea>
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-success" onclick="saveEditOrder()">Salvar Alterações</button>
                <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancelar</button>
            </div>
        </form>
    `;
    
    document.getElementById('editForm').innerHTML = editFormHtml;
    document.getElementById('editModal').style.display = 'block';

}

// FUNÇÃO PARA FECHAR MODAL DE COMPROVANTE
function closePaymentProofModal() {
    const modal = document.getElementById('paymentProofModal');
    if (modal) {
        modal.remove();
    }
}

// NOVO: Função auxiliar para encontrar uma ordem por ID de forma consistente
function findOrderById(orderId) {
    const order = fullOrdersList.find(o => String(o.id) === String(orderId));
    if (!order) {
        console.error(`Ordem com ID ${orderId} não encontrada em fullOrdersList.`);
        showModernErrorNotification('Ordem não encontrada na lista. Recarregue a página se o problema persistir.');
        return null;
    }
    return order;
}

function toggleEditPaymentFields() {
    const paymentType = document.getElementById('editPaymentType').value;
    const pixFields = document.getElementById('editPixFields');
    const boletoFields = document.getElementById('editBoletoFields');
    const bankFields = document.getElementById('editBankFields');
    
    // Ocultar todos os campos específicos
    if (pixFields) pixFields.style.display = 'none';
    if (boletoFields) boletoFields.style.display = 'none';
    if (bankFields) bankFields.style.display = 'none';
    
    // Mostrar campos específicos baseado no tipo selecionado
    if (paymentType === 'PIX' && pixFields) {
        pixFields.style.display = 'block';
    } else if (paymentType === 'Boleto' && boletoFields) {
        boletoFields.style.display = 'block';
    } else if (paymentType === 'Outros' && bankFields) {
        bankFields.style.display = 'block';
    }
}

// Localização: Sua função async function saveEditOrder()
async function saveEditOrder() {
    if (!editingOrderId) return;

    const order = fullOrdersList.find(o => String(o.id) === String(editingOrderId));
    if (!order) {
        showModernErrorNotification('Ordem não encontrada.');
        return;
    }
    
    // 1. Captura todos os valores dos campos do modal de edição
    const favoredName = document.getElementById('editFavoredName').value.trim();
    const paymentValue = parseFloat(document.getElementById('editPaymentValue').value);
    const paymentType = document.getElementById('editPaymentType').value;
    const priority = document.getElementById('editPriority').value;
    const paymentForecast = document.getElementById('editPaymentForecast').value || null;
    const company = document.getElementById('editCompany').value;
    const process = document.getElementById('editProcess').value.trim() || null;
    const direction = document.getElementById('editDirection').value || null;
    const solicitant = document.getElementById('editSolicitant').value || null;
    const reference = document.getElementById('editReference').value.trim() || null;
    const observation = document.getElementById('editObservation').value.trim() || null;

    // 2. Validações básicas (mantidas)
    if (!favoredName) {
        showModernErrorNotification('Por favor, informe o nome do favorecido.');
        return;
    }
    if (isNaN(paymentValue) || paymentValue <= 0) {
        showModernErrorNotification('Por favor, informe um valor válido para o pagamento.');
        return;
    }
    if (!paymentType) {
        showModernErrorNotification('Por favor, selecione o tipo de pagamento.');
        return;
    }
    
    // 3. Objeto que conterá os campos atualizados
    const updatedFields = {
        favoredName: favoredName,
        paymentValue: paymentValue,
        paymentType: paymentType,
        priority: priority,
        paymentForecast: paymentForecast,
        company: company,
        process: process,
        direction: direction,
        solicitant: solicitant,
        reference: reference,
        observation: observation,
        pixKeyType: null,
        pixKey: null,
        linhaDigitavel: null,
        bankDetails: null
    };

    // 4. Lógica condicional para capturar e preencher campos específicos do tipo de pagamento
    if (paymentType === 'PIX') {
        updatedFields.pixKeyType = document.getElementById('editPixKeyType').value || null;
        updatedFields.pixKey = document.getElementById('editPixKey').value.trim() || null;
    } else if (paymentType === 'Boleto') {
        updatedFields.linhaDigitavel = document.getElementById('editLinhaDigitavel').value.trim() || null;
    } else if (paymentType === 'Outros') {
        updatedFields.bankDetails = document.getElementById('editBankDetails').value.trim() || null;
    }
    
    // Salva uma cópia do estado original para rollback em caso de erro da API
    const originalOrderState = { ...order }; 
    const originalOrderPayments = JSON.parse(JSON.stringify(order.payments)); // Cópia profunda dos pagamentos

    // --- INÍCIO DA ATUALIZAÇÃO OTTIMISTA E INSTANTÂNEA DA UI ---
    Object.assign(order, updatedFields); 
    
    const rowElement = document.getElementById(`order-${editingOrderId}`);
    let rowContext = 'general'; // Default para 'general'
    if (rowElement) { // Só tenta determinar o contexto se a linha existe
        const activeTabButton = document.querySelector('.tab-button.active');
        const activeTabName = activeTabButton ? activeTabButton.dataset.tabName : 'orders';
        if (activeTabName === 'diretoria') rowContext = 'diretoria';
        else if (activeTabName === 'financeiro') rowContext = 'financeiro';
        else if (activeTabName === 'pending') rowContext = 'pending';
        // Para 'paid', o contexto pode ser 'paid', mas editOrder não é o fluxo principal de lá
    }
    
    if (rowElement) {
        const newRow = createOrderRow(order, rowContext);
        rowElement.replaceWith(newRow); 

        console.log(`✅ UI: Ordem ${editingOrderId} atualizada e destacada visualmente no DOM.`);
    } else {
        console.warn(`⚠️ UI: Linha da ordem ${editingOrderId} não encontrada para atualização otimista.`);
    }
    // --- FIM DA ATUALIZAÇÃO OTTIMISTA E INSTANTÂNEA DA UI ---

    let editSuccess = false; 
    let data = null; // <--- DECLARADO AQUI, NO ESCOPO MAIS ALTO DA FUNÇÃO

    try {
        console.log('Enviando edição para API...');
        const response = await fetch(`${API_BASE_URL}/update_order.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: editingOrderId,
                ...updatedFields 
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text(); // Lê a resposta como texto para debug
            console.error(`❌ Erro HTTP na API para Order ID: ${editingOrderId}: Status ${response.status}, Texto: ${errorText}`);
            showModernErrorNotification(`Erro na comunicação com o servidor (Status: ${response.status}). Verifique o console para mais detalhes.`);
            
            // Força o rollback e recarregamento para consistência
            Object.assign(order, originalOrderState);
            order.payments = originalOrderPayments;
            if (rowElement) {
                const revertedRow = createOrderRow(order, rowContext);
                rowElement.replaceWith(revertedRow);
                console.log(`❌ UI: Ordem ${editingOrderId} revertida para o estado original no DOM.`);
            }
            await loadFullOrdersList(true); 
            updateUIComponentsAfterLoad(); 
            return; // Sai da função após lidar com o erro HTTP
        }
        // --- FIM NOVO ---

        // Se a resposta HTTP foi OK, tenta parsear como JSON
        data = await response.json(); // Atribui à variável 'data' declarada no escopo superior

        if (data.success) { 
            console.log('Edição sincronizada com API. Atualizando UI localmente...');
            editSuccess = true;
            showModernSuccessNotification('Ordem atualizada com sucesso!');
            highlightEditedOrderId = `order-${editingOrderId}`; // <--- Esta é a linha 11687
            console.log('DEBUG Destaque: highlightEditedOrderId definido como:', highlightEditedOrderId); // <-- ADICIONE ESTA LINHA

            updateUIComponentsAfterLoad(); 
        } else {
            console.warn('Erro ao sincronizar edição com API:', data.error);
            showModernErrorNotification('Atenção: Houve um erro ao salvar no servidor: ' + (data.error || 'Erro desconhecido. Os dados podem não estar atualizados no sistema.'));
            
            // --- ROLLBACK ---
            Object.assign(order, originalOrderState); 
            order.payments = originalOrderPayments; 
            if (rowElement) {
                const revertedRow = createOrderRow(order, rowContext);
                rowElement.replaceWith(revertedRow);
                console.log(`❌ UI: Ordem ${editingOrderId} revertida para o estado original no DOM.`);
            }
            await loadFullOrdersList(true); 
            updateUIComponentsAfterLoad(); 
        }
    } catch (error) { // Erro de rede ou erro no parse do JSON
        console.error('Erro de conexão ou JSON parsing:', error); 
        showModernErrorNotification('Atenção: Erro de conexão ou dados inválidos do servidor. Verifique sua internet e o console.');
        
        // --- ROLLBACK ---
        Object.assign(order, originalOrderState); 
        order.payments = originalOrderPayments; 
        if (rowElement) {
            const revertedRow = createOrderRow(order, rowContext);
            rowElement.replaceWith(revertedRow);
            console.log(`❌ UI: Ordem ${editingOrderId} revertida para o estado original no DOM devido a erro de conexão.`);
        }
        await loadFullOrdersList(true); 
        updateUIComponentsAfterLoad(); 
    } finally {
        closeEditModal();
        hideLoadingOverlay(); // Garante que qualquer overlay ativo seja ocultado
        console.log('Processo de salvar edição de ordem concluído.');
    }
}

async function approveOrderDiretoria(orderId) {
    if (!canApproveDiretoria()) {
        alert('Você não tem permissão para aprovar pela Diretoria.');
        return;
    }
    
    const order = fullOrdersList.find(o => o.id === orderId); // Busca na lista completa
    if (!order) {
        alert('Ordem não encontrada.');
        return;
    }
    
    if (!confirm(`Aprovar ordem do favorecido "${order.favoredName}" pela Diretoria?`)) {
        return;
    }
    
    // Atualiza localmente o status da ordem (para resposta visual imediata)
    order.approvedByDiretoria = true;
    order.status = 'Aguardando Financeiro';
    order.approvalDateDiretoria = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    
    try {
        const response = await fetch(`${API_BASE_URL}/update_order.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: orderId,
                approvedByDiretoria: true,
                status: 'Aguardando Financeiro',
                approvalDateDiretoria: order.approvalDateDiretoria
            })
        });
        const data = await response.json();
        if (data.success) {
            console.log('✅ Aprovação da diretoria sincronizada com API.');
            await loadFullOrdersList(); // CRÍTICO: Recarrega a fonte de verdade após a atualização

            if (typeof notifyBotStatusChange === 'function' && currentUser) {
                const updatedOrder = fullOrdersList.find(o => o.id === orderId); // Pega a ordem atualizada da lista completa
                notifyBotStatusChange(updatedOrder, 'Pendente', 'Aguardando Financeiro', currentUser.username);
            }
        } else {
            console.warn('⚠️ Erro ao sincronizar aprovação da diretoria com API:', data.error);
            alert('Atenção: Aprovação registrada, mas houve um erro ao sincronizar com o servidor: ' + data.error);
            await loadFullOrdersList(); // Recarrega mesmo em caso de erro da API
        }
    } catch (error) {
        console.warn('⚠️ Erro de conexão ao sincronizar aprovação da diretoria. Verifique sua internet.', error);
        alert('Atenção: Aprovação registrada, mas houve um erro de conexão com o servidor. Verifique sua internet.');
        await loadFullOrdersList(); // Recarrega mesmo em caso de erro de conexão
    }
    
    // Atualização IMEDIATA e FORÇADA de todas as telas relevantes
    updateCounters();
    updateDetailedCounters();
    setTimeout(() => { // Pequeno delay para garantir que as atualizações do DOM sejam processadas
        displayOrders();
        displayDiretoriaOrders();
        displayFinanceiroOrders();
        displayPendingOrders();
        displayPaidOrders();
    }, 100);

    alert('Ordem aprovada pela Diretoria!');
}

// Localização aproximada: ~linha 13570 (primeira versão que você enviou, antes do "NOVO CÓDIGO")
async function disapproveOrderDiretoria(event, orderId) { // <<< Adicionado 'event' aqui
    // --- Feedback visual no botão ---
    const button = event.currentTarget;
    const originalButtonText = showButtonLoading(button, 'Reprovando...');
    // --- Fim do feedback visual ---

    if (!canApproveDiretoria()) {
        showModernErrorNotification('Você não tem permissão para reprovar ordens.');
        hideButtonLoading(button, originalButtonText); // Restaura o botão
        return;
    }

    const order = fullOrdersList.find(o => String(o.id) === String(orderId));
    if (!order) {
        showModernErrorNotification('Ordem não encontrada na lista. Recarregue a página se o problema persistir.');
        hideButtonLoading(button, originalButtonText); // Restaura o botão
        return;
    }

    const reason = prompt(`Motivo da reprovação da ordem do favorecido "${order.favoredName}":`);
    if (!reason) {
        showModernInfoNotification('Reprovação cancelada.');
        hideButtonLoading(button, originalButtonText); // Restaura o botão se o usuário cancelar
        return;
    }

    const oldStatus = order.status; 

    const rowElement = document.querySelector(`#diretoriaTableBody tr[data-order-id="${orderId}"]`);
    if (rowElement) {
        rowElement.remove();
        console.log(`UI: Ordem ${orderId} removida otimisticamente da aba Diretoria.`);
    }

    order.status = 'Pendente';
    order.approvedByDiretoria = false;
    order.approvedByFinanceiro = false;
    order.reprovedByDiretoriaReason = reason;

    // showLoadingOverlay(); // <<< REMOVER ESTA LINHA se presente

    try {
        const response = await fetch(`${API_BASE_URL}/update_order.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: orderId,
                status: 'Pendente', 
                approvedByDiretoria: false,
                approvedByFinanceiro: false,
                reprovedByDiretoriaReason: reason
            })
        });
        const data = await response.json();
        if (data.success) {
            console.log('✅ Reprovação da diretoria sincronizada com API. Atualizando UI localmente...');
            showModernSuccessNotification('Ordem reprovada e retornada para revisão!'); 
            
            if (typeof notifyBotStatusChange === 'function' && currentUser) {
                notifyBotStatusChange(order, oldStatus, 'Pendente', currentUser.username, reason);
            }
            updateUIComponentsAfterLoad('diretoria'); // <<< Passa o nome da aba explicitamente

        } else {
            console.warn('⚠️ Erro ao sincronizar reprovação da diretoria com API:', data.error);
            showModernErrorNotification('Atenção: Houve um erro ao sincronizar a reprovação com o servidor: ' + data.error);
            await loadFullOrdersList(true);
            updateUIComponentsAfterLoad('diretoria');
        }
    } catch (error) {
        console.error('❌ Erro de conexão ao sincronizar reprovação da diretoria:', error);
        showModernErrorNotification('Atenção: Erro de conexão ao tentar reprovar a ordem. Verifique sua internet.');
        await loadFullOrdersList(true);
        updateUIComponentsAfterLoad('diretoria');
    } finally {
        hideButtonLoading(button, originalButtonText); // <<< RESTAURA O BOTÃO AQUI!
        // hideLoadingOverlay(); // <<< REMOVER ESTA LINHA se presente
    }
}

async function approveOrderFinanceiro(event, orderId) { // <<< Adicionado 'event' aqui
    // --- Feedback visual no botão ---
    const button = event.currentTarget;
    const originalButtonText = showButtonLoading(button, 'Aprovando...');
    // --- Fim do feedback visual ---

    if (!canApproveFinanceiro()) {
        showModernErrorNotification('Você não tem permissão para aprovar pelo Financeiro.');
        hideButtonLoading(button, originalButtonText); // Restaura o botão
        return;
    }

    const order = fullOrdersList.find(o => String(o.id) === String(orderId));
    if (!order) {
        showModernErrorNotification('Ordem não encontrada na lista. Recarregue a página se o problema persistir.');
        hideButtonLoading(button, originalButtonText); // Restaura o botão
        return;
    }

    if (!confirm(`Aprovar ordem do favorecido "${order.favoredName}" pelo Financeiro?`)) {
        hideButtonLoading(button, originalButtonText); // Restaura o botão se o usuário cancelar
        return;
    }

    const oldStatus = order.status; 
    let groupEmergencyNotificationSent = false; 

    const rowElement = document.querySelector(`#financeiroTableBody tr[data-order-id="${orderId}"]`);
    if (rowElement) {
        rowElement.remove();
        console.log(`UI: Ordem ${orderId} removida otimisticamente da aba Financeiro.`);
    }

    order.approvedByFinanceiro = true;
    order.status = 'Aguardando Pagamento';
    order.approvalDateFinanceiro = new Date().toISOString().split('T')[0];

    // showLoadingOverlay(); // <<< REMOVER ESTA LINHA se presente

    try {
        const response = await fetch(`${API_BASE_URL}/update_order.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: orderId,
                approvedByFinanceiro: true,
                status: 'Aguardando Pagamento',
                approvalDateFinanceiro: order.approvalDateFinanceiro
            })
        });

        if (!response.ok) { 
            const errorText = await response.text();
            throw new Error(`Erro de rede/servidor (${response.status}): ${errorText}`);
        }

        const data = await response.json(); 

        if (data.success) {
            console.log('✅ Aprovação do financeiro sincronizada com API.');
            showModernSuccessNotification('Ordem aprovada pelo Financeiro!');

            if (order && (order.priority?.toLowerCase() === 'emergencia' || order.priority?.toLowerCase() === 'emergência') && order.direction === 'Marina') {
                if (window.whatsappScheduler && typeof window.whatsappScheduler.sendEmergencyNotificationApprovedByFinanceiro === 'function') {
                    await window.whatsappScheduler.sendEmergencyNotificationApprovedByFinanceiro(order);
                    groupEmergencyNotificationSent = true;
                } else {
                    console.warn('⚠️ [script.js] whatsappScheduler.sendEmergencyNotificationApprovedByFinanceiro não disponível para notificar emergência aprovada.');
                }
            }
            
            if (typeof notifyBotStatusChange === 'function' && currentUser) {
                notifyBotStatusChange(order, oldStatus, 'Aguardando Pagamento', currentUser.username, null, null, groupEmergencyNotificationSent);
            }

            updateUIComponentsAfterLoad('financeiro'); // <<< Passa o nome da aba explicitamente

        } else {
            console.warn('⚠️ Erro ao sincronizar aprovação do financeiro com API:', data.error);
            showModernErrorNotification('Atenção: Houve um erro ao sincronizar a aprovação com o servidor: ' + (data.error || 'Erro desconhecido'));
            await loadFullOrdersList(true);
            updateUIComponentsAfterLoad('financeiro');
        }
    } catch (error) {
        console.error('❌ Erro de conexão/parsing ao aprovar ordem Financeiro:', error);
        showModernErrorNotification('Atenção: Erro de conexão ao tentar aprovar a ordem. Verifique sua internet.');
        await loadFullOrdersList(true);
        updateUIComponentsAfterLoad('financeiro');
    } finally {
        hideButtonLoading(button, originalButtonText); // <<< RESTAURA O BOTÃO AQUI!
        // hideLoadingOverlay(); // <<< REMOVER ESTA LINHA se presente
    }
}

async function disapproveOrderFinanceiro(event, orderId) { // <<< Adicionado 'event' aqui
    // --- Feedback visual no botão ---
    const button = event.currentTarget;
    const originalButtonText = showButtonLoading(button, 'Reprovando...');
    // --- Fim do feedback visual ---

    if (!canApproveFinanceiro()) {
        showModernErrorNotification('Você não tem permissão para reprovar ordens.');
        hideButtonLoading(button, originalButtonText); // Restaura o botão
        return;
    }

    const order = fullOrdersList.find(o => String(o.id) === String(orderId));
    if (!order) {
        showModernErrorNotification('Ordem não encontrada na lista. Recarregue a página se o problema persistir.');
        hideButtonLoading(button, originalButtonText); // Restaura o botão
        return;
    }

    const reason = prompt(`Motivo da reprovação da ordem do favorecido "${order.favoredName}":`);
    if (!reason) {
        showModernInfoNotification('Reprovação cancelada.');
        hideButtonLoading(button, originalButtonText); // Restaura o botão se o usuário cancelar
        return;
    }

    const oldStatus = order.status; 

    const rowElement = document.querySelector(`#financeiroTableBody tr[data-order-id="${orderId}"]`);
    if (rowElement) {
        rowElement.remove();
        console.log(`UI: Ordem ${orderId} removida otimisticamente da aba Financeiro.`);
    }

    order.status = 'Pendente';
    order.approvedByFinanceiro = false;
    order.reprovedByFinanceiroReason = reason;

    // showLoadingOverlay(); // <<< REMOVER ESTA LINHA se presente

    try {
        const response = await fetch(`${API_BASE_URL}/update_order.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: orderId,
                status: 'Pendente', 
                approvedByFinanceiro: false,
                reprovedByFinanceiroReason: reason
            })
        });

        if (!response.ok) { 
            const errorText = await response.text();
            throw new Error(`Erro de rede/servidor (${response.status}): ${errorText}`);
        }

        const data = await response.json(); 

        if (data.success) {
            console.log('✅ Reprovação do financeiro sincronizada com API.');
            showModernSuccessNotification('Ordem reprovada e retornada para revisão!');
            
            if (typeof notifyBotStatusChange === 'function' && currentUser) {
                notifyBotStatusChange(order, oldStatus, 'Pendente', currentUser.username, reason);
            }

            updateUIComponentsAfterLoad('financeiro'); // <<< Passa o nome da aba explicitamente

        } else {
            console.warn('⚠️ Erro ao sincronizar reprovação do financeiro com API:', data.error);
            showModernErrorNotification('Atenção: Houve um erro ao sincronizar a reprovação com o servidor: ' + (data.error || 'Erro desconhecido'));
            await loadFullOrdersList(true); 
            updateUIComponentsAfterLoad('financeiro');
        }
    } catch (error) {
        console.error('❌ Erro de conexão/parsing ao reprovar ordem Financeiro:', error);
        showModernErrorNotification('Atenção: Erro de conexão ao tentar reprovar a ordem. Verifique sua internet.');
        await loadFullOrdersList(true); 
        updateUIComponentsAfterLoad('financeiro');
    } finally {
        hideButtonLoading(button, originalButtonText); // <<< RESTAURA O BOTÃO AQUI!
        // hideLoadingOverlay(); // <<< REMOVER ESTA LINHA se presente
    }
}

function openPaymentModal(orderId) {
    console.log(`[DEBUG - openPaymentModal] Chamado para Order ID: ${orderId}`);
    console.trace(`[DEBUG - openPaymentModal] Rastreamento da chamada para Order ID: ${orderId}`);
    console.log(`[DEBUG - openPaymentModal] fullOrdersList.length no início: ${fullOrdersList.length}`);

    console.log(`[DEBUG - openPaymentModal] currentOrderId ANTES de ser definido: ${currentOrderId}`);

    const modal = document.getElementById('paymentModal'); // Obter referência ao modal

    // --- CRÍTICO: Limpar e resetar o formulário e botão IMEDIATAMENTE (boa prática) ---
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm && typeof paymentForm.reset === 'function') {
        paymentForm.reset();
        console.log(`[DEBUG - openPaymentModal] Formulário de pagamento resetado.`);
    }
    const proofFileInput = document.getElementById('proofOfPayment');
    if (proofFileInput) {
        proofFileInput.value = ''; 
        console.log(`[DEBUG - openPaymentModal] Input de comprovante limpo.`);
    }
    const payButton = document.getElementById('registerPaymentBtn');
    if (payButton) {
        payButton.disabled = false;
        payButton.innerHTML = 'Registrar Pagamento'; // Resetar texto original
        console.log(`[DEBUG - openPaymentModal] Botão de pagamento resetado.`);
    }
    // --- FIM DA LIMPEZA INICIAL ---

    if (!canRegisterPayment()) {
        alert('Você não tem permissão para registrar pagamentos.');
        return;
    }
    
    currentOrderId = orderId; 
    console.log(`[DEBUG - openPaymentModal] currentOrderId APÓS ser definido para o ID da ordem: ${currentOrderId}`);

    const order = fullOrdersList.find(o => o.id === orderId); 
    
    if (!order) {
        console.error(`[DEBUG ERROR - openPaymentModal] Order ID ${orderId} NÃO ENCONTRADA em fullOrdersList.`);
        alert('Ordem não encontrada na lista atualizada. Por favor, recarregue a página.'); 
        return;
    }
    
    console.log(`[DEBUG - openPaymentModal] Ordem encontrada: Favorecido: ${order.favoredName}, Status: ${order.status}`);

    if (order.status !== 'Aguardando Pagamento') { 
        console.warn(`[DEBUG WARNING - openPaymentModal] Tentativa de abrir modal de pagamento para ordem com status "${order.status}" (ID: ${orderId}). RETORNANDO.`);
        alert('Esta ordem não está mais aguardando pagamento ou já foi paga. A lista será atualizada. Por favor, selecione outra ordem.');
        displayPendingOrders(); 
        return; 
    }


    document.getElementById('paymentDate').value = new Date().toLocaleDateString('en-CA');
    const totalPaid = order.payments ? order.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0) : 0;
    const remainingValue = parseFloat(order.paymentValue || 0) - totalPaid;
    
    document.getElementById('paymentAmount').value = remainingValue.toFixed(2);
    document.getElementById('paymentAmount').max = remainingValue.toFixed(2);
    
    const partialInfo = document.getElementById('partialPaymentInfo');
    partialInfo.style.display = 'block';
    partialInfo.innerHTML = `
        <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; border: 2px solid #0066cc;">
            <h4>💰 Resumo Financeiro da Ordem</h4>
            <p><strong>📊 Valor Total:</strong> R$ ${parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            <p><strong>✅ Já Pago:</strong> R$ ${totalPaid.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            <p><strong>⏳ Valor Restante:</strong> R$ ${remainingValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            <p><strong>📝 Pagamentos Feitos:</strong> ${order.payments ? order.payments.length : 0}</p>
            ${order.payments && order.payments.length > 0 ? '<p><strong>📄 Comprovantes disponíveis para download</strong></p>' : ''}
        </div>
    `;
    
    // --- CRÍTICO: Redefinir opacidade e transformação ANTES de exibir o modal ---
    if (modal) {
        // Garantir que as propriedades de animação estejam prontas para a abertura
        modal.style.transition = 'none'; // Desativa transição momentaneamente para aplicar o estado inicial
        modal.style.opacity = '0';       // Começa invisível para animar entrada
        modal.style.transform = 'scale(0.95)'; // Começa um pouco menor para animar entrada
        
        // Forçar um reflow no navegador. Isso garante que as propriedades acima sejam aplicadas instantaneamente.
        void modal.offsetWidth; 
        
        // Reativa a transição para a animação de entrada e define o estado final
        modal.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out'; 
        modal.style.opacity = '1';       // Anima para totalmente visível
        modal.style.transform = 'scale(1)'; // Anima para tamanho normal
    }
    // --- FIM DA CORREÇÃO ---

    console.log(`[DEBUG - openPaymentModal] Tentando exibir o modal de pagamento para Order ID: ${orderId}`);
    modal.style.display = 'block'; // Agora, exibe o modal com as propriedades de animação prontas.
    console.log(`[DEBUG - openPaymentModal] Modal de pagamento exibido (se não houver erro anterior).`);
}

// Localização sugerida: Perto de showModernSuccessNotification, showModernErrorNotification, etc.

/**
 * Exibe um spinner e desabilita um botão.
 * @param {HTMLElement} buttonElement O elemento do botão.
 * @param {string} loadingText O texto a ser exibido enquanto carrega (padrão: "Processando...").
 * @returns {string} O texto original do botão para ser restaurado depois.
 */
function showButtonLoading(buttonElement, loadingText = 'Processando...') {
    if (!buttonElement) return;
    const originalText = buttonElement.innerHTML; // Guarda o conteúdo HTML original do botão
    buttonElement.disabled = true;
    buttonElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
    return originalText; // Retorna o texto original para a função que chamou poder restaurá-lo
}

/**
 * Restaura o estado original de um botão.
 * @param {HTMLElement} buttonElement O elemento do botão.
 * @param {string} originalText O texto original do botão.
 */
function hideButtonLoading(buttonElement, originalText) {
    if (!buttonElement) return;
    buttonElement.disabled = false;
    buttonElement.innerHTML = originalText;
}


async function registerPayment() {
    console.log(`[DEBUG - registerPayment] INICIADA para Order ID: ${currentOrderId}`);
    
    // Identifica o elemento que disparou a função
    const eventTarget = event && event.target ? event.target : 'Desconhecido';
    console.log(`[DEBUG - registerPayment] Event target for call: `, eventTarget);
    
    if (!canRegisterPayment()) {
        console.warn(`[DEBUG - registerPayment] Permissão negada para registrar pagamento.`);
        showModernErrorNotification('Você não tem permissão para registrar pagamentos.');
        return;
    }
    
    if (!currentOrderId) {
        console.warn(`[DEBUG - registerPayment] currentOrderId não definido.`);
        showModernErrorNotification('Erro: Nenhuma ordem selecionada para registro de pagamento.');
        return;
    }

    const payButton = document.getElementById('registerPaymentBtn');
    const originalButtonText = payButton ? payButton.innerHTML : 'Registrar Pagamento'; // Valor padrão para evitar undefined
    
    const showButtonLoading = () => {
        if (payButton) {
            payButton.disabled = true;
            payButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
        }
    };
    
    const restoreButton = () => {
        if (payButton) {
            payButton.disabled = false;
            payButton.innerHTML = originalButtonText;
        }
    };
    
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const date = document.getElementById('paymentDate').value;
    const description = document.getElementById('paymentDescription').value;
    const proofFile = document.getElementById('proofOfPayment').files[0];
    
    // --- Validações Iniciais ---
    if (!amount || amount <= 0) {
        console.warn(`[DEBUG - registerPayment] Validação falhou: Valor do pagamento inválido (${amount}).`);
        showModernErrorNotification('Por favor, informe um valor válido.');
        restoreButton(); // Restaura o botão em caso de validação falha
        return;
    }
    
    if (!date) {
        console.warn(`[DEBUG - registerPayment] Validação falhou: Data de pagamento não informada.`);
        showModernErrorNotification('Por favor, informe a data do pagamento.');
        restoreButton(); // Restaura o botão em caso de validação falha
        return;
    }
    
    if (!proofFile) {
        console.warn(`[DEBUG - registerPayment] Validação falhou: Comprovante de pagamento não anexado.`);
        showModernErrorNotification('Por favor, anexe o comprovante de pagamento.');
        restoreButton(); // Restaura o botão em caso de validação falha
        return;
    }

    const order = fullOrdersList.find(o => o.id === currentOrderId);
    if (!order) {
        console.warn(`[DEBUG - registerPayment] Validação falhou: Ordem ${currentOrderId} não encontrada em fullOrdersList.`);
        showModernErrorNotification('Ordem não encontrada.');
        restoreButton(); // Restaura o botão em caso de validação falha
        return;
    }
    
    const currentTotalPaid = order.payments ? order.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0) : 0;
    const orderValue = parseFloat(order.paymentValue || 0);
    
    if (currentTotalPaid + amount > orderValue + 0.001) { // 0.001 para evitar problemas de float
        console.warn(`[DEBUG - registerPayment] Validação falhou: Valor excede o total da ordem. Pago: ${currentTotalPaid}, Valor Ordem: ${orderValue}, Tentativa: ${amount}`);
        showModernErrorNotification(`Valor excede o total da ordem. Máximo permitido: R\$ ${(orderValue - currentTotalPaid).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
        restoreButton(); // Restaura o botão em caso de validação falha
        return;
    }
    
    console.log(`[DEBUG - registerPayment] Todas as validações INICIAIS passaram para Order ID: ${currentOrderId}.`); 
    showButtonLoading(); // Mostrar loading após todas as validações
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const newPayment = {
                amount: amount,
                date: date,
                description: description || 'Pagamento registrado',
                proofData: e.target.result,
                proofFileName: proofFile.name,
                registeredBy: currentUser.role,
                registeredAt: new Date().toISOString()
            };
            
            // --- INÍCIO DA ATUALIZAÇÃO OTTIMISTA DO fullOrdersList (LOCALMENTE) ---
            const oldOrderStatus = order.status; // Salva o status antigo para notificação do bot
            
            if (!order.payments) { order.payments = []; }
            order.payments.push(newPayment); // Adiciona o novo pagamento à ordem local

            const newTotalPaid = order.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
            const orderFullyPaid = (newTotalPaid >= (orderValue - 0.001));

            let orderBecamePaid = false; // Flag para indicar se a ordem se tornou paga NESTA transação

            // Define o NOVO status da ordem com base no pagamento
            if (orderFullyPaid) {
                order.status = 'Paga';
                order.paymentCompletionDate = date; // Data de conclusão é a data do último pagamento
                order.isPaid = true;
                orderBecamePaid = true; // Sim, a ordem se tornou paga agora
                console.log(`%c[DEBUG - registerPayment] Ordem ${currentOrderId} se tornou TOTALMENTE PAGA. Novo status: ${order.status}`, 'color: #28a745; font-weight: bold;');
                
                // --- REMOÇÃO OTTIMISTA DA UI DA ABA 'PENDENTES PAGAMENTO' ---
                const pendingRow = document.querySelector(`#pendingTableBody tr#order-${currentOrderId}`);
                if (pendingRow) {
                    console.log(`[DEBUG - registerPayment] Elemento TR na aba 'Pendentes Pagamento' encontrado para remoção otimista.`);
                    pendingRow.style.opacity = '0';
                    pendingRow.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                    pendingRow.style.transform = 'translateX(-100%)'; // Animação de saída para a esquerda
                    // O `setTimeout` finaliza a remoção depois da animação
                    setTimeout(() => { 
                        pendingRow.remove(); 
                        console.log(`[DEBUG - registerPayment] TR da ordem ${currentOrderId} removido da aba 'Pendentes Pagamento' após animação.`);
                    }, 300); // Deve corresponder à duração da transição
                    console.log(`UI: Ordem ${currentOrderId} animada para remoção otimista da aba Pendentes Pagamento.`);
                } else {
                    console.warn(`[DEBUG - registerPayment] Elemento TR na aba 'Pendentes Pagamento' NÃO encontrado para Order ID: ${currentOrderId}.`);
                }
                // --- FIM REMOÇÃO OTTIMISTA ---

            } else {
                order.status = 'Aguardando Pagamento'; // Continua como pagamento parcial
                order.isPaid = false;
                orderBecamePaid = false; // Não se tornou paga nesta transação
                console.log(`[DEBUG - registerPayment] Ordem ${currentOrderId} é PAGAMENTO PARCIAL. Status: ${order.status}`);
            }
            console.log(`%c[DEBUG - registerPayment] Estado final da ordem ${currentOrderId} no fullOrdersList (localmente) antes de enviar à API:`, 'color: #007bff;', { status: order.status, isPaid: order.isPaid, paymentsLength: order.payments.length, currentTotalPaid: newTotalPaid, orderValue: orderValue });
            // --- FIM DA ATUALIZAÇÃO OTTIMISTA DO fullOrdersList ---
            
            try {
                console.log(`%c[DEBUG registerPayment] --- INÍCIO ENVIO PARA API ---`, 'color: #9c27b0; font-weight: bold;');
                const payloadToSend = {
                    id: currentOrderId,
                    payments: JSON.stringify(order.payments), // Envia os pagamentos atualizados
                    status: order.status, // Envia o status atualizado ('Paga' ou 'Aguardando Pagamento')
                    paymentCompletionDate: order.paymentCompletionDate,
                    isPaid: order.isPaid, // Envia o flag isPaid atualizado
                    amountPaidInThisTransaction: amount // Inclui o valor da transação para cálculo no backend
                };
                console.log(`[DEBUG registerPayment] Payload Completo enviado à API:`, payloadToSend); 

                const response = await fetch(`${API_BASE_URL}/update_order.php?_=${new Date().getTime()}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadToSend)
                });
                
                console.log(`[DEBUG registerPayment] Resposta bruta da API para Order ID: ${currentOrderId} - Status: ${response.status}`);
                
                if (response.ok) { // Verifica se a requisição HTTP em si foi bem-sucedida (status 200-299)
                    const data = await response.json();
                    console.log(`%c[DEBUG registerPayment] Resposta JSON (data.success: ${data.success}) da API para Order ID: ${currentOrderId}:`, 'color: #1976d2;', data);
                    
                    if (data.success) {
                        console.log('%c[DEBUG registerPayment] API retornou sucesso. Processando atualizações pós-API...', 'color: #28a745; font-weight: bold;');
                        
                        await loadCashValueFromDB(); // Recarrega o valor do caixa do DB
                        
                        // Notificação WhatsApp (se a ordem se tornou paga nesta transação)
                        if (orderBecamePaid && order.sendProofToWhatsApp && typeof window.whatsappScheduler !== 'undefined' && typeof window.whatsAppIntegration !== 'undefined' && window.whatsAppIntegration.isInitialized && order.payments.length > 0) {
                            try {
                                const lastPaymentIndex = order.payments.length - 1;
                                const proofLink = `${API_BASE_URL}/download_payment_proof.php?order_id=${order.id}&payment_index=${lastPaymentIndex}`;
                                window.whatsappScheduler.notifyPaymentCompleted(order, proofLink);
                                console.log(`[DEBUG - registerPayment] Notificação de pagamento via WhatsApp AGENDADA para Order ID: ${order.id}`);
                            } catch (error) {
                                console.error('❌ [script.js] Erro ao enviar notificação de pagamento via WhatsApp:', error);
                            }
                        } else if (orderBecamePaid) {
                            console.warn('⚠️ [registerPayment] Condições para envio de WhatsApp NÃO atendidas. Notificação de pagamento NÃO enviada. (Faltando link? sendProofToWhatsApp=false? Scheduler não inicializado?)');
                        }
                    
                        if (typeof window.whatsappScheduler !== 'undefined') {
                            window.whatsappScheduler.cleanupEmergencyNotifications(order.id);
                        }
                        await fetchPaidOrdersForReports(); // Força a atualização dos dados para relatórios de pagos
                        
                        // --- CHAMADA FINAL PARA ATUALIZAR A INTERFACE ---
                        // Esta função irá forçar o carregamento de `fullOrdersList` do servidor
                        // e redesenhar todas as abas, incluindo "Ordens Pendentes" e "Ordens Pagas".
                        console.log(`%c[DEBUG - registerPayment] Chamando updateUIComponentsAfterLoad() após sucesso da API para redesenho completo da UI.`, 'color: #f57c00; font-weight: bold;');
                        updateUIComponentsAfterLoad();

                    } else { // A API retornou 'success: false' na sua resposta JSON
                        console.warn('%c[DEBUG registerPayment] API retornou success: false. Detalhes do erro:', 'color: #d32f2f; font-weight: bold;', data.error);
                        showModernErrorNotification('Erro ao sincronizar com servidor: ' + (data.error || 'Erro desconhecido. Recarregue a página se os dados não aparecerem.'));
                        
                        // --- REVERTER ATUALIZAÇÃO OTTIMISTA EM CASO DE ERRO DA API ---
                        if (orderBecamePaid) {
                            console.log(`%c[DEBUG - registerPayment] Revertendo status otimista de Ordem Paga devido a erro da API.`, 'color: #d32f2f;');
                            order.status = oldOrderStatus; // Volta ao status anterior
                            order.paymentCompletionDate = null;
                            order.isPaid = false;
                            const pendingRow = document.querySelector(`#pendingTableBody tr#order-${currentOrderId}`);
                            if (pendingRow) {
                                pendingRow.style.opacity = '1';
                                pendingRow.style.transform = 'translateX(0)';
                                pendingRow.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                                console.log(`[DEBUG - registerPayment] Revertendo animação da linha na aba 'Pendentes Pagamento'.`);
                                // Se a linha foi removida por `setTimeout`, ela precisará ser recriada pelo `updateUIComponentsAfterLoad`.
                            }
                        }
                        // Força a atualização de UI para refletir o estado correto após o erro da API
                        console.log(`%c[DEBUG - registerPayment] Chamando updateUIComponentsAfterLoad() após erro da API para restaurar UI.`, 'color: #f57c00; font-weight: bold;');
                        updateUIComponentsAfterLoad(); 
                        // --- FIM DA REVERSÃO ---
                    }
                } else { // A requisição HTTP falhou (status 4xx, 5xx ou erro de rede)
                    const errorText = await response.text(); 
                    console.error(`%c[DEBUG registerPayment] Erro HTTP na API para Order ID: ${currentOrderId}: Status ${response.status}, Texto: ${errorText}`, 'color: #d32f2f; font-weight: bold;');
                    showModernErrorNotification(`Erro na comunicação com o servidor (Status: ${response.status}). Recarregue a página se os dados não aparecerem.`);
                    
                    // --- REVERTER ATUALIZAÇÃO OTTIMISTA EM CASO DE ERRO DE CONEXÃO ---
                    if (orderBecamePaid) {
                        console.log(`%c[DEBUG - registerPayment] Revertendo status otimista de Ordem Paga devido a erro HTTP.`, 'color: #d32f2f;');
                        order.status = oldOrderStatus; // Volta ao status anterior
                        order.paymentCompletionDate = null;
                        order.isPaid = false;
                        const pendingRow = document.querySelector(`#pendingTableBody tr#order-${currentOrderId}`);
                        if (pendingRow) {
                            pendingRow.style.opacity = '1';
                            pendingRow.style.transform = 'translateX(0)';
                            pendingRow.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                            console.log(`[DEBUG - registerPayment] Revertendo animação da linha na aba 'Pendentes Pagamento'.`);
                        }
                    }
                    console.log(`%c[DEBUG - registerPayment] Chamando updateUIComponentsAfterLoad() após erro HTTP para restaurar UI.`, 'color: #f57c00; font-weight: bold;');
                    updateUIComponentsAfterLoad(); // Força a atualização de UI
                    // --- FIM DA REVERSÃO ---
                }
            } catch (error) { // Erro de conexão ou parsing do JSON
                console.warn('%c[DEBUG registerPayment] Erro de CONEXÃO ou PARSING:', 'color: #d32f2f; font-weight: bold;', error);
                showModernWarningNotification('Erro de conexão ou no processamento da API. Verifique sua internet. Recarregue a página se os dados não aparecerem.');
                
                // --- REVERTER ATUALIZAÇÃO OTTIMISTA EM CASO DE ERRO DE CONEXÃO ---
                if (orderBecamePaid) {
                    console.log(`%c[DEBUG - registerPayment] Revertendo status otimista de Ordem Paga devido a erro de conexão/parsing.`, 'color: #d32f2f;');
                    order.status = oldOrderStatus; // Volta ao status anterior
                    order.paymentCompletionDate = null;
                    order.isPaid = false;
                    const pendingRow = document.querySelector(`#pendingTableBody tr#order-${currentOrderId}`);
                    if (pendingRow) {
                        pendingRow.style.opacity = '1';
                        pendingRow.style.transform = 'translateX(0)';
                        pendingRow.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                        console.log(`[DEBUG - registerPayment] Revertendo animação da linha na aba 'Pendentes Pagamento'.`);
                    }
                }
                console.log(`%c[DEBUG - registerPayment] Chamando updateUIComponentsAfterLoad() após erro de conexão/parsing para restaurar UI.`, 'color: #f57c00; font-weight: bold;');
                updateUIComponentsAfterLoad(); // Força a atualização de UI
                // --- FIM DA REVERSÃO ---
            }
            
            closePaymentModalWithAnimation(); // Fecha o modal de pagamento com animação suave
            
            // --- Notificações Finais ---
            if (orderBecamePaid) {
                showModernSuccessNotification(`✅ Pagamento registrado! Ordem ${currentOrderId} totalmente paga.`);
            } else {
                const remaining = orderValue - newTotalPaid;
                showModernInfoNotification(`💰 Pagamento parcial registrado! Falta pagar: R\$ ${remaining.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
            }
            
        } catch (error) { // Erros no leitor de arquivo (FileReader) ou outros erros síncronos
            console.error('❌ Erro inesperado durante o processamento do pagamento:', error);
            showModernErrorNotification('Erro inesperado durante o processamento. Tente novamente.');
        } finally {
            restoreButton(); // Garante que o botão seja restaurado
        }
    };
    
    reader.onerror = function(errorEvent) {
        console.error('❌ Erro no FileReader ao processar comprovante:', errorEvent);
        restoreButton();
        showModernErrorNotification('Erro ao processar o arquivo de comprovante. Verifique o arquivo e tente novamente.');
    };
    
    reader.readAsDataURL(proofFile);
}

// =======================================================
// NOVAS FUNÇÕES PARA O FILTRO DE PROCESSO NA ABA ORDENS PAGAS (paidTab)
// =======================================================

// Alterna a visibilidade do dropdown de Processo para Ordens Pagas
function togglePaidOrdersProcessDropdown(event) {
    console.log("DEBUG: togglePaidOrdersProcessDropdown - Função chamada."); // Log 1

    event.stopPropagation();
    const dropdownContent = document.getElementById('paidOrdersProcessDropdownContent');
    const displayElement = document.getElementById('paidOrdersProcessDisplay');

    if (!dropdownContent || !displayElement) {
        console.warn("DEBUG: togglePaidOrdersProcessDropdown - Elementos dropdownContent ou displayElement não encontrados!"); // Log de alerta
        return;
    }

    console.log("DEBUG: togglePaidOrdersProcessDropdown - Elementos encontrados."); // Log 2

    const isOpen = dropdownContent.classList.contains('is-open');

    if (isOpen) {
        dropdownContent.classList.remove('is-open');
        displayElement.classList.remove('is-open');
        console.log("DEBUG: togglePaidOrdersProcessDropdown - Classes 'is-open' removidas. Dropdown fechado."); // Log 3
    } else {
        console.log("DEBUG: togglePaidOrdersProcessDropdown - Chamando populatePaidOrdersProcessCheckboxes()."); // Log 4
        populatePaidOrdersProcessCheckboxes(); // Popula os checkboxes antes de abrir
        dropdownContent.classList.add('is-open');
        displayElement.classList.add('is-open');
        console.log("DEBUG: togglePaidOrdersProcessDropdown - Classes 'is-open' adicionadas. Dropdown aberto."); // Log 5
    }
    console.log("DEBUG: togglePaidOrdersProcessDropdown - Fim da execução."); // Log 6
}

// Lidar com a mudança de estado dos checkboxes de Processo para Ordens Pagas
function handlePaidOrdersProcessCheckboxChange(processValue, isChecked) {
    const allProcessesCheckbox = document.querySelector('.paid-orders-process-filter-checkbox[value=""]');

    if (processValue === '') { // Se "Todos os processos" foi alterado
        paidOrdersProcessFilterSelection = []; // Limpa todas as seleções

        // Desmarca todos os outros checkboxes
        document.querySelectorAll('.paid-orders-process-filter-checkbox').forEach(cb => {
            if (cb.value !== '') cb.checked = false;
        });
        if (allProcessesCheckbox) allProcessesCheckbox.checked = true; // Garante que "Todos" está marcado
    } else { // Se um processo específico foi alterado
        // Desmarca "Todos os processos" se um específico foi marcado
        if (isChecked && allProcessesCheckbox) {
            allProcessesCheckbox.checked = false;
        }

        if (isChecked) {
            paidOrdersProcessFilterSelection.push(processValue);
        } else {
            paidOrdersProcessFilterSelection = paidOrdersProcessFilterSelection.filter(p => p !== processValue);
        }

        // Se nenhum processo específico está marcado, marca "Todos os processos"
        if (paidOrdersProcessFilterSelection.length === 0 && allProcessesCheckbox) {
            allProcessesCheckbox.checked = true;
        }
    }
    
    updatePaidOrdersProcessDisplay(); // Atualiza o texto de exibição
    debouncedApplyPaidFilters(); // Aplica os filtros após a mudança
}

// Atualiza o texto exibido na barra do filtro de Processo para Ordens Pagas
function updatePaidOrdersProcessDisplay() {
    const displayElement = document.getElementById('paidOrdersProcessDisplay');
    if (!displayElement) return;

    if (paidOrdersProcessFilterSelection.length === 0) {
        displayElement.textContent = 'Todos os processos';
    } else if (paidOrdersProcessFilterSelection.length === 1) {
        displayElement.textContent = paidOrdersProcessFilterSelection[0];
    } else {
        displayElement.textContent = `${paidOrdersProcessFilterSelection.length} processos selecionados`;
    }
}

// Para popular o filtro de Processo na aba de Ordens Pagas com Checkboxes
function populatePaidOrdersProcessCheckboxes() {
    console.log("DEBUG POPULATE PROCESS: Iniciando população do filtro de Processo da aba Ordens Pagas."); // Log de início

    const container = document.getElementById('paidOrdersProcessFilterCheckboxesContainer');
    if (!container) {
        console.warn('DEBUG POPULATE PROCESS: Elemento paidOrdersProcessFilterCheckboxesContainer não encontrado. Verifique o HTML.');
        return;
    }
    console.log("DEBUG POPULATE PROCESS: Container paidOrdersProcessFilterCheckboxesContainer encontrado.");

    // Guarda a seleção atual antes de limpar
    const currentSelection = new Set(paidOrdersProcessFilterSelection);
    console.log("DEBUG POPULATE PROCESS: Seleção atual salva:", Array.from(currentSelection));

    // Limpa todas as opções existentes no container, exceto a primeira que é 'Todos os processos'
    container.innerHTML = ''; 
    console.log("DEBUG POPULATE PROCESS: Container limpo.");

    // Re-adiciona a opção "Todos os processos"
    const allProcessesLabel = document.createElement('label');
    allProcessesLabel.className = 'custom-multi-select-option';
    allProcessesLabel.innerHTML = `
        <input type="checkbox" value="" class="paid-orders-process-filter-checkbox" 
               onchange="handlePaidOrdersProcessCheckboxChange(this.value, this.checked)">
        <span>Todos os processos</span>
    `;
    container.appendChild(allProcessesLabel);
    console.log("DEBUG POPULATE PROCESS: Checkbox 'Todos os processos' adicionado.");

    const uniqueProcesses = new Set();
    console.log("DEBUG POPULATE PROCESS: Coletando processos de fullOrdersList (status 'Paga')...");
    if (typeof fullOrdersList !== 'undefined' && fullOrdersList && Array.isArray(fullOrdersList)) {
        fullOrdersList.filter(order => order.status === 'Paga' && order.process)
                      .forEach(order => {
                          const process = order.process.trim();
                          if (process) {
                              uniqueProcesses.add(process);
                          }
                      });
    } else {
        console.warn("DEBUG POPULATE PROCESS: fullOrdersList não está disponível ou não é um array.");
    }
    console.log("DEBUG POPULATE PROCESS: Processos de fullOrdersList coletados. Tamanho:", uniqueProcesses.size);


    console.log("DEBUG POPULATE PROCESS: Coletando processos de boletos (com parcelas pagas)...");
    if (typeof boletos !== 'undefined' && boletos && Array.isArray(boletos)) {
        boletos.forEach(boleto => {
            if (boleto.process && boleto.parcels && boleto.parcels.some(p => p.isPaid)) {
                const process = boleto.process.trim();
                if (process) {
                    uniqueProcesses.add(process);
                }
            }
        });
    } else {
        console.warn("DEBUG POPULATE PROCESS: boletos não está disponível ou não é um array.");
    }
    console.log("DEBUG POPULATE PROCESS: Processos de boletos coletados. Tamanho total:", uniqueProcesses.size);

    const sortedProcesses = Array.from(uniqueProcesses).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    console.log("DEBUG POPULATE PROCESS: Processos únicos e ordenados encontrados:", sortedProcesses);

    // Adicionar os checkboxes para cada processo
    if (sortedProcesses.length === 0) {
        console.warn("DEBUG POPULATE PROCESS: Nenhum processo único encontrado para adicionar ao filtro.");
        // Adicionar uma mensagem visual de "nenhum processo encontrado" se necessário
        const noProcessesMsg = document.createElement('div');
        noProcessesMsg.className = 'custom-multi-select-option';
        noProcessesMsg.style.textAlign = 'center';
        noProcessesMsg.style.fontStyle = 'italic';
        noProcessesMsg.textContent = 'Nenhum processo encontrado';
        container.appendChild(noProcessesMsg);
    } else {
        sortedProcesses.forEach(processName => {
            const isChecked = currentSelection.has(processName); // Usa a seleção salva
            const labelElement = document.createElement('label');
            labelElement.className = 'custom-multi-select-option';
            labelElement.innerHTML = `
                <input type="checkbox" value="${escapeForHTML(processName)}" class="paid-orders-process-filter-checkbox" 
                       onchange="handlePaidOrdersProcessCheckboxChange(this.value, this.checked)" ${isChecked ? 'checked' : ''}>
                <span>${escapeForHTML(processName)}</span>
            `;
            container.appendChild(labelElement);
        });
        console.log(`DEBUG POPULATE PROCESS: ${sortedProcesses.length} checkboxes de processos adicionados.`);
    }
    
    // Garante que o checkbox "Todos os processos" reflita o estado atual
    const allProcessesCheckbox = container.querySelector('input[type="checkbox"][value=""]');
    if (allProcessesCheckbox) {
        allProcessesCheckbox.checked = paidOrdersProcessFilterSelection.length === 0;
        console.log("DEBUG POPULATE PROCESS: Estado do checkbox 'Todos os processos' atualizado:", allProcessesCheckbox.checked);
    }

    updatePaidOrdersProcessDisplay(); // Atualiza o texto de exibição
    console.log("DEBUG POPULATE PROCESS: População finalizada e display atualizado.");
}

// Função para fechar modal com animação suave
function closePaymentModalWithAnimation() {
    const modal = document.querySelector('#paymentModal');
    if (modal) {
        currentOrderId = null; // Limpa o ID da ordem imediatamente!

        // Inicia as propriedades de animação para fechar (fade-out e scale-down)
        modal.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        modal.style.opacity = '0'; // Começa a sumir (fade out)
        modal.style.transform = 'scale(0.95)'; // Começa a diminuir (scale down)
        
        setTimeout(() => {
            // Após a animação, esconde o modal completamente
            modal.style.display = 'none'; 
            
            // --- CRÍTICO: Resetar opacidade, transformação e transição para o estado NEUTRO/INICIAL ---
            // Isso garante que o modal esteja pronto para a próxima abertura sem resquícios de estilos inline.
            modal.style.opacity = '1';       // Reseta a opacidade para visível (pronta para a próxima abertura)
            modal.style.transform = 'scale(1)'; // Reseta a transformação para tamanho normal (pronta para a próxima abertura)
            modal.style.transition = 'none'; // Remove a transição para que não haja animação ao aplicar o display:none
            // --- FIM DA CORREÇÃO ---

            // Remove a classe 'show' (se estiver usando)
            modal.classList.remove('show'); 
            
            // Lógica para modals do Bootstrap e backdrop (se aplicável)
            if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    bsModal.hide();
                }
            }
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.style.opacity = '0';
                setTimeout(() => backdrop.remove(), 150);
            }
            
            // Resetar formulário e botão (já movido para openPaymentModal, mas mantido aqui para fechamento direto)
            const paymentForm = document.getElementById('paymentForm');
            if (paymentForm && typeof paymentForm.reset === 'function') {
                paymentForm.reset();
            }
            const proofFileInput = document.getElementById('proofOfPayment');
            if (proofFileInput) {
                proofFileInput.value = ''; 
            }
            const partialInfo = document.getElementById('partialPaymentInfo');
            if (partialInfo) partialInfo.innerHTML = '';
            const payButton = document.getElementById('registerPaymentBtn');
            if (payButton) {
                payButton.disabled = false;
                payButton.innerHTML = 'Registrar Pagamento';
            }
            
        }, 300); // Esta duração deve corresponder à duração da transição CSS
    }
}
function highlightOrderAsPaid(orderId) {

    // Buscar elementos da ordem na interface
    const orderElements = document.querySelectorAll(`
        tr[data-order-id="${orderId}"], 
        tr[data-id="${orderId}"],
        .order-row[data-order-id="${orderId}"],
        .order-item[data-order-id="${orderId}"]
    `);
    
    orderElements.forEach(element => {
        // Adicionar efeito visual de "pago"
        element.style.transition = 'all 0.8s ease-out';
        element.style.backgroundColor = '#d4edda';
        element.style.borderLeft = '5px solid #28a745';
        element.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.2)';
        
        // Atualizar badge de status se existir
        const statusBadge = element.querySelector('.status-badge, .order-status, .badge');
        if (statusBadge) {
            statusBadge.textContent = 'Paga';
            statusBadge.className = statusBadge.className.replace(/badge-\w+|status-\w+/g, '');
            statusBadge.classList.add('badge-success', 'status-paid');
            statusBadge.style.backgroundColor = '#28a745';
            statusBadge.style.color = 'white';
        }
        
        // Adicionar ícone de check se não existir
        const checkIcon = element.querySelector('.paid-check-icon');
        if (!checkIcon) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-check-circle paid-check-icon';
            icon.style.cssText = 'color: #28a745; margin-left: 8px; animation: bounceIn 0.6s ease-out;';
            
            const firstCell = element.querySelector('td:first-child');
            if (firstCell) {
                firstCell.appendChild(icon);
            }
        }
        
        // Se estiver na aba de pendentes, remover após um tempo
        const isPendingTab = document.querySelector('.tab-button.active')?.textContent.toLowerCase().includes('pendente');
        if (isPendingTab) {
            setTimeout(() => {
                element.style.opacity = '0';
                element.style.transform = 'translateX(-100%)';
                setTimeout(() => {
                    element.remove();
                }, 500);
            }, 2000);
        }
    });
}

// Exemplo de localização: Perto de showModernSuccessNotification
/**
 * Aplica um destaque visual temporário a um elemento de linha da tabela.
 * @param {string} fullRowId O ID completo do elemento <tr> a ser destacado (ex: 'order-123', 'boleto_parcel-456').
 * @param {string} highlightClass A classe CSS de destaque a ser aplicada (ex: 'highlight-new-order', 'highlight-edited-order').
 */
function applyHighlightToRowById(fullRowId, highlightClass) {
    if (!fullRowId) {
        console.log('DEBUG Destaque: fullRowId está vazio em applyHighlightToRowById.');
        return;
    }

    // Pequeno atraso para garantir que o DOM foi atualizado e o elemento existe
    setTimeout(() => {
        const element = document.getElementById(fullRowId);
        if (element) {
            console.log(`DEBUG Destaque: Elemento encontrado para highlight:`, element);
            element.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Rola suavemente
            element.classList.add(highlightClass); // Adiciona classe de destaque
            console.log(`DEBUG Destaque: Classe '${highlightClass}' adicionada ao elemento.`);

            // Remove a classe de destaque após 2 segundos
            setTimeout(() => {
                element.classList.remove(highlightClass);
                console.log(`DEBUG Destaque: Classe '${highlightClass}' removida do elemento.`);
            }, 2000);
        } else {
            console.warn(`DEBUG Destaque: Elemento com ID '${fullRowId}' NÃO ENCONTRADO para destacar.`);
        }
    }, 500); // 500ms de atraso para o DOM renderizar
}

// Mapa de configuração de notificações — adicionar novo tipo aqui, sem alterar lógica
const NOTIFICATION_TYPES = {
    success: '#28a745',
    error:   '#dc3545',
    info:    '#17a2b8',
    warning: '#ffc107',
};

// Dispatcher centralizado de notificações
function showNotification(type, message) {
    const color = NOTIFICATION_TYPES[type];
    if (!color) {
        console.warn(`[Notificação] Tipo desconhecido: "${type}". Use: success, error, info, warning.`);
        return;
    }
    createModernNotification(message, type, color);
}

// Aliases de compatibilidade — mantém todos os pontos de chamada existentes funcionando
// sem necessidade de refatorar o restante do arquivo neste momento
function showModernSuccessNotification(message) { showNotification('success', message); }
function showModernErrorNotification(message)   { showNotification('error', message); }
function showModernInfoNotification(message)    { showNotification('info', message); }
function showModernWarningNotification(message) { showNotification('warning', message); }

function createModernNotification(message, type, color) {
    // Remover notificações anteriores do mesmo tipo
    const existingNotifications = document.querySelectorAll(`.modern-notification.${type}`);
    existingNotifications.forEach(notification => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    });
    
    const notification = document.createElement('div');
    notification.className = `modern-notification ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        color: #333;
        padding: 16px 20px;
        border-radius: 8px;
        border-left: 4px solid ${color};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-weight: 500;
        max-width: 400px;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 12px;
        transform: translateX(100%);
        transition: transform 0.3s ease-out;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    notification.innerHTML = `
        <i class="${icons[type]}" style="color: ${color}; font-size: 18px;"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Remover após 5 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Função centralizada para exibir detalhes de QUALQUER ITEM PAGO
async function viewPaidItemDetails(id, itemType, parcelId = null) {
    let itemToDisplay = null;
    let originalParentItem = null; // Útil para parcelas de boleto, para ter acesso ao boleto pai
    let modalTitle = 'Detalhes do Pagamento';

    // 1. Determinar o item e seu pai (se aplicável) com base no itemType
    // 'id' sempre se refere ao ID do objeto "pai" (ordem, salário, boleto)
    // 'parcelId' só é usado quando itemType é 'boleto_parcel', e 'id' nesse caso é o boleto.id
    if (itemType === 'order') {
        originalParentItem = fullOrdersList.find(o => o.id === id);
        itemToDisplay = originalParentItem; // Para ordens, o item a exibir é a própria ordem
        modalTitle = 'Detalhes da Ordem de Pagamento';
    } else if (itemType === 'salary') {
        originalParentItem = salaries.find(s => s.id === id);
        itemToDisplay = originalParentItem; // Para salários, o item a exibir é o próprio salário
        modalTitle = 'Detalhes do Salário/Auxílio';
    } else if (itemType === 'boleto_full') {
        originalParentItem = boletos.find(b => b.id === id);
        itemToDisplay = originalParentItem; // Para boleto_full, o item a exibir é o próprio boleto
        modalTitle = 'Detalhes do Boleto Completo';
    } else if (itemType === 'boleto_parcel') {
        originalParentItem = boletos.find(b => b.id === id); // id aqui é o ID do boleto pai
        itemToDisplay = originalParentItem?.parcels.find(p => p.id === parcelId); // parcelId é o ID da parcela específica
        modalTitle = `Detalhes da Parcela ${itemToDisplay?.parcelNumber || ''} do Boleto`;
        if (!itemToDisplay) { showModernErrorNotification('Parcela de boleto não encontrada.'); return; }
    } else {
        showModernErrorNotification(`Tipo de item '${itemType}' não reconhecido para visualização de detalhes.`);
        return;
    }

    if (!itemToDisplay) {
        showModernErrorNotification(`Detalhes do item não encontrados para o tipo '${itemType}'.`);
        return;
    }

    // 2. Acessar o modal genérico de detalhes
    const modal = document.getElementById('detailsModal');
    const modalTitleElement = document.getElementById('detailsModalTitle');
    const detailsContentDiv = document.getElementById('detailsModalContent');
    
    if (!modal || !modalTitleElement || !detailsContentDiv) {
        console.error('Elementos do modal de detalhes (detailsModal, detailsModalTitle, detailsModalContent) não encontrados no DOM.');
        showModernErrorNotification('Erro interno: Componentes do modal não encontrados. Verifique o console.');
        return;
    }
    
    // 3. Limpar conteúdo anterior e definir título
    detailsContentDiv.innerHTML = '';
    modalTitleElement.textContent = modalTitle; // Atualiza o título do modal

    let html = '';

    // 4. Construir o Cabeçalho Resumido
    const mainValue = itemToDisplay.paidAmount || itemToDisplay.value || itemToDisplay.totalValue || 0;
    const mainName = itemToDisplay.favoredName || originalParentItem?.vendor || 'N/A';

    html += `
        <div class="order-summary-header">
            <span class="favored-name-highlight">${escapeForHTML(mainName)}</span> |
            <span class="payment-value-highlight">${formatCurrency(mainValue)}</span>
        </div>
    `;

    // 5. Construir o Grid de Detalhes Principais
    html += `<div class="details-grid">`;
    // Linha Tipo
    let displayedItemType = '';
    if (itemType === 'boleto_full') displayedItemType = 'Boleto Total';
    else if (itemType === 'boleto_parcel') displayedItemType = `Boleto - Parcela ${itemToDisplay.parcelNumber}`;
    else if (itemType === 'order') displayedItemType = itemToDisplay.paymentType || 'Ordem de Pagamento';
    else if (itemType === 'salary') displayedItemType = itemToDisplay.type || 'Salário/Auxílio';

    html += `<div class="details-grid-item"><span class="details-label">Tipo:</span><span class="details-value">${escapeForHTML(displayedItemType)}</span></div>`;
    html += `<div class="details-grid-item"><span class="details-label">Status:</span><span class="status-badge status-paga">Paga</span></div>`;
    html += `<div class="details-grid-item"><span class="details-label">Processo:</span><span class="details-value">${escapeForHTML(itemToDisplay.process || originalParentItem?.process || 'N/A')}</span></div>`;
    html += `<div class="details-grid-item"><span class="details-label">Empresa:</span><span class="details-value">${escapeForHTML(itemToDisplay.company || originalParentItem?.company || 'N/A')}</span></div>`;
    
    // Data de Pagamento (para boletos, paidAt é mais preciso, para ordens paymentCompletionDate)
    const displayPaymentDate = itemToDisplay.paidAt || itemToDisplay.paymentCompletionDate || itemToDisplay.paymentDate || 'N/A';
    html += `<div class="details-grid-item"><span class="details-label">Data Pagamento:</span><span class="details-value">${formatDate(displayPaymentDate)}</span></div>`;
    
    // Campos específicos por tipo de item
    if (itemType === 'order') {
        html += `<div class="details-grid-item"><span class="details-label">Prioridade:</span><span class="details-value">${escapeForHTML(itemToDisplay.priority || 'Normal')}</span></div>`;
        html += `<div class="details-grid-item"><span class="details-label">Solicitante:</span><span class="details-value">${escapeForHTML(itemToDisplay.solicitant || 'N/A')}</span></div>`;
        html += `<div class="details-grid-item full-width"><span class="details-label">Referência:</span><span class="details-value">${escapeForHTML(itemToDisplay.reference || 'N/A')}</span></div>`;
        html += `<div class="details-grid-item full-width"><span class="details-label">Observação:</span><span class="details-value">${escapeForHTML(itemToDisplay.observation || 'N/A')}</span></div>`;
    } else if (itemType === 'boleto_full' || itemType === 'boleto_parcel') {
        html += `<div class="details-grid-item"><span class="details-label">Direcionamento:</span><span class="details-value">${escapeForHTML(originalParentItem?.direction || 'N/A')}</span></div>`;
        // Linha Digitável
        if (originalParentItem?.linhaDigitavel) {
             html += `<div class="details-grid-item full-width"><span class="details-label">Linha Digitável:</span><span class="details-value">${escapeForHTML(originalParentItem.linhaDigitavel)}</span></div>`;
        } else if (itemToDisplay?.linhaDigitavel) { // Caso a linha digitavel esteja diretamente na parcela
            html += `<div class="details-grid-item full-width"><span class="details-label">Linha Digitável:</span><span class="details-value">${escapeForHTML(itemToDisplay.linhaDigitavel)}</span></div>`;
        } else {
             html += `<div class="details-grid-item full-width"><span class="details-label">Linha Digitável:</span><span class="details-value">N/A</span></div>`;
        }
        
        const boletoObservation = originalParentItem?.observation || itemToDisplay?.observation || 'N/A';
        html += `<div class="details-grid-item full-width"><span class="details-label">Observação:</span><span class="details-value">${escapeForHTML(boletoObservation)}</span></div>`;
        // Adicionar observação específica do pagamento da parcela, se houver
        if (itemType === 'boleto_parcel' && itemToDisplay.paymentObservation) {
             html += `<div class="details-grid-item full-width"><span class="details-label">Observação do Pagamento:</span><span class="details-value">${escapeForHTML(itemToDisplay.paymentObservation)}</span></div>`;
        }

    } else if (itemType === 'salary') {
        // Para salários, o 'month' pode ser 'YYYY-MM' ou 'YYYY-13-PX'
        const { year: salaryYear, monthPartDisplay: salaryMonthDisplay } = extractYearAndMonthPartFromBackend(itemToDisplay.month);
        const displayMonthYear = salaryMonthDisplay && salaryYear ? `${salaryMonthDisplay} / ${salaryYear}` : 'N/A';

        html += `<div class="details-grid-item"><span class="details-label">Mês/Ano:</span><span class="details-value">${escapeForHTML(displayMonthYear)}</span></div>`;
        html += `<div class="details-grid-item"><span class="details-label">Banco:</span><span class="details-value">${escapeForHTML(itemToDisplay.bank || 'N/A')}</span></div>`;
        html += `<div class="details-grid-item"><span class="details-label">Agência:</span><span class="details-value">${escapeForHTML(itemToDisplay.agency || 'N/A')}</span></div>`;
        html += `<div class="details-grid-item"><span class="details-label">Conta:</span><span class="details-value">${escapeForHTML(itemToDisplay.account || 'N/A')}</span></div>`;
        html += `<div class="details-grid-item"><span class="details-label">Operação:</span><span class="details-value">${escapeForHTML(itemToDisplay.operation || 'N/A')}</span></div>`;
    }
    html += `</div>`; // Fim do details-grid

    // 6. Seções de Comprovantes e Histórico
    // Renderiza o boleto original ou comprovante da ordem/parcela
    if (itemType === 'order') {
        if (originalParentItem.paymentProofData) { // Se a ordem tem comprovante direto (PIX/Outros)
            html += await renderProofSection(originalParentItem.paymentProofData, originalParentItem.paymentProofFileName, originalParentItem.paymentProofMimeType, 'Comprovante de Pagamento', originalParentItem.id, 'payment_proof_order');
        }
    } else if (itemType === 'boleto_full' || itemType === 'boleto_parcel') {
        // O boleto original é o mesmo para o boleto completo e para suas parcelas
        if (originalParentItem?.file_name && originalParentItem?.id) { // Verifica se há um arquivo associado ao boleto pai
            // Usa 'null' para base64Data para forçar a busca via API (get_boleto_original_file.php)
            html += await renderProofSection(null, originalParentItem.file_original_name, 'application/pdf', 'Boleto Original', originalParentItem.id, 'boleto_original_from_db');
        }
        // Comprovante da parcela específica, se for uma parcela e tiver comprovante
        if (itemType === 'boleto_parcel' && itemToDisplay.proofFileName && itemToDisplay.id) {
            html += await renderProofSection(null, itemToDisplay.proofFileName, getMimeTypeFromFileName(itemToDisplay.proofFileName), 'Comprovante da Parcela', originalParentItem.id, 'payment_proof_boleto_parcel', itemToDisplay.id);
        }
    } else if (itemType === 'salary') {
        // Se salários tiverem comprovantes (ex: contra-cheque), adicionar lógica aqui
        // Exemplo: if (itemToDisplay.salaryProofData) { html += await renderProofSection(...); }
    }

    // Histórico de pagamentos (se aplicável)
    if (itemType === 'order' && originalParentItem.payments && originalParentItem.payments.length > 0) {
        html += renderPaymentHistorySection(originalParentItem.payments, originalParentItem.id);
    } else if ((itemType === 'boleto_full' || itemType === 'boleto_parcel') && originalParentItem?.parcels && originalParentItem.parcels.length > 0) {
        html += renderBoletoParcelsHistorySection(originalParentItem.parcels, originalParentItem.id, itemType === 'boleto_parcel' ? itemToDisplay.id : null);
    }
    
    // 7. Inserir HTML e exibir o modal
    detailsContentDiv.innerHTML = html;
    modal.style.display = 'block'; // Exibe o modal

    // Rolagem suave para o topo do modal (se o conteúdo for muito grande)
    setTimeout(() => {
        const modalContentElement = modal.querySelector('.modal-content');
        if (modalContentElement) {
            modalContentElement.scrollTop = 0;
        }
    }, 100);
}

// --- Funções Auxiliares para Renderização de Seções no Modal ---

// NOVO: Renderiza a seção de um comprovante/arquivo (reutilizável)
// O `base64Data` pode ser `null`, indicando que o arquivo deve ser buscado via API
async function renderProofSection(base64Data, fileName, mimeType, title, itemId, type, parcelId = null) {
    let finalBase64Data = base64Data;
    let finalFileName = fileName;
    let finalMimeType = mimeType;
    let fetchFromDbOnClick = false; // Flag para indicar se o JS deve buscar o arquivo ao clicar
    let idForFetch = itemId; // ID a ser usado para buscar (boleto_id ou parcel_id)

    // Se `base64Data` é null, os botões deverão chamar as funções que buscam do DB
    if (!finalBase64Data && (type === 'boleto_original_from_db' || type === 'payment_proof_boleto_parcel')) {
        fetchFromDbOnClick = true;
        if (type === 'payment_proof_boleto_parcel') idForFetch = parcelId; // Se for comprovante de parcela
    }
    
    // HTML da seção de comprovante
    let proofSectionHtml = `
        <div class="details-attachment-card">
            <h3><i class="icon-attachment"></i> ${title}</h3>
    `;
    
    if (finalFileName) { // Se pelo menos o nome do arquivo for conhecido
        const sizeString = finalBase64Data ? `(${getFileSizeFromBase64(finalBase64Data)} MB)` : '';
        proofSectionHtml += `
            <div class="details-attachment-info">
                <span class="details-attachment-filename">${escapeForHTML(finalFileName)}</span>
                <span class="details-attachment-size">${sizeString}</span>
            </div>
            <div class="details-attachment-actions">
                <button class="btn btn-info btn-view" onclick="${fetchFromDbOnClick ? `viewFile(null, null, '${escapeForHTML(finalFileName)}', '${escapeForHTML(idForFetch)}')` : `viewFileInNewTab('${escapeForHTML(finalBase64Data)}', '${escapeForHTML(finalMimeType)}', '${escapeForHTML(finalFileName)}')`}"><i class="fas fa-eye"></i> Visualizar</button>
                <button class="btn btn-success btn-download" onclick="${fetchFromDbOnClick ? `downloadFile(null, null, '${escapeForHTML(finalFileName)}', '${escapeForHTML(idForFetch)}')` : `downloadFileFromBase64('${escapeForHTML(finalBase64Data)}', '${escapeForHTML(finalFileName)}', '${escapeForHTML(finalMimeType)}')`}"><i class="fas fa-download"></i> Baixar</button>
            </div>
        `;
    } else {
        proofSectionHtml += `<p>Nenhum ${title.toLowerCase()} disponível.</p>`;
    }
    proofSectionHtml += `</div>`;
    return proofSectionHtml;
}

// NOVO: Renderiza a seção de histórico de pagamentos para Ordens (pagamentos parciais)
function renderPaymentHistorySection(payments, orderId) {
    let historyHtml = `
        <div class="details-card-history">
            <h3><i class="icon-history"></i> Histórico de Pagamentos Parciais da Ordem</h3>
            <div style="overflow-x: auto;">
                <table class="orders-table">
                    <thead>
                        <tr>
                            <th>Valor</th>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th>Comprovante</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    payments.forEach((p, index) => {
        historyHtml += `
            <tr>
                <td>${formatCurrency(p.amount)}</td>
                <td>${formatDate(p.date)}</td>
                <td>${escapeForHTML(p.description || 'N/A')}</td>
                <td>
                    ${p.proofData ? 
                        `<button class="btn btn-info btn-small" onclick="viewFileInNewTab('${escapeForHTML(p.proofData)}', '${escapeForHTML(getMimeTypeFromBase64(p.proofData))}', 'Comprovante_Pagto_Parcial_${orderId}_${index+1}.pdf')"><i class="fas fa-eye"></i> Ver</button>
                         <button class="btn btn-success btn-small" onclick="downloadFileFromBase64('${escapeForHTML(p.proofData)}', 'Comprovante_Pagto_Parcial_${orderId}_${index+1}.pdf', '${escapeForHTML(getMimeTypeFromBase64(p.proofData))}')"><i class="fas fa-download"></i> Baixar</button>`
                        : `N/A`}
                </td>
            </tr>
        `;
    });
    historyHtml += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    return historyHtml;
}

// `highlightParcelId` é o ID da parcela que está sendo visualizada no momento (para destaque)
function renderBoletoParcelsHistorySection(parcels, boletoId, highlightParcelId = null) {
    let historyHtml = `
        <div class="details-card-history">
            <h3><i class="icon-history"></i> Histórico de Parcelas do Boleto</h3>
            <div style="overflow-x: auto;">
                <table class="orders-table">
                    <thead>
                        <tr>
                            <th>Nº</th>
                            <th>Vencimento</th>
                            <th>Valor</th>
                            <th>Status</th>
                            <th>Data Pgto</th>
                            <th>Comprovante</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    parcels.forEach((parcel) => {
        const statusText = parcel.isPaid ? '<span class="status-badge status-paga">Paga</span>' : '<span class="status-badge status-pendente">Pendente</span>';
        const paymentDate = parcel.isPaid ? formatDate(parcel.paidAt || parcel.paymentDate) : 'N/A';
        const rowClass = parcel.id === highlightParcelId ? 'highlight-current-parcel' : ''; // Para destacar a parcela atual
        const proofButtons = parcel.isPaid && parcel.proofFileName ?
            `<button class="btn btn-info btn-small" onclick="viewFile(null, null, '${escapeForHTML(parcel.proofFileName)}', '${escapeForHTML(parcel.id)}')"><i class="fas fa-eye"></i> Ver</button>
             <button class="btn btn-success btn-small" onclick="downloadFile(null, null, '${escapeForHTML(parcel.proofFileName)}', '${escapeForHTML(parcel.id)}')"><i class="fas fa-download"></i> Baixar</button>`
            : 'N/A';

        historyHtml += `
            <tr class="${rowClass}">
                <td>${parcel.parcelNumber}</td>
                <td>${formatDate(parcel.dueDate)}</td>
                <td>${formatCurrency(parcel.value)}</td>
                <td>${statusText}</td>
                <td>${paymentDate}</td>
                <td>${proofButtons}</td>
            </tr>
        `;
    });
    historyHtml += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    return historyHtml;
}


function viewPaymentProof(orderId, paymentIndex) {
    const order = orders.find(o => o.id === orderId) || allOrders.find(o => o.id === orderId);
    if (!order || !order.payments || !order.payments[paymentIndex]) {
        alert('Comprovante não encontrado.');
        return;
    }
    
    const payment = order.payments[paymentIndex];
    if (!payment.proofData) {
        alert('Comprovante não disponível.');
        return;
    }
    
    const link = document.createElement('a');
    link.href = payment.proofData;
    link.download = payment.proofFileName || `comprovante_${orderId}_${paymentIndex + 1}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function addSalary() {
    if (!canManageSalaries()) {
        alert('Você não tem permissão para cadastrar salários/auxílios.');
        return;
    }
    
    const isProcessValid = validateProcessSelection('salaryProcess', 'processesList');
    if (!isProcessValid) {
        return;  // Bloqueia o envio
    }
    
    const type = document.getElementById('salaryType').value;
    const favoredName = document.getElementById('salaryFavoredName').value.trim();
    const bank = document.getElementById('salaryBank').value.trim();
    const agency = document.getElementById('salaryAgency').value.trim();
    const account = document.getElementById('salaryAccount').value.trim();
    const value = parseFloat(document.getElementById('salaryValue').value);
    const operation = document.getElementById('salaryOperation').value.trim();
    const process = document.getElementById('salaryProcess').value.trim();
    
    // NOVO: Lendo dos novos campos de Ano e Mês (dropdown)
    const year = parseInt(document.getElementById('salaryYearInput').value);
    const monthPart = document.getElementById('salaryMonthSelect').value; // Ex: "01", "13-P1"

    // Validações
    if (!type || !favoredName || !bank || !agency || !account || isNaN(value) || value <= 0 || isNaN(year) || !monthPart) {
        alert('Por favor, preencha todos os campos obrigatórios (Tipo, Favorecido, Banco, Agência, Conta, Valor, Ano, Mês).');
        return;
    }
    if (year < 1900 || year > 2100) {
        alert('Por favor, insira um ano válido (entre 1900 e 2100).');
        return;
    }

    // Constrói a string do mês no formato esperado pelo backend (AAAA-MM ou AAAA-13-PX)
    const monthBackendString = formatMonthAndPartToBackend(year, monthPart);
    if (!monthBackendString) {
        alert('Erro ao formatar o mês para o backend. Verifique a seleção de Ano e Mês.');
        return;
    }
    
    const newSalary = {
        id: generateId(),
        type: type,
        favoredName: favoredName,
        bank: bank,
        agency: agency,
        account: account,
        operation: operation || null,
        process: process || null,
        value: value,
        month: monthBackendString, // Usa a string formatada para o backend
        createdBy: currentUser.role,
        createdAt: new Date().toISOString()
    };
    
    salaries.unshift(newSalary);
    localStorage.setItem('salaries', JSON.stringify(salaries));
    displaySalaries();
    
    // Limpa o formulário e define defaults
    document.getElementById('salaryForm').reset();
    document.getElementById('salaryYearInput').value = new Date().getFullYear();
    document.getElementById('salaryMonthSelect').value = ''; // Reseta o dropdown
    
    try {
        const response = await fetch(`${API_BASE_URL}/add_salary.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSalary)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (!data.success) {
                console.warn('Erro reportado pela API ao sincronizar salário:', data.error);
                alert('Salário/Auxílio cadastrado localmente, mas houve um erro no servidor: ' + (data.error || 'Erro desconhecido.'));
            } else {
                 console.log('Salário/Auxílio sincronizado com API:', data);
                 displayReports2();
            }
        } else {
            const errorText = await response.text();
            console.warn('Erro HTTP ao sincronizar salário com API:', response.status, errorText);
            alert('Salário/Auxílio cadastrado localmente, mas houve um erro de conexão com o servidor. Verifique sua internet.');
        }
    } catch (error) {
        console.error('Erro de conexão com API ao adicionar salário:', error);
        alert('Salário/Auxílio cadastrado localmente, mas houve um erro de conexão com o servidor. Verifique sua internet.');
    }
    
    alert('Salário/Auxílio cadastrado com sucesso!');
}
async function editSalary(salaryId) {
    if (!canManageSalaries()) {
        alert('Você não tem permissão para editar salários/auxílios.');
        return;
    }
    
    const salary = salaries.find(s => s.id === salaryId);
    if (!salary) {
        alert('Salário/Auxílio não encontrado.');
        return;
    }

    // EXTRAI O ANO E A PARTE DO MÊS (01-12, 13-P1, 13-P2)
    const { year, monthPart, monthPartDisplay } = extractYearAndMonthPartFromBackend(salary.month);

    editingSalaryId = salaryId; 
    
    const editFormHtml = `
        <form id="editSalaryFormElement">
            <div class="form-row">
                <div class="form-group">
                    <label for="editSalaryType">Tipo <span class="required">*</span></label>
                    <select id="editSalaryType" required>
                        <option value="Salário" ${salary.type === 'Salário' ? 'selected' : ''}>Salário</option>
                        <option value="Auxílio" ${salary.type === 'Auxílio' ? 'selected' : ''}>Auxílio</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editSalaryFavoredName">Nome do Favorecido <span class="required">*</span></label>
                    <input type="text" id="editSalaryFavoredName" value="${salary.favoredName}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="editSalaryBank">Banco <span class="required">*</span></label>
                    <input type="text" id="editSalaryBank" value="${salary.bank}" required>
                </div>
                <div class="form-group">
                    <label for="editSalaryAgency">Agência <span class="required">*</span></label>
                    <input type="text" id="editSalaryAgency" value="${salary.agency}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="editSalaryAccount">Conta <span class="required">*</span></label>
                    <input type="text" id="editSalaryAccount" value="${salary.account}" required>
                </div>
                <div class="form-group">
                    <label for="editSalaryOperation">N° de Operação</label>
                    <input type="text" id="editSalaryOperation" value="${salary.operation || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="editSalaryProcess">Processo</label>
                    <input type="text" id="editSalaryProcess" value="${salary.process || ''}">
                </div>
                <div class="form-group">
                    <label for="editSalaryValue">Valor <span class="required">*</span></label>
                    <input type="number" id="editSalaryValue" step="0.01" value="${salary.value}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="editSalaryYearInput">Ano <span class="required">*</span></label>
                    <input type="number" id="editSalaryYearInput" required min="1900" max="2100" value="${year}">
                </div>
                <div class="form-group">
                    <label for="editSalaryMonthSelect">Mês <span class="required">*</span></label>
                    <select id="editSalaryMonthSelect" required>
                        <!-- Opções preenchidas via JavaScript -->
                    </select>
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-success" onclick="saveEditSalary()">Salvar Alterações</button>
                <button type="button" class="btn btn-secondary" onclick="closeEditSalaryModal()">Cancelar</button>
            </div>
        </form>
    `;
    
    document.getElementById('editSalaryForm').innerHTML = editFormHtml;
    document.getElementById('editSalaryModal').style.display = 'block';

    // NOVO: Popula o dropdown de mês no modal de edição e seleciona o mês correto
    populateMonthSelect('editSalaryMonthSelect');
    if (document.getElementById('editSalaryMonthSelect')) {
        document.getElementById('editSalaryMonthSelect').value = monthPart;
    }
}

async function saveEditSalary() {
    if (!editingSalaryId) return;
    
    const salary = salaries.find(s => s.id === editingSalaryId);
    if (!salary) {
        alert('Salário/Auxílio não encontrado.');
        return;
    }
    
    const type = document.getElementById('editSalaryType').value;
    const favoredName = document.getElementById('editSalaryFavoredName').value.trim();
    const bank = document.getElementById('editSalaryBank').value.trim();
    const agency = document.getElementById('editSalaryAgency').value.trim();
    const account = document.getElementById('editSalaryAccount').value.trim();
    const value = parseFloat(document.getElementById('editSalaryValue').value);
    
    // NOVO: Lendo dos novos campos de Ano e Mês (dropdown) do modal de edição
    const year = parseInt(document.getElementById('editSalaryYearInput').value);
    const monthPart = document.getElementById('editSalaryMonthSelect').value; // Ex: "01", "13-P1"

    if (!type || !favoredName || !bank || !agency || !account || isNaN(value) || value <= 0 || isNaN(year) || !monthPart) {
        alert('Por favor, preencha todos os campos obrigatórios (Tipo, Favorecido, Banco, Agência, Conta, Valor, Ano, Mês).');
        return;
    }
    if (year < 1900 || year > 2100) {
        alert('Por favor, insira um ano válido (entre 1900 e 2100).');
        return;
    }

    // Constrói a string do mês no formato esperado pelo backend (AAAA-MM ou AAAA-13-PX)
    const monthBackendString = formatMonthAndPartToBackend(year, monthPart);
    if (!monthBackendString) {
        alert('Erro ao formatar o mês para o backend. Verifique a seleção de Ano e Mês.');
        return;
    }
    
    const updatedFields = {
        type: type,
        favoredName: favoredName,
        bank: bank,
        agency: agency,
        account: account,
        operation: document.getElementById('editSalaryOperation').value.trim() || null,
        process: document.getElementById('editSalaryProcess').value.trim() || null,
        value: value,
        month: monthBackendString // Usa a string formatada para o backend
    };
    
    Object.assign(salary, updatedFields);

    try {
        const response = await fetch(`${API_BASE_URL}/update_salary.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: editingSalaryId,
                ...updatedFields
            })
        });
        const data = await response.json();
        if (data.success) {
            console.log('Edição de salário sincronizada com API');
        } else {
            console.warn('Erro ao sincronizar edição de salário com API:', data.error);
        }
    } catch (error) {
        console.warn('Erro de conexão, mantendo dados locais', error);
    }
    
    displaySalaries();
    displayReports2();
    closeEditSalaryModal();
    
    alert('Salário/Auxílio atualizado com sucesso!');
}

async function deleteSalary(salaryId) {
    if (!canManageSalaries()) {
        alert('Você não tem permissão para excluir salários/auxílios.');
        return;
    }
    
    const salary = salaries.find(s => s.id === salaryId);
    if (!salary) {
        alert('Salário/Auxílio não encontrado.');
        return;
    }
    
    if (!confirm(`Tem certeza que deseja excluir o ${salary.type.toLowerCase()} de "${salary.favoredName}"?`)) {
        return;
    }
    
    salaries = salaries.filter(s => s.id !== salaryId);

    try {
        const response = await fetch(`${API_BASE_URL}/delete_salary.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: salaryId })
        });
        const data = await response.json();
        if (data.success) {
            console.log('Exclusão de salário sincronizada com API');
        } else {
            console.warn('Erro ao sincronizar exclusão de salário com API:', data.error);
        }
    } catch (error) {
        console.warn('Erro de conexão, mantendo dados locais', error);
    }
    
    displaySalaries();
    displayReports2();
    
    alert('Salário/Auxílio excluído com sucesso!');
}

function toggleBackupSection() {
    const section = document.getElementById('backupSection');
    if (section.style.display === 'none' || !section.style.display) {
        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }
}

async function performBackup() {
    if (!canManageBackup()) {
        alert('Você não tem permissão para gerenciar backup.');
        return;
    }
    
    const startDate = document.getElementById('backupStartDate').value;
    const endDate = document.getElementById('backupEndDate').value;
    
    if (!startDate || !endDate) {
        alert('Por favor, informe as datas inicial e final.');
        return;
    }
    
    if (startDate > endDate) {
        alert('A data inicial não pode ser maior que a data final.');
        return;
    }
    
    const ordersToBackup = orders.filter(order => {
        if (order.status !== 'Paga') return false;
        const completionDate = order.paymentCompletionDate;
        if (!completionDate) return false;
        return completionDate >= startDate && completionDate <= endDate;
    });
    
    if (ordersToBackup.length === 0) {
        alert('Nenhuma ordem paga encontrada no período especificado.');
        return;
    }
    
    if (!confirm(`Retirar ${ordersToBackup.length} ordens pagas da visualização? Esta ação pode ser desfeita.`)) {
        return;
    }
    
    try {
        const backupIds = ordersToBackup.map(order => order.id);
        const response = await fetch(`${API_BASE_URL}/backup_orders.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderIds: backupIds })
        });

        const data = await response.json();
        
        if (data.success) {

            await loadFullOrdersList();

            updateCounters();
            updateDetailedCounters(); // Garante que os contadores são atualizados
            displayOrders(); // Atualiza a aba principal de ordens
            displayPaidOrders(); // Atualiza a aba de ordens pagas (onde o backup é feito)
            displayPendingOrders(); // Atualiza ordens pendentes
            
            alert(`${ordersToBackup.length} ordens foram retiradas da visualização com sucesso!`);
            console.log(`✅ ${ordersToBackup.length} ordens foram arquivadas no banco de dados e removidas da visualização.`);
        } else {
            alert('Erro ao realizar backup: ' + data.error);
        }
    } catch (error) {
        console.error('Erro de conexão ao realizar backup:', error);
        alert('Erro de conexão ao realizar backup.');
    }
}

// Exportar ordens de pagamento para Excel
function exportToExcel() {
    console.log('%c[DEBUG_EXPORT] Preparing Orders Excel export...', 'color: green; font-weight: bold;');
    const filteredOrders = getFilteredOrders(); // Usa a função de filtro de ordens existente

    if (filteredOrders.length === 0) {
        alert('Nenhuma ordem de pagamento para exportar após os filtros.');
        return;
    }

    // Usar UTF-8 com BOM para garantir caracteres especiais corretos no Excel
    // Usar ponto e vírgula como delimitador, mais comum em versões brasileiras do Excel
    let csvContent = 'data:text/csv;charset=utf-8,%EF%BB%BF'; // %EF%BB%BF é o BOM para UTF-8
    const delimiter = ';'; // Delimitador agora é ponto e vírgula

    // Adicionar cabeçalho
    csvContent += [
        'Favorecido',
        'Valor',
        'Tipo',
        'Prioridade',
        'Status',
        'Data Geracao',
        'Previsao',
        'Processo',
        'Direcionamento',
        'Solicitante'
    ].map(header => `"${header}"`).join(delimiter) + '\n';

    filteredOrders.forEach(order => {
        const fields = [
            order.favoredName,
            parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, useGrouping: false }), // Formato numérico para Excel
            order.paymentType,
            order.priority,
            order.status,
            formatDate(order.generationDate), // Garante DD/MM/YYYY
            order.paymentForecast ? formatDate(order.paymentForecast) : '', // Garante DD/MM/YYYY
            order.process || '',
            order.direction || '',
            order.solicitant || ''
        ];

        const row = fields.map(field => {
            const stringField = String(field);
            // Duplica as aspas internas e envolve o campo inteiro em aspas
            return `"${stringField.replace(/"/g, '""')}"`;
        }).join(delimiter) + '\n';
        
        csvContent += row;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ordens_pagamento_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('%c[DEBUG_EXPORT] Orders Excel export initiated.', 'color: green;');
}

// ATUALIZADA: Exportar itens pagos (ordens e boletos) para Excel com somatórios específicos
function exportPaidToExcel() {
    const allPaidItemsForExport = getPaidFilteredItemsForExport(); 
    
    if (allPaidItemsForExport.length === 0) {
        alert('Nenhum item pago (ordem ou boleto) para exportar após os filtros da aba "Ordens Pagas".');
        return;
    }
    
    let csvContent = 'data:text/csv;charset=utf-8,%EF%BB%BF';
    const delimiter = ';';

    csvContent += [
        'Favorecido',
        'Tipo de Pagamento',
        'Processo',
        'Data Pagamento',
        'Valor Original (Item)',
        'Valor Pago (Item)'
    ].map(header => `"${header}"`).join(delimiter) + '\n';

    let totalBoletosPaid = 0;           
    let grandTotalPaid = 0;             

    let totalOrdersOnlyPaid = 0;
    const processOrdersOnlySums = new Map(); // Somatório de 'order' por Processo
    const processBoletosOnlySums = new Map(); // NOVO: Somatório de 'boleto_parcel' por Processo

    allPaidItemsForExport.forEach(item => {
        // Este bloco substitui o anterior que usava 'order' indevidamente
        // Ele usa as propriedades do objeto 'item', que é a variável correta de iteração
        const fields = [
            item.favoredName || '', // Nome do favorecido/fornecedor
            item.paymentType || '', // Tipo de pagamento (Ordem/Boleto)
            item.process || '',     // Processo
            formatDate(item.paymentDate), // Data de pagamento (já processada)
            parseFloat(item.originalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, useGrouping: false }), // Valor original do item
            parseFloat(item.paidAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, useGrouping: false }) // Valor efetivamente pago pelo item
        ];
        
        const row = fields.map(field => {
            const stringField = String(field);
            return `"${stringField.replace(/"/g, '""')}"`;
        }).join(delimiter) + '\n';
        
        csvContent += row;

    });

    // --- Adiciona linhas de resumo ao final do CSV ---
    csvContent += '\n'; // Linha vazia para separação visual
    csvContent += `"RESUMOS GERAIS:",,,,\n`;
    csvContent += `"Valor Total Geral Pago (Ordens + Boletos)",,,,,"${parseFloat(grandTotalPaid).toLocaleString('pt-BR', { minimumFractionDigits: 2, useGrouping: false })}"\n`;
    csvContent += `"Valor Total Pago (Somente Boletos)",,,,,"${parseFloat(totalBoletosPaid).toLocaleString('pt-BR', { minimumFractionDigits: 2, useGrouping: false })}"\n`;
    csvContent += `"Valor Total Pago (Somente Ordens de Pagamento)",,,,,"${parseFloat(totalOrdersOnlyPaid).toLocaleString('pt-BR', { minimumFractionDigits: 2, useGrouping: false })}"\n`;

    csvContent += `\n"Somatórios por Processo (Somente Boletos):",,,,\n`; // NOVO TÍTULO
    processBoletosOnlySums.forEach((sum, processName) => { // NOVO MAP
        csvContent += `"${processName}",,,,,"${parseFloat(sum).toLocaleString('pt-BR', { minimumFractionDigits: 2, useGrouping: false })}"\n`;
    });

    csvContent += `\n"Somatórios por Processo (Somente Ordens de Pagamento):",,,,\n`;
    processOrdersOnlySums.forEach((sum, processName) => {
        csvContent += `"${processName}",,,,,"${parseFloat(sum).toLocaleString('pt-BR', { minimumFractionDigits: 2, useGrouping: false })}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `itens_pagos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Localize a sua função exportPaidToPDF e substitua-a por esta
function exportPaidToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Obtém os itens pagos já filtrados (reutiliza a lógica existente)
    const paidItems = getPaidFilteredItemsForExport(); // Esta função já aplica os filtros

    if (paidItems.length === 0) {
        alert('Nenhum item pago para exportar após os filtros para gerar o PDF.');
        return;
    }
    
    doc.setFontSize(16);
    doc.text('Relatório de Itens Pagos (Filtrado)', 20, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 30);

    // =======================================================
    // NOVO BLOCO: COLETAR E EXIBIR OS CRITÉRIOS DE FILTRO NO PDF
    // =======================================================
    let filterInfoY = 40; // Posição Y inicial para as informações dos filtros
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal"); // Define a fonte para "normal" para os filtros

    // Data de Pagamento
    const startDateRaw = document.getElementById('paidFilterStartDate')?.value || '';
    const endDateRaw = document.getElementById('paidFilterEndDate')?.value || '';
    const periodText = `Período: ${startDateRaw ? formatDate(startDateRaw) : 'Início'} a ${endDateRaw ? formatDate(endDateRaw) : 'Fim'}`;
    doc.text(periodText, 20, filterInfoY);
    filterInfoY += 5;

    // Favorecido
    const paidFavoredFilterSelect = document.getElementById('paidFavoredFilter');
    const favoredText = paidFavoredFilterSelect?.selectedOptions[0]?.textContent || 'Todos';
    doc.text(`Favorecido: ${favoredText}`, 20, filterInfoY);
    filterInfoY += 5;

    // Solicitante
    const paidSolicitantFilterSelect = document.getElementById('paidSolicitantFilter');
    const solicitantText = paidSolicitantFilterSelect?.selectedOptions[0]?.textContent || 'Todos';
    doc.text(`Solicitante: ${solicitantText}`, 20, filterInfoY);
    filterInfoY += 5;

    // Processo (multi-seleção, requer tratamento especial)
    // Obter todos os checkboxes de processo marcados
    const selectedProcessCheckboxes = Array.from(document.querySelectorAll('#paidOrdersProcessFilterCheckboxesContainer input[type="checkbox"]:checked'));
    let processText;
    if (selectedProcessCheckboxes.length === 0 || (selectedProcessCheckboxes.length === 1 && selectedProcessCheckboxes[0].value === '')) {
        // Se nada selecionado OU apenas a opção 'Todos os processos' está selecionada
        processText = 'Todos';
    } else {
        // Mapeia os valores para texto e junta com vírgula
        processText = selectedProcessCheckboxes
                        .filter(cb => cb.value !== '') // Ignora a opção 'Todos' se outros estiverem selecionados
                        .map(cb => cb.value)
                        .join(', ');
    }
    doc.text(`Processo: ${processText}`, 20, filterInfoY);
    filterInfoY += 5;

    // Empresa
    const paidFilterCompanySelect = document.getElementById('paidFilterCompany');
    const companyText = paidFilterCompanySelect?.selectedOptions[0]?.textContent || 'Todas';
    doc.text(`Empresa: ${companyText}`, 20, filterInfoY);
    filterInfoY += 5;
    
    // Tipo de Pagamento
    const paidFilterPaymentTypeSelect = document.getElementById('paidFilterPaymentType');
    const paymentTypeText = paidFilterPaymentTypeSelect?.selectedOptions[0]?.textContent || 'Todos';
    doc.text(`Tipo de Pagamento: ${paymentTypeText}`, 20, filterInfoY);
    filterInfoY += 5;

    // Prioridade
    const paidFilterPrioritySelect = document.getElementById('paidFilterPriority');
    const priorityText = paidFilterPrioritySelect?.selectedOptions[0]?.textContent || 'Todas';
    doc.text(`Prioridade: ${priorityText}`, 20, filterInfoY);
    filterInfoY += 5;

    filterInfoY += 5; // Adiciona um pequeno espaço antes da tabela

    // Define a fonte de volta para "bold" para o cabeçalho da tabela
    doc.setFont("helvetica", "bold"); 
    // =======================================================
    // FIM DO NOVO BLOCO
    // =======================================================

    const tableData = paidItems.map(item => {
        let favoredName = item.favoredName || 'N/A';
        let type = '';
        if (item.itemType === 'order') {
            type = item.paymentType || 'Ordem';
        } else if (item.itemType === 'salary') {
            type = item.paymentType || 'Salário'; // paymentType aqui já é Salário/Auxílio
        } else if (item.itemType === 'boleto_full') {
            type = 'Boleto Total';
        } else if (item.itemType === 'boleto_parcel') {
            type = `Boleto - Parcela ${item.parcelaAtual?.parcelNumber || 'N/A'}`;
        }
        
        return [
            favoredName,
            formatCurrency(item.paidAmount),
            type,
            item.priority || 'Normal',
            item.solicitant || 'N/A',
            item.process || 'N/A',
            item.company || 'N/A',
            formatDate(item.paymentDate)
        ];
    });

    doc.autoTable({
        head: [['Favorecido', 'Valor', 'Tipo', 'Prioridade', 'Solicitante', 'Processo', 'Empresa', 'Data Pgto']],
        body: tableData,
        startY: filterInfoY, // A tabela começa após as informações dos filtros
        styles: { fontSize: 8, cellPadding: 2,  overflow: 'linebreak' },
        headStyles: { fillColor: [52, 73, 94], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            1: { halign: 'right', cellWidth: 30,  overflow: 'hidden' } // Alinha a coluna de valor à direita
        }
    });

    const totalValue = paidItems.reduce((sum, item) => sum + parseFloat(item.paidAmount || 0), 0);
    let finalY = doc.autoTable.previous.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Valor Total dos Itens Pagos: ${formatCurrency(totalValue)}`, 20, finalY);

    doc.save(`itens_pagos_filtrados_${new Date().toISOString().split('T')[0]}.pdf`);
    
    showDownloadFeedback(`Relatório de Itens Pagos.pdf`);
    console.log('✅ PDF de itens pagos exportado com filtros.');
}

// ===== ATUALIZAR TOTAL DE ENTRADAS DE ACORDO COM PROCESSO SELECIONADO =====

function updateTotalEntradasByProcess() {
    console.log('🔄 [updateTotalEntradasByProcess] Iniciando cálculo de Total de Entradas por processo...');
    
    // Obter o processo selecionado nos filtros do dashboard
    const processFilterElement = document.getElementById('dashboardFilterProcess') || 
                                 document.getElementById('reportFilterProcess') ||
                                 document.getElementById('filterProcess');
    
    if (!processFilterElement) {
        console.warn('⚠️ [updateTotalEntradasByProcess] Elemento de filtro de processo não encontrado');
        return;
    }
    
    const selectedProcess = processFilterElement.value;
    console.log(`📋 [updateTotalEntradasByProcess] Processo selecionado: "${selectedProcess}"`);
    
    // Se nenhum processo foi selecionado, usar todos os dados de entrada
    let filteredEntries = [];
    
    if (selectedProcess && selectedProcess.trim() !== '') {
        // Filtrar dados de entrada pelo processo selecionado
        filteredEntries = customEntryData.filter(entry => {
            const entryProcess = entry.process || '';
            return entryProcess.toLowerCase().includes(selectedProcess.toLowerCase());
        });
        console.log(`✅ [updateTotalEntradasByProcess] ${filteredEntries.length} entradas encontradas para o processo "${selectedProcess}"`);
    } else {
        // Se vazio, usar todos os dados de entrada
        filteredEntries = customEntryData;
        console.log(`✅ [updateTotalEntradasByProcess] Nenhum processo selecionado. Usando TODAS as ${filteredEntries.length} entradas`);
    }
    
    // Calcular o valor total das entradas filtradas
    const totalEntradasValue = filteredEntries.reduce((sum, entry) => {
        return sum + (parseFloat(entry.value || 0) || 0);
    }, 0);
    
    console.log(`💰 [updateTotalEntradasByProcess] Valor Total de Entradas Calculado: R$ ${totalEntradasValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    
    // Atualizar o elemento visual do "Total de Entradas"
    const totalEntradasElement = document.getElementById('dashboardTotalEntradas') || 
                                 document.getElementById('totalEntradas') ||
                                 document.getElementById('metric-total-entradas');
    
    if (totalEntradasElement) {
        const formattedValue = totalEntradasValue.toLocaleString('pt-BR', { 
            minimumFractionDigits: 2, 
            style: 'currency', 
            currency: 'BRL' 
        });
        
        totalEntradasElement.textContent = formattedValue;
        totalEntradasElement.style.color = totalEntradasValue > 0 ? '#27ae60' : '#666';
        
        console.log(`✅ [updateTotalEntradasByProcess] Total de Entradas atualizado para: ${formattedValue}`);
    } else {
        console.warn('⚠️ [updateTotalEntradasByProcess] Elemento de exibição do Total de Entradas não encontrado');
    }
}

async function exportReportToExcel() {
    const paidOrders = orders.filter(order => order.status === 'Paga');
    await fetchPaidOrdersForReports(); // Busca dados frescos do banco
    const reportData = generateReportData(allPaidOrdersForReports);
    const filteredReports = getFilteredReports(reportData); // Aplica os filtros

    if (filteredReports.length === 0) {
        alert('Nenhum dado para exportar.');
        return;
    }
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Processo,Mês/Ano,Quantidade,Valor Total,Valor Médio\n';
    
    filteredReports.forEach(report => {
        const row = [
            report.process,
            report.monthYear,
            report.count,
            `R$ ${report.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
            `R$ ${report.avgValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
        ].map(field => `"${field}"`).join(',');
        csvContent += row + '\n';
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_processos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportReportToPDF() {
    // Importar jsPDF (assumindo que está disponível globalmente via CDN)
    const { jsPDF } = window.jspdf;  // Ou require('jspdf') se for Node
    const doc = new jsPDF();
    
    // Título do relatório com data atual
    doc.setFontSize(18);
    doc.text('Relatório de Ordens Pendentes (com Previsões)', 20, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 30);
    
    // Filtrar ordens pendentes de fullOrdersList
    let pendingOrders = fullOrdersList.filter(order => order.status !== 'Paga');
    console.log(`[DEBUG exportReportToPDF] ${pendingOrders.length} ordens pendentes encontradas para export.`);
    
    if (pendingOrders.length === 0) {
        doc.text('Nenhuma ordem pendente encontrada.', 20, 40);
        doc.save(`relatorio_ordens_pendentes_${new Date().toISOString().split('T')[0]}.pdf`);
        showSystemMessage('PDF gerado (sem dados pendentes).', 'info');
        return;
    }
    
    // Preencher previsão se não existir (evita campos vazios)
    pendingOrders.forEach(order => {
        if (!order.paymentForecast) {
            order.paymentForecast = 'N/A';  // Ou calcular baseado em generationDate + dias úteis
        }
    });
    
    // Ordenar por previsão (data mais recente primeiro; 'N/A' no final)
    pendingOrders.sort((a, b) => {
        if (a.paymentForecast === 'N/A') return 1;
        if (b.paymentForecast === 'N/A') return -1;
        return new Date(b.paymentForecast) - new Date(a.paymentForecast);  // Descendente
    });
    
    // Agrupar por previsão para calcular totais
    const groupedByForecast = pendingOrders.reduce((acc, order) => {
        const key = order.paymentForecast;
        if (!acc[key]) acc[key] = [];
        acc[key].push(order);
        return acc;
    }, {});
    console.log(`[DEBUG exportReportToPDF] Grupos por previsão:`, Object.keys(groupedByForecast));
    
    // Cabeçalhos das colunas (Previsão após Processo)
    const headers = ['Processo', 'Previsão', 'Favorecido', 'Valor', 'Status'];
    const columnWidths = [35, 30, 50, 25, 20];  // Ajuste para caber no PDF (largura total ~130)
    let yPosition = 50;  // Posição inicial após título
    
    // Desenhar cabeçalhos
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    let xPosition = 20;
    headers.forEach((header, index) => {
        doc.text(header, xPosition, yPosition);
        xPosition += columnWidths[index];
    });
    yPosition += 10;
    
    // Iterar sobre grupos e adicionar linhas
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let grandTotal = 0;  // Total geral
    
    Object.keys(groupedByForecast).forEach(forecast => {
        const orders = groupedByForecast[forecast];
        const totalValue = orders.reduce((sum, order) => sum + parseFloat(order.paymentValue || order.value || 0), 0);
        grandTotal += totalValue;
        
        // Adicionar linha de grupo (negrito)
        doc.setFont('helvetica', 'bold');
        doc.text(`Previsão: ${forecast} (Total: R$ ${totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})})`, 20, yPosition);
        yPosition += 8;
        doc.setFont('helvetica', 'normal');
        
        // Adicionar ordens do grupo (limitar a 20 linhas por página para evitar overflow)
        orders.forEach((order, orderIndex) => {
            if (yPosition > 270) {  // Nova página se necessário
                doc.addPage();
                yPosition = 20;
            }
            
            const rowData = [
                order.process || 'N/A',
                forecast,
                order.favoredName || 'N/A',
                parseFloat(order.paymentValue || order.value || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
                order.status || 'Pendente'
            ];
            
            let rowX = 20;
            rowData.forEach((data, colIndex) => {
                doc.text(data.toString(), rowX, yPosition);
                rowX += columnWidths[colIndex];
            });
            yPosition += 7;
        });
        
        yPosition += 5;  // Espaço após grupo
    });
    
    // Total Geral (no final)
    if (yPosition > 270) doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`GRAND TOTAL: R$ ${grandTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 20, yPosition);
    
    // Salvar PDF
    const fileName = `relatorio_ordens_pendentes_com_previsoes_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    console.log(`[DEBUG exportReportToPDF] PDF salvo como: ${fileName}`);
    showSystemMessage(`Relatório PDF gerado com ${pendingOrders.length} ordens e previsões incluídas.`, 'success');
}

function exportSalariesToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const filteredSalaries = getFilteredSalaries();
    
    if (filteredSalaries.length === 0) {
        alert('Nenhum salário/auxílio para exportar com os filtros aplicados.');
        return;
    }
    
    // --- Cabeçalho do Documento ---
    doc.setFontSize(16);
    doc.text('Relatório de Salários e Auxílios', 20, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 30);
    
    // --- Dados Detalhados da Tabela Principal ---
    const tableData = filteredSalaries.map(salary => [
        salary.type,
        salary.favoredName,
        salary.bank,
        salary.agency,
        salary.account,
        salary.operation || '',
        salary.process || '',
        `R$ ${parseFloat(salary.value || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
        formatMonth(salary.month)
    ]);
    
    doc.autoTable({
        head: [['Tipo', 'Favorecido', 'Banco', 'Agência', 'Conta', 'Operação', 'Processo', 'Valor', 'Mês']],
        body: tableData,
        startY: 40, // Início da tabela principal
        styles: { fontSize: 7 },
        headStyles: { fillColor: [52, 73, 94] }
    });

    const bankSummaries = new Map();
    const processSummaries = new Map();
    let grandTotalSum = 0;

    filteredSalaries.forEach(salary => {
        const value = parseFloat(salary.value || 0);
        grandTotalSum += value; // Acumula para o total geral

        const bank = salary.bank || 'Não Informado';
        const process = salary.process || 'Não Informado';

        // Somatório por Banco
        bankSummaries.set(bank, (bankSummaries.get(bank) || 0) + value);

        // Somatório por Processo
        processSummaries.set(process, (processSummaries.get(process) || 0) + value);
    });

    // Inicia a posição Y para os blocos de resumo, após a tabela principal, com um espaçamento
    let currentY = doc.autoTable.previous.finalY + 15; 

    // --- Resumo por Banco ---
    if (bankSummaries.size > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumo por Banco', 20, currentY);
        currentY += 8; // Espaçamento após o título do resumo

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const bankSummaryTableData = Array.from(bankSummaries.entries()).map(([bank, total]) => [
            bank,
            `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
        ]);

        doc.autoTable({
            head: [['Banco', 'Valor Total']],
            body: bankSummaryTableData,
            startY: currentY, // Posição de início da tabela de resumo por banco
            styles: { fontSize: 8 },
            headStyles: { fillColor: [52, 73, 94] }
        });
        currentY = doc.autoTable.previous.finalY + 15; // Atualiza Y para a próxima seção
    }

    // --- Resumo por Processo ---
    if (processSummaries.size > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumo por Processo', 20, currentY);
        currentY += 8; // Espaçamento após o título do resumo

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const processSummaryTableData = Array.from(processSummaries.entries()).map(([process, total]) => [
            process,
            `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
        ]);

        doc.autoTable({
            head: [['Processo', 'Valor Total']],
            body: processSummaryTableData,
            startY: currentY, // Posição de início da tabela de resumo por processo
            styles: { fontSize: 8 },
            headStyles: { fillColor: [52, 73, 94] }
        });
        currentY = doc.autoTable.previous.finalY + 15; // Atualiza Y para a próxima seção
    }

    // --- Somatório Total Geral ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Valor Total Geral (Todos os Salários/Auxílios Filtrados): R$ ${grandTotalSum.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 20, currentY);
    doc.setFont('helvetica', 'normal'); // Reseta a fonte para o padrão após o total

    // --- FIM DO CÓDIGO PARA SOMATÓRIOS POR GRUPO E TOTAL GERAL ---

    doc.save(`salarios_auxilios_${new Date().toISOString().split('T')[0]}.pdf`);
}

async function replicateSalaries() {
    console.log('🔄 [replicateSalaries] Iniciando replicação. IDs selecionados:', Array.from(selectedSalaryIds));
    console.log('🔄 [replicateSalaries] Total de salários selecionados:', selectedSalaryIds.size);

    // VALIDAÇÃO 1: Verificar se há salários selecionados
    if (selectedSalaryIds.size === 0) {
        showSystemMessage(
            '⚠️ Nenhum salário/auxílio selecionado para replicação.\n\n' +
            'Selecione pelo menos um item usando os checkboxes antes de clicar em "Replicar".',
            'warning',
            5000
        );
        return;
    }

    console.log('✅ [replicateSalaries] Validação 1 passou - há salários selecionados');

    // VALIDAÇÃO 2: Obter ano e mês de ORIGEM dos filtros
    const sourceYearInput = document.getElementById('salaryFilterYearInput');
    const sourceMonthSelect = document.getElementById('salaryFilterMonthSelect');

    if (!sourceYearInput || !sourceMonthSelect) {
        showSystemMessage(
            '❌ Erro: Filtros de data não encontrados.\n\n' +
            'Certifique-se de que os filtros de Ano e Mês estão visíveis.',
            'error',
            5000
        );
        return;
    }

    const sourceYear = parseInt(sourceYearInput.value);
    const sourceMonthPart = sourceMonthSelect.value;

    if (isNaN(sourceYear) || !sourceMonthPart) {
        showSystemMessage(
            '⚠️ Filtros de origem incompletos.\n\n' +
            'Selecione o Ano e o Mês de ORIGEM antes de replicar.',
            'warning',
            5000
        );
        return;
    }

    const sourceMonthForApiRequest = formatMonthAndPartToBackend(sourceYear, sourceMonthPart);

    if (!sourceMonthForApiRequest) {
        showSystemMessage(
            '❌ Erro ao processar o mês de origem.\n\nTente novamente.',
            'error',
            5000
        );
        return;
    }

    console.log('✅ [replicateSalaries] Validação 2 passou - mês de origem válido:', sourceMonthForApiRequest);

    // VALIDAÇÃO 3: Solicitar mês de DESTINO
    const targetMonthStr = prompt(
        `Replicar ${selectedSalaryIds.size} salário(s)/auxílio(s) selecionado(s):\n\n` +
        `De: ${formatMonth(sourceMonthForApiRequest)}\n\n` +
        `Digite o Mês/Ano de DESTINO:\n` +
        `(Formato: AAAA-MM ou AAAA-13 ou AAAA-13-P1/P2)`,
        ''
    );

    if (!targetMonthStr || targetMonthStr.trim() === '') {
        showSystemMessage('Replicação cancelada.', 'info', 3000);
        console.log('⚠️ [replicateSalaries] Replicação cancelada pelo usuário');
        return;
    }

    const targetMonthForBackend = targetMonthStr.trim();

    // VALIDAÇÃO 4: Validar formato do mês de destino
    const parsedTarget = parseCustomMonthString(targetMonthForBackend);
    if (!parsedTarget) {
        showSystemMessage(
            '❌ Formato de mês inválido.\n\n' +
            'Use: AAAA-MM, AAAA-13 ou AAAA-13-P1/P2\n\n' +
            'Exemplos:\n' +
            '• 2026-03 (março de 2026)\n' +
            '• 2026-13 (13º de 2026)\n' +
            '• 2026-13-P1 (1ª parcela do 13º)',
            'error',
            6000
        );
        return;
    }

    console.log('✅ [replicateSalaries] Validação 4 passou - mês de destino válido:', targetMonthForBackend);

    // VALIDAÇÃO 5: Confirmar replicação
    const confirmMessage =
        `✅ REPLICAR ${selectedSalaryIds.size} SALÁRIO(S)/AUXÍLIO(S) SELECIONADO(S)\n\n` +
        `De: ${formatMonth(sourceMonthForApiRequest)}\n` +
        `Para: ${formatMonth(targetMonthForBackend)}\n\n` +
        `Tem certeza que deseja continuar?`;

    if (!confirm(confirmMessage)) {
        showSystemMessage('Replicação cancelada.', 'info', 3000);
        console.log('⚠️ [replicateSalaries] Replicação cancelada na confirmação');
        return;
    }

    console.log('✅ [replicateSalaries] Confirmação do usuário - procedendo com replicação');

    // Converter Set para Array de IDs
    const selectedSalaryIdsList = Array.from(selectedSalaryIds);
    console.log('📋 [replicateSalaries] Array final de IDs para enviar:', selectedSalaryIdsList);

    // Mostrar indicador de carregamento
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'replicateSalariesLoading';
    loadingIndicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        text-align: center;
        font-family: Arial, sans-serif;
    `;
    loadingIndicator.innerHTML = `
        <div style="font-size: 18px; margin-bottom: 15px; font-weight: bold;">⏳ Replicando...</div>
        <div style="font-size: 14px; color: #666; margin-bottom: 10px;">Processando ${selectedSalaryIds.size} item(ns) selecionado(s)</div>
        <div style="font-size: 12px; color: #999;">De: ${formatMonth(sourceMonthForApiRequest)}</div>
        <div style="font-size: 12px; color: #999;">Para: ${formatMonth(targetMonthForBackend)}</div>
    `;
    document.body.appendChild(loadingIndicator);

    try {
        console.log('📤 [replicateSalaries] Enviando requisição para API...');

        // ENVIO CRÍTICO: Passar APENAS os IDs selecionados
        const payload = {
            sourceMonth: sourceMonthForApiRequest,
            targetMonth: targetMonthForBackend,
            selectedIds: selectedSalaryIdsList,  // ✅ CRÍTICO: Array de IDs
            force: true
        };

        console.log('📤 [replicateSalaries] Payload sendo enviado:', JSON.stringify(payload));

        const response = await fetch(`${API_BASE_URL}/replicate_salaries.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        console.log('📥 [replicateSalaries] Resposta recebida - Status:', response.status);

        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ [replicateSalaries] JSON decodificado:', data);

        if (loadingIndicator.parentNode) {
            document.body.removeChild(loadingIndicator);
        }

        if (data.success) {
            console.log('✅ [replicateSalaries] Replicação bem-sucedida!');
            
            // Remover indicador de carregamento
            if (loadingIndicator.parentNode) {
                document.body.removeChild(loadingIndicator);
            }
            
            showSystemMessage(
                `✅ ${data.addedCount || selectedSalaryIds.size} salário(s)/auxílio(s) replicado(s) com sucesso!\n\n` +
                `De: ${formatMonth(sourceMonthForApiRequest)}\n` +
                `Para: ${formatMonth(targetMonthForBackend)}`,
                'success',
                7000
            );
        
            // ===== ATUALIZAR VISUAL INSTANTANEAMENTE =====
            
            console.log('🔄 [replicateSalaries] Iniciando atualização instantânea da interface...');
            
            // 1. Limpar todas as seleções
            clearAllSalarySelections();
            console.log('✅ [replicateSalaries] Seleções limpas');
            
            // 2. Atualizar o contador do botão de replicar
            updateReplicateButtonText();
            console.log('✅ [replicateSalaries] Contador do botão atualizado');
            
            // 3. CRÍTICO: Recarregar dados do servidor com força
            console.log('🔄 [replicateSalaries] Recarregando dados do servidor...');
            await loadSalaries(true);  // Força recarregamento ignorando cache
            await fetchSalariesForReports(true);  // Força recarregamento dos relatórios
            
            console.log('✅ [replicateSalaries] Dados recarregados do servidor');
            
            // 4. Renderizar a tabela de salários com os novos dados
            displaySalaries();
            console.log('✅ [replicateSalaries] Tabela de salários renderizada');
            
            // 5. Atualizar os relatórios
            if (typeof displayReports2 === 'function') {
                displayReports2();
                console.log('✅ [replicateSalaries] Relatórios atualizados');
            }
            
            // 6. Atualizar os contadores globais
            if (typeof updateCounters === 'function') {
                updateCounters();
                console.log('✅ [replicateSalaries] Contadores globais atualizados');
            }
            
            if (typeof updateDetailedCounters === 'function') {
                updateDetailedCounters();
                console.log('✅ [replicateSalaries] Contadores detalhados atualizados');
            }
            
            // 7. Atualizar o status de salários (se existir a função)
            if (typeof atualizarStatusSalarios === 'function') {
                atualizarStatusSalarios();
                console.log('✅ [replicateSalaries] Status de salários atualizado');
            }
            
            // 8. Exibir indicador visual de sucesso
            const successBox = document.createElement('div');
            successBox.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 10000;
                font-weight: bold;
                animation: slideInRight 0.3s ease-out;
            `;
            successBox.innerHTML = `
                <div style="font-size: 14px; margin-bottom: 5px;">✓ Replicação concluída</div>
                <div style="font-size: 12px; opacity: 0.9;">Tela atualizada com os novos dados</div>
            `;
            document.body.appendChild(successBox);
            
            // Remover indicador após 4 segundos
            setTimeout(() => {
                if (successBox.parentNode) {
                    successBox.style.animation = 'slideOutRight 0.3s ease-in';
                    setTimeout(() => {
                        if (successBox.parentNode) {
                            document.body.removeChild(successBox);
                        }
                    }, 300);
                }
            }, 4000);
            
            console.log('✅ [replicateSalaries] Atualização visual concluída com sucesso');
        
        } else if (data.requireConfirmation) {
            console.log('⚠️ [replicateSalaries] Replicação requer confirmação - registros já existem');
            
            showSystemMessage(
                `⚠️ ${data.error || 'Registros já existem no mês de destino'}`,
                'warning',
                6000
            );

            // Perguntar ao usuário se deseja forçar
            const forceConfirm = confirm(
                `${data.error}\n\n` +
                `Deseja forçar a replicação mesmo assim?\n` +
                `(Os registros existentes NÃO serão sobrescritos, mas novos serão adicionados.)`
            );

            if (forceConfirm) {
                // Fazer nova requisição com force: true (já está definido acima)
                // Chamar a função recursivamente ou fazer nova requisição
                console.log('🔄 [replicateSalaries] Usuário confirmou força - reenviando com force: true');
                // Recursão controlada
                const payloadForce = {
                    sourceMonth: sourceMonthForApiRequest,
                    targetMonth: targetMonthForBackend,
                    selectedIds: selectedSalaryIdsList,
                    force: true
                };

                const responseForce = await fetch(`${API_BASE_URL}/replicate_salaries.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadForce)
                });

                const dataForce = await responseForce.json();

                if (dataForce.success) {
                    showSystemMessage(
                        `✅ ${dataForce.addedCount || selectedSalaryIds.size} salário(s)/auxílio(s) replicado(s) com sucesso!`,
                        'success',
                        7000
                    );
                    clearAllSalarySelections();
                    await fetchSalariesForReports(true);
                    displaySalaries();
                }
            }

        } else {
            console.error('❌ [replicateSalaries] Erro na replicação:', data.error);
            
            showSystemMessage(
                `❌ Erro na replicação:\n\n${data.error || 'Erro desconhecido'}`,
                'error',
                6000
            );
        }

    } catch (error) {
        console.error('❌ [replicateSalaries] Erro na requisição:', error);

        if (loadingIndicator.parentNode) {
            document.body.removeChild(loadingIndicator);
        }

        showSystemMessage(
            `❌ Erro ao replicar:\n\n${error.message}\n\n` +
            `Verifique sua conexão e tente novamente.`,
            'error',
            7000
        );
    }
}

function parseCustomMonthString(monthStr) {
    let match;

    // Tenta formato AAAA-13-P1/P2
    match = monthStr.match(/^(\d{4})-13-(P[12])$/);
    if (match) {
        return {
            year: parseInt(match[1], 10),
            month: 13, // Indicador para 13º salário
            part: match[2] // 'P1' ou 'P2'
        };
    }

    // Tenta formato AAAA-13 (13º genérico)
    match = monthStr.match(/^(\d{4})-13$/);
    if (match) {
        return {
            year: parseInt(match[1], 10),
            month: 13,
            part: null // Sem parte específica
        };
    }

    // Tenta formato AAAA-MM (mês normal, 01-12)
    match = monthStr.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
    if (match) {
        return {
            year: parseInt(match[1], 10),
            month: parseInt(match[2], 10),
            part: null
        };
    }

    // Se nenhum formato corresponder
    throw new Error(`Formato de mês/ano inválido: "${monthStr}". Esperado AAAA-MM, AAAA-13 ou AAAA-13-P1/P2.`);
}

/**
 * Duplica ordens de um mês de origem normal para um mês de destino (normal ou 13º salário).
 * O mês de destino é automaticamente preenchido se o modo 13º Salário estiver ativo.
 */
async function replicateOrders() {
    let sourceMonthStr; // String do mês de origem (AAAA-MM)
    let targetMonthStr; // String do mês de destino (AAAA-MM, AAAA-13, AAAA-13-P1/P2)

    // 1. Obter Mês de Origem (sempre via prompt para ordens)
    sourceMonthStr = prompt(
        'Digite o Mês/Ano de ORIGEM para as ordens:\n(Formato: AAAA-MM, ex: 2025-01)',
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` // Sugestão: mês atual
    );

    if (!sourceMonthStr || sourceMonthStr.trim() === '') {
        alert('Mês/Ano de origem não fornecido. Replicação de ordens cancelada.');
        return;
    }
    sourceMonthStr = sourceMonthStr.trim();

    // Validação de formato para AAAA-MM
    const normalMonthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!normalMonthPattern.test(sourceMonthStr)) {
        alert('Formato de mês de origem inválido. Use AAAA-MM (ex: 2025-01).');
        return;
    }

    // 2. Obter Mês de Destino (automaticamente se 13º Salário ativo, senão via prompt)
    if (isThirteenthSalaryMode && selectedThirteenthSalaryYear !== null) {
        // Se o modo 13º salário está ativo (selecionado na aba de salários),
        // usamos o valor do campo oculto de lá para o destino das ordens.
        targetMonthStr = document.getElementById('salaryMonthBackendValue').value;

        if (!targetMonthStr || targetMonthStr.trim() === '') {
            showSystemMessage('Erro: Mês do 13º Salário não definido. Por favor, selecione a parte na aba de Salários.', 'error', 3000);
            return;
        }
        showSystemMessage(`Destino da replicação de ordens definido automaticamente: ${formatMonth(targetMonthStr, null)}`, 'info', 3000);

    } else {
        // Se o modo 13º Salário NÃO está ativo, pede o mês de destino via prompt
        targetMonthStr = prompt(
            `Digite o Mês/Ano de DESTINO para as ordens:\n(Formato: AAAA-MM ou AAAA-13 ou AAAA-13-P1/P2)\n\nOrigem selecionada: ${sourceMonthStr}`,
            `${new Date().getFullYear()}-13-P1` // Sugestão para 13º Salário Parte 1
        );

        if (!targetMonthStr || targetMonthStr.trim() === '') {
            alert('Mês/Ano de destino não fornecido. Replicação de ordens cancelada.');
            return;
        }
        targetMonthStr = targetMonthStr.trim().toUpperCase(); // Para lidar com P1/P2 consistentemente

        // Validação de formato para destino (AAAA-MM, AAAA-13, AAAA-13-P1/P2)
        const anyMonthPattern = /^\d{4}-(?:(0[1-9]|1[0-2])|13(?:-P[12])?)$/;
        if (!anyMonthPattern.test(targetMonthStr)) {
            alert('Formato de mês/13º salário de destino inválido. Use AAAA-MM, AAAA-13, AAAA-13-P1 ou AAAA-13-P2.');
            return;
        }
    }

    // Validação final: Origem e Destino não podem ser iguais
    if (sourceMonthStr === targetMonthStr) {
        alert('O mês de origem e destino não podem ser iguais.');
        return;
    }

    // Confirmação final antes de replicar
    const finalConfirmationMessage = `Confirma a replicação de TODAS as ordens do mês de ORIGEM (${formatMonth(sourceMonthStr, null)}) para o mês/13º de DESTINO (${formatMonth(targetMonthStr, null)})?\n\nEsta ação pode criar novos registros de ordens.`;
    if (!confirm(finalConfirmationMessage)) {
        console.log('Replicação de ordens cancelada pelo usuário.');
        return;
    }

    // 3. Usar a função `parseCustomMonthString` para converter as strings
    let sourceData;
    let targetData;
    try {
        sourceData = parseCustomMonthString(sourceMonthStr);
        targetData = parseCustomMonthString(targetMonthStr);
    } catch (error) {
        alert(`Erro de formato na data: ${error.message}. Replicação cancelada.`);
        console.error('Erro de parsing de data customizada:', error);
        return;
    }

    // 4. Enviar para o Backend (requer um novo script PHP)
    const loadingIndicator = document.createElement('div');
    loadingIndicator.innerHTML = 'Replicando ordens... Por favor, aguarde.';
    loadingIndicator.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border: 2px solid #007bff; border-radius: 5px; z-index: 9999;';
    document.body.appendChild(loadingIndicator);

    try {
        const response = await fetch(`${API_BASE_URL}/replicate_orders.php`, { // <<< NOVO ENDPOINT PHP <<<
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sourceYear: sourceData.year,
                sourceMonth: sourceData.month,
                sourcePart: sourceData.part,
                targetYear: targetData.year,
                targetMonth: targetData.month,
                targetPart: targetData.part
            })
        });

        const textResponse = await response.text(); // Lê como texto primeiro
        let data;
        try {
            data = JSON.parse(textResponse);
        } catch (e) {
            throw new Error(`Erro ao fazer parse do JSON da resposta. Resposta: ${textResponse}`);
        }

        document.body.removeChild(loadingIndicator);

        if (data.success) {
            alert(data.message);
            // Após replicar, recarregue os dados e atualize a UI
            await loadFullOrdersList(); // Recarrega todas as ordens
            updateCounters();
            updateDetailedCounters();
            displayOrders(); // Atualiza a tabela de ordens
        } else {
            alert('Erro ao replicar ordens: ' + (data.error || 'Erro desconhecido.'));
        }
    } catch (error) {
        console.error('Erro na requisição de replicação de ordens:', error);
        if (loadingIndicator.parentNode) {
            document.body.removeChild(loadingIndicator);
        }
        alert('Erro ao replicar ordens. Por favor, tente novamente. Verifique o console para mais detalhes.');
    }
}

function forceReplicateSalaries(sourceMonth, targetMonth, favoredNameFilter) { // <-- TRÊS PARÂMETROS AGORA
    fetch(`${API_BASE_URL}/replicate_salaries.php`, { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sourceMonth: sourceMonth,
            targetMonth: targetMonth,
            favoredName: favoredNameFilter, // <-- favoredNameFilter INCLUÍDO NO BODY
            force: true
        })
    })
    .then(response => {
        if (!response.ok) { // Verifica se a resposta HTTP foi bem-sucedida (status 2xx)
            // Se a resposta não for JSON (ex: erro PHP), handle como texto
            return response.text().then(text => { throw new Error(text || `Erro HTTP: ${response.status}`); });
        }
        return response.json(); // Tenta parsear como JSON
    })
    .then(data => {
        if (data.success) {
            showSystemMessage(data.message, 'success', 5000); // <-- USANDO showSystemMessage
            loadSalaries();
        } else {
            showSystemMessage('Erro: ' + data.error, 'error', 5000); // <-- USANDO showSystemMessage
        }
    })
    .catch(error => {
        console.error('Erro na requisição forceReplicateSalaries:', error);
        // Tenta extrair a mensagem de erro de forma mais inteligente
        let errorMessage = 'Erro ao replicar dados. Verifique sua conexão e tente novamente.';
        if (error instanceof Error) {
            errorMessage += ' Detalhes: ' + error.message;
        } else {
            errorMessage += ' Detalhes: ' + String(error);
        }
        showSystemMessage(errorMessage, 'error', 7000); // <-- USANDO showSystemMessage
    });
}

let showingBackedUpSalaries = false;


function toggleSalariesBackupSection() {
    if (!canManageSalariesBackup()) {
        alert('❌ Você não tem permissão para gerenciar visualização de salários/auxílios.\n\nApenas perfis "Geral" e "RH" podem fazer isso.');
        return;
    }
    
    const section = document.getElementById('salariesBackupSection');
    if (section.style.display === 'none' || !section.style.display) {
        section.style.display = 'block';
        atualizarStatusSalarios(); // Atualizar status quando abrir
    } else {
        section.style.display = 'none';
    }
}

// Função para realizar o backup de salários/auxílios por intervalo de meses
async function performSalariesBackup() {
    if (!canManageSalaries()) {
        alert('Você não tem permissão para gerenciar backup de salários/auxílios.');
        return;
    }

    const startDate = document.getElementById('salaryBackupMonthStart').value;
    const endDate = document.getElementById('salaryBackupMonthEnd').value;

    if (!startDate || !endDate) {
        alert('Por favor, informe os meses inicial e final.');
        return;
    }

    if (startDate > endDate) {
        alert('O mês inicial não pode ser maior que o mês final.');
        return;
    }
    
    if (!confirm(`Confirma a retirada de salários/auxílios do período ${startDate} a ${endDate} da visualização? Esta ação pode ser desfeita.`)) {
       return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/manage_salaries_backup.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'backup_by_month_range',
                startDate: startDate, // Enviamos o período para o backend
                endDate: endDate
            })
        });

        const data = await response.json();

        if (data.success) {
            await loadSalaries(); // Recarrega os salários (que agora carregarão apenas os não arquivados)
            displaySalaries(); // Atualiza a tabela
            alert(`Salário(s)/auxílio(s) do período ${startDate} a ${endDate} foram retirados da visualização com sucesso!`);
            toggleSalariesBackupSection(); // Esconde a seção de backup após a operação
        } else {
            alert('Erro ao realizar backup: ' + (data.error || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro de conexão ao realizar backup de salários:', error);
        alert('Erro de conexão ao realizar backup de salários.');
    }
}

function atualizarStatusSalarios() {
    const statusInfo = document.getElementById('salariesStatusInfo');
    if (!statusInfo || typeof salaries === 'undefined') return;
    
    const salariosVisiveis = salaries.filter(salary => !salary.isBackedUp).length;
    const salariosOcultos = salaries.filter(salary => salary.isBackedUp).length;
    const total = salaries.length;
    
    // Calcular arquivados baseado no que sabemos
    const totalArquivados = 319 - total; // 319 era o total original
    
    statusInfo.innerHTML = `
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div>👁️ <strong>Visíveis:</strong> ${total}</div>
            <div>📦 <strong>Arquivados:</strong> ${totalArquivados}</div>
            <div style="opacity: 0.8;">
                <small>Total no sistema: ${total + totalArquivados} registros</small>
            </div>
        </div>
    `;
}

// Aplicar a correção
atualizarStatusSalarios();

// Aplicar a correção
atualizarStatusSalarios();
// Aplicar a correção
atualizarStatusSalarios();

// NOVA função para controlar visibilidade do botão de gerenciamento
function controlarVisibilidadeGerenciamentoSalarios() {
    const button = document.getElementById('toggleSalariesBackupBtn');
    if (button) {
        if (canManageSalariesBackup()) {
            button.style.display = '';
            button.disabled = false;
            console.log(`✅ Botão Gerenciamento habilitado para ${currentUser?.role}`);
        } else {
            button.style.display = 'none';
            button.disabled = true;
            console.log(`❌ Botão Gerenciamento ocultado para ${currentUser?.role}`);
        }
    }
}

async function retirarSalariosVisualizacao() {
    if (!canManageSalariesBackup()) {
        alert('❌ Você não tem permissão para gerenciar visualização de salários/auxílios.\n\nApenas perfis "Geral" e "RH" podem fazer isso.');
        return;
    }

    // NOVO: Obtém ano e mês dos novos campos
    const startYear = parseInt(document.getElementById('salaryBackupYearStart').value);
    const startMonthPart = document.getElementById('salaryBackupMonthStartSelect').value;
    const endYear = parseInt(document.getElementById('salaryBackupYearEnd').value);
    const endMonthPart = document.getElementById('salaryBackupMonthEndSelect').value;

    if (isNaN(startYear) || !startMonthPart || isNaN(endYear) || !endMonthPart) {
        alert('⚠️ Por favor, informe os anos e meses inicial e final completos.');
        return;
    }
    if (startYear < 1900 || startYear > 2100 || endYear < 1900 || endYear > 2100) {
        alert('Por favor, insira anos válidos (entre 1900 e 2100).');
        return;
    }

    // Constrói as strings de mês no formato esperado pelo backend (AAAA-MM ou AAAA-13-PX)
    const startDateBackend = formatMonthAndPartToBackend(startYear, startMonthPart);
    const endDateBackend = formatMonthAndPartToBackend(endYear, endMonthPart);

    if (!startDateBackend || !endDateBackend) {
        alert('Erro ao formatar os meses para o backend.');
        return;
    }

    // Validação de intervalo de datas (como strings)
    if (startDateBackend > endDateBackend) {
        alert('⚠️ O período inicial não pode ser maior que o período final.');
        return;
    }
    
    // Filtra salários do período para a mensagem de confirmação
    const salariesToHide = salaries.filter(salary => {
        if (salary.isBackedUp) return false;
        // Compara as strings de mês do backend diretamente
        return salary.month >= startDateBackend && salary.month <= endDateBackend;
    });
    
    if (salariesToHide.length === 0) {
        alert('ℹ️ Nenhum salário/auxílio encontrado no período informado para arquivar.');
        return;
    }
    
    const confirmMessage = `🗂️ ARQUIVAR SALÁRIOS/AUXÍLIOS\n\n` +
        `Período: ${extractYearAndMonthPartFromBackend(startDateBackend).monthPartDisplay} ${startYear} a ${extractYearAndMonthPartFromBackend(endDateBackend).monthPartDisplay} ${endYear}\n` +
        `Registros encontrados: ${salariesToHide.length}\n\n` +
        `⚠️ IMPORTANTE:\n` +
        `• Os dados serão ARQUIVADOS (retirados da visualização)\n` +
        `• Os dados PERMANECEM seguros no banco de dados\n` +
        `Confirma o arquivamento?`;
    
    if (!confirm(confirmMessage)) {
       return;
    }

    try {
        console.log('🔄 Arquivando', salariesToHide.length, 'salários/auxílios...');
        
        const response = await fetch(`${API_BASE_URL}/manage_salaries_backup.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'backup_by_month_range',
                startDate: startDateBackend,
                endDate: endDateBackend
            })
        });

        const data = await response.json();

        if (data.success) {
            await loadSalaries();
            displaySalaries();
            atualizarStatusSalarios();
            
            alert(`✅ ARQUIVAMENTO CONCLUÍDO!\n\n${salariesToHide.length} salário(s)/auxílio(s) do período ${extractYearAndMonthPartFromBackend(startDateBackend).monthPartDisplay} ${startYear} a ${extractYearAndMonthPartFromBackend(endDateBackend).monthPartDisplay} ${endYear} foram arquivados com sucesso.\n\n📁 Os dados foram retirados da visualização mas permanecem seguros no banco de dados.`);
            
            console.log('✅ Arquivamento concluído:', data.message);
            
            toggleSalariesBackupSection();
            
        } else {
            alert('❌ Erro ao arquivar: ' + (data.error || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('❌ Erro de conexão ao arquivar:', error);
        alert('❌ Erro de conexão. Verifique sua internet e tente novamente.');
    }
}


async function recuperarSalariosVisualizacao() {
    if (!canManageSalariesBackup()) {
        alert('❌ Você não tem permissão para gerenciar visualização de salários/auxílios.\n\nApenas perfis "Geral" e "RH" podem fazer isso.');
        return;
    }

    // NOVO: Obtém ano e mês dos novos campos
    const startYear = parseInt(document.getElementById('salaryBackupYearStart').value);
    const startMonthPart = document.getElementById('salaryBackupMonthStartSelect').value;
    const endYear = parseInt(document.getElementById('salaryBackupYearEnd').value);
    const endMonthPart = document.getElementById('salaryBackupMonthEndSelect').value;

    if (isNaN(startYear) || !startMonthPart || isNaN(endYear) || !endMonthPart) {
        alert('⚠️ Por favor, informe os anos e meses inicial e final completos para recuperação.');
        return;
    }
    if (startYear < 1900 || startYear > 2100 || endYear < 1900 || endYear > 2100) {
        alert('Por favor, insira anos válidos (entre 1900 e 2100).');
        return;
    }

    // Constrói as strings de mês no formato esperado pelo backend (AAAA-MM ou AAAA-13-PX)
    const startDateBackend = formatMonthAndPartToBackend(startYear, startMonthPart);
    const endDateBackend = formatMonthAndPartToBackend(endYear, endMonthPart);

    if (!startDateBackend || !endDateBackend) {
        alert('Erro ao formatar os meses para o backend.');
        return;
    }

    // Validação de intervalo de datas (como strings)
    if (startDateBackend > endDateBackend) {
        alert('⚠️ O período inicial não pode ser maior que o período final.');
        return;
    }

    const confirmMessage = `🔄 RECUPERAR VISUALIZAÇÃO DE SALÁRIOS/AUXÍLIOS\n\n` +
        `Período: ${extractYearAndMonthPartFromBackend(startDateBackend).monthPartDisplay} ${startYear} a ${extractYearAndMonthPartFromBackend(endDateBackend).monthPartDisplay} ${endYear}\n\n` +
        `⚠️ IMPORTANTE:\n` +
        `• Os dados arquivados voltarão a aparecer na visualização\n` +
        `• Não afeta os dados no banco de dados\n` +
        `• Pode impactar a performance se muitos registros\n\n` +
        `Confirma a recuperação da visualização?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    const button = document.getElementById('recoverSalariesBtn');
    const originalText = button.innerHTML;
    button.innerHTML = '⏳ Recuperando...';
    button.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/manage_salaries_backup.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'restore_by_month_range',
                startDate: startDateBackend,
                endDate: endDateBackend
            })
        });

        const data = await response.json();
        
        if (data.success) {
            await loadSalaries();
            displaySalaries();
            atualizarStatusSalarios();
            
            alert(`✅ RECUPERAÇÃO CONCLUÍDA!\n\nSalários/auxílios do período ${extractYearAndMonthPartFromBackend(startDateBackend).monthPartDisplay} ${startYear} a ${extractYearAndMonthPartFromBackend(endDateBackend).monthPartDisplay} ${endYear} foram recuperados na visualização.\n\nTotal atual: ${salaries.length} registros`);
        } else {
            console.log('❌ Recuperação falhou:', data.error);
            alert('❌ Erro na recuperação: ' + (data.error || 'Erro desconhecido'));
        }
        
    } catch (error) {
        console.error('❌ Erro na recuperação:', error);
        alert('❌ Erro de conexão na recuperação. Verifique sua internet e tente novamente.');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Função para recuperar visualização
async function recuperarVisualizacaoSalarios() {
    const startDate = document.getElementById('salaryBackupMonthStart').value;
    const endDate = document.getElementById('salaryBackupMonthEnd').value;
    
    if (!startDate || !endDate) {
        alert('⚠️ Por favor, selecione o período para recuperação.');
        return;
    }
    
    const confirmMessage = `🔄 RECUPERAR VISUALIZAÇÃO DE SALÁRIOS/AUXÍLIOS\n\n` +
        `Período: ${startDate} a ${endDate}\n\n` +
        `⚠️ IMPORTANTE:\n` +
        `• Os dados arquivados voltarão a aparecer na visualização\n` +
        `• Não afeta os dados no banco de dados\n` +
        `• Pode impactar a performance se muitos registros\n\n` +
        `Confirma a recuperação da visualização?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Mostrar loading
    const button = document.getElementById('salaryRestoreButton');
    const originalText = button.innerHTML;
    button.innerHTML = '⏳ Recuperando...';
    button.disabled = true;
    
    try {

        if (sucesso) {
            alert(`✅ RECUPERAÇÃO CONCLUÍDA!\n\nSalários/auxílios do período ${startDate} a ${endDate} foram recuperados na visualização.\n\nTotal atual: ${salaries.length} registros`);
        } else {
            if (!sucessoAlternativo) {
                alert('❌ Não foi possível recuperar automaticamente.\n\nTentando método alternativo...');
                await implementarRecuperacaoManual(startDate, endDate);
            }
        }
        
    } catch (error) {
        console.error('Erro na recuperação:', error);
        alert('❌ Erro ao tentar recuperar. Verifique o console para detalhes.');
    } finally {
        // Restaurar botão
        button.innerHTML = originalText;
        button.disabled = false;
    }
}


async function recuperarSalariosVisualizacao() {
    if (!canManageSalariesBackup()) {
        alert('❌ Você não tem permissão para gerenciar visualização de salários/auxílios.\n\nApenas perfis "Geral" e "RH" podem fazer isso.');
        return;
    }

    const confirmMessage = `🔄 RECUPERAR TODOS OS DADOS ARQUIVADOS\n\n` + 
        `✅ AÇÃO:\n` +
        `• Todos os salários/auxílios arquivados voltarão a ser VISÍVEIS\n` +
        `• Os dados retornarão exatamente como estavam antes do arquivamento\n` +
        `• Nenhum dado será perdido, apenas restaurado na visualização\n\n` +
        `⚠️ Esta ação irá recuperar TODOS os períodos arquivados.\n\n` +
        `Confirma a recuperação completa?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }

    const button = document.getElementById('recoverSalariesBtn');
    const originalText = button ? button.innerHTML : '🔄 Recuperar Dados';
    if (button) {
        button.innerHTML = '⏳ Recuperando todos...';
        button.disabled = true;
    }
    
    try {

        const response = await fetch(`${API_BASE_URL}/manage_salaries_backup.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'restore_all_salaries'
            })
        });

        const data = await response.json();
        console.log('📊 Resultado da recuperação completa:', data);

        if (data.success) {
            console.log(`✅ SUCESSO! ${data.affected} registros recuperados`);
            
            // Recarregar dados do servidor
            await loadSalaries();
            displaySalaries();
            atualizarStatusSalarios();
            
            alert(`🎉 RECUPERAÇÃO COMPLETA CONCLUÍDA!\n\n${data.affected} salário(s)/auxílio(s) foram recuperados e estão novamente visíveis.\n\nTotal atual: ${salaries.length} registros`);
            
            console.log('✅ Recuperação completa da visualização concluída');
        } else {
            console.log('❌ Erro na recuperação:', data.error);
            alert('❌ Erro ao recuperar dados: ' + (data.error || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('❌ Erro de conexão ao recuperar dados:', error);
        alert('❌ Erro de conexão ao recuperar dados: ' + error.message);
    } finally {
        // Restaurar botão
        if (button) {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }
}


// Atualizar status final na interface
function atualizarStatusFinal() {
    const statusInfo = document.getElementById('salariesStatusInfo');
    if (statusInfo) {
        statusInfo.innerHTML = `
            <div style="display: flex; gap: 20px; flex-wrap: wrap; background: #d4edda; padding: 15px; border-radius: 5px; border: 1px solid #c3e6cb;">
                <div>🎉 <strong>RECUPERAÇÃO CONCLUÍDA!</strong></div>
                <div>👁️ <strong>Visíveis:</strong> ${salaries.length}</div>
                <div>📦 <strong>Arquivados:</strong> 0</div>
                <div style="opacity: 0.8;">
                    <small>✅ Total no sistema: ${salaries.length} registros</small>
                </div>
            </div>
        `;
    }
    
    console.log('✅ Status final atualizado na interface');
}

atualizarStatusFinal();

function updateCounters() {
    try {
        // Verificar se fullOrdersList existe e é um array
        if (!fullOrdersList || !Array.isArray(fullOrdersList)) {
            console.warn('⚠️ [updateCounters] fullOrdersList não está disponível ou é inválida. Contadores não serão atualizados.');
            return;
        }

        // --- Contagem ---
        // Filtra DIRETAMENTE do fullOrdersList (fonte de dados globais e não filtrada)
        const allPendingOrders = fullOrdersList.filter(order =>
            order.status === 'Pendente' ||
            order.status === 'Aguardando Financeiro' ||
            order.status === 'Aguardando Pagamento'
        );
        
        const pendingDiretoriaOrders = fullOrdersList.filter(order => order.status === 'Pendente');
        const pendingFinanceiroOrders = fullOrdersList.filter(order => order.status === 'Aguardando Financeiro');
        const pendingAguardandoPagamentoOrders = fullOrdersList.filter(order => order.status === 'Aguardando Pagamento');

        const totalPendingCount = allPendingOrders.length;
        const pendingDiretoriaCount = pendingDiretoriaOrders.length;
        const pendingFinanceiroCount = pendingFinanceiroOrders.length;
        const pendingAguardandoPagamentoCount = pendingAguardandoPagamentoOrders.length;
        
        const totalElement = document.getElementById('totalPendingOrdersCount');
        const diretoriaElement = document.getElementById('pendingDiretoriaCount');
        const financeiroElement = document.getElementById('pendingFinanceiroCount');
        const pagamentoElement = document.getElementById('pendingAguardandoPagamentoCount');

        if (totalElement) totalElement.textContent = totalPendingCount;
        if (diretoriaElement) diretoriaElement.textContent = pendingDiretoriaCount;
        if (financeiroElement) financeiroElement.textContent = pendingFinanceiroCount;
        if (pagamentoElement) pagamentoElement.textContent = pendingAguardandoPagamentoCount;

        // --- Valores (calculados de forma segura) ---
        let totalPendingValue = 0;
        let pendingDiretoriaValue = 0;
        let pendingFinanceiroValue = 0;
        let pendingAguardandoPagamentoValue = 0;

        allPendingOrders.forEach(order => {
            const value = parseFloat(order.paymentValue || 0);
            totalPendingValue += value;
        });

        pendingDiretoriaOrders.forEach(order => {
            const value = parseFloat(order.paymentValue || 0);
            pendingDiretoriaValue += value;
        });

        pendingFinanceiroOrders.forEach(order => {
            const value = parseFloat(order.paymentValue || 0);
            pendingFinanceiroValue += value;
        });

        pendingAguardandoPagamentoOrders.forEach(order => {
            const value = parseFloat(order.paymentValue || 0);
            pendingAguardandoPagamentoValue += value;
        });

        const totalValueElement = document.getElementById('totalPendingOrdersValue');
        const diretoriaValueElement = document.getElementById('pendingDiretoriaValue');
        const financeiroValueElement = document.getElementById('pendingFinanceiroValue');
        const pagamentoValueElement = document.getElementById('pendingAguardandoPagamentoValue');

        if (totalValueElement) totalValueElement.textContent = `R$ ${totalPendingValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        if (diretoriaValueElement) diretoriaValueElement.textContent = `R$ ${pendingDiretoriaValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        if (financeiroValueElement) financeiroValueElement.textContent = `R$ ${pendingFinanceiroValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        if (pagamentoValueElement) pagamentoValueElement.textContent = `R$ ${pendingAguardandoPagamentoValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        
        const cashValueElement = document.getElementById('cashValue');
        if (cashValueElement && typeof currentCashValue !== 'undefined') {
            cashValueElement.value = currentCashValue.toLocaleString('pt-BR', {minimumFractionDigits: 2});
        }

        // Atualizar valor a ser depositado
        if (typeof updateDepositValue === 'function') {
            updateDepositValue();
        }

        console.log('✅ [updateCounters] Contadores globais atualizados com base em fullOrdersList.');
        
    } catch (error) {
        console.error('❌ [updateCounters] Erro ao atualizar contadores globais:', error);
    }
}
function updateDepositValue() {
    // --- MUDANÇA CRÍTICA AQUI: Usar 'fullOrdersList' em vez de 'orders' ---
    const pendingAguardandoPagamentoOrders = fullOrdersList.filter(order => order.status === 'Aguardando Pagamento');
    // --- FIM DA MUDANÇA ---
    
    const valorPendenteAguardandoPagamento = pendingAguardandoPagamentoOrders.reduce((sum, order) => sum + parseFloat(order.paymentValue || 0), 0);
    const depositValue = valorPendenteAguardandoPagamento - currentCashValue;
    
    document.getElementById('depositValue').textContent = `R$ ${depositValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}


function formatarDataParaExibicao(dataString) {
    if (!dataString) return '';
    
    const partes = dataString.split('-');
    const ano = parseInt(partes[0]);
    const mes = parseInt(partes[1]) - 1; // JavaScript: mês começa em 0
    const dia = parseInt(partes[2]);
    
    const data = new Date(ano, mes, dia);
    return data.toLocaleDateString('pt-BR'); // Ex: 03/09/2025
}

function formatarDataParaInput(dataString) {
    if (!dataString) return '';
    
    // Se já está no formato correto
    if (dataString.includes('-') && dataString.length === 10) {
        return dataString;
    }
    
    // Se está no formato DD/MM/YYYY
    if (dataString.includes('/')) {
        const partes = dataString.split('/');
        const dia = partes[0].padStart(2, '0');
        const mes = partes[1].padStart(2, '0');
        const ano = partes[2];
        return `${ano}-${mes}-${dia}`;
    }
    
    return dataString;
}

// Helper function to count total unique boletos with at least one pending parcel
function getTotalUniquePendingBoletosCount() {
    const totalPendingBoletoIds = new Set();
    // Assuming 'boletos' is the global array of all boletos loaded from the DB
    if (!boletos || !Array.isArray(boletos)) {
        return 0; // Return 0 if the global boletos array is not available
    }
    boletos.forEach(boleto => {
        // Check if this boleto has at least one pending parcel
        const hasPendingParcel = boleto.parcels && Array.isArray(boleto.parcels) && boleto.parcels.some(parcela => !parcela.isPaid);
        if (hasPendingParcel) {
            totalPendingBoletoIds.add(boleto.id);
        }
    });
    return totalPendingBoletoIds.size;
}

function getSortedPendingBoletoParcels() {

    const dueDateStartRaw = document.getElementById('filterBoletoDueDateStart')?.value || '';
    const dueDateEndRaw = document.getElementById('filterBoletoDueDateEnd')?.value || '';
    
    let filterDueDateStart = null;
    let filterDueDateEnd = null;

    if (dueDateStartRaw) {
        const [ano, mes, dia] = dueDateStartRaw.split('-');
        filterDueDateStart = new Date(ano, mes - 1, dia);
        filterDueDateStart.setHours(0, 0, 0, 0);
        console.log(`%c✅ Data inicial filtro: ${filterDueDateStart.toLocaleDateString('pt-BR')}`, 'color: #27ae60;');
    }

    if (dueDateEndRaw) {
        const [ano, mes, dia] = dueDateEndRaw.split('-');
        filterDueDateEnd = new Date(ano, mes - 1, dia);
        // ✅ CORREÇÃO CRÍTICA: Adiciona 1 dia para incluir a data final selecionada
        filterDueDateEnd.setDate(filterDueDateEnd.getDate() + 1);
        filterDueDateEnd.setHours(0, 0, 0, 0);
        console.log(`%c✅ Data final filtro (ajustada): ${filterDueDateEnd.toLocaleDateString('pt-BR')}`, 'color: #27ae60;');
    }

    let boletosQuePassaramNosOutrosFiltros = getFilteredBoletos(); 

    let allIndividualPendingParcels = [];

    boletosQuePassaramNosOutrosFiltros.forEach(boleto => {

        if (boleto.parcels && Array.isArray(boleto.parcels)) {

            boleto.parcels.forEach(parcela => {

                if (!parcela.isPaid) {

                    let parcelDueDate = null;
                    
                    if (parcela.dueDate && typeof parcela.dueDate === 'string' && parcela.dueDate.includes('-')) {
                        const [ano, mes, dia] = parcela.dueDate.split('-');
                        parcelDueDate = new Date(ano, mes - 1, dia);
                        parcelDueDate.setHours(0, 0, 0, 0);
                    } else {
                        parcelDueDate = criarDataLocal(parcela.dueDate);
                    }

                    if (isNaN(parcelDueDate.getTime())) {
                        console.warn(`%c[DEBUG_SORTED_PARCELS] Parcel #${parcela.parcelNumber} of Boleto ${boleto.id} has invalid dueDate: "${parcela.dueDate}". Skipping.`, 'color: #ffc107;');
                        return;
                    }

                    let matchesDueStart = true;
                    if (filterDueDateStart && parcelDueDate < filterDueDateStart) {
                        matchesDueStart = false;
                    }

                    let matchesDueEnd = true;
                    if (filterDueDateEnd && parcelDueDate >= filterDueDateEnd) {
                        matchesDueEnd = false;
                    }

                    if ((filterDueDateStart || filterDueDateEnd) && parcela.parcelNumber === 1) {
                        console.log(`%c[FILTRO RESULTADO] Parcela ${parcela.parcelNumber}: ${parcela.dueDate} | Start: ${matchesDueStart} | End: ${matchesDueEnd} | Passa: ${matchesDueStart && matchesDueEnd}`, 
                            matchesDueStart && matchesDueEnd ? 'color: #27ae60;' : 'color: #e74c3c;');
                    }

                    if (matchesDueStart && matchesDueEnd) {
                        allIndividualPendingParcels.push({
                            boleto: boleto,
                            parcela: parcela,
                            sortDate: parcelDueDate
                        });
                    }

                }

            });

        }

    });

    allIndividualPendingParcels.sort((a, b) => {
        const dateA = a.sortDate && !isNaN(a.sortDate.getTime()) ? a.sortDate : new Date('9999-12-31');
        const dateB = b.sortDate && !isNaN(b.sortDate.getTime()) ? b.sortDate : new Date('9999-12-31');
        return dateA.getTime() - dateB.getTime();
    });

    console.log(`%c✅ [RESULTADO FINAL] Total de parcelas: ${allIndividualPendingParcels.length}`, 'color: #27ae60; font-weight: bold;');

    return allIndividualPendingParcels;
}

function checkBoletoHasAnyPendingParcelInDateRange(boleto, startDateFilter, endDateFilter) {
  
    const filterStartDate = startDateFilter ? criarDataLocal(startDateFilter) : null;
    const filterEndDate = endDateFilter ? criarDataLocal(endDateFilter) : null;

    if ((filterStartDate && isNaN(filterStartDate.getTime())) || (filterEndDate && isNaN(filterEndDate.getTime()))) {
        console.warn(`%c[DEBUG_FILTER] Invalid filter date objects generated. Please check input date formats. Skipping.`, 'color: #ffc107; font-weight: bold;');
        return false; // Se as datas do filtro são inválidas, o boleto não pode corresponder
    }

    // Se não há filtros de data aplicados, o boleto passa neste critério
    if (!filterStartDate && !filterEndDate) {
        console.log(`%c[DEBUG_FILTER] No date filters applied. Returning true.`, 'color: green;');
        return true;
    }

    // Iterar por todas as parcelas pendentes do boleto
    if (boleto.parcels && Array.isArray(boleto.parcels)) {
        for (const parcel of boleto.parcels) {
            if (!parcel.isPaid && parcel.dueDate) {
                const parcelDueDate = criarDataLocal(parcel.dueDate);
                if (isNaN(parcelDueDate.getTime())) {
                    console.warn(`%c[DEBUG_FILTER]     Parcel #${parcel.parcelNumber} has invalid dueDate: "${parcel.dueDate}". Skipping this parcel.`, 'color: #ffc107;');
                    continue; // Ignora datas de parcela inválidas
                }
                let matchesStart = true;
                if (filterStartDate && parcelDueDate < filterStartDate) {
                    matchesStart = false;
                }
                let matchesEnd = true;
                if (filterEndDate && parcelDueDate > filterEndDate) {
                    matchesEnd = false;
                }

                if (matchesStart && matchesEnd) {
                    console.log(`%c[DEBUG_FILTER]     Parcel #${parcel.parcelNumber} is IN RANGE! Boleto matches filter. Returning true for boleto.`, 'color: green; font-weight: bold;');
                    return true;
                }
            } 
        }
    }
    return false;
}


async function loadCashValueFromDB() {
    try {
        const response = await fetch(`${API_BASE_URL}/get_cash_value.php?_=${new Date().getTime()}`);
        const data = await response.json();
        if (data.success) {
            currentCashValue = data.cashValue;
            updateCounters();       // <--- Restaurada
            updateDetailedCounters(); // <--- Restaurada
            console.log('Valor do caixa carregado do DB (cache-busted):', currentCashValue);
        } else {
            console.error('Erro ao carregar valor do caixa do DB (cache-busted):', data.error);
            currentCashValue = 0; // Fallback
            updateCounters();       // <--- Restaurada
            updateDetailedCounters(); // <--- Restaurada
        }
    } catch (error) {
        console.error('Erro de conexão ao carregar valor do caixa do DB (cache-busted):', error);
        currentCashValue = 0; // Fallback
        updateCounters();       // <--- Restaurada
        updateDetailedCounters(); // <--- Restaurada
    }
}

async function loadDepositsFromDB(forceReload = false) { // Adiciona forceReload
    try {
        const response = await fetch(`${API_BASE_URL}/get_deposits.php?_=${new Date().getTime()}`);
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
            deposits = data.data; 
            hasLoadedDeposits = true; // Define a flag como true em caso de sucesso
            console.log(`DEBUG: loadDepositsFromDB - ${deposits.length} depósitos carregados com sucesso:`, deposits); // <<< LOG DETALHADO
        } else {
            console.error('Erro ao carregar depósitos do DB (cache-busted):', data.error || 'Resposta da API inválida ou sem dados.');
            deposits = []; 
            hasLoadedDeposits = false; // Define a flag como false em caso de erro
            console.log('DEBUG: loadDepositsFromDB - Nenhum depósito carregado ou erro na resposta da API.');
        }
    } catch (error) {
        console.error('Erro de conexão ao carregar depósitos do DB (cache-busted):', error);
        deposits = [];
        hasLoadedDeposits = false; // Define a flag como false em caso de erro
        console.log('DEBUG: loadDepositsFromDB - Erro de conexão, nenhum depósito carregado.');
    } finally {
        hideLoadingOverlay(); // Esconde o overlay
    }
}

function displayDeposits() {

    const tbody = document.getElementById('depositsTableBody');
    if (!tbody) {
        console.warn("Element 'depositsTableBody' not found. Hidden tabs?");
        return;
    }

    tbody.innerHTML = '';
    

    const sortedDeposits = [...deposits].sort((a, b) => criarDataLocal(b.deposit_date).getTime() - criarDataLocal(a.deposit_date).getTime());

   
    sortedDeposits.forEach(deposit => {
        const row = document.createElement('tr');
        const actionsHtml = `
            <button class="btn btn-info btn-small" onclick="downloadDepositProof('${deposit.id}')">
                📄 Comprovante
            </button>
            <button class="btn btn-danger btn-small" onclick="deleteDeposit('${deposit.id}')">
                Excluir
            </button>
        `;

        row.innerHTML = `
            <td>${formatDate(deposit.deposit_date)}</td>
            <td>R$ ${parseFloat(deposit.deposit_value || '0').toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td><div class="action-buttons">${actionsHtml}</div></td>
        `;
        tbody.appendChild(row);
    });
}

function downloadDepositProof(depositId) {

    const deposit = deposits.find(d => String(d.id) === String(depositId));
    
    if (!deposit) {
        console.error('Depósito não encontrado. ID procurado:', depositId, 'Depósitos disponíveis:', deposits);
        alert('Depósito não encontrado.');
        return;
    }
    
  
    if (!deposit.proof_data) {
        console.error('Comprovante não encontrado para o depósito:', deposit);
        alert('Comprovante não encontrado para este depósito.');
        return;
    }
    
    const link = document.createElement('a');
    link.href = deposit.proof_data; 
    link.download = deposit.proof_file_name || 'comprovante_deposito.pdf'; 
    link.click();
}

function clearDepositForm() {
    document.getElementById('depositForm').reset();
    const today = new Date().toLocaleDateString('en-CA'); // Formato YYYY-MM-DD local
    document.getElementById('depositDate').value = today; // Preenche a data com o dia atual
}

function showDepositsTab() {
    // Preenche a data do formulário com o dia atual
    const today = new Date().toLocaleDateString('en-CA'); // Formato YYYY-MM-DD local
    document.getElementById('depositDate').value = today;
    displayDeposits(); // Garante que a tabela de depósitos seja atualizada
}

async function addDeposit() {
    const depositDate = document.getElementById('depositDate').value;
    const depositValue = parseFloat(document.getElementById('depositValueInput').value);
    const depositProofFile = document.getElementById('depositProof').files[0]; // Pode ser undefined se nenhum arquivo for selecionado

    if (!depositDate || !depositValue || depositValue <= 0) {
        alert('Por favor, preencha a data e o valor do depósito.');
        return;
    }

    let proofData = null;
    let proofFileName = null;

    if (depositProofFile) {
        try {
            proofData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(depositProofFile);
            });
            proofFileName = depositProofFile.name;
        } catch (error) {
            console.error('Erro na leitura do arquivo de comprovante:', error);
            alert('Erro ao carregar o arquivo de comprovante. Por favor, tente novamente.');
            return; // Interrompe o processo se houver erro na leitura
        }
    }

    const newDepositData = {
        id: generateId(),
        date: depositDate,
        value: depositValue,
        proofData: proofData, 
        proofFileName: proofFileName, 
    };

    try {
        const response = await fetch(`${API_BASE_URL}/add_deposit.php?_=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newDepositData)
        });
        const data = await response.json();
        
        if (data.success) {
            alert('Depósito registrado com sucesso!');
            clearDepositForm(); 
            await loadCashValueFromDB();
            await loadDepositsFromDB();
            displayDeposits(); 
        } else {
            alert('Erro ao registrar depósito: ' + data.error);
            console.error('Erro ao registrar depósito via API:', data.error);
        }
    } catch (error) {
        alert('Erro de conexão ao registrar depósito. Verifique sua internet.');
        console.error('Erro de conexão ao registrar depósito:', error);
    }
}

// Função para excluir um depósito
async function deleteDeposit(depositId) {
    if (!confirm('Tem certeza que deseja excluir este depósito? Esta ação irá subtrair o valor do caixa.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/delete_deposit.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: depositId })
        });
        const data = await response.json();

        if (data.success) {
            alert('Depósito excluído com sucesso e valor ajustado no caixa!');
            await loadCashValueFromDB(); 
            await loadDepositsFromDB(); 
            displayDeposits(); 
        } else {
            alert('Erro ao excluir depósito: ' + data.error);
            console.error('Erro ao excluir depósito via API:', data.error);
        }
    } catch (error) {
        alert('Erro de conexão ao excluir depósito. Verifique sua internet.');
        console.error('Erro de conexão ao excluir depósito:', error);
    }
}     

async function exportReports2ToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    await fetchSalariesForReports(); // Garante que os dados mais recentes estão carregados do DB
    const reportData = generateSalaryReportData(allSalariesForReports); // Passa os dados completos do DB
    const filteredReports = getFilteredReports2(reportData);
    
    if (filteredReports.length === 0) {
        alert('Nenhum dado para exportar.');
        return;
    }
    
    doc.setFontSize(16);
    doc.text('Resumo de Salários e Auxílios', 20, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 30);
    
    const tableData = filteredReports.map(report => [
        report.type,
        report.bank,
        report.process,
        report.month,
        report.count.toString(),
        `R$ ${report.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
    ]);
    
    doc.autoTable({
        head: [['Tipo', 'Banco', 'Processo', 'Mês', 'Quantidade', 'Valor Total']],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [52, 73, 94] }
    });
    
    let totalSum = 0;
    filteredReports.forEach(report => {
        totalSum += report.totalValue;
    });

 
    let finalY = doc.autoTable.previous.finalY;
    finalY += 10; // Espaçamento após a tabela

    doc.setFontSize(12);
    doc.text(`Valor Total Geral (Filtrado): R$ ${totalSum.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 20, finalY);

    doc.save(`resumo_salarios_auxilios_${new Date().toISOString().split('T')[0]}.pdf`);
}

async function loadBoletos(forceReload = false) {
    if (hasLoadedBoletos && boletos.length > 0 && !forceReload) {
        console.log('[loadBoletos] Boletos ja carregados:', boletos.length);
        displayBoletos();
        return;
    }

    hasLoadedBoletos = false;
    console.log('[loadBoletos] Carregando boletos do banco...');

    try {
        const response = await fetch(`api/get_boletos.php?t=${Date.now()}`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        const text = await response.text();

        if (!text || text.trim() === '') {
            console.error('[loadBoletos] Resposta vazia. Status:', response.status);
            boletos = [];
            hasLoadedBoletos = false;
            displayBoletos();
            return;
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            console.error('[loadBoletos] JSON invalido:', text.substring(0, 300));
            boletos = [];
            hasLoadedBoletos = false;
            displayBoletos();
            return;
        }

        if (!response.ok) {
            console.error('[loadBoletos] Status', response.status, ':', data);
            boletos = [];
            hasLoadedBoletos = false;
            displayBoletos();
            return;
        }

        if (data.success && Array.isArray(data.data)) {
            boletos = data.data.map(boleto => {
                const parcelasPagas = boleto.parcels.filter(p => p.isPaid).length;
                boleto.isFullyPaid = parcelasPagas === boleto.parcels.length;
                return boleto;
            });
            hasLoadedBoletos = true;
            console.log('[loadBoletos]', boletos.length, 'boletos carregados com sucesso.');
        } else {
            console.error('[loadBoletos] Erro na resposta:', data.error || 'Campo data ausente');
            boletos = [];
            hasLoadedBoletos = false;
        }

    } catch (error) {
        console.error('[loadBoletos] Erro de rede:', error.message);
        boletos = [];
        hasLoadedBoletos = false;
    } finally {
        populateBoletoVendorsDatalist();
        displayBoletos();
        hideLoadingOverlay();
    }
}
function uniqid(prefix = '') {
    return prefix + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function toggleParcelFields() {
    const singleParcelSelected = document.getElementById('singleParcel')?.checked;
    const singleFields = document.getElementById('singleParcelFields');
    const multipleFields = document.getElementById('multipleParcelFields');
    const parcelasContainer = document.getElementById('parcelasContainer'); // Obter o container aqui

    if (singleParcelSelected) {
        if (singleFields) singleFields.style.display = 'grid';
        if (multipleFields) multipleFields.style.display = 'none';
        // Ao mudar PARA parcela única, limpar o contêiner de múltiplas parcelas e resetar o contador
        if (parcelasContainer) {
            parcelasContainer.innerHTML = '';
        }
        parcelCounter = 0; // Resetar o contador
    } else { // Múltiplas parcelas selecionadas
        if (singleFields) singleFields.style.display = 'none';
        if (multipleFields) multipleFields.style.display = 'block';

        // CRÍTICO: Se mudar PARA múltiplas parcelas e o contêiner estiver vazio, adicionar o primeiro campo de parcela.
        // Garantir que o contador seja 0 antes de adicionar a primeira.
        if (parcelasContainer && parcelasContainer.children.length === 0) {
            parcelCounter = 0; // Garantir que comece do 0 (addParcelField incrementará para 1)
            addParcelField(); // Adicionar o primeiro campo de parcela (que será o #1)
        }
    }
}

// Adiciona um novo campo para parcela (valor e vencimento)
function addParcelField(value = '', dueDate = '') {
    parcelCounter++;
    const container = document.getElementById('parcelasContainer');
    if (!container) return;

    const parcelDiv = document.createElement('div');
    parcelDiv.className = 'form-row parcel-item';
    parcelDiv.id = `parcel-${parcelCounter}`;
    parcelDiv.innerHTML = `
        <div class="form-group">
            <label for="parcelValue-${parcelCounter}">Valor Parcela ${parcelCounter} <span class="required">*</span></label>
            <input type="number" id="parcelValue-${parcelCounter}" step="0.01" value="${value}" required>
        </div>
        <div class="form-group">
            <label for="parcelDueDate-${parcelCounter}">Vencimento Parcela ${parcelCounter} <span class="required">*</span></label>
            <input type="date" id="parcelDueDate-${parcelCounter}" value="${dueDate}" required onchange="validateParcelMonth(this, ${parcelCounter})">
        </div>
        <div class="form-group" style="display: flex; align-items: flex-end;">
            <button type="button" class="btn btn-danger btn-small" onclick="removeParcelField(${parcelCounter})">Remover</button>
        </div>
    `;
    container.appendChild(parcelDiv);
}

// Remove um campo de parcela
function removeParcelField(id) {
    const element = document.getElementById(`parcel-${id}`);
    if (element) {
        element.remove();
    }
}

// Valida que a data da parcela está no mês correto (do próprio vencimento)
function validateParcelMonth(inputElement, parcelNum) {
    const dueDate = inputElement.value;
    if (!dueDate) return;

    const selectedMonth = new Date(dueDate).getMonth();
    const selectedYear = new Date(dueDate).getFullYear();
}

async function addBoleto() { 
    console.log('=== INICIANDO CADASTRO DE BOLETO ===');
    
    // VALIDAR SELEÇÃO DE PROCESSO
    const isProcessValid = validateProcessSelection('boletoProcess', 'processesList');
    if (!isProcessValid) {
        console.warn('Validação de processo falhou.');
        return;
    }
    
    // ✅ OBTER ELEMENTOS FIXOS DO FORMULÁRIO (com verificações seguras)
    const vendorElement = document.getElementById('boletoVendor');
    const processElement = document.getElementById('boletoProcess');
    const directionElement = document.getElementById('boletoDirection');
    const companyElement = document.getElementById('boletoCompany');
    const observationElement = document.getElementById('boletoObservation');
    
    // ✅ VERIFICAR SE ELEMENTOS EXISTEM (evita erros de null/undefined)
    if (!vendorElement || !processElement || !directionElement || !companyElement) {
        console.error('Elementos essenciais do formulário não encontrados:', {
            vendor: !!vendorElement,
            process: !!processElement,
            direction: !!directionElement,
            company: !!companyElement
        });
        alert('Erro no formulário: Campos obrigatórios não foram encontrados. Recarregue a página e tente novamente.');
        return;
    }
    
    // ✅ VALIDAR ARQUIVO ANEXADO
    const boletoFileInput = document.getElementById('boletoFileAttachment');
    const boletoFile = boletoFileInput ? boletoFileInput.files[0] : null;
    
    if (!boletoFile) {
        alert('Por favor, anexe um arquivo de boleto (PDF).');
        boletoFileInput?.focus();
        return;
    }
    
    // ✅ CAPTURAR VALORES DOS CAMPOS (com trim e fallback)
    const vendor = vendorElement.value.trim() || '';
    const process = processElement.value.trim() || '';
    const direction = directionElement.value || '';
    const company = companyElement.value.trim() || '';
    const observation = observationElement.value.trim() || '';
    const singleParcelSelected = document.getElementById('singleParcel')?.checked || false;
    
    // ✅ DATA DE GERAÇÃO FIXA (sempre data atual, formato YYYY-MM-DD)
    const generationDate = getBoletoGenerationDate(); // Função que retorna data atual como string
    console.log('✅ Data de geração do boleto (fixa):', generationDate);
    
    // ✅ VALIDAÇÕES DE CAMPOS OBRIGATÓRIOS
    if (!vendor || !process || !direction || !company) {
        alert('Por favor, preencha todos os campos obrigatórios: Fornecedor, Processo, Direcionamento e Empresa.');
        return;
    }
    
    // ✅ INICIALIZAR VARIÁVEIS
    let parcels = [];
    let totalBoletoValue = 0;
    let firstDueDate = null;
    
    // ✅ PROCESSAR PARCELAMENTO
    if (singleParcelSelected) {
        // --- PARCELA ÚNICA ---
        const singleParcelValueElement = document.getElementById('singleParcelValue');
        const singleParcelDueDateElement = document.getElementById('singleParcelDueDate');
        
        if (!singleParcelValueElement || !singleParcelDueDateElement) {
            alert('Campos de parcela única não encontrados. Verifique o formulário.');
            return;
        }
        
        const singleValue = parseFloat(singleParcelValueElement.value || 0);
        const singleDueDate = singleParcelDueDateElement.value || '';
        
        if (isNaN(singleValue) || singleValue <= 0) {
            alert('Insira um Valor Total válido para a parcela única (maior que zero).');
            singleParcelValueElement.focus();
            return;
        }
        
        if (!singleDueDate) {
            alert('Insira a Data de Vencimento para a parcela única.');
            singleParcelDueDateElement.focus();
            return;
        }
        
        totalBoletoValue = singleValue;
        firstDueDate = singleDueDate;
        
        parcels.push({
            id: uniqid('parcel_'),
            parcelNumber: 1,
            value: singleValue,
            dueDate: singleDueDate,
            isPaid: false,
            paymentOrderId: null
        });
        
        console.log('✅ Parcela única processada: R$ ' + singleValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
        
    } else {
        // --- MÚLTIPLAS PARCELAS ---
        const parcelElements = document.querySelectorAll('#parcelasContainer .parcel-item');
        
        if (parcelElements.length === 0) {
            alert('Adicione pelo menos uma parcela para boletos com múltiplas parcelas.');
            return;
        }
        
        let calculatedTotalValue = 0;
        let earliestDueDate = null;
        const tempParcels = [];
        
        // ====== LOOP DE PROCESSAMENTO DE PARCELAS ======
        for (let i = 0; i < parcelElements.length; i++) {
            const parcelNumberId = parcelElements[i].id.split('-')[1];
            
            const parcelValueElement = document.getElementById(`parcelValue-${parcelNumberId}`);
            const parcelDueDateElement = document.getElementById(`parcelDueDate-${parcelNumberId}`);
            
            if (!parcelValueElement || !parcelDueDateElement) {
                alert(`Erro ao localizar campos da Parcela ${i + 1}. Verifique o formulário.`);
                console.error(`Elementos não encontrados para parcela ${i + 1}:`, {
                    parcelValueElement: !!parcelValueElement,
                    parcelDueDateElement: !!parcelDueDateElement
                });
                return;
            }
            
            // ====== PARSING MONETÁRIO ROBUSTO ======
            const rawValue = parcelValueElement.value.trim();
            const value = parseMonetaryValue(rawValue);
            
            if (isNaN(value) || value <= 0) {
                alert(`Insira um Valor válido (maior que zero) para a Parcela ${i + 1}.`);
                parcelValueElement.focus();
                parcelValueElement.style.borderColor = '#e74c3c';
                return;
            }
            
            const dueDate = parcelDueDateElement.value.trim();
            
            if (!dueDate) {
                alert(`Insira a Data de Vencimento para a Parcela ${i + 1}.`);
                parcelDueDateElement.focus();
                parcelDueDateElement.style.borderColor = '#e74c3c';
                return;
            }
            
            const dateParsed = criarDataLocal(dueDate);
            if (isNaN(dateParsed.getTime())) {
                alert(`Data de vencimento inválida para a Parcela ${i + 1}. Use formato YYYY-MM-DD.`);
                parcelDueDateElement.focus();
                parcelDueDateElement.style.borderColor = '#e74c3c';
                return;
            }
            
            // ====== CONSTRUIR OBJETO DA PARCELA ======
            tempParcels.push({
                id: uniqid('parcel_'),
                parcelNumber: i + 1,
                value: parseFloat(value.toFixed(2)),
                dueDate: dueDate,
                isPaid: false,
                paymentOrderId: null
            });
            
            calculatedTotalValue += value;
            
            if (!earliestDueDate || dateParsed < criarDataLocal(earliestDueDate)) {
                earliestDueDate = dueDate;
            }
            
            console.log(`✅ Parcela ${i + 1} processada: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - Vence em ${dueDate}`);
        }
        
        // ====== ORDENAR PARCELAS POR DATA DE VENCIMENTO ======
        tempParcels.sort((a, b) => {
            const dateA = criarDataLocal(a.dueDate);
            const dateB = criarDataLocal(b.dueDate);
            return dateA.getTime() - dateB.getTime();
        });
        
        console.log('✅ Parcelas ordenadas por data de vencimento');
        
        totalBoletoValue = calculatedTotalValue;
        firstDueDate = earliestDueDate;
        parcels = tempParcels;
        
        console.log('📊 [MÚLTIPLAS PARCELAS] Resumo:', {
            totalParcelas: parcels.length,
            valorTotal: `R$ ${totalBoletoValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            primeiroVencimento: firstDueDate,
            parcelas: parcels.map(p => ({ value: p.value, dueDate: p.dueDate }))
        });
    }
    
    // ✅ VALIDAÇÕES FINAIS DE VALOR E DATA
    if (totalBoletoValue <= 0) {
        alert('O valor total do boleto deve ser maior que zero.');
        return;
    }
    
    if (!firstDueDate) {
        alert('A data de primeiro vencimento não pode estar vazia.');
        return;
    }
    
    // ✅ PREPARAR DADOS PARA ENVIO (FormData com data fixa)
    const formData = new FormData();
    formData.append('id', uniqid('boleto_'));
    formData.append('vendor', vendor);
    formData.append('generationDate', generationDate); // ✅ Data fixa cadastrada
    formData.append('totalValue', totalBoletoValue);
    formData.append('firstDueDate', firstDueDate);
    formData.append('process', process);
    formData.append('direction', direction);
    formData.append('company', company);
    formData.append('observation', observation);
    formData.append('parcels', JSON.stringify(parcels));
    formData.append('boletoFile', boletoFile);
    formData.append('boletoFileName', boletoFile.name);
    formData.append('boletoFileSize', (boletoFile.size / (1024 * 1024)).toFixed(2) + ' MB');
    
    console.log('📤 Enviando para API:', {
        vendor,
        generationDate, // ✅ Log da data para verificação
        totalValue: totalBoletoValue,
        parcelsCount: parcels.length
    });
    
    // ✅ VERIFICAR DUPLICIDADE (com try-catch para segurança)
    try {
        const duplicateCheck = await checkDuplicateBoleto(vendor, totalBoletoValue, process, firstDueDate);
        if (duplicateCheck && duplicateCheck.isDuplicate) {
            const proceed = confirm(
                `Um boleto similar já existe:\n` +
                `Fornecedor: ${duplicateCheck.existingBoleto?.vendor || 'N/A'}\n` +
                `Valor: R$ ${parseFloat(duplicateCheck.existingBoleto?.totalValue || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n` +
                `Processo: ${duplicateCheck.existingBoleto?.process || 'N/A'}\n\n` +
                `Deseja continuar com o cadastro mesmo assim?`
            );
            
            if (!proceed) {
                return;
            }
        }
    } catch (duplicateError) {
        console.warn('⚠️ Erro na verificação de duplicidade, prosseguindo com cadastro:', duplicateError);
    }
    
    // ✅ PROCEDER COM CADASTRO
    await _proceedWithAddBoleto(formData);
}
function parseMonetaryValue(input) {
    if (!input) return 0;
    
    // Se já é número, retorna
    if (typeof input === 'number') return parseFloat(input.toFixed(2));
    
    // Normalizar string
    let cleaned = String(input)
        .trim()
        .replace(/[^\d,.\-]/g, '') // Remove tudo exceto números, vírgula, ponto, hífen
        .replace(/^-/, '');          // Remove hífen no início (negativo não faz sentido)
    
    if (!cleaned) return 0;
    
    // Detectar formato brasileiro vs americano
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    let result;
    
    if (lastComma > lastDot && lastComma !== -1) {
        // Formato brasileiro: 1.234,56 ou 150,1
        result = parseFloat(
            cleaned
                .replace(/\./g, '')      // Remove separadores de milhar
                .replace(',', '.')       // Converte vírgula em ponto
        );
    } else if (lastDot > lastComma && lastDot !== -1) {
        // Formato americano: 1,234.56
        result = parseFloat(
            cleaned.replace(/,/g, '')    // Remove separadores de milhar
        );
    } else {
        // Sem formatação clara
        result = parseFloat(cleaned);
    }
    
    // Garantir número válido e com 2 casas decimais
    return isNaN(result) ? 0 : parseFloat(result.toFixed(2));
}

function clearBoletoForm() {
    console.log('🧹 Limpando formulário de boleto...');
    
    const fieldsToClear = [
        'boletoVendor',
        'boletoProcess',
        'boletoDirection',
        'boletoCompany',
        'boletoObservation',
        'singleParcelValue',
        'singleParcelDueDate',
        'boletoFileAttachment',
        'boletoGenerationDateDisplay' // Campo readonly
    ];
    
    fieldsToClear.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            if (element.type === 'file') {
                element.value = '';
            } else {
                element.value = '';
            }
        } else {
            console.warn(`Campo ${fieldId} não encontrado - ignorado.`);
        }
    });
    
    // Limpar preview de arquivo
    const boletoFilePreview = document.getElementById('boletoFilePreview');
    if (boletoFilePreview) {
        boletoFilePreview.style.display = 'none';
    }
    
    // Resetar parcelamento
    const parcelasContainer = document.getElementById('parcelasContainer');
    if (parcelasContainer) {
        parcelasContainer.innerHTML = '';
    }
    
    const singleParcelRadio = document.getElementById('singleParcel');
    if (singleParcelRadio) {
        singleParcelRadio.checked = true;
    }
    
    const multipleParcelRadio = document.getElementById('multipleParcels');
    if (multipleParcelRadio) {
        multipleParcelRadio.checked = false;
    }
    
    // ✅ Inicializar data fixa
    initializeBoletoGenerationDate();
    
    // ✅ Recarregar empresas
    populateBoletoCompanySelect();
    
    // Resetar contador de parcelas
    if (typeof parcelCounter !== 'undefined') {
        parcelCounter = 0;
    }
    
    // Mostrar campos de parcela única
    toggleParcelFields();
    
    console.log('✅ Formulário de boleto limpo com sucesso.');
}
let _cachedBoletoFilters = null;
let _cachedBoletosForDisplay = null;

function displayBoletos() {
    const tbody = document.getElementById('boletosTableBody');
    if (!tbody) {
        console.error('❌ boletosTableBody não encontrado');
        return;
    }

    tbody.innerHTML = '';
    const boletosTabContent = document.getElementById('boletosTab');
    if (!boletosTabContent) {
        console.error('❌ boletosTab não encontrado');
        return;
    }

    // Limpar alertas
    boletosTabContent.querySelectorAll('[class*="soft-alerts"], [class*="indicator-boletos"]').forEach(el => el.remove());

    // OTIMIZAÇÃO: Usar cache se filtros não mudaram
    const filterHash = JSON.stringify({
        direction: document.getElementById('filterBoletoDirection')?.value,
        vendor: document.getElementById('filterBoletoVendor')?.value,
        process: document.getElementById('filterBoletoProcess')?.value,
        company: document.getElementById('filterBoletoCompany')?.value
    });

    // Pegar parcelas pendentes (SEM refiltrar tudo novamente)
    const allIndividualPendingParcels = getSortedPendingBoletoParcels();
    boletoTotalPendingParcelsInSystem = allIndividualPendingParcels.length;

    if (allIndividualPendingParcels.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="8" class="text-center text-muted py-4"><i class="fas fa-inbox"></i> Nenhuma parcela pendente.</td>`;
        tbody.appendChild(emptyRow);
        return;
    }

    // Filtrar e paginar
    let filteredAndSortedParcels = getBoletoFilteredItemsAndSort(allIndividualPendingParcels);
    
    const startIndex = (boletoCurrentPage - 1) * boletoItemsPerPage;
    const endIndex = startIndex + boletoItemsPerPage;
    const paginatedParcels = filteredAndSortedParcels.slice(startIndex, endIndex);

    // OTIMIZAÇÃO: Usar DocumentFragment para renderização em batch
    const fragment = document.createDocumentFragment();
    
    paginatedParcels.forEach(item => {
        try {
            const row = _createSinglePendingParcelRowHTML(item.boleto, item.parcela);
            fragment.appendChild(row);
        } catch (err) {
            console.error(`❌ Erro renderizando parcela:`, err);
        }
    });

    // Inserir tudo de uma vez
    tbody.appendChild(fragment);

    // Atualizar controles de paginação
    updateBoletoPaginationControls();

    // Destaque de novo boleto
    if (highlightNewBoletoId) {
        requestAnimationFrame(() => {
            const newRow = document.querySelector(`tr[data-boleto-id="${highlightNewBoletoId}"]`);
            if (newRow) {
                newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                newRow.classList.add('highlight-new-boleto');
                setTimeout(() => newRow.classList.remove('highlight-new-boleto'), 3000);
            }
            highlightNewBoletoId = null;
        });
    }

    console.log(`✅ displayBoletos renderizou ${paginatedParcels.length} parcelas`);
}

async function payBoletoParcel(boletoId, parcelId, parcelNumber, parcelValue, vendor) {
 
    const safeVendor = vendor.replace(/'/g, "\'").replace(/"/g, '"');
    const vendorForDisplay = vendor; // Para exibição, usar o nome original
  
    const getLocalYYYYMMDD = () => {
        const today = new Date();
        return today.toLocaleDateString('en-CA'); 
    };

    // Criar modal para upload de comprovante
    const modalHtml = `
        <div id="paymentProofModal" class="modal" style="display: block;">
            <div class="modal-content">
                <span class="close" onclick="closePaymentProofModal()">&times;</span>
                <h2>💰 Pagamento de Parcela</h2>
                <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <strong>Fornecedor:</strong> ${vendorForDisplay}<br>
                    <strong>Parcela:</strong> ${parcelNumber}<br>
                    <strong>Valor:</strong> R\$ ${parcelValue.toFixed(2).replace('.', ',')}<br>
                </div>
                
                <form id="paymentProofForm">
                    <!-- NOVO CAMPO: Data de Pagamento -->
                    <div class="form-group">
                        <label for="paymentCompletionDate"><span class="required">*</span> Data de Pagamento:</label>
                        <input type="date" id="paymentCompletionDate" name="paymentCompletionDate" required>
                    </div>
                    <!-- FIM NOVO CAMPO -->

                    <div class="form-group">
                        <label for="proofFile"><span class="required">*</span> Comprovante de Pagamento:</label>
                        <input type="file" id="proofFile" accept=".pdf,.jpg,.jpeg,.png" required>
                        <small style="color: #666;">Formatos aceitos: PDF, JPG, JPEG, PNG (máx. 30MB)</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="paymentObservation">Observação (opcional):</label>
                        <textarea id="paymentObservation" rows="3" placeholder="Observações sobre o pagamento..."></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" id="confirmPaymentBtn" class="btn btn-success"
                                data-boleto-id="${boletoId}" 
                                data-parcel-id="${parcelId}" 
                                data-parcel-number="${parcelNumber}" 
                                data-parcel-value="${parcelValue}">
                            💰 Confirmar Pagamento
                        </button>
                        <button type="button" onclick="closePaymentProofModal()" class="btn btn-secondary">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Adicionar modal ao body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('paymentCompletionDate').value = getLocalYYYYMMDD();
    document.getElementById('confirmPaymentBtn').addEventListener('click', function() {
        const boletoId = this.getAttribute('data-boleto-id');
        const parcelId = this.getAttribute('data-parcel-id');
        const parcelNumber = parseInt(this.getAttribute('data-parcel-number'));
        const parcelValue = parseFloat(this.getAttribute('data-parcel-value'));
        
        processPaymentWithProof(boletoId, parcelId, parcelNumber, parcelValue);
    });
    
    console.log('=== FIM INICIANDO PAGAMENTO DE PARCELA ===');
}

function closePaymentProofModal() {
    const modal = document.getElementById('paymentProofModal');
    if (modal) {
        modal.remove();
    }
}

function closePaymentProofModal() {
    const modal = document.getElementById('paymentProofModal');
    if (modal) {
        modal.remove();
    }
}

function showLoadingOverlay() {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            color: white;
            font-size: 2em;
            flex-direction: column;
            gap: 20px;
        `;
        overlay.innerHTML = `
            <i class="fas fa-spinner fa-spin fa-3x"></i>
            <p>Carregando, por favor aguarde...</p>
        `;
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

async function processPaymentWithProof(boletoId, parcelId, parcelNumber, parcelValue) {
    const fileInput = document.getElementById('proofFile');
    const observationInput = document.getElementById('paymentObservation');
    const paymentDateInput = document.getElementById('paymentCompletionDate');
    
    // Validar se arquivo foi selecionado
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Por favor, selecione um arquivo de comprovante!');
        return;
    }
    // VALIDAR SE A DATA FOI SELECIONADA
    if (!paymentDateInput.value) {
        alert('Por favor, selecione a data de pagamento!');
        return;
    }
    
    const file = fileInput.files[0];
    const observation = observationInput.value.trim();
    const paymentCompletionDate = paymentDateInput.value;

    const maxSize = 30 * 1024 * 1024; // 30MB em bytes
    if (file.size > maxSize) {
        alert('O arquivo é muito grande! Tamanho máximo: 30MB');
        return;
    }
    
    // Validar tipo do arquivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
        alert('Tipo de arquivo não permitido! Use apenas PDF, JPG, JPEG ou PNG.');
        return;
    }
    
    // Desabilitar botão para evitar cliques duplos
    const confirmBtn = document.getElementById('confirmPaymentBtn');
    const originalButtonText = confirmBtn ? confirmBtn.innerHTML : '   Confirmar Pagamento'; // Guarda o texto original

    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    }
    

    try {
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        
        const payload = {
            boletoId: boletoId,
            parcelId: parcelId,
            proofData: base64Data,
            proofFileName: file.name,
            observation: observation,
            paymentCompletionDate: paymentCompletionDate
        };
        
        const response = await fetch('api/pay_boleto_simple.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            showModernSuccessNotification('Parcela paga com sucesso! Comprovante anexado.');
            closePaymentProofModal();
            
            console.log('Recarregando dados localmente após pagamento de parcela...');
            
            // --- MUDANÇA CRÍTICA: ATUALIZA BOLETO E fullOrdersList LOCALMENTE ---
            const boleto = boletos.find(b => b.id === boletoId);
            if (boleto) {
                const parcel = boleto.parcels.find(p => p.id === parcelId);
                if (parcel) {
                    parcel.isPaid = true;
                    parcel.paidAt = paymentCompletionDate; // Ou a data do servidor se houver
                    parcel.proofData = base64Data;
                    parcel.proofFileName = file.name;
                    parcel.paymentObservation = observation;
                    parcel.paymentOrderId = data.orderId; // Se o backend retornar o ID da ordem de pagamento gerada
                    console.log(`✅ Boleto ${boletoId}, parcela ${parcelId} atualizada localmente.`);
                }
                // Verifica se o boleto está totalmente pago
                boleto.isFullyPaid = boleto.parcels.every(p => p.isPaid);
            }
            // Se o pagamento de boleto gera uma ordem de pagamento, atualiza 'fullOrdersList' localmente
            if (data.order && data.order.id) {
                const existingOrderIndex = fullOrdersList.findIndex(o => o.id === data.order.id);
                if (existingOrderIndex !== -1) {
                    Object.assign(fullOrdersList[existingOrderIndex], data.order);
                    console.log(`✅ Ordem ${data.order.id} (gerada pelo boleto) atualizada localmente.`);
                } else {
                    fullOrdersList.push(data.order);
                    console.log(`✅ Nova ordem ${data.order.id} (gerada pelo boleto) adicionada localmente.`);
                }
            }
            // --- FIM DA MUDANÇA LOCAL ---

            // Recarrega o valor em caixa (este é um estado global separado)
            await loadCashValueFromDB();       
            
            // Chama a função unificada de atualização de UI para redesenhar o que for necessário
            updateUIComponentsAfterLoad();

            console.log('Todos os dados atualizados após pagamento de parcela!');

        } else {
            console.error('Erro na API:', data.error);
            showModernErrorNotification('Erro ao processar pagamento: ' + (data.error || 'Erro desconhecido'));
            
            // Em caso de erro, recarregar tudo para garantir a consistência
            await loadBoletos();
            await loadFullOrdersList(); 
            await loadCashValueFromDB(); 
            updateUIComponentsAfterLoad(); 
        }

    } catch (error) {
        console.error('Erro ao processar pagamento:', error); 
        showModernErrorNotification('Erro ao processar pagamento. Verifique o console.');
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalButtonText; // Restaurar texto original
        }
        hideLoadingOverlay();
        console.log('=== FIM PROCESSANDO PAGAMENTO COM COMPROVANTE ==='); 
    }
}
function editBoletoParcel(boletoId, parcelId) {
    console.log(`[DEBUG editBoletoParcel] Chamada para editar PARCELA com Boleto ID: ${boletoId}, Parcela ID: ${parcelId}`);
    
    // Encontrar o boleto e a parcela
    const boleto = boletos.find(b => b.id === boletoId);
    console.log(`[DEBUG editBoletoParcel] Boleto encontrado em 'boletos':`, boleto);
    
    const parcela = boleto ? boleto.parcels.find(p => p.id === parcelId) : null;
    console.log(`[DEBUG editBoletoParcel] Parcela encontrada no boleto:`, parcela);
    
    if (!boleto || !parcela) {
        alert('Boleto ou parcela não encontrada!');
        return;
    }
    
    // ✅ NOVA: Popular o select de Empresas (usando função existente ou array global)
    // Se você tem uma função como populateBoletoCompanySelect(), chame aqui
    // Caso contrário, extraia de fullOrdersList ou use um array fixo de empresas
    let companyOptions = '<option value="">Selecione uma empresa...</option>';
    if (typeof companies !== 'undefined' && Array.isArray(companies)) {
        companies.forEach(comp => {
            const selected = boleto.company === comp ? 'selected' : '';
            companyOptions += `<option value="${comp}" ${selected}>${comp}</option>`;
        });
    } else if (fullOrdersList && Array.isArray(fullOrdersList)) {
        // Fallback: Extrair empresas únicas de fullOrdersList
        const uniqueCompanies = [...new Set(fullOrdersList.map(o => o.company).filter(Boolean))];
        uniqueCompanies.forEach(comp => {
            const selected = boleto.company === comp ? 'selected' : '';
            companyOptions += `<option value="${comp}" ${selected}>${comp}</option>`;
        });
    }
    
    const modalHtml = `
        <div id="editParcelModal" class="modal" style="display: block;">
            <div class="modal-content">
                <span class="close" onclick="closeEditParcelModal()">&times;</span>
                <h2>Editar Parcela</h2>
                <form id="editParcelForm">
                    <div class="form-group">
                        <label>Fornecedor:</label>
                        <input type="text" id="editVendor" value="${boleto.vendor}" required>
                    </div>
                    <!-- ✅ NOVO CAMPO: Empresa -->
                    <div class="form-group">
                        <label for="editCompany">Empresa <span class="required">*</span>:</label>
                        <select id="editCompany" required>
                            ${companyOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Processo:</label>
                        <input type="text" id="editProcess" value="${boleto.process}" required>
                    </div>
                    <div class="form-group">
                        <label>Valor da Parcela:</label>
                        <input type="number" id="editValue" value="${parcela.value}" step="0.01" min="0" required>
                    </div>
                    <div class="form-group">
                        <label>Data de Vencimento:</label>
                        <input type="date" id="editDueDate" value="${parcela.dueDate}" required>
                    </div>
                    <div class="form-group">
                        <label>Direcionamento:</label>
                        <select id="editDirection" required>
                            <option value="Tiago" ${boleto.direction === 'Tiago' ? 'selected' : ''}>Tiago</option>
                            <option value="Lotérica" ${boleto.direction === 'Lotérica' ? 'selected' : ''}>Lotérica</option>
                            <!-- Adicione outras opções se necessário -->
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Observação:</label>
                        <textarea id="editObservation" rows="3">${boleto.observation || ''}</textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="saveParcelEdit('${boletoId}', '${parcelId}')" class="btn btn-success">
                            Salvar Alterações
                        </button>
                        <button type="button" onclick="closeEditParcelModal()" class="btn btn-secondary">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // ✅ NOVA: Definir valor inicial do select de Empresa (caso não tenha sido setado no HTML)
    const editCompanySelect = document.getElementById('editCompany');
    if (editCompanySelect && boleto.company) {
        editCompanySelect.value = boleto.company;
    }
}
function closeEditParcelModal() {
    const modal = document.getElementById('editParcelModal');
    if (modal) {
        modal.remove();
    }
}

async function saveParcelEdit(boletoId, parcelId) {
    console.log('=== SALVANDO EDIÇÃO DE PARCELA ===');
    
    // Tentar encontrar os elementos para parcela ÚNICA primeiro
    let editValueEl = document.getElementById('editValue');
    let editDueDateEl = document.getElementById('editDueDate');
    
    // Se não encontrar, procurar pela estrutura de múltiplas parcelas
    if (!editValueEl || !editDueDateEl) {
        // Procurar entre os campos dinâmicos de múltiplas parcelas
        const parcelElements = document.querySelectorAll('#editParcelModal .parcel-item, #editParcelModal [id^="editParcelValue-"]');
        
        if (parcelElements.length > 0) {
            // Pegar o primeiro (ou o único) campo
            const firstParcelId = parcelElements[0].id;
            const counter = firstParcelId.match(/\d+/)[0];
            editValueEl = document.getElementById(`editParcelValue-${counter}`);
            editDueDateEl = document.getElementById(`editParcelDueDate-${counter}`);
        }
    }
    
    // Obter outros elementos que devem existir
    const editVendorEl = document.getElementById('editVendor');
    const editProcessEl = document.getElementById('editProcess');
    const editDirectionEl = document.getElementById('editDirection');
    const editObservationEl = document.getElementById('editObservation');
    
    // ✅ NOVO: Obter elemento para Empresa (do modal atualizado)
    const editCompanyEl = document.getElementById('editCompany');
    
    // Verificar quais elementos existem
    console.log('Verificação de elementos:');
    console.log('editVendor:', editVendorEl ? '✅' : '❌');
    console.log('editProcess:', editProcessEl ? '✅' : '❌');
    console.log('editCompany:', editCompanyEl ? '✅' : '❌');  // ✅ NOVO LOG
    console.log('editValue:', editValueEl ? '✅' : '❌');
    console.log('editDueDate:', editDueDateEl ? '✅' : '❌');
    console.log('editDirection:', editDirectionEl ? '✅' : '❌');
    console.log('editObservation:', editObservationEl ? '✅' : '❌');
    
    // Se algum elemento estiver faltando, abortar (agora inclui editCompany)
    if (!editVendorEl || !editProcessEl || !editValueEl || !editDueDateEl || !editDirectionEl || !editObservationEl || !editCompanyEl) {  // ✅ NOVO: !editCompanyEl
        showModernErrorNotification('Erro: Um ou mais campos do formulário não foram encontrados (incluindo Empresa). Recarregando página...');
        location.reload();
        return;
    }
    
    // Coletar os valores
    const vendor = editVendorEl.value.trim();
    const process = editProcessEl.value.trim();
    const value = parseFloat(editValueEl.value);
    const dueDate = editDueDateEl.value;
    const direction = editDirectionEl.value;
    const observation = editObservationEl.value.trim();
    
    // ✅ NOVO: Coletar valor de Empresa
    const company = editCompanyEl.value.trim();
    
    // Validações (agora inclui Empresa obrigatória)
    if (!vendor || !process || !company || isNaN(value) || value <= 0 || !dueDate) {  // ✅ NOVO: !company
        showModernErrorNotification('Por favor, preencha todos os campos obrigatórios com valores válidos, incluindo Empresa.');
        return;
    }
    
    showLoadingOverlay();
    
    try {
        console.log('Enviando dados para API de edição...');
        console.log('Dados a enviar:', { boletoId, parcelId, vendor, process, company, value, dueDate, direction, observation });  // ✅ NOVO LOG
        
        const response = await fetch('api/edit_boleto_parcel.php', {  // Assuma o caminho correto da API
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                boletoId: boletoId,
                parcelId: parcelId,
                vendor: vendor,
                process: process,
                company: company,  // ✅ NOVO: Incluir no payload para API
                value: value,
                dueDate: dueDate,
                direction: direction,
                observation: observation
            })
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Resposta da API:', data);
        
        if (data.success) {
            const message = data.data?.wasPaid ? 
                'Parcela paga editada com sucesso!' : 
                'Parcela editada com sucesso!';
            
            showModernSuccessNotification(message);
            
            // Atualização otimista (local) - agora inclui company
            const boleto = boletos.find(b => b.id === boletoId);
            if (boleto) {
                const parcel = boleto.parcels.find(p => p.id === parcelId);
                if (parcel) {
                    parcel.value = value;
                    parcel.dueDate = dueDate;
                    
                    // Atualizar boleto pai
                    boleto.vendor = vendor;
                    boleto.process = process;
                    boleto.company = company;  // ✅ NOVO: Atualizar localmente
                    boleto.direction = direction;
                    boleto.observation = observation;
                    
                    console.log(`✨ Parcela ${parcelId} atualizada localmente (incluindo Empresa: ${company})`);
                }
            }
            
            // Fechar modal e reexibir
            closeEditParcelModal();
            displayBoletos();
            updateCounters();
        } else {
            showModernErrorNotification('Erro ao editar parcela: ' + (data.error || 'Erro desconhecido'));
            await loadBoletos(true);
            displayBoletos();
        }
    } catch (error) {
        console.error('Erro ao editar parcela:', error);
        showModernErrorNotification('Erro ao editar parcela: ' + error.message);
        await loadBoletos(true);
        displayBoletos();
    } finally {
        hideLoadingOverlay();
        console.log('=== FIM SALVANDO EDIÇÃO DE PARCELA ===');
    }
}

function visualizarBoleto(boletoId) {
    const boleto = boletos.find(b => b.id === boletoId);
    if (!boleto) {
        alert('Boleto não encontrado!');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'visualizarBoletoModal';
    
    const totalPago = boleto.parcels.filter(p => p.isPaid).reduce((sum, p) => sum + parseFloat(p.value), 0);
    const totalPendente = boleto.parcels.filter(p => !p.isPaid).reduce((sum, p) => sum + parseFloat(p.value), 0);
    
    let anexoSection = ''; // ✅ Garantido: inicializado como string vazia
    
    // Verificar múltiplas condições para detectar arquivo
    const temArquivo = boleto.hasFile || 
                      boleto.file_name || 
                      boleto.file_original_name || 
                      boleto.boletoFileName;
    
    console.log('Tem arquivo (verificação múltipla):', temArquivo);
    
    if (temArquivo) {
        const nomeOriginal = boleto.file_original_name || boleto.boletoFileName || 'boleto.pdf';
        const tamanhoArquivo = boleto.file_size || boleto.boletoFileSize || 'Tamanho não disponível';
        
        console.log('✅ Arquivo detectado:', nomeOriginal);
        anexoSection = `
            <div class="boleto-anexo-section boleto-anexo-disponivel">
                <h4 style="color: #1976d2;">📎 Boleto Anexado</h4>
                <div class="anexo-info">
                    <span>📄 ${nomeOriginal}</span>
                    <span style="color: #666; font-size: 0.9em;">(${tamanhoArquivo})</span>
                </div>
                <div class="anexo-actions">
                    <button class="btn btn-info btn-small" onclick="abrirAnexoBoleto('${boleto.id}')" title="Exibir boleto em nova aba">
                        <i class="fas fa-eye"></i> Exibir Boleto
                    </button>
                    <button class="btn btn-success btn-small" onclick="baixarAnexoBoleto('${boleto.id}')" title="Baixar boleto">
                        <i class="fas fa-download"></i> Baixar Boleto
                    </button>
                </div>
            </div>
        `;
    } else {
        console.log('❌ Nenhum arquivo detectado');
        anexoSection = `
            <div class="boleto-anexo-section boleto-anexo-indisponivel">
                <h4 style="color: #d32f2f;">⚠️ Boleto não anexado</h4>
                <p style="margin: 0; color: #666;">Nenhum arquivo de boleto foi anexado a este registro.</p>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="modal-content boleto-modal">
            <span class="close" onclick="fecharVisualizacaoBoleto()">&times;</span>
            <h2>📄 Detalhes do Boleto</h2>
            
            <div class="resumo-financeiro">
                <div class="resumo-card">
                    <h3>Informações Gerais</h3>
                    <p><strong>Empresa:</strong> ${boleto.company || 'N/D'}</p>
                    <p><strong>Processo:</strong> ${boleto.process}</p>
                    <p><strong>Direcionamento:</strong> ${boleto.direction}</p>
                    <p><strong>Data de Geração:</strong> ${formatDateForDisplay(boleto.generationDate)}</p> <!-- ✅ Corrigido -->
                    ${boleto.observation ? `<p><strong>Observação:</strong> ${boleto.observation}</p>` : ''}
                </div>
                
                <div class="resumo-card">
                    <h3>Fornecedor (Beneficiário):</h3>
                    <p>${boleto.vendor || 'N/D'}</p>
                </div>
                
                <div class="resumo-card">
                    <h3>💰 Resumo Financeiro</h3>
                    <p><strong>Valor Total:</strong> R$ ${parseFloat(boleto.totalValue).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    <p><strong>Total Pago:</strong> <span style="color: green;">R$ ${totalPago.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></p>
                    <p><strong>Total Pendente:</strong> <span style="color: red;">R$ ${totalPendente.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></p>
                    <p><strong>Total de Parcelas:</strong> ${boleto.parcels.length}</p>
                </div>
            </div>
            
            ${anexoSection}
            
            <h3>📅 Detalhes das Parcelas</h3>
            <div style="overflow-x: auto;">
                <table class="parcelas-table">
                    <thead>
                        <tr>
                            <th>Parcela</th>
                            <th>Valor</th>
                            <th>Vencimento</th>
                            <th>Status</th>
                            <th>Situação</th>
                            <th>Data Pagamento</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${boleto.parcels.map((parcela, index) => {
                            const dueDateObj = criarDataLocal(parcela.dueDate);
                            // Validar se dueDateObj é uma data válida antes de usar
                            if (isNaN(dueDateObj.getTime())) {
                                console.warn(`visualizarBoleto: Data de vencimento inválida para parcela ${index + 1} do boleto ${boletoId}: "${parcela.dueDate}"`);
                                return ''; // Ou exibir um placeholder
                            }

                            // Usar dueDateObj para cálculos e exibição
                            const today = new Date(); // Definir today dentro do loop ou fora, mas para cada comparação
                            today.setHours(0,0,0,0); // Zera a hora para comparação de datas
                            const daysDiff = Math.ceil((dueDateObj - today) / (1000 * 60 * 60 * 24));
                            
                            let statusText, statusColor, daysText;
                            
                            if (parcela.isPaid) {
                                statusText = '✅ Pago';
                                statusColor = 'green';
                                daysText = '-';
                            } else if (daysDiff < 0) {
                                statusText = '🔴 Vencido';
                                statusColor = 'red';
                                daysText = `${Math.abs(daysDiff)} dias atrás`; // ✅ Corrigido: template literal
                            } else if (daysDiff <= 7) {
                                statusText = '🟡 Vencendo';
                                statusColor = 'orange';
                                daysText = daysDiff === 0 ? 'Hoje' : `${daysDiff} dias`; // ✅ Corrigido
                            } else {
                                statusText = '🟢 Pendente';
                                statusColor = 'blue';
                                daysText = `${daysDiff} dias`; // ✅ Corrigido
                            }
                            
                            return `
                                <tr>
                                    <td>${index + 1}ª Parcela</td>
                                    <td>R$ ${parseFloat(parcela.value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                    <td>${formatDateForDisplay(parcela.dueDate)}</td> <!-- ✅ Corrigido: vencimento -->
                                    <td style="color: ${statusColor};">${statusText}</td>
                                    <td>${daysText}</td>
                                    <td>${parcela.paymentDate ? formatDateForDisplay(parcela.paymentDate) : '-'}</td> <!-- ✅ Corrigido: data pagamento -->
                                    <td>
                                        <!-- Botões de ação da parcela aqui (ex: Pagar Parcela, Editar Parcela) -->
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 20px; text-align: center;">
                <button class="btn btn-secondary" onclick="fecharVisualizacaoBoleto()">Fechar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}
// Função para fechar modal de visualização
function fecharVisualizacaoBoleto() {
    const modal = document.getElementById('visualizarBoletoModal');
    if (modal) {
        modal.remove();
    }
}

function abrirAnexoBoleto(boletoId) {
    console.log('Tentando abrir arquivo do boleto:', boletoId);
    
    const boleto = boletos.find(b => b.id === boletoId);
    if (!boleto) {
        alert('Boleto não encontrado!');
        return;
    }
    
    console.log('Boleto encontrado:', boleto);
    console.log('file_name:', boleto.file_name);
    
    const fileName = boleto.file_name;
    if (!fileName) {
        alert('Arquivo do boleto não encontrado!');
        return;
    }
    
    const url = `api/download_boleto.php?boleto_id=${encodeURIComponent(boletoId)}&file=${encodeURIComponent(fileName)}`;
    console.log('URL do arquivo:', url);
    
    window.open(url, '_blank');
}

// Função para baixar anexo do boleto
function baixarAnexoBoleto(boletoId) {
    console.log('Tentando baixar arquivo do boleto:', boletoId);
    
    const boleto = boletos.find(b => b.id === boletoId);
    if (!boleto) {
        alert('Boleto não encontrado!');
        return;
    }
    
    const fileName = boleto.file_name;
    const originalName = boleto.file_original_name || boleto.boletoFileName || fileName;
    
    if (!fileName) {
        alert('Arquivo do boleto não encontrado!');
        return;
    }
    
    const url = `api/download_boleto.php?boleto_id=${encodeURIComponent(boletoId)}&file=${encodeURIComponent(fileName)}`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// FUNÇÃO para baixar anexo do boleto
function baixarAnexoBoleto(boletoId) {
    console.log('💾 Baixando arquivo do boleto:', boletoId);
    
    const boleto = boletos.find(b => b.id === boletoId);
    
    if (!boleto) {
        console.error('❌ Boleto não encontrado:', boletoId);
        alert('Boleto não encontrado!');
        return;
    }
    
    if (!boleto.file_name) {
        console.error('❌ Arquivo não encontrado para o boleto:', boleto);
        alert('Arquivo do boleto não encontrado!');
        return;
    }
    
    console.log('✅ Boleto encontrado:', {
        id: boleto.id,
        vendor: boleto.vendor,
        file_name: boleto.file_name,
        file_original_name: boleto.file_original_name
    });
    
    // Usar a URL que já funciona para abrir, mas com parâmetro de download
    const url = `api/download_boleto.php?boleto_id=${encodeURIComponent(boletoId)}&file=${encodeURIComponent(boleto.file_name)}&download=1`;
    
    console.log('🔗 URL de download:', url);
    
    // Método via fetch para garantir que funcione
    fetch(url)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        return response.blob();
    })
    .then(blob => {
        console.log('📥 Blob recebido:', blob.size, 'bytes');
        
        // Criar URL temporária para o blob
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Criar link de download
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = boleto.file_original_name || boleto.file_name;
        a.style.display = 'none';
        document.body.appendChild(a);
        
        console.log('🎯 Iniciando download:', a.download);
        a.click();
        
        // Limpar recursos
        document.body.removeChild(a);
        setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
            console.log('✅ Download concluído e recursos liberados');
        }, 100);
    })
    .catch(error => {
        console.error('❌ Erro no download:', error);
        alert('Erro no download: ' + error.message);
    });
}

// Abrir modal de pagamento de parcela de boleto
function openBoletoPaymentModal(boletoId) {
    currentBoletoId = boletoId;
    const boleto = boletos.find(b => b.id === boletoId);
    if (!boleto) {
        alert('Boleto não encontrado.');
        return;
    }

    document.getElementById('modalBoletoVendor').textContent = boleto.vendor;
    document.getElementById('modalBoletoValue').textContent = `R$ ${boleto.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

    const parcelsList = document.getElementById('boletoParcelsToPayList');
    parcelsList.innerHTML = ''; // Limpa a lista antes de adicionar novas parcelas

    boleto.parcels.forEach(parcel => {
        const parcelDiv = document.createElement('div');
        parcelDiv.className = 'payment-item'; // Reutiliza estilo de payments-list
        if (parcel.isPaid) {
            parcelDiv.style.borderLeftColor = '#28a745'; // Verde para paga
        } else {
            parcelDiv.style.borderLeftColor = '#ffc107'; // Amarelo para pendente
        }
        
        parcelDiv.innerHTML = `
            <div class="payment-details">
                <strong>Parcela:</strong> R$ ${parcel.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}<br>
                <strong>Vencimento:</strong> ${formatDate(parcel.dueDate)}<br>
                <strong>Status:</strong> ${parcel.isPaid ? 'Paga' : 'Pendente'}
                ${parcel.isPaid && parcel.paymentOrderId ? `<br><small>Ordem de Pagamento ID: ${parcel.paymentOrderId}</small>` : ''}
            </div>
            <div class="payment-actions">
                ${!parcel.isPaid ? `<button class="btn btn-success btn-small" onclick="registerBoletoParcelPayment('${boleto.id}', '${parcel.id}')">Pagar Parcela</button>` : ''}
                ${parcel.paymentOrderId ? `<button class="btn btn-info btn-small" onclick="viewOrder('${parcel.paymentOrderId}')">Ver OP</button>` : ''}
            </div>
        `;
        parcelsList.appendChild(parcelDiv);
    });

    document.getElementById('boletoPaymentModal').style.display = 'block';
}

// Função de teste para verificar envio de arquivo
function testarEnvioArquivo() {
    const fileInput = document.getElementById('boletoFileAttachment');
    const file = fileInput ? fileInput.files[0] : null;

    if (file) {

        const formData = new FormData();
        formData.append('teste', 'valor_teste');
        formData.append('boletoFile', file);
        
        console.log('FormData criado com sucesso');
        
        // Testar envio
        fetch('api/add_boleto.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.text())
        .then(data => {
            console.log('Resposta do servidor:', data);
        })
        .catch(error => {
            console.error('Erro no envio:', error);
        });
    } else {
        console.log('❌ Nenhum arquivo selecionado');
    }
}

// Fechar modal de pagamento de parcela
function closeBoletoPaymentModal() {
    document.getElementById('boletoPaymentModal').style.display = 'none';
    currentBoletoId = null;
}

// Registrar pagamento de UMA parcela de boleto
async function registerBoletoParcelPayment(boletoId, parcelId) {
    const boleto = boletos.find(b => b.id === boletoId);
    if (!boleto) {
        alert('Boleto não encontrado.');
        return;
    }
    const parcel = boleto.parcels.find(p => p.id === parcelId);
    if (!parcel) {
        alert('Parcela não encontrada.');
        return;
    }
    if (parcel.isPaid) {
        alert('Esta parcela já foi paga.');
        return;
    }

   
    const tempOrderId = generateId(); // Gerar um ID temporário para o order.id
    const orderTemplate = {
        id: tempOrderId,
        favoredName: boleto.vendor,
        paymentValue: parcel.value,
        paymentType: 'Boleto', 
        priority: 'Normal', 
        status: 'Aguardando Pagamento', 
        generationDate: new Date().toISOString().split('T')[0],
        paymentForecast: parcel.dueDate,
        process: boleto.process,
        direction: boleto.direction,
        reference: `Boleto ${boleto.vendor} - Parcela ${parcelId}`,
        solicitant: currentUser.role || 'Sistema', // Quem está registrando
        observation: boleto.observation,
        approvedByDiretoria: true,
        approvedByFinanceiro: true, 
        isPaid: false,
        boletoRefId: boletoId, 
        boletoParcelId: parcelId,
        payments: []
    };

    orders.push(orderTemplate);
    saveOrders();

    openPaymentModal(tempOrderId); // Reutiliza o modal de pagamento de ordem
    closeBoletoPaymentModal();
}

// APROX. LINHA 17090 (ou onde deleteBoleto está)
// Função para excluir boleto (se não existir)
async function deleteBoleto(boletoId) {
    const confirmMessage = 'Tem certeza que deseja excluir este boleto COMPLETAMENTE?\n\nTodas as parcelas serão removidas.\n\nEsta ação não pode ser desfeita.';
    
    if (!confirm(confirmMessage)) {
        console.log('Exclusão de boleto cancelada pelo usuário');
        return;
    }
    
    console.log('=== INICIANDO EXCLUSÃO DE BOLETO COMPLETO ===');
    console.log('authToken que será enviado:', authToken);
    console.log('boletoId:', boletoId);

    // --- INÍCIO DA ATUALIZAÇÃO OTTIMISTA DA UI ---
    console.log(`[DEBUG DELETE BOLETO] Tentando remover visualmente boleto com ID: ${boletoId}`);
    // Busca todas as linhas de parcela que pertencem a este boleto
    const rowsToDelete = document.querySelectorAll(`tr[data-boleto-id="${boletoId}"]`);
    
    if (rowsToDelete.length > 0) {
        console.log(`[DEBUG DELETE BOLETO] Encontradas ${rowsToDelete.length} linhas de parcela para boleto ID: ${boletoId}`);
        rowsToDelete.forEach(row => {
            row.style.opacity = '0'; // Começa a animação de fade-out
            row.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out'; // Animação de fade e slide
            row.style.transform = 'translateX(-100%)'; // Move para a esquerda (fora da tela)
        });
        // Remove os elementos do DOM após a animação (0.3 segundos)
        setTimeout(() => {
            rowsToDelete.forEach(row => row.remove());
            console.log(`UI: Boleto ${boletoId} e suas parcelas removidas otimisticamente do display.`);
        }, 300); // Deve corresponder à duração da transição
    } else {
        console.warn(`[DEBUG DELETE BOLETO] Nenhuma linha de parcela encontrada para boleto ID: ${boletoId}. A remoção visual instantânea não ocorrerá.`);
    }
    // --- FIM DA ATUALIZAÇÃO OTTIMISTA DA UI ---

    try {
        console.log('Enviando requisição de exclusão de boleto para a API...');
        const response = await fetch('api/delete_boleto.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({ boletoId: boletoId })
        });

        console.log('Response status delete_boleto:', response.status);
        const data = await response.json();
        console.log('Resposta da API delete_boleto:', data);
        
        // DEBUG DETALHADO:
        console.log('=== DEBUG DETALHADO DA EXCLUSÃO DE BOLETO ===');
        console.log('authToken enviado:', authToken);
        if (data.debug) {
            console.log('Debug do backend:', JSON.stringify(data.debug, null, 2));
        } else {
            console.log('Nenhum debug retornado pelo backend');
        }
        console.log('=== FIM DEBUG DETALHADO ===');

        if (data.success) {
            showModernSuccessNotification(`Boleto excluído com sucesso!\n\n${data.data.parcelasExcluidas} parcela(s) foram removidas.`);
            
            // --- MUDANÇA CRÍTICA: Atualizar boletos localmente para garantir a remoção
            // Remove o boleto do array global 'boletos'
            boletos = boletos.filter(b => b.id !== boletoId);
            
            // As próximas chamadas de display já usarão os 'boletos' atualizados
            // updateUIComponentsAfterLoad() já abrange todas as atualizações necessárias
            updateUIComponentsAfterLoad(); 

        } else {
            console.log('Erro na API:', data.error);
            showModernErrorNotification('Erro ao excluir boleto: ' + (data.error || 'Erro desconhecido'));

            // --- REVERTER ATUALIZAÇÃO OTTIMISTA EM CASO DE ERRO DA API ---
            console.warn(`[DEBUG DELETE BOLETO] Revertendo remoção otimista para boleto ID: ${boletoId} devido a erro da API.`);
            // Força a atualização completa da UI para restaurar o boleto, recarregando do servidor
            await loadBoletos(true); // Recarrega do servidor forçadamente
            updateUIComponentsAfterLoad();
            // --- FIM DA REVERSÃO ---
        }

    } catch (error) {
        console.error('Erro ao excluir boleto:', error);
        showModernErrorNotification('Erro ao excluir boleto. Verifique o console.');
        
        // --- REVERTER ATUALIZAÇÃO OTTIMISTA EM CASO DE ERRO DE CONEXÃO ---
        console.warn(`[DEBUG DELETE BOLETO] Revertendo remoção otimista para boleto ID: ${boletoId} devido a erro de conexão.`);
        // Força a atualização completa da UI para restaurar o boleto, recarregando do servidor
        await loadBoletos(true); // Recarrega do servidor forçadamente
        updateUIComponentsAfterLoad();
        // --- FIM DA REVERSÃO ---

    } finally {
        hideLoadingOverlay(); // Remove esta linha
    }
}

async function deleteBoletoParcel(boletoId, parcelId, parcelNumber, vendor) {
    const confirmMessage = `Tem certeza que deseja excluir APENAS a Parcela ${parcelNumber} do boleto de ${vendor}?\n\nEsta ação não pode ser desfeita.\n\nO boleto continuará existindo com as outras parcelas.`;
    
    if (!confirm(confirmMessage)) {
        console.log('Exclusão de parcela cancelada pelo usuário');
        return;
    }
    
    console.log('=== INICIANDO EXCLUSÃO DE PARCELA INDIVIDUAL ===');
    console.log('authToken que será enviado:', authToken);
    console.log('boletoId:', boletoId, 'parcelId:', parcelId);

    // --- INÍCIO DA ATUALIZAÇÃO OTTIMISTA DA UI ---
    console.log(`[DEBUG DELETE PARCEL] Tentando remover visualmente parcela com ID: ${parcelId}`);
    // Busca a linha específica da parcela que está sendo excluída
    const rowToDelete = document.querySelector(`tr[data-parcel-id="${parcelId}"]`);
    
    if (rowToDelete) {
        console.log(`[DEBUG DELETE PARCEL] Linha de parcela encontrada para ID: ${parcelId}`);
        rowToDelete.style.opacity = '0'; // Começa a animação de fade-out
        rowToDelete.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out'; // Animação de fade e slide
        rowToDelete.style.transform = 'translateX(-100%)'; // Move para a esquerda (fora da tela)
        
        // Remove o elemento do DOM após a animação (0.3 segundos)
        setTimeout(() => {
            rowToDelete.remove();
            console.log(`UI: Parcela ${parcelId} removida otimisticamente do display.`);
        }, 300); // Deve corresponder à duração da transição
    } else {
        console.warn(`[DEBUG DELETE PARCEL] Nenhuma linha encontrada para parcela ID: ${parcelId}. A remoção visual instantânea não ocorrerá.`);
    }
    // --- FIM DA ATUALIZAÇÃO OTTIMISTA DA UI ---

    try {
        console.log('Enviando requisição de exclusão de parcela para a API...');
        const response = await fetch('api/delete_boleto_parcel.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({ 
                boletoId: boletoId,
                parcelId: parcelId
            })
        });
        console.log('Resposta da API:', await response.clone().text()); // ← ADICIONAR AQUI

        const data = await response.json();

        if (data.success) {
            showModernSuccessNotification(`Parcela ${parcelNumber} excluída com sucesso!\n\nO boleto agora tem ${data.data.remainingParcels} parcela(s).`);
            
            // --- MUDANÇA CRÍTICA AQUI: Recarregar AMBAS as listas de dados ---
            // Remove a parcela do array local `boletos`
            const boleto = boletos.find(b => b.id === boletoId);
            if (boleto) {
                boleto.parcels = boleto.parcels.filter(p => p.id !== parcelId);
                // Atualiza o status de pagamento completo do boleto
                boleto.isFullyPaid = boleto.parcels.every(p => p.isPaid);
            }

            updateUIComponentsAfterLoad(); 

        } else {
            showModernErrorNotification('Erro ao excluir parcela: ' + (data.error || 'Erro desconhecido'));

            // --- REVERTER ATUALIZAÇÃO OTTIMISTA EM CASO DE ERRO DA API ---
            console.warn(`[DEBUG DELETE PARCEL] Revertendo remoção otimista para parcela ID: ${parcelId} devido a erro da API.`);
            // Força a atualização completa da UI para restaurar a parcela, recarregando do servidor
            await loadBoletos(true); // Recarrega do servidor forçadamente
            updateUIComponentsAfterLoad();
            // --- FIM DA REVERSÃO ---
        }

    } catch (error) {
        console.error('Erro ao excluir parcela:', error);
        showModernErrorNotification('Erro ao excluir parcela. Verifique o console.');
        
        // --- REVERTER ATUALIZAÇÃO OTTIMISTA EM CASO DE ERRO DE CONEXÃO ---
        console.warn(`[DEBUG DELETE PARCEL] Revertendo remoção otimista para parcela ID: ${parcelId} devido a erro de conexão.`);
        // Força a atualização completa da UI para restaurar a parcela, recarregando do servidor
        await loadBoletos(true); // Recarrega do servidor forçadamente
        updateUIComponentsAfterLoad();
        // --- FIM DA REVERSÃO ---

    } finally {
        hideLoadingOverlay();
    }
}

async function editBoleto(boletoId) {

    editingBoletoId = boletoId;

    const boleto = boletos.find(b => b.id === boletoId);

    if (!boleto) {
        alert('Boleto não encontrado.');
        return;
    }

    const editFormHtml = `

        <form id="editBoletoFormElement">

            <div class="form-row">

                <div class="form-group">

                    <label for="editBoletoVendor">Fornecedor <span class="required">*</span></label>

                    <input type="text" id="editBoletoVendor" value="${boleto.vendor}" required>

                </div>

                <div class="form-group">

                    <label for="editBoletoGenerationDate">Data de Geração <span class="required">*</span></label>

                    <input type="date" id="editBoletoGenerationDate" value="${boleto.generationDate}" required>

                </div>

                <div class="form-group">

                    <label for="editBoletoProcess">Processo (Ex: Cidade) <span class="required">*</span></label>

                    <input type="text" id="editBoletoProcess" value="${boleto.process}" placeholder="Ex: São Paulo" required>

                </div>

                <div class="form-group">

                    <label for="editBoletoDirection">Direcionamento <span class="required">*</span></label>

                    <select id="editBoletoDirection" required>

                        <option value="Tiago" ${boleto.direction === 'Tiago' ? 'selected' : ''}>Tiago</option>

                        <option value="Lotérica" ${boleto.direction === 'Lotérica' ? 'selected' : ''}>Lotérica</option>

                    </select>

                </div>

            </div>

            <!-- ✅ NOVO: Campo Empresa -->

            <div class="form-group">

                <label for="editBoletoCompany">Empresa <span class="required">*</span></label>

                <select id="editBoletoCompany" required>

                    <option value="">Selecione uma Empresa</option>

                    <!-- Opções serão preenchidas dinamicamente via JavaScript -->

                </select>

            </div>

            <div class="form-group">

                <label>Parcelamento <span class="required">*</span></label>

                <div>

                    <input type="radio" id="editSingleParcel" name="editParcelType" value="single" ${boleto.parcels.length === 1 ? 'checked' : ''} onchange="toggleEditParcelFields()">

                    <label for="editSingleParcel">Uma Parcela</label>

                    <input type="radio" id="editMultipleParcels" name="editParcelType" value="multiple" ${boleto.parcels.length > 1 ? 'checked' : ''} onchange="toggleEditParcelFields()">

                    <label for="editMultipleParcels">Múltiplas Parcelas</label>

                </div>

            </div>

            <!-- Campos para Parcela Única -->

            <div id="editSingleParcelFields" class="form-row" style="display: ${boleto.parcels.length === 1 ? 'grid' : 'none'};">

                <div class="form-group">

                    <label for="editSingleParcelValue">Valor Total <span class="required">*</span></label>

                    <input type="number" id="editSingleParcelValue" step="0.01" value="${boleto.parcels.length === 1 ? boleto.parcels[0].value : ''}" required>

                </div>

                <div class="form-group">

                    <label for="editSingleParcelDueDate">Data de Vencimento <span class="required">*</span></label>

                    <input type="date" id="editSingleParcelDueDate" value="${boleto.parcels.length === 1 ? boleto.parcels[0].dueDate : ''}" required>

                </div>

            </div>

            <!-- Campos para Múltiplas Parcelas -->

            <div id="editMultipleParcelFields" style="display: ${boleto.parcels.length > 1 ? 'block' : 'none'};">

                <p>Preencha os valores e datas de vencimento de cada parcela. As datas devem estar dentro do mês da parcela.</p>

                <div id="editParcelasContainer">

                    <!-- Parcelas serão adicionadas aqui via JS -->

                </div>

                <button type="button" class="btn btn-info btn-small" onclick="addEditParcelField()">Adicionar Parcela</button>

            </div>

            <div class="form-group">

                <label for="editBoletoObservation">Observação</label>

                <textarea id="editBoletoObservation" rows="3">${boleto.observation || ''}</textarea>

            </div>

            <div class="form-actions">

                <button type="button" class="btn btn-success" onclick="saveEditBoleto()">Salvar Alterações</button>

                <button type="button" class="btn btn-secondary" onclick="closeEditBoletoModal()">Cancelar</button>

            </div>

        </form>

    `;

    
    document.getElementById('editBoletoForm').innerHTML = editFormHtml;
    populateEditBoletoCompanySelect();
    
    setTimeout(() => {
        const companySelect = document.getElementById('editBoletoCompany');
        if (companySelect) {
            companySelect.value = boleto.company || '';
        }
    }, 100);

    document.getElementById('editBoletoModal').style.display = 'block';

    if (boleto.parcels.length > 1) {
        boleto.parcels.forEach(p => addEditParcelField(p.value, p.dueDate, p.id, p.isPaid));
    }
}

function populateBoletoCompanySelect() {
    const companySelect = document.getElementById('boletoCompany');
    
    if (!companySelect) {
        console.warn('populateBoletoCompanySelect: Elemento boletoCompany não encontrado.');
        return;
    }
    
    console.log('🔍 Iniciando populateBoletoCompanySelect...');
    
    // Limpar opções
    companySelect.innerHTML = '<option value="">Selecione uma Empresa</option>';
    
    const uniqueCompanies = new Set([
        "Facilita Serviços", "T Santana", "Maia Silva", "DDSJ"
    ]);
    
    // Adicionar de fullOrdersList
    if (Array.isArray(fullOrdersList)) {
        fullOrdersList.forEach(order => {
            if (order.company && order.company.trim()) {
                uniqueCompanies.add(order.company.trim());
            }
        });
    }
    
    // Ordenar e adicionar
    const sortedCompanies = Array.from(uniqueCompanies).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    
    sortedCompanies.forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        option.textContent = company;
        companySelect.appendChild(option);
    });
    
    // ✅ Forçar atualização visual
    companySelect.size = 1; // Fechar dropdown
    companySelect.blur();
    companySelect.focus();
    
    console.log(`✅ [populateBoletoCompanySelect] ${sortedCompanies.length} empresas carregadas.`);
    console.log('Empresas:', sortedCompanies.slice(0, 5));
}
function populateEditBoletoCompanySelect() {
    const editCompanySelect = document.getElementById('editBoletoCompany');
    if (!editCompanySelect) {
        console.warn('populateEditBoletoCompanySelect: Elemento editBoletoCompany não encontrado.');
        return;
    }
    
    editCompanySelect.innerHTML = '<option value="">Selecione uma Empresa</option>';
    
    const uniqueCompanies = new Set();
    
    // ✅ ADICIONADO: Empresas fixas de Ordens de Pagamento (MESMAS que em Ordens)
    const fixedCompanies = ["Facilita Serviços", "T Santana", "Maia Silva", "DDSJ"];
    fixedCompanies.forEach(company => uniqueCompanies.add(company));
    
    // Adiciona empresas de fullOrdersList
    if (Array.isArray(fullOrdersList)) {
        fullOrdersList.forEach(order => {
            if (order.company && typeof order.company === 'string' && order.company.trim() !== '') {
                uniqueCompanies.add(order.company.trim());
            }
        });
    }
    
    // Adiciona empresas de boletos já cadastrados
    if (Array.isArray(boletos)) {
        boletos.forEach(boleto => {
            if (boleto.company && typeof boleto.company === 'string' && boleto.company.trim() !== '') {
                uniqueCompanies.add(boleto.company.trim());
            }
        });
    }
    
    // Adiciona empresas de dados de entrada personalizados
    if (Array.isArray(customEntryData)) {
        customEntryData.forEach(entry => {
            if (entry.company && typeof entry.company === 'string' && entry.company.trim() !== '') {
                uniqueCompanies.add(entry.company.trim());
            }
        });
    }
    
    // Ordenar alfabeticamente e adicionar ao select
    const sortedCompanies = Array.from(uniqueCompanies).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    
    sortedCompanies.forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        option.textContent = company;
        editCompanySelect.appendChild(option);
    });
    
    console.log(`✅ [populateEditBoletoCompanySelect] ${sortedCompanies.length} empresas carregadas no select de edição de boleto.`);
}

// Alterna campos de parcela no formulário de EDIÇÃO
function toggleEditParcelFields() {
    const singleParcelSelected = document.getElementById('editSingleParcel')?.checked;
    const singleFields = document.getElementById('editSingleParcelFields');
    const multipleFields = document.getElementById('editMultipleParcelFields');

    if (singleParcelSelected) {
        if (singleFields) singleFields.style.display = 'grid';
        if (multipleFields) multipleFields.style.display = 'none';
    } else {
        if (singleFields) singleFields.style.display = 'none';
        if (multipleFields) multipleFields.style.display = 'block';
    }
}

// Adiciona um novo campo para parcela no modal de EDIÇÃO
let editParcelCounter = 0; // Novo contador para parcelas de edição
function addEditParcelField(value = '', dueDate = '', parcelId = generateId(), isPaid = false) {
    editParcelCounter++;
    const container = document.getElementById('editParcelasContainer');
    if (!container) return;

    const parcelDiv = document.createElement('div');
    parcelDiv.className = 'form-row parcel-item';
    parcelDiv.id = `edit-parcel-${editParcelCounter}`; // ID único para o campo no modal de edição
    parcelDiv.setAttribute('data-parcel-original-id', parcelId); // Guarda o ID original da parcela
    parcelDiv.innerHTML = `
        <div class="form-group">
            <label for="editParcelValue-${editParcelCounter}">Valor Parcela ${editParcelCounter} <span class="required">*</span></label>
            <input type="number" id="editParcelValue-${editParcelCounter}" step="0.01" value="${value}" required ${isPaid ? 'readonly' : ''}>
        </div>
        <div class="form-group">
            <label for="editParcelDueDate-${editParcelCounter}">Vencimento Parcela ${editParcelCounter} <span class="required">*</span></label>
            <input type="date" id="editParcelDueDate-${editParcelCounter}" value="${dueDate}" required ${isPaid ? 'readonly' : ''} onchange="validateParcelMonth(this, ${editParcelCounter})">
        </div>
        <div class="form-group" style="display: flex; align-items: flex-end;">
            ${!isPaid ? `<button type="button" class="btn btn-danger btn-small" onclick="removeEditParcelField(${editParcelCounter})">Remover</button>` : '<span>Paga</span>'}
        </div>
    `;
    container.appendChild(parcelDiv);
}

// Remove um campo de parcela no modal de EDIÇÃO
function removeEditParcelField(id) {
    const element = document.getElementById(`edit-parcel-${id}`);
    if (element) {
        // Verificar se a parcela já foi paga (não deve ser removível)
        const originalParcelId = element.getAttribute('data-parcel-original-id');
        const boleto = boletos.find(b => b.id === editingBoletoId);
        const parcel = boleto?.parcels.find(p => p.id === originalParcelId);
        if (parcel && parcel.isPaid) {
            alert('Não é possível remover parcelas já pagas.');
            return;
        }
        element.remove();
    }
}

// Salvar edição de boleto
async function saveEditBoleto() {

    if (!editingBoletoId) return;

    const boleto = boletos.find(b => b.id === editingBoletoId);

    if (!boleto) {
        alert('Boleto não encontrado.');
        return;
    }

    const vendor = document.getElementById('editBoletoVendor').value.trim();
    const generationDate = document.getElementById('editBoletoGenerationDate').value;
    const process = document.getElementById('editBoletoProcess').value.trim();
    const direction = document.getElementById('editBoletoDirection').value;
    const company = document.getElementById('editBoletoCompany').value.trim(); // ✅ NOVA LINHA
    const observation = document.getElementById('editBoletoObservation').value.trim();
    const singleParcelSelected = document.getElementById('editSingleParcel').checked;

    if (!vendor || !generationDate || !process || !direction || !company) {
        alert('Por favor, preencha todos os campos obrigatórios do boleto (incluindo Empresa).');
        return;
    }

    let parcels = [];
    let totalBoletoValue = 0;
    let firstDueDate = null;

    if (singleParcelSelected) {
        const value = parseFloat(document.getElementById('editSingleParcelValue').value);
        const dueDate = document.getElementById('editSingleParcelDueDate').value;

        if (isNaN(value) || value <= 0 || !dueDate) {
            alert('Por favor, insira um valor e data de vencimento válidos para a parcela única.');
            return;
        }

        parcels.push({ 
            id: boleto.parcels[0]?.id || generateId(), 
            value: value, 
            dueDate: dueDate, 
            isPaid: boleto.parcels[0]?.isPaid || false, 
            paymentOrderId: boleto.parcels[0]?.paymentOrderId || null 
        });

        totalBoletoValue = value;
        firstDueDate = dueDate;

    } else { // Múltiplas Parcelas
        const parcelElements = document.querySelectorAll('#editParcelasContainer .parcel-item');

        if (parcelElements.length === 0) {
            alert('Por favor, adicione pelo menos uma parcela.');
            return;
        }

        let tempParcels = [];

        for (let i = 0; i < parcelElements.length; i++) {
            const fieldId = parcelElements[i].id.split('-')[2]; // edit-parcel-X
            const originalParcelId = parcelElements[i].getAttribute('data-parcel-original-id');
            const value = parseFloat(document.getElementById(`editParcelValue-${fieldId}`).value);
            const dueDate = document.getElementById(`editParcelDueDate-${fieldId}`).value;

            const originalParcel = boleto.parcels.find(p => p.id === originalParcelId);

            if (isNaN(value) || value <= 0 || !dueDate) {
                alert(`Por favor, insira um valor e data de vencimento válidos para a Parcela ${i + 1}.`);
                return;
            }

            tempParcels.push({ 
                id: originalParcelId, 
                value: value, 
                dueDate: dueDate, 
                isPaid: originalParcel ? originalParcel.isPaid : false,
                paymentOrderId: originalParcel ? originalParcel.paymentOrderId : null
            });

            totalBoletoValue += value;
        }

        tempParcels.sort((a, b) => criarDataLocal(a.dueDate) - criarDataLocal(b.dueDate));
        parcels = tempParcels;
        firstDueDate = parcels.length > 0 ? parcels[0].dueDate : null;
    }

    // ✅ ATUALIZAR O OBJETO BOLETO: Incluir company
    boleto.vendor = vendor;
    boleto.generationDate = generationDate;
    boleto.totalValue = totalBoletoValue;
    boleto.firstDueDate = firstDueDate;
    boleto.process = process;
    boleto.direction = direction;
    boleto.company = company; // ✅ NOVA LINHA
    boleto.observation = observation;
    boleto.parcels = parcels;

    saveBoletos();

    await loadBoletos();
    populateBoletoVendorsDatalist();
    populateBoletoCompanySelect(); // ✅ NOVA LINHA: Atualizar select de empresa
    displayBoletos();
    closeEditBoletoModal();

    alert('Boleto atualizado com sucesso!');
}
// Fechar modal de edição de boleto
function closeEditBoletoModal() {
    document.getElementById('editBoletoModal').style.display = 'none';
    editingBoletoId = null;
    editParcelCounter = 0; // Reseta o contador de edição
}

// Filtros para Boletos
function getFilteredBoletos() {
    
    // Obtém os valores dos filtros existentes
    const directionFilter = document.getElementById('filterBoletoDirection')?.value || '';
    const generationDateStartRaw = document.getElementById('filterBoletoGenerationDateStart')?.value || '';
    const generationDateEndRaw = document.getElementById('filterBoletoGenerationDateEnd')?.value || '';
    // REMOVIDO: dueDateStartRaw e dueDateEndRaw não serão usados aqui para filtragem de boleto completo
    const searchTerm = document.getElementById('searchBoletoTerm')?.value.toLowerCase() || '';
    
    // Converte datas brutas dos filtros para objetos Date normalizados
    const filterGenerationDateStart = generationDateStartRaw ? criarDataLocal(generationDateStartRaw) : null;
    const filterGenerationDateEnd = generationDateEndRaw ? criarDataLocal(generationDateEndRaw) : null;

    const allBoletos = boletos || []; // Adapte conforme sua estrutura de dados

    const filtered = allBoletos.filter(boleto => {
        let matchesDirection = true;
        if (directionFilter) {
            matchesDirection = (boleto.direction && boleto.direction === directionFilter);
        }

        let matchesGenerationStart = true;
        if (filterGenerationDateStart) {
            const boletoGenerationDate = boleto.generationDate ? criarDataLocal(boleto.generationDate) : null;
            matchesGenerationStart = boletoGenerationDate && !isNaN(boletoGenerationDate.getTime()) && boletoGenerationDate >= filterGenerationDateStart;
        }

        let matchesGenerationEnd = true;
        if (filterGenerationDateEnd) {
            const boletoGenerationDate = boleto.generationDate ? criarDataLocal(boleto.generationDate) : null;
            matchesGenerationEnd = boletoGenerationDate && !isNaN(boletoGenerationDate.getTime()) && boletoGenerationDate <= filterGenerationDateEnd;
        }

        // REMOVIDO: checkBoletoHasAnyPendingParcelInDateRange() NÃO É MAIS CHAMADO AQUI.
        // A filtragem de data de vencimento será feita por getSortedPendingBoletoParcels() em nível de parcela.

        let matchesSearch = true;
        if (searchTerm) {
            matchesSearch = (boleto.vendor && boleto.vendor.toLowerCase().includes(searchTerm)) ||
                            (boleto.process && boleto.process.toLowerCase().includes(searchTerm)) ||
                            (boleto.observation && boleto.observation.toLowerCase().includes(searchTerm));
        }

        // A data de vencimento não é mais filtrada neste nível, apenas na coleta das parcelas.
        const finalMatch = matchesDirection && matchesGenerationStart && matchesGenerationEnd && matchesSearch;

        return finalMatch;
    });

    return filtered;
    
}

function checkBoletoHasAnyPendingParcelInDateRange(boleto, startDateFilterRaw, endDateFilterRaw) {

    const filterStartDate = startDateFilterRaw ? criarDataLocal(startDateFilterRaw) : null;
    const filterEndDate = endDateFilterRaw ? criarDataLocal(endDateFilterRaw) : null;

    if ((filterStartDate && isNaN(filterStartDate.getTime())) || (filterEndDate && isNaN(filterEndDate.getTime()))) {
        console.warn(`%c[DEBUG_FILTER_PARCEL] Invalid filter date objects generated. Please check input date formats. Skipping.`, 'color: #ffc107; font-weight: bold;');
        return false;
    }

    // Se não há filtros de data de vencimento aplicados, o boleto passa neste critério
    if (!filterStartDate && !filterEndDate) {
        return true;
    }

    // Iterar por todas as parcelas pendentes do boleto (CORRIGIDO: boleto.parcels)
    if (boleto.parcels && Array.isArray(boleto.parcels)) { // <-- CORREÇÃO AQUI: de .parcelas para .parcels
        console.log(`%c[DEBUG_FILTER_PARCEL] Processing ${boleto.parcels.length} parcels for this boleto.`, 'color: #007bff;');
        for (const parcel of boleto.parcels) { // <-- CORREÇÃO AQUI: de .parcelas para .parcels
        
            // Considerar apenas parcelas não pagas e com data de vencimento (CORRIGIDO: !parcel.isPaid)
            if (!parcel.isPaid && parcel.dueDate) { // <-- CORREÇÃO AQUI: de !p.paid para !p.isPaid
                const parcelDueDate = criarDataLocal(parcel.dueDate);
                if (isNaN(parcelDueDate.getTime())) {
                    continue;
                }

                let matchesStart = true;
                if (filterStartDate && parcelDueDate < filterStartDate) {
                    matchesStart = false;
                }


                let matchesEnd = true;
                if (filterEndDate && parcelDueDate > filterEndDate) {
                    matchesEnd = false;
                }


                // Se esta parcela está dentro do período de filtro, o boleto inteiro corresponde
                if (matchesStart && matchesEnd) {
                    console.log(`%c[DEBUG_FILTER_PARCEL]     Parcel #${parcel.parcelNumber} is IN RANGE! Boleto matches filter. Returning true for boleto.`, 'color: green; font-weight: bold;');
                    return true;
                }
            }
        }
    }

    // Se chegou aqui, nenhuma parcela pendente foi encontrada dentro do período de filtro
    return false;
}

// Função para verificar vencimento inicial (considerando parcelas)
function checkBoletoVencimentoStart(boleto, startDate) {
    // Se tem parcelas, verificar a primeira parcela não paga
    if (boleto.parcelas && Array.isArray(boleto.parcelas)) {
        const parcelasNaoPagas = boleto.parcelas.filter(p => !p.paid && p.status !== 'Paga');
        if (parcelasNaoPagas.length > 0) {
            const primeiraVencimento = Math.min(...parcelasNaoPagas.map(p => new Date(p.dueDate)));
            return new Date(primeiraVencimento) >= new Date(startDate);
        }
    }
    
    // Se não tem parcelas ou todas estão pagas, usar data de vencimento principal
    return boleto.dueDate && boleto.dueDate >= startDate;
}

// Função para verificar vencimento final (considerando parcelas)
function checkBoletoVencimentoEnd(boleto, endDate) {
    // Se tem parcelas, verificar a última parcela não paga
    if (boleto.parcelas && Array.isArray(boleto.parcelas)) {
        const parcelasNaoPagas = boleto.parcelas.filter(p => !p.paid && p.status !== 'Paga');
        if (parcelasNaoPagas.length > 0) {
            const ultimoVencimento = Math.max(...parcelasNaoPagas.map(p => new Date(p.dueDate)));
            return new Date(ultimoVencimento) <= new Date(endDate);
        }
    }
    
    // Se não tem parcelas ou todas estão pagas, usar data de vencimento principal
    return boleto.dueDate && boleto.dueDate <= endDate;
}

// Função para determinar status do boleto baseado no vencimento
function getBoletoStatus(boleto) {
    if (boleto.status) return boleto.status;
    
    // Verificar se todas as parcelas estão pagas
    if (boleto.parcelas && Array.isArray(boleto.parcelas)) {
        const todasPagas = boleto.parcelas.every(p => p.paid || p.status === 'Paga');
        if (todasPagas) return 'Pago';
        
        // Verificar vencimento da próxima parcela não paga
        const parcelasNaoPagas = boleto.parcelas.filter(p => !p.paid && p.status !== 'Paga');
        if (parcelasNaoPagas.length > 0) {
            const proximoVencimento = Math.min(...parcelasNaoPagas.map(p => new Date(p.dueDate)));
            return getStatusByDate(new Date(proximoVencimento));
        }
    }
    
    // Se não tem parcelas, usar data de vencimento principal
    if (boleto.dueDate) {
        return getStatusByDate(new Date(boleto.dueDate));
    }
    
    return 'Pendente';
}

function getBoletoFilteredItemsAndSort(allIndividualPendingParcels) {
    const directionFilter = document.getElementById('filterBoletoDirection')?.value || '';
    const generationDateStartRaw = document.getElementById('filterBoletoGenerationDateStart')?.value || '';
    const generationDateEndRaw = document.getElementById('filterBoletoGenerationDateEnd')?.value || '';
    
    // << NOVO: Ler valores dos selects de Fornecedor e Processo >>
    const vendorFilter = document.getElementById('filterBoletoVendor')?.value || '';
    const processFilter = document.getElementById('filterBoletoProcess')?.value || '';
    // << FIM NOVO >>

    const searchTerm = document.getElementById('searchBoletoTerm')?.value.toLowerCase() || ''; // Para outros campos (Observação)
    const valueMin = parseFloat(document.getElementById('filterBoletoValueMin')?.value) || 0;
    const valueMax = parseFloat(document.getElementById('filterBoletoValueMax')?.value) || Infinity;
    const sortBy = document.getElementById('boletoSortBy')?.value || 'dueDate_asc';

    const filterGenerationDateStart = generationDateStartRaw ? criarDataLocal(generationDateStartRaw) : null;
    const filterGenerationDateEnd = generationDateEndRaw ? criarDataLocal(generationDateEndRaw) : null;

    let filteredParcels = allIndividualPendingParcels.filter(item => {
        const boleto = item.boleto;
        const parcela = item.parcela;

        // Filtro por direcionamento
        const matchesDirection = !directionFilter || 
                                (boleto.direction && boleto.direction === directionFilter);

        // Filtro por data de geração
        let matchesGenerationDate = true;
        if (filterGenerationDateStart || filterGenerationDateEnd) {
            const boletoGenerationDate = boleto.generationDate ? criarDataLocal(boleto.generationDate) : null;
            if (!boletoGenerationDate || isNaN(boletoGenerationDate.getTime())) {
                matchesGenerationDate = false;
            } else {
                if (filterGenerationDateStart && boletoGenerationDate < filterGenerationDateStart) {
                    matchesGenerationDate = false;
                }
                if (matchesGenerationDate && filterGenerationDateEnd && boletoGenerationDate > filterGenerationDateEnd) {
                    matchesGenerationDate = false;
                }
            }
        }

        // << NOVO: Filtros por Fornecedor e Processo (selects) >>
        const matchesVendor = !vendorFilter || (boleto.vendor && boleto.vendor === vendorFilter);
        const matchesProcess = !processFilter || (boleto.process && boleto.process === processFilter);
        // << FIM NOVO >>

        // Filtro por termo de busca (agora focado em observação e outros campos, se houver)
        // Não inclui vendor e process aqui, pois já temos selects específicos.
        const matchesSearch = !searchTerm || (boleto.observation && boleto.observation.toLowerCase().includes(searchTerm));
        
        // Filtro por valor da parcela
        const parcelValue = parseFloat(parcela.value) || 0;
        const matchesValue = parcelValue >= valueMin && parcelValue <= valueMax;

        // << COMBINAR TODOS OS NOVOS FILTROS >>
        return matchesDirection && matchesGenerationDate && matchesVendor && matchesProcess && matchesSearch && matchesValue;
    });

    // Ordenação
    filteredParcels.sort((a, b) => {
        const dateA = a.sortDate && !isNaN(a.sortDate.getTime()) ? a.sortDate.getTime() : new Date('2999-12-31').getTime(); // Fallback para data futura
        const dateB = b.sortDate && !isNaN(b.sortDate.getTime()) ? b.sortDate.getTime() : new Date('2999-12-31').getTime(); // Fallback para data futura
        const valueA = parseFloat(a.parcela.value || 0);
        const valueB = parseFloat(b.parcela.value || 0);
        const vendorA = a.boleto.vendor || '';
        const vendorB = b.boleto.vendor || '';

        switch (sortBy) {
            case 'dueDate_asc':
                return dateA - dateB;
            case 'dueDate_desc':
                return dateB - dateA;
            case 'vendor':
                return vendorA.localeCompare(vendorB, 'pt-BR'); // Usa pt-BR para acentuação
            case 'value_desc':
                return valueB - valueA;
            case 'value_asc':
                return valueA - valueB;
            default:
                return 0; // Por padrão, mantém a ordem original ou de vencimento
        }
    });

    return filteredParcels;
}

function addBoletoFilterSummaryMessage(currentDisplayCount, filteredCount, totalSystemCount, allRawPendingParcels, paginatedParcelsList, containerElement) {
    // VERIFICAÇÃO CRÍTICA: Garante que containerElement é válido
    if (!containerElement || typeof containerElement.querySelector !== 'function') {
        console.warn('⚠️ containerElement não é um elemento DOM válido. Abortando addBoletoFilterSummaryMessage.');
        return;
    }

    const existingMessage = containerElement.querySelector('.filtered-info-box');
    if (existingMessage) { 
        existingMessage.remove(); 
    }

    if (totalSystemCount === 0 && currentDisplayCount === 0) { 
        return; 
    }

    let messageContent;
    const parcelText = currentDisplayCount === 1 ? 'parcela pendente' : 'parcelas pendentes';
    const filteredParcelText = filteredCount === 1 ? 'parcela filtrada' : 'parcelas filtradas';
    const totalParcelText = totalSystemCount === 1 ? 'parcela pendente' : 'parcelas pendentes';

    if (boletoShowAllItemsMode) {
        if (filteredCount === 0) {
            messageContent = `Nenhuma ${parcelText} encontrada com os filtros aplicados.`;
        } else {
            messageContent = `Mostrando <strong>todas</strong> as <strong>${filteredCount}</strong> ${parcelText} (de um total de ${totalSystemCount}).`;
        }
    } else {
        if (currentDisplayCount === 0 && filteredCount === 0) {
            messageContent = `Nenhuma ${parcelText} encontrada nesta página. (Total de <strong>${totalSystemCount}</strong> ${totalParcelText} no sistema.)`;
        } else if (currentDisplayCount === 0 && filteredCount > 0) {
             messageContent = `Nenhuma ${parcelText} nesta página. <strong>${filteredCount}</strong> ${filteredParcelText} encontradas no total. (Total de <strong>${totalSystemCount}</strong> ${totalParcelText} no sistema.)`;
        } else {
            messageContent = `<strong>${currentDisplayCount}</strong> ${parcelText} exibida(s) nesta página (de <strong>${filteredCount}</strong> ${filteredParcelText} no total).`;
        }
    }
    
    // MUDANÇA CRÍTICA: Usa paginatedParcelsList para calcular o valor
    const totalValueDisplayed = paginatedParcelsList.reduce((sum, item) => sum + (parseFloat(item.parcela.value) || 0), 0);
    
    messageContent += `<br>Valor Total Exibido: <strong>${totalValueDisplayed.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' })}</strong>`;
    const infoBoxHtml = `<div class="filtered-info-box"><span class="text-content">${messageContent}</span></div>`;

    const boletoAdvancedFiltersContainer = containerElement.querySelector('#boletoAdvancedFiltersContainer');

    if (boletoAdvancedFiltersContainer && boletoAdvancedFiltersContainer.parentElement) {
        boletoAdvancedFiltersContainer.parentElement.insertBefore(document.createRange().createContextualFragment(infoBoxHtml), boletoAdvancedFiltersContainer.nextElementSibling);
    } else if (containerElement) {
        containerElement.insertBefore(document.createRange().createContextualFragment(infoBoxHtml), containerElement.firstChild);
    }
}

// Função auxiliar para determinar status por data
function getStatusByDate(vencimento) {
    const hoje = new Date();
    const diffDays = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Vencido';
    if (diffDays <= 3) return 'Vencendo';
    if (diffDays <= 7) return 'Próximo';
    return 'Pendente';
}

// Função para determinar status do boleto
function getBoletoStatus(boleto) {
    if (boleto.status) return boleto.status;
    
    // Lógica baseada em vencimento e pagamento
    const hoje = new Date();
    const vencimento = criarDataLocal(boleto.dueDate || boleto.vencimento);
    
    if (boleto.paid || boleto.status === 'Paga') return 'Pago';
    if (vencimento < hoje) return 'Vencido';
    
    const diffDays = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) return 'Vencendo';
    if (diffDays <= 7) return 'Próximo';
    
    return 'Pendente';
}

// Aplicar filtros de boleto
function applyBoletoFilters() {
    boletoCurrentPage = 1; // Sempre volta para a primeira página ao aplicar filtros
    displayBoletos();
}
// APROX. LINHA 14459 (ou onde a primeira função setupBoletoFilterListeners estava)
// REMOVA AS DUAS FUNÇÕES EXISTENTES E COLOQUE ESTA VERSÃO UNIFICADA:

function setupBoletoFilterListeners() {
    // Lista completa de todos os elementos de filtro de boleto
    const allFilterElementsIds = [
        'filterBoletoDirection',
        'filterBoletoGenerationDateStart',
        'filterBoletoGenerationDateEnd',
        'filterBoletoDueDateStart',
        'filterBoletoDueDateEnd',
        'filterBoletoVendor',  // Adicionado, pois é um <select>
        'filterBoletoProcess', // Adicionado, pois é um <select>
        'boletoSortBy',        // Adicionado, pois é um <select>
        'searchBoletoTerm',    // Input de texto
        'filterBoletoValueMin',// Input numérico
        'filterBoletoValueMax' // Input numérico
        // Removidos 'filterBoletoStatus', 'filterBoletoPriority', 'filterVencimento', 'filterValorMin', 'filterValorMax', 'filterFornecedor', 'filterParcela'
        // pois parecem ser nomes de filtros que não existem no index-sistema-ordem.txt ou são duplicados
        // Se eles realmente existirem, adicione-os aqui.
    ];

    allFilterElementsIds.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            // Remover listeners antigos para evitar duplicação se chamada múltiplas vezes
            // (Boa prática se essa função puder ser chamada mais de uma vez)
            if (element._filterListener) {
                element.removeEventListener(element._filterEventType, element._filterListener);
                element._filterListener = null;
                element._filterEventType = null;
            }

            // Lógica para aplicar debounce apenas em inputs de texto e número
            // Evento 'input' é mais adequado para capturar cada alteração de texto/número
            if (element.type === 'text' || element.type === 'number') {
                const listener = debounce(applyBoletoFilters, 500); // Atraso de 500ms
                element.addEventListener('input', listener);
                element._filterListener = listener; // Guarda a referência para remoção futura
                element._filterEventType = 'input';
            } else { // Para 'select' e 'date' inputs, aplicar diretamente no 'change'
                const listener = () => applyBoletoFilters();
                element.addEventListener('change', listener);
                element._filterListener = listener; // Guarda a referência
                element._filterEventType = 'change';
            }
        } else {
            console.warn(`Elemento de filtro de boleto com ID '${elementId}' não encontrado no DOM. Verifique o HTML.`);
        }
    });
}


// Função auxiliar para buscar TODAS as parcelas pendentes (sem filtros)
function getAllPendingParcelsForPredictions(boletos) {

    const allPendingParcels = [];
    
    boletos.forEach(boleto => {
        if (boleto.parcels && boleto.parcels.length > 0) {
            boleto.parcels.forEach(parcela => {
                // Verifica se a parcela está pendente (não paga)
                if (!parcela.paid) {
                    const dueDate = criarDataLocal(parcela.dueDate);
                    
                    allPendingParcels.push({
                        boleto: boleto,
                        parcela: parcela,
                        sortDate: dueDate
                    });
                }
            });
        }
    });
    
    // Ordena por data de vencimento
    allPendingParcels.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
    
    if (allPendingParcels.length > 0) {
        const firstDate = allPendingParcels[0].sortDate.toLocaleDateString('pt-BR');
        const lastDate = allPendingParcels[allPendingParcels.length - 1].sortDate.toLocaleDateString('pt-BR');
    }
    
    return allPendingParcels;
}

// === NOVAS FUNÇÕES DE PAGINAÇÃO E CONTROLES PARA BOLETOS PENDENTES ===

function boletoGoToPage(page) {
    if (page < 1 || page > boletoTotalPages) {
        console.warn(`Tentativa de ir para página inválida de boletos pendentes: ${page}. Total de páginas: ${boletoTotalPages}.`);
        return;
    }
    boletoCurrentPage = page;
    displayBoletos(); // Recarrega os boletos pendentes para a nova página
}

function boletoNextPage() {
    if (boletoCurrentPage < boletoTotalPages) {
        boletoCurrentPage++;
        displayBoletos();
    }
}

function boletoPrevPage() {
    if (boletoCurrentPage > 1) {
        boletoCurrentPage--;
        displayBoletos();
    }
}

function updateBoletoPaginationControls() {
    const paginationContainer = document.getElementById('boletoPaginationControls');
    if (!paginationContainer) {
        console.warn('Elemento #boletoPaginationControls não encontrado no DOM. Paginação não será exibida.');
        return;
    }

    if (boletoShowAllItemsMode) {
        paginationContainer.style.display = 'none';
        document.getElementById('showAllBoletoItemsBtn').style.display = 'none';
        document.getElementById('hideAllBoletoItemsBtn').style.display = 'block';
        return;
    } else {
        document.getElementById('showAllBoletoItemsBtn').style.display = 'block';
        document.getElementById('hideAllBoletoItemsBtn').style.display = 'none';
    }

    const prevBtn = document.getElementById('boletoPrevPageBtn');
    const nextBtn = document.getElementById('boletoNextPageBtn');
    const pageInfo = document.getElementById('boletoPageInfo');

    if (prevBtn) prevBtn.disabled = (boletoCurrentPage === 1);
    if (nextBtn) nextBtn.disabled = (boletoCurrentPage === boletoTotalPages);
    if (pageInfo) pageInfo.textContent = `Página ${boletoCurrentPage} de ${boletoTotalPages}`;

    if (boletoTotalPages > 1) {
        paginationContainer.style.display = 'flex';
    } else {
        paginationContainer.style.display = 'none';
    }
}

function toggleBoletoShowAllItems() {
    boletoShowAllItemsMode = !boletoShowAllItemsMode;
    if (boletoShowAllItemsMode) {
        boletoItemsPerPage = boletoTotalPendingParcelsInSystem;
        boletoCurrentPage = 1;
    } else {
        boletoItemsPerPage = BOLETO_DEFAULT_ITEMS_PER_PAGE;
        boletoCurrentPage = 1;
    }
    displayBoletos();
}

// Função para mostrar/esconder os filtros avançados de boletos
function toggleBoletoAdvancedFilters() {
    const filtersContainer = document.getElementById('boletoAdvancedFiltersContainer');
    const toggleBtn = document.getElementById('toggleBoletoFiltersBtn'); // O botão que o usuário clicou

    // É crucial que o filtersContainer exista. O toggleBtn deve existir se o onclick foi nele.
    if (!filtersContainer) {
        console.error('ERRO CRÍTICO: Elemento filtersContainer (#boletoAdvancedFiltersContainer) não encontrado. Verifique IDs no HTML.');
        return; // Impede a execução se o container principal não for encontrado
    }
    // Não precisamos checar o toggleBtn aqui, pois a função foi chamada através dele.

    const isCurrentlyVisible = filtersContainer.style.display !== 'none';
    
    if (isCurrentlyVisible) {
        // Esconder filtros
        filtersContainer.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-filter"></i> Filtros';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-primary');
    } else {
        // Mostrar filtros
        filtersContainer.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-filter"></i> Fechar Filtros';
        toggleBtn.classList.remove('btn-primary');
        toggleBtn.classList.add('btn-secondary');

        // Popula os SELECTS de filtros (Fornecedor e Processo) APENAS quando os filtros são EXIBIDOS.
        populateBoletoVendorFilter();
        populateBoletoProcessFilter();
    }
}

function toggleAddBoletoForm() {

    const formContainer = document.getElementById('boletoRegistrationFormContainer');

    const toggleBtn = document.getElementById('toggleAddBoletoFormBtn');

    

    if (!formContainer || !toggleBtn) {

        console.warn('Elementos do formulário de boleto ou botão "Cadastrar Boleto" não encontrados no DOM.');

        return;

    }

    

    const isCurrentlyVisible = formContainer.style.display !== 'none';

    

    if (isCurrentlyVisible) {

        // Esconder formulário

        formContainer.style.display = 'none';

        toggleBtn.innerHTML = '<i class="fas fa-plus"></i> Cadastrar Boleto';

        toggleBtn.classList.remove('btn-secondary');

        toggleBtn.classList.add('btn-success');

        if (typeof clearBoletoForm === 'function') {

            clearBoletoForm();

        }

    } else {

        // Mostrar formulário

        formContainer.style.display = 'block';

        toggleBtn.innerHTML = '<i class="fas fa-times"></i> Fechar Formulário';

        toggleBtn.classList.remove('btn-success');

        toggleBtn.classList.add('btn-secondary');

        

        if (typeof clearBoletoForm === 'function') {

            clearBoletoForm();

        }

        const boletoGenerationDateField = document.getElementById('boletoGenerationDate');

        if (boletoGenerationDateField) {

            boletoGenerationDateField.value = new Date().toISOString().split('T')[0];

        }

        // ✅ Popular os dropdowns e datalists
        populateBoletoVendorsDatalist();

        populateProcessesDatalist();

        populateBoletoCompanySelect(); // ← ADICIONE ESTA LINHA

    }

}
// NOVA FUNÇÃO: Alternar a visibilidade do formulário de cadastro de salário inline
function toggleAddSalaryForm() {
    const formContainer = document.getElementById('addSalaryFormContainer');
    const toggleBtn = document.getElementById('toggleAddSalaryFormBtn');
    
    if (!formContainer || !toggleBtn) {
        console.warn('Elementos do formulário de salário ou botão "Cadastrar Salário/Auxílio" não encontrados no DOM.');
        return;
    }
    
    const isCurrentlyVisible = formContainer.style.display !== 'none';
    
    if (isCurrentlyVisible) {
        // Esconder formulário
        formContainer.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-plus"></i> Cadastrar Salário/Auxílio';
        toggleBtn.classList.remove('btn-secondary'); // Remove o estilo de "ativo"
        toggleBtn.classList.add('btn-success');      // Volta ao estilo padrão (verde)
        // Opcional: Limpar o formulário quando ele é fechado
        if (typeof clearSalaryForm === 'function') {
            clearSalaryForm();
        }
    } else {
        // Mostrar formulário
        formContainer.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-times"></i> Fechar Formulário';
        toggleBtn.classList.remove('btn-success');   // Remove o estilo padrão (verde)
        toggleBtn.classList.add('btn-secondary');    // Adiciona estilo de "ativo/aberto"
        
        // Limpar o formulário e definir defaults para mês/ano
        if (typeof clearSalaryForm === 'function') {
            clearSalaryForm(); // Limpa todos os campos
        }
        // Set default year and populate month select upon opening
        const salaryYearInput = document.getElementById('salaryYearInput');
        const salaryMonthSelect = document.getElementById('salaryMonthSelect');
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonthFormatted = String(today.getMonth() + 1).padStart(2, '0');

        if (salaryYearInput) {
            salaryYearInput.value = currentYear;
        }
        if (salaryMonthSelect) {
            populateMonthSelect('salaryMonthSelect'); // Ensure it's populated
            salaryMonthSelect.value = currentMonthFormatted; // Set to current month
        }
    }
}

function clearBoletoFilters() {
    document.getElementById('filterBoletoDirection').value = '';
    document.getElementById('filterBoletoGenerationDateStart').value = '';
    document.getElementById('filterBoletoGenerationDateEnd').value = '';
    document.getElementById('filterBoletoDueDateStart').value = '';
    document.getElementById('filterBoletoDueDateEnd').value = '';
    
    // << NOVO: Resetar os novos filtros de Fornecedor e Processo >>
    document.getElementById('filterBoletoVendor').value = '';
    document.getElementById('filterBoletoProcess').value = '';
    // << FIM NOVO >>

    document.getElementById('searchBoletoTerm').value = ''; // Resetar o campo de busca (Observação)
    document.getElementById('filterBoletoValueMin').value = '';
    document.getElementById('filterBoletoValueMax').value = '';
    document.getElementById('boletoSortBy').value = 'dueDate_asc'; // Resetar ordenação
    boletoCurrentPage = 1; // Volta para a primeira página
    displayBoletos();
}

// ATUALIZADA: Exportar boletos pendentes para Excel com somatórios
function exportBoletosToExcel() {

    const allIndividualPendingParcels = getSortedPendingBoletoParcels();

    if (allIndividualPendingParcels.length === 0) {
        alert('Nenhum boleto pendente para exportar após os filtros e ordenação.');
        return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,%EF%BB%BF';
    const delimiter = ';';

    // Adicionar cabeçalho com EMPRESA incluída
    csvContent += [
        'Fornecedor',
        'Empresa',
        'Parcela',
        'Valor Parcela',
        'Vencimento',
        'Processo',
        'Direcionamento',
        'Status Pagamento'
    ].map(header => `"${header}"`).join(delimiter) + '\n';

    let totalPendingValue = 0;
    const processPendingSums = new Map();

    allIndividualPendingParcels.forEach(item => {
        const boleto = item.boleto;
        const parcela = item.parcela;
        const statusPagamento = parcela.isPaid ? 'Paga' : 'Pendente';
        const parcelValue = parseFloat(parcela.value || 0);
        totalPendingValue += parcelValue;

        const process = boleto.process || 'Não Informado';
        processPendingSums.set(process, (processPendingSums.get(process) || 0) + parcelValue);

        // Adicionar EMPRESA na lista de campos
        const fields = [
            boleto.vendor,
            boleto.company || 'Não Informado',
            `${parcela.parcelNumber}/${boleto.parcels.length}`,
            parcelValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, useGrouping: false }),
            formatDate(parcela.dueDate),
            boleto.process || '',
            boleto.direction || '',
            statusPagamento
        ];

        const row = fields.map(field => {
            const stringField = String(field);
            return `"${stringField.replace(/"/g, '""')}"`;
        }).join(delimiter) + '\n';

        csvContent += row;
    });

    // Linhas de resumo
    csvContent += '\n';
    csvContent += `"RESUMOS BOLETOS PENDENTES:","","","","","","",\n`;
    csvContent += `"Valor Total Geral Pendente","","","${parseFloat(totalPendingValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, useGrouping: false })}","","","",\n`;
    csvContent += `"","","","","","","",\n`;
    csvContent += `"Somatórios por Processo (Somente Boletos Pendentes):","","","","","","",\n`;

    Array.from(processPendingSums.keys()).sort().forEach(processName => {
        const sum = processPendingSums.get(processName);
        csvContent += `"${processName}","","","${parseFloat(sum).toLocaleString('pt-BR', { minimumFractionDigits: 2, useGrouping: false })}","","","",\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `boletos_pendentes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportBoletosToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const LAYOUT = {
        // Margens e posicionamento
        MARGIN_LEFT: 20,
        MARGIN_RIGHT: 20,
        MARGIN_TOP: 20,
        MARGIN_BOTTOM: 20,
        
        // Fontes e tamanhos
        FONTS: {
            TITLE_MAIN: 18,       
            TITLE_SECTION: 14,   
            TITLE_SUBSECTION: 12, 
            TEXT_NORMAL: 10,       
            TEXT_SMALL: 8,        
            TEXT_INFO: 9          
        },
        
        // Cores padronizadas
        COLORS: {
            TITLE_MAIN: [0, 0, 0],           
            TITLE_SECTION: [52, 73, 94],     
            TITLE_SUBSECTION: [70, 130, 180], 
            TEXT_NORMAL: [0, 0, 0],         
            TEXT_INFO: [100, 100, 100],      
            TABLE_HEADER: [52, 73, 94], 
            TABLE_HEADER_ALT: [70, 130, 180],
            TABLE_HEADER_PREVIEW: [0, 123, 255] 
        },
        
        // Espaçamentos padronizados
        SPACING: {
            AFTER_TITLE_MAIN: 15,     
            AFTER_TITLE_SECTION: 10,   
            AFTER_TITLE_SUBSECTION: 7, 
            AFTER_TEXT: 5,             
            AFTER_TABLE: 15,          
            BETWEEN_SECTIONS: 20,     
            LINE_HEIGHT: 7           
        }
    };
  
    function addMainTitle(text, y) {
        doc.setFontSize(LAYOUT.FONTS.TITLE_MAIN);
        doc.setTextColor(...LAYOUT.COLORS.TITLE_MAIN);
        doc.setFont("helvetica", "bold");
        doc.text(text, LAYOUT.MARGIN_LEFT, y);
        return y + LAYOUT.SPACING.AFTER_TITLE_MAIN;
    }
    
    // Função para aplicar título de seção
    function addSectionTitle(text, y) {
        doc.setFontSize(LAYOUT.FONTS.TITLE_SECTION);
        doc.setTextColor(...LAYOUT.COLORS.TITLE_SECTION);
        doc.setFont("helvetica", "bold");
        doc.text(text, LAYOUT.MARGIN_LEFT, y);
        // Adaptação para usar um espaçamento comum após títulos de seção
        return y + (LAYOUT.SPACING.AFTER_SECTION_TITLE || LAYOUT.SPACING.AFTER_TITLE_SECTION); 
    }
    
    // Função para aplicar subtítulo
    function addSubsectionTitle(text, y) {
        doc.setFontSize(LAYOUT.FONTS.TITLE_SUBSECTION);
        doc.setTextColor(...LAYOUT.COLORS.TITLE_SUBSECTION);
        doc.setFont("helvetica", "bold");
        doc.text(text, LAYOUT.MARGIN_LEFT, y);
        return y + LAYOUT.SPACING.AFTER_TITLE_SUBSECTION;
    }
    
    // Função para aplicar texto normal
    function addNormalText(text, y) {
        doc.setFontSize(LAYOUT.FONTS.TEXT_NORMAL);
        doc.setTextColor(...LAYOUT.COLORS.TEXT_NORMAL);
        doc.setFont("helvetica", "normal");
        doc.text(text, LAYOUT.MARGIN_LEFT, y);
        return y + LAYOUT.SPACING.AFTER_TEXT;
    }
    
    // Função para aplicar texto informativo
    function addInfoText(text, y) {
        doc.setFontSize(LAYOUT.FONTS.TEXT_INFO);
        doc.setTextColor(...LAYOUT.COLORS.TEXT_INFO);
        doc.setFont("helvetica", "normal");
        doc.text(text, LAYOUT.MARGIN_LEFT, y);
        return y + LAYOUT.SPACING.AFTER_TEXT;
    }
    
    // Função para aplicar texto de resumo
    function addSummaryText(text, y, isHighlight = false) {
        doc.setFontSize(LAYOUT.FONTS.TEXT_NORMAL);
        if (isHighlight) {
            doc.setTextColor(...LAYOUT.COLORS.TITLE_SECTION);
            doc.setFont("helvetica", "bold");
        } else {
            doc.setTextColor(...LAYOUT.COLORS.TEXT_NORMAL);
            doc.setFont("helvetica", "normal");
        }
        doc.text(text, LAYOUT.MARGIN_LEFT, y);
        return y + LAYOUT.SPACING.AFTER_TEXT;
    }
    
    // Função para adicionar espaçamento entre seções
    function addSectionSpacing(y) {
        return y + LAYOUT.SPACING.BETWEEN_SECTIONS;
    }

    LAYOUT.SPACING.AFTER_SECTION_TITLE = LAYOUT.SPACING.AFTER_TITLE_SECTION;

    const allIndividualPendingParcels = getSortedPendingBoletoParcels();
    if (allIndividualPendingParcels.length === 0) {
        alert('Nenhum boleto pendente para exportar após os filtros e ordenação.');
        return;
    }
    
    let currentY = LAYOUT.MARGIN_TOP;
    
    // --- CABEÇALHO PRINCIPAL ---
    currentY = addMainTitle('Relatório de Boletos Pendentes', currentY);
    currentY = addInfoText(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, currentY);
    
    // Obtém os valores dos filtros da UI
    const filterDueDateStartValue = document.getElementById('filterBoletoDueDateStart')?.value;
    const filterDueDateEndValue = document.getElementById('filterBoletoDueDateEnd')?.value;
    
    currentY = addInfoText(`Filtro de Vencimento: ${filterDueDateStartValue ? formatDate(filterDueDateStartValue) : 'N/A'} a ${filterDueDateEndValue ? formatDate(filterDueDateEndValue) : 'N/A'}`, currentY);
    currentY += LAYOUT.SPACING.LINE_HEIGHT;

    // --- PREPARAÇÃO DOS DADOS (Necessário antes de qualquer seção que os utilize) ---
    let totalPendingValue = 0;
    const processPendingSums = new Map(); // Para Somatórios por Processo
    
    // === NOVOS CÁLCULOS: Somatórios por Direcionamento ===
    let tiagoTotal = 0;
    let lotericaTotal = 0;
    const otherDirectionsSums = new Map(); // Para outros direcionamentos
    
    const tableData = allIndividualPendingParcels.map(item => {
        const boleto = item.boleto;
        const parcela = item.parcela;
        const statusPagamento = 'Pendente'; // No contexto de boletos pendentes, sempre será Pendente
    
        const parcelValue = parseFloat(parcela.value || 0);
        totalPendingValue += parcelValue; // Acumula o valor total
    
        const process = boleto.process || 'Não Informado';
        processPendingSums.set(process, (processPendingSums.get(process) || 0) + parcelValue);
    
        // Lógica para somar por direcionamento
        if (boleto.direction === 'Tiago') {
            tiagoTotal += parcelValue;
        } else if (boleto.direction === 'Lotérica') {
            lotericaTotal += parcelValue;
        } else {
            const directionName = boleto.direction || 'Outros / Não Informado';
            otherDirectionsSums.set(directionName, (otherDirectionsSums.get(directionName) || 0) + parcelValue);
        }
    
        return [
            boleto.vendor,
            `${parcela.parcelNumber}/${boleto.parcels.length}`,
            `R$ ${parcelValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            formatDate(parcela.dueDate),
            boleto.process || '',
            boleto.direction || '',
            boleto.company || 'N/A',  // ✅ Empresa
            statusPagamento
        ];
    });
    
    // --- SEÇÃO 1: TABELA PRINCIPAL ---
    currentY = addSectionTitle('1. Boletos Pendentes Detalhados', currentY);
    
    doc.autoTable({
        head: [['Fornecedor', 'Parcela', 'Valor Parcela', 'Vencimento', 'Processo', 'Direcionamento', 'Empresa', 'Status Pagamento']],
        body: tableData,
        startY: currentY,
        styles: { 
            fontSize: LAYOUT.FONTS.TEXT_SMALL,
            cellPadding: 3
        },
        headStyles: { 
            fillColor: LAYOUT.COLORS.TABLE_HEADER,
            textColor: [255, 255, 255],
            fontSize: LAYOUT.FONTS.TEXT_SMALL,
            fontStyle: 'bold'
        }
    });
    
    currentY = doc.autoTable.previous.finalY + LAYOUT.SPACING.AFTER_TABLE;
    
    // --- QUEBRA DE PÁGINA: APÓS SEÇÃO 1 (antes da Seção 2) ---
    doc.addPage();
    currentY = LAYOUT.MARGIN_TOP;
    
// --- SEÇÃO 2: RESUMO FINANCEIRO GERAL ---
currentY = addSectionTitle('2. Resumo Financeiro Geral', currentY);
currentY = addSummaryText(`Total Geral Pendente (no período filtrado): R$ ${totalPendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, currentY, true);
currentY = addSectionSpacing(currentY); 

// === NOVA SEÇÃO 3: SOMATÓRIOS POR DIRECIONAMENTO ===
if (tiagoTotal > 0 || lotericaTotal > 0 || otherDirectionsSums.size > 0) {
    doc.addPage(); // Adiciona uma nova página para esta seção
    currentY = LAYOUT.MARGIN_TOP;
    currentY = addSectionTitle('3. Somatórios por Direcionamento', currentY);

    const directionSummaryTableData = [];
    if (tiagoTotal > 0) directionSummaryTableData.push(['Tiago', `R$ ${tiagoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]);
    if (lotericaTotal > 0) directionSummaryTableData.push(['Lotérica', `R$ ${lotericaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]);
    
    // Adiciona outros direcionamentos se existirem, ordenados alfabeticamente
    Array.from(otherDirectionsSums.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([dirName, sum]) => {
        directionSummaryTableData.push([dirName, `R$ ${sum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]);
    });

    if (directionSummaryTableData.length > 0) {
        doc.autoTable({
            head: [['Direcionamento', 'Valor Total Pendente']],
            body: directionSummaryTableData,
            startY: currentY,
            styles: { 
                fontSize: LAYOUT.FONTS.TEXT_SMALL,
                cellPadding: 3
            },
            headStyles: { 
                fillColor: LAYOUT.COLORS.TABLE_HEADER_ALT, // Usando uma cor de cabeçalho alternativa
                textColor: [255, 255, 255],
                fontSize: LAYOUT.FONTS.TEXT_SMALL,
                fontStyle: 'bold'
            }
        });
        currentY = doc.autoTable.previous.finalY + LAYOUT.SPACING.AFTER_TABLE;
    } else {
        currentY = addInfoText('Nenhum valor pendente por direcionamento encontrado.', currentY);
        currentY += LAYOUT.SPACING.BETWEEN_SECTIONS;
    }
}

const uiFilterStartDate = filterDueDateStartValue ? criarDataLocal(filterDueDateStartValue) : null;
const uiFilterEndDate = filterDueDateEndValue ? criarDataLocal(filterDueDateEndValue) : null;
const allUnfilteredPendingParcels = getAllPendingParcelsForPredictions(boletos); // Garante que esta variável está definida

// --- SEÇÃO 4: PREVISÕES INTELIGENTES DE PAGAMENTO (Antiga Seção 3) ---
doc.addPage(); // Adiciona uma nova página para esta seção
currentY = LAYOUT.MARGIN_TOP;
currentY = addIntelligentPredictionsToPDF(doc, currentY, allUnfilteredPendingParcels, uiFilterStartDate, uiFilterEndDate, LAYOUT);
currentY += LAYOUT.SPACING.BETWEEN_SECTIONS; // Adiciona um espaçamento após esta seção

// --- SEÇÃO 5: BOLETOS PENDENTES DO PRÓXIMO MÊS (Antiga Seção 4) ---
doc.addPage(); // Adiciona uma nova página para esta seção
currentY = LAYOUT.MARGIN_TOP;
currentY = addSectionTitle('5. Boletos Pendentes do Próximo Mês', currentY);
const nextMonthSummary = getNextMonthSummaryForPDF(boletos);

if (nextMonthSummary && nextMonthSummary.totalValue > 0) {
    currentY = addNormalText(`Mês: ${nextMonthSummary.monthName} ${nextMonthSummary.year}`, currentY);
    currentY = addNormalText(`Período: ${nextMonthSummary.period}`, currentY);
    currentY = addNormalText(`Boletos Pendentes: ${nextMonthSummary.uniqueBoletos} boleto(s) (${nextMonthSummary.parcelsCount} parcela(s))`, currentY);
    currentY = addSummaryText(`Total a Pagar no Mês: R$ ${nextMonthSummary.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, currentY, true);
} else {
    currentY = addInfoText('Não há boletos pendentes no próximo mês.', currentY);
}
currentY += LAYOUT.SPACING.BETWEEN_SECTIONS; // Adiciona um espaçamento após esta seção

// --- SEÇÃO 6: SOMATÓRIOS POR PROCESSO (Antiga Seção 5) ---
if (processPendingSums.size > 0) {
    doc.addPage(); // Adiciona uma nova página para esta seção
    currentY = LAYOUT.MARGIN_TOP;
    currentY = addSectionTitle('6. Somatórios por Processo', currentY);

    const boletosProcessSummaryTableData = Array.from(processPendingSums.keys()).sort().map(processName => {
        const sum = processPendingSums.get(processName);
        return [
            processName,
            `R$ ${sum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ];
    });

    doc.autoTable({
        head: [['Processo', 'Valor Total Pendente']],
        body: boletosProcessSummaryTableData,
        startY: currentY,
        styles: { 
            fontSize: LAYOUT.FONTS.TEXT_SMALL,
            cellPadding: 3
        },
        headStyles: { 
            fillColor: LAYOUT.COLORS.TABLE_HEADER_ALT,
            textColor: [255, 255, 255],
            fontSize: LAYOUT.FONTS.TEXT_SMALL,
            fontStyle: 'bold'
        }
    });
    currentY = doc.autoTable.previous.finalY + LAYOUT.SPACING.AFTER_TABLE;
}
    doc.save(`relatorio_boletos_pendentes_${new Date().toISOString().split('T')[0]}.pdf`);
    console.log('%c[DEBUG_EXPORT] PDF export initiated.', 'color: green;');
}

function addIntelligentPredictionsToPDF(doc, currentY, allUnfilteredPendingParcels, uiFilterStartDate, uiFilterEndDate, LAYOUT) {
    const intelligentPredictions = getIntelligentWeeklyPredictions(allUnfilteredPendingParcels, uiFilterStartDate, uiFilterEndDate);

    currentY = addSectionTitle('3. Previsões Inteligentes de Pagamento', currentY);
    
    if (intelligentPredictions.summary.totalValue > 0) {
        // Informações do método de cálculo
        currentY = addInfoText(`Método de Cálculo: ${intelligentPredictions.summary.calculationMethod}`, currentY);
        currentY = addNormalText(`Período de Previsão: ${intelligentPredictions.summary.predictionPeriod}`, currentY);
        currentY = addNormalText(`Total de Semanas: ${intelligentPredictions.summary.totalWeeks} semana(s)`, currentY);
        currentY = addNormalText(`Boletos Previstos: ${intelligentPredictions.summary.uniqueBoletos} boleto(s) (${intelligentPredictions.summary.parcelsCount} parcela(s))`, currentY);
        currentY = addSummaryText(`Total Previsto: R$ ${intelligentPredictions.summary.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, currentY, true);
        currentY += LAYOUT.SPACING.LINE_HEIGHT * 2;
        currentY = addInfoText('As previsões semanais detalhadas não são exibidas neste relatório.', currentY);
        currentY += LAYOUT.SPACING.AFTER_TEXT; // Adiciona um espaçamento após a informação
        
    } else {
        currentY = addInfoText('Não há previsões de pagamento para o período calculado.', currentY);
        currentY += LAYOUT.SPACING.BETWEEN_SECTIONS;
    }

    return currentY;
}

function debugParcelDates(pendingParcels) {
 
    const allDates = pendingParcels.map(item => ({
        vendor: item.boleto.vendor,
        dueDate: item.sortDate.toLocaleDateString('pt-BR'),
        dueDateObj: item.sortDate,
        value: item.parcela.value
    }));
    
    // Ordena por data
    allDates.sort((a, b) => a.dueDateObj.getTime() - b.dueDateObj.getTime());
    
    console.table(allDates);
    
    // Verifica quantas parcelas vencem após 30/11/2025
    const predictionStart = new Date('2025-11-30');
    const futureParcel = allDates.filter(p => p.dueDateObj >= predictionStart);
    

    if (futureParcel.length > 0) {
        console.table(futureParcel);
    }
}


function getIntelligentWeeklyPredictions(allPendingParcels) {
    // ✅ DEBUG
    console.log('DEBUG - getIntelligentWeeklyPredictions recebeu:', {
        tipo: typeof allPendingParcels,
        isArray: Array.isArray(allPendingParcels),
        valor: allPendingParcels
    });
    
    // ✅ VALIDAÇÃO: Garantir que é um array
    if (!Array.isArray(allPendingParcels)) {
        console.warn('⚠️ allPendingParcels não é um array. Convertendo...');
        
        if (typeof allPendingParcels === 'object' && allPendingParcels !== null) {
            // Se é um objeto, converter para array
            allPendingParcels = Object.values(allPendingParcels);
        } else {
            // Caso contrário, array vazio
            allPendingParcels = [];
        }
    }
    
    // Se vazio, retornar array vazio
    if (allPendingParcels.length === 0) {
        console.log('ℹ️ Nenhuma parcela pendente para análise.');
        return [];
    }
    
    try {
        // ✅ Agrupar por semana
        const weeklyGroups = {};
        
        allPendingParcels.forEach(parcel => {
            const week = parcel.week || 'Sem Data';
            if (!weeklyGroups[week]) {
                weeklyGroups[week] = {
                    week: week,
                    count: 0,
                    totalAmount: 0,
                    parcels: []
                };
            }
            weeklyGroups[week].count++;
            weeklyGroups[week].totalAmount += parcel.amount || 0;
            weeklyGroups[week].parcels.push(parcel);
        });
        
        // ✅ Converter para array e ordenar
        const predictions = Object.values(weeklyGroups).sort((a, b) => {
            if (a.week === 'Sem Data') return 1;
            if (b.week === 'Sem Data') return -1;
            return new Date(a.week) - new Date(b.week);
        });
        
        console.log('✅ Previsões geradas:', predictions.length, 'semanas');
        return predictions;
        
    } catch (error) {
        console.error('❌ Erro ao processar previsões:', error);
        return [];
    }
}
// Função de Geração - VERSÃO LIMPA
function generateWeeklyPredictions(allPendingParcels, predictionConfig) {
    const weeklyPredictions = [];
    
    predictionConfig.weekDetails.forEach(weekDetail => {
        console.log('%c[WEEK] Processando:', 'color: orange;', weekDetail.period);
        
        const weekParcels = allPendingParcels.filter(item => {
            return item.sortDate >= weekDetail.startDate && item.sortDate <= weekDetail.endDate;
        });

        console.log('%c[WEEK] Parcelas encontradas:', 'color: orange;', weekParcels.length);

        let weekTotalValue = 0;
        const weekUniqueBoletos = new Set();
        const weekDetailedParcels = [];

        weekParcels.forEach(item => {
            const parcelValue = parseFloat(item.parcela.value || 0);
            weekTotalValue += parcelValue;
            weekUniqueBoletos.add(item.boleto.id);
            
            weekDetailedParcels.push({
                vendor: item.boleto.vendor,
                parcelNumberInfo: `${item.parcela.parcelNumber}/${item.boleto.parcels.length}`,
                parcelValue: parcelValue,
                dueDate: formatDate(item.parcela.dueDate),
                process: item.boleto.process || '',
                direction: item.boleto.direction || ''
            });
        });

        weekDetailedParcels.sort((a, b) => {
            const dateA = criarDataLocal(a.dueDate);
            const dateB = criarDataLocal(b.dueDate);
            return dateA.getTime() - dateB.getTime();
        });

        weeklyPredictions.push({
            weekNumber: weekDetail.weekNumber,
            period: weekDetail.period,
            startDate: weekDetail.startDate,
            endDate: weekDetail.endDate,
            totalValue: weekTotalValue,
            uniqueBoletos: weekUniqueBoletos.size,
            parcelsCount: weekDetailedParcels.length,
            detailedParcels: weekDetailedParcels
        });
    });

    return weeklyPredictions;
}

// Função 2: Calcula Datas de Previsão Inteligentes - LÓGICA CORRETA FINAL
function calculateIntelligentPredictionDates(startDate, endDate) {
    console.log('%c[DEBUG CALC] Iniciando cálculo de datas inteligentes...', 'color: cyan; font-weight: bold;');
    console.log('%c[DEBUG CALC] Datas de entrada:', 'color: cyan;', {
        startDate: startDate.toLocaleDateString('pt-BR'),
        endDate: endDate.toLocaleDateString('pt-BR')
    });
    
    const config = {
        originalStart: new Date(startDate),
        originalEnd: new Date(endDate),
        predictionStart: null,
        predictionEnd: null,
        totalWeeks: 0,
        calculationMethod: '',
        weekDetails: []
    };

    const dayOfMonth = startDate.getDate();
    const weekOfMonth = Math.ceil(dayOfMonth / 7);
    
        config.predictionStart = new Date(endDate);
    config.predictionStart.setDate(config.predictionStart.getDate() + 1); // +1 dia após o fim do filtro
    
    // REGRA 1: Data de início de previsões (dia 1-7 do mês)
    if (dayOfMonth >= 1 && dayOfMonth <= 7) {
        config.totalWeeks = 5;
        config.calculationMethod = `Primeira semana do mês (dia ${dayOfMonth}) - 5 semanas de previsão`;
        console.log('%c[DEBUG CALC] REGRA 1 aplicada (dia 1-7)', 'color: green; font-weight: bold;');
    }
    // REGRA 2: Data de fim de previsões (dia 8-14 do mês)
    else if (dayOfMonth >= 8 && dayOfMonth <= 14) {
        config.totalWeeks = 5;
        config.calculationMethod = `Segunda semana do mês (dia ${dayOfMonth}) - 5 semanas de previsão`;
    }
    // REGRA 3: Ajustes baseados na semana do mês
    else {
        switch (weekOfMonth) {
            case 2:
                config.totalWeeks = 4;
                config.calculationMethod = `Segunda semana do mês (dia ${dayOfMonth}) - 4 semanas de previsão`;
                break;
            case 3:
                config.totalWeeks = 3;
                config.calculationMethod = `Terceira semana do mês (dia ${dayOfMonth}) - 3 semanas de previsão`;
                break;
            case 4:
                config.totalWeeks = 2;
                config.calculationMethod = `Quarta semana do mês (dia ${dayOfMonth}) - 2 semanas de previsão`;
                break;
            case 5:
            default:
                config.totalWeeks = 1;
                config.calculationMethod = `Quinta semana do mês (dia ${dayOfMonth}) - 1 semana de previsão`;
                break;
        }
        console.log('%c[DEBUG CALC] REGRA 3 aplicada (semana ' + weekOfMonth + ')', 'color: green; font-weight: bold;');
    }

    console.log('%c[DEBUG CALC] Data de início da primeira semana:', 'color: cyan; font-weight: bold;', 
        config.predictionStart.toLocaleDateString('pt-BR'));
    console.log('%c[DEBUG CALC] Total de semanas:', 'color: cyan; font-weight: bold;', config.totalWeeks);

    // Calcula as datas de cada semana de previsão
    let currentWeekStart = new Date(config.predictionStart);
    
    for (let week = 1; week <= config.totalWeeks; week++) {
        const weekStart = new Date(currentWeekStart);
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6); // 7 dias por semana (0-6)
        
        const weekDetail = {
            weekNumber: week,
            startDate: new Date(weekStart),
            endDate: new Date(weekEnd),
            period: `${weekStart.toLocaleDateString('pt-BR')} - ${weekEnd.toLocaleDateString('pt-BR')}`
        };
        
        config.weekDetails.push(weekDetail);
        
        console.log('%c[DEBUG CALC] Semana ' + week + ' calculada:', 'color: cyan;', weekDetail);
        
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    if (config.weekDetails.length > 0) {
        config.predictionEnd = new Date(config.weekDetails[config.weekDetails.length - 1].endDate);
        console.log('%c[DEBUG CALC] Data final das previsões:', 'color: cyan; font-weight: bold;', 
            config.predictionEnd.toLocaleDateString('pt-BR'));
    }

    return config;
}

function generateWeeklyPredictions(pendingParcels, predictionConfig) {
    console.log('%c[DEBUG GEN] Iniciando geração de previsões semanais...', 'color: magenta; font-weight: bold;');
    console.log('%c[DEBUG GEN] Total de parcelas a analisar:', 'color: magenta;', pendingParcels.length);
    
    const weeklyPredictions = [];
    
    predictionConfig.weekDetails.forEach((weekDetail, index) => {
        console.log('%c[DEBUG GEN] === PROCESSANDO SEMANA ' + (index + 1) + ' ===', 'color: yellow; font-weight: bold;');
        console.log('%c[DEBUG GEN] Período da semana:', 'color: yellow;', {
            weekNumber: weekDetail.weekNumber,
            startDate: weekDetail.startDate.toLocaleDateString('pt-BR'),
            endDate: weekDetail.endDate.toLocaleDateString('pt-BR')
        });
        
        // Filtra parcelas que vencem DENTRO do período da semana de previsão
        const weekParcels = pendingParcels.filter(item => {
            const dueDate = item.sortDate;
            const isInRange = dueDate >= weekDetail.startDate && dueDate <= weekDetail.endDate;
            
            return isInRange;
        });

        console.log('%c[DEBUG GEN] Parcelas encontradas nesta semana:', 'color: yellow; font-weight: bold;', weekParcels.length);
        
        if (weekParcels.length > 0) {
            console.log('%c[DEBUG GEN] Detalhes das parcelas encontradas:', 'color: yellow;', 
                weekParcels.map(p => ({
                    vendor: p.boleto.vendor,
                    dueDate: p.sortDate.toLocaleDateString('pt-BR'),
                    value: p.parcela.value
                }))
            );
        }

        let weekTotalValue = 0;
        const weekUniqueBoletos = new Set();
        const weekDetailedParcels = [];

        weekParcels.forEach(item => {
            const parcelValue = parseFloat(item.parcela.value || 0);
            weekTotalValue += parcelValue;
            weekUniqueBoletos.add(item.boleto.id);
            
            weekDetailedParcels.push({
                vendor: item.boleto.vendor,
                parcelNumberInfo: `${item.parcela.parcelNumber}/${item.boleto.parcels.length}`,
                parcelValue: parcelValue,
                dueDate: formatDate(item.parcela.dueDate),
                process: item.boleto.process || '',
                direction: item.boleto.direction || ''
            });
        });

        // Ordena as parcelas por data de vencimento
        weekDetailedParcels.sort((a, b) => {
            const dateA = criarDataLocal(a.dueDate);
            const dateB = criarDataLocal(b.dueDate);
            return dateA.getTime() - dateB.getTime();
        });

        const weekResult = {
            weekNumber: weekDetail.weekNumber,
            period: weekDetail.period,
            startDate: weekDetail.startDate,
            endDate: weekDetail.endDate,
            totalValue: weekTotalValue,
            uniqueBoletos: weekUniqueBoletos.size,
            parcelsCount: weekDetailedParcels.length,
            detailedParcels: weekDetailedParcels
        };

        console.log('%c[DEBUG GEN] Resultado da semana ' + weekDetail.weekNumber + ':', 'color: yellow; font-weight: bold;', {
            parcelas: weekResult.parcelsCount,
            valor: weekResult.totalValue,
            boletos: weekResult.uniqueBoletos
        });

        weeklyPredictions.push(weekResult);
    });

    console.log('%c[DEBUG GEN] RESULTADO FINAL - Total de semanas processadas:', 'color: magenta; font-weight: bold;', weeklyPredictions.length);
    console.log('%c[DEBUG GEN] RESULTADO FINAL - Resumo por semana:', 'color: magenta;', 
        weeklyPredictions.map(w => ({
            semana: w.weekNumber,
            parcelas: w.parcelsCount,
            valor: w.totalValue
        }))
    );

    return weeklyPredictions;
}

function calculatePredictionSummary(weeklyPredictions, predictionConfig) {
    let totalValue = 0;
    let totalParcels = 0;
    const allUniqueBoletos = new Set();

    weeklyPredictions.forEach(week => {
        totalValue += week.totalValue;
        totalParcels += week.parcelsCount;
        week.detailedParcels.forEach(parcel => {
            const boletoKey = `${parcel.vendor}_${parcel.process}`;
            allUniqueBoletos.add(boletoKey);
        });
    });

    let predictionPeriod = 'N/A';
    if (predictionConfig.weekDetails.length > 0) {
        const firstWeek = predictionConfig.weekDetails[0];
        const lastWeek = predictionConfig.weekDetails[predictionConfig.weekDetails.length - 1];
        predictionPeriod = `${firstWeek.startDate.toLocaleDateString('pt-BR')} - ${lastWeek.endDate.toLocaleDateString('pt-BR')}`;
    }

    return {
        calculationMethod: predictionConfig.calculationMethod,
        totalWeeks: predictionConfig.totalWeeks,
        predictionPeriod: predictionPeriod,
        totalValue: totalValue,
        uniqueBoletos: allUniqueBoletos.size,
        parcelsCount: totalParcels
    };
}

// Função 5: Adiciona Previsões Inteligentes ao PDF - SEM ALTERAÇÃO
function addIntelligentPredictionsToPDF(doc, pendingOrders, startingYPosition) {
    console.log('DEBUG - addIntelligentPredictionsToPDF iniciada');
    
    let yPosition = startingYPosition || 20;
    
    try {
        // ✅ NOVO: Extrair parcelas de forma segura
        const allPendingParcels = getAllPendingParcels(pendingOrders);
        
        // ✅ Obter previsões (agora com validação interna)
        const predictions = getIntelligentWeeklyPredictions(allPendingParcels);
        
        if (predictions.length === 0) {
            console.log('ℹ️ Nenhuma previsão inteligente para adicionar.');
            return yPosition;
        }
        
        // ✅ Adicionar seção de análise ao PDF
        doc.addPage();
        yPosition = 20;
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text('Análise Inteligente de Previsões', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        // Adicionar cada previsão
        predictions.forEach((pred, index) => {
            doc.setFont("helvetica", "bold");
            doc.text(`Semana ${index + 1}: ${pred.week}`, 20, yPosition);
            yPosition += 6;
            
            doc.setFont("helvetica", "normal");
            doc.text(`   Parcelas: ${pred.count} | Total: R$ ${pred.totalAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 20, yPosition);
            yPosition += 6;
            
            // Verificar se precisa de nova página
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
        });
        
        console.log('✅ Análise inteligente adicionada ao PDF com sucesso');
        return yPosition;
        
    } catch (error) {
        console.error('❌ Erro em addIntelligentPredictionsToPDF:', error);
        return yPosition;
    }
}
function getPendingParcelsDetailsForCurrentMonth(pendingParcels, uiFilterStartDate, uiFilterEndDate) {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Define o fim do mês atual
    const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    endOfCurrentMonth.setHours(23, 59, 59, 999);

    if (pendingParcels.length === 0) {
        return {
            summary: {
                period: `${currentDate.toLocaleDateString('pt-BR')} - ${endOfCurrentMonth.toLocaleDateString('pt-BR')}`,
                uniqueBoletos: 0,
                parcelsCount: 0,
                totalValue: 0
            },
            detailedParcels: []
        };
    }

    const currentMonthParcels = pendingParcels.filter(item => {
        const dueDate = item.sortDate;
        return dueDate >= currentDate && dueDate <= endOfCurrentMonth;
    });

    let totalCurrentMonth = 0;
    const uniqueBoletosCurrentMonth = new Set();
    const detailedParcelsList = [];

    currentMonthParcels.forEach(item => {
        const parcelValue = parseFloat(item.parcela.value || 0);
        totalCurrentMonth += parcelValue;
        uniqueBoletosCurrentMonth.add(item.boleto.id);
        
        detailedParcelsList.push({
            vendor: item.boleto.vendor,
            parcelNumberInfo: `${item.parcela.parcelNumber}/${item.boleto.parcels.length}`,
            parcelValue: parcelValue,
            dueDate: formatDate(item.parcela.dueDate),
            process: item.boleto.process || '',
            direction: item.boleto.direction || ''
        });
    });

    // Ordena as parcelas por data de vencimento
    detailedParcelsList.sort((a, b) => {
        const dateA = criarDataLocal(a.dueDate);
        const dateB = criarDataLocal(b.dueDate);
        return dateA.getTime() - dateB.getTime();
    });

    return {
        summary: {
            period: `${currentDate.toLocaleDateString('pt-BR')} - ${endOfCurrentMonth.toLocaleDateString('pt-BR')}`,
            uniqueBoletos: uniqueBoletosCurrentMonth.size,
            parcelsCount: detailedParcelsList.length,
            totalValue: totalCurrentMonth
        },
        detailedParcels: detailedParcelsList
    };
}

function getNextMonthSummaryForPDF(allBoletos) {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const nextCalendarMonthStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    nextCalendarMonthStartDate.setHours(0, 0, 0, 0);

    const nextCalendarMonthEndDate = new Date(nextCalendarMonthStartDate.getFullYear(), nextCalendarMonthStartDate.getMonth() + 1, 0);
    nextCalendarMonthEndDate.setHours(23, 59, 59, 999);
    
    let totalNextMonth = 0;
    let uniqueBoletosNextMonth = new Set();
    let totalParcelsNextMonth = 0;

    allBoletos.forEach(boleto => {
        if (boleto.parcels && Array.isArray(boleto.parcels)) {
            boleto.parcels.forEach(parcela => {
                if (!parcela.isPaid) {
                    const dueDate = criarDataLocal(parcela.dueDate);
                    if (!isNaN(dueDate.getTime()) && dueDate >= nextCalendarMonthStartDate && dueDate <= nextCalendarMonthEndDate) {
                        totalNextMonth += parseFloat(parcela.value || 0);
                        uniqueBoletosNextMonth.add(boleto.id);
                        totalParcelsNextMonth++;
                    }
                }
            });
        }
    });

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    return {
        monthName: monthNames[nextCalendarMonthStartDate.getMonth()],
        year: nextCalendarMonthStartDate.getFullYear(),
        period: `${nextCalendarMonthStartDate.toLocaleDateString('pt-BR')} - ${nextCalendarMonthEndDate.toLocaleDateString('pt-BR')}`,
        uniqueBoletos: uniqueBoletosNextMonth.size,
        parcelsCount: totalParcelsNextMonth,
        totalValue: totalNextMonth
    };
}


function getWeeklyPredictionsDataForPDF(pendingParcels, uiFilterStartDate, uiFilterEndDate) {
    const predictions = [];
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Zera a hora da data atual para comparações consistentes

    if (pendingParcels.length === 0) {
        return predictions;
    }


    let effectiveStartPredictionDate = new Date(Math.min(...pendingParcels.map(item => item.sortDate.getTime())));
    effectiveStartPredictionDate.setHours(0, 0, 0, 0);
    if (effectiveStartPredictionDate < currentDate) {
        effectiveStartPredictionDate = currentDate; // Começa as previsões a partir de hoje
    }

    const endOfCurrentCalendarMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0); 
    endOfCurrentCalendarMonth.setHours(23, 59, 59, 999); 

    let effectiveEndPredictionDate = new Date(Math.max(...pendingParcels.map(item => item.sortDate.getTime())));
    effectiveEndPredictionDate.setHours(23, 59, 59, 999);

    if (effectiveEndPredictionDate > endOfCurrentCalendarMonth) {
        effectiveEndPredictionDate = endOfCurrentCalendarMonth;
    }
    if (uiFilterEndDate && effectiveEndPredictionDate > uiFilterEndDate) {
        effectiveEndPredictionDate = uiFilterEndDate;
    }

    if (effectiveStartPredictionDate > effectiveEndPredictionDate) {
        return predictions; // Período de previsão inválido
    }

    let weekStart = new Date(effectiveStartPredictionDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    let weekNumber = 1;
    
    // Itera semana a semana
    while (weekStart <= effectiveEndPredictionDate) {
        let weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6); // Fim desta semana de 7 dias
        weekEnd.setHours(23, 59, 59, 999); // Incluir o dia inteiro

        // Garante que o fim da semana não ultrapasse a data final efetiva da previsão
        if (weekEnd > effectiveEndPredictionDate) {
            weekEnd = new Date(effectiveEndPredictionDate);
        }
        
        const weekParcels = pendingParcels.filter(item => {
            const dueDate = item.sortDate; // Já é um objeto Date normalizado
            return dueDate >= weekStart && dueDate <= weekEnd;
        });
        
        const weekTotal = weekParcels.reduce((sum, item) => sum + parseFloat(item.parcela.value || 0), 0);
        const uniqueBoletosInWeek = new Set(weekParcels.map(item => item.boleto.id)).size;

        if (weekParcels.length > 0) { // Adicionar apenas semanas com boletos
             predictions.push({
                weekLabel: `Semana ${weekNumber}`,
                weekPeriod: `${weekStart.toLocaleDateString('pt-BR')} - ${weekEnd.toLocaleDateString('pt-BR')}`,
                uniqueBoletos: uniqueBoletosInWeek,
                parcelsCount: weekParcels.length,
                totalValue: weekTotal
            });
        }
       
        weekStart.setDate(weekStart.getDate() + 7); // Avança para o início da próxima semana
        weekNumber++;
    }
    
    return predictions;
}


function getNextMonthTotalDataForPDF(allBoletos) { // Espera o array global 'boletos'
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const nextCalendarMonthStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1); // Primeiro dia do próximo mês
    nextCalendarMonthStartDate.setHours(0, 0, 0, 0);

    const nextCalendarMonthEndDate = new Date(nextCalendarMonthStartDate.getFullYear(), nextCalendarMonthStartDate.getMonth() + 1, 0); // Último dia do próximo mês
    nextCalendarMonthEndDate.setHours(23, 59, 59, 999); // Incluir o dia inteiro
    
    let totalNextMonth = 0;
    let uniqueBoletosNextMonth = new Set();
    let totalParcelsNextMonth = 0;

    allBoletos.forEach(boleto => {
        if (boleto.parcels && Array.isArray(boleto.parcels)) {
            boleto.parcels.forEach(parcela => {
                if (!parcela.isPaid) { // Considerar apenas parcelas pendentes
                    const dueDate = criarDataLocal(parcela.dueDate); // Usa sua função auxiliar para obter um objeto Date local
                    if (!isNaN(dueDate.getTime()) && dueDate >= nextCalendarMonthStartDate && dueDate <= nextCalendarMonthEndDate) {
                        totalNextMonth += parseFloat(parcela.value || 0);
                        uniqueBoletosNextMonth.add(boleto.id);
                        totalParcelsNextMonth++;
                    }
                }
            });
        }
    });

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    return {
        monthName: monthNames[nextCalendarMonthStartDate.getMonth()],
        year: nextCalendarMonthStartDate.getFullYear(),
        period: `${nextCalendarMonthStartDate.toLocaleDateString('pt-BR')} - ${nextCalendarMonthEndDate.toLocaleDateString('pt-BR')}`,
        uniqueBoletos: uniqueBoletosNextMonth.size,
        parcelsCount: totalParcelsNextMonth,
        totalValue: totalNextMonth
    };
}

function getPendingParcelsDetailsForWeeks(pendingParcels, uiFilterStartDate, uiFilterEndDate) {
    if (pendingParcels.length === 0) {
        return {
            summary: {
                period: 'N/A',
                uniqueBoletos: 0,
                parcelsCount: 0,
                totalValue: 0,
                weeksCount: 0
            },
            detailedParcels: []
        };
    }


    let effectiveStartDate, effectiveEndDate;
    
    if (uiFilterStartDate && uiFilterEndDate) {
        effectiveStartDate = new Date(uiFilterStartDate);
        effectiveStartDate.setDate(effectiveStartDate.getDate() + 8); // +7 dias na data inicial
        
        effectiveEndDate = new Date(uiFilterEndDate);
        effectiveEndDate.setDate(effectiveEndDate.getDate() + 8); // +7 dias na data final
    } else {
        const allDates = pendingParcels.map(item => item.sortDate);
        effectiveStartDate = new Date(Math.min(...allDates.map(d => d.getTime())));
        effectiveEndDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    }

    effectiveStartDate.setHours(0, 0, 0, 0);
    effectiveEndDate.setHours(23, 59, 59, 999);

    const weeks = [];
    let currentWeekStart = new Date(effectiveStartDate);
    
    while (currentWeekStart <= effectiveEndDate) {
        let currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekEnd.getDate() + 6); // +7 dias (0-6 = 7 dias)
        currentWeekEnd.setHours(23, 59, 59, 999);
        
        // Se o fim da semana ultrapassar a data final do filtro, ajusta para a data final
        if (currentWeekEnd > effectiveEndDate) {
            currentWeekEnd = new Date(effectiveEndDate);
        }
        
        weeks.push({
            start: new Date(currentWeekStart),
            end: new Date(currentWeekEnd)
        });
        
        // Avança para a próxima semana (+7 dias)
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    // Coleta todas as parcelas que caem dentro do período das semanas (+7 dias)
    let totalValue = 0;
    const uniqueBoletos = new Set();
    const detailedParcelsList = [];

    weeks.forEach((week, index) => {
        const weekParcels = pendingParcels.filter(item => {
            const dueDate = item.sortDate;
            return dueDate >= week.start && dueDate <= week.end;
        });

        weekParcels.forEach(item => {
            const parcelValue = parseFloat(item.parcela.value || 0);
            totalValue += parcelValue;
            uniqueBoletos.add(item.boleto.id);
            
            detailedParcelsList.push({
                vendor: item.boleto.vendor,
                parcelNumberInfo: `${item.parcela.parcelNumber}/${item.boleto.parcels.length}`,
                parcelValue: parcelValue,
                dueDate: formatDate(item.parcela.dueDate),
                process: item.boleto.process || '',
                direction: item.boleto.direction || '',
                weekNumber: index + 1,
                weekPeriod: `${week.start.toLocaleDateString('pt-BR')} - ${week.end.toLocaleDateString('pt-BR')}`
            });
        });
    });

    // Ordena as parcelas por data de vencimento
    detailedParcelsList.sort((a, b) => {
        const dateA = criarDataLocal(a.dueDate);
        const dateB = criarDataLocal(b.dueDate);
        return dateA.getTime() - dateB.getTime();
    });

    return {
        summary: {
            period: `${effectiveStartDate.toLocaleDateString('pt-BR')} - ${effectiveEndDate.toLocaleDateString('pt-BR')}`,
            uniqueBoletos: uniqueBoletos.size,
            parcelsCount: detailedParcelsList.length,
            totalValue: totalValue,
            weeksCount: weeks.length
        },
        detailedParcels: detailedParcelsList,
        weeks: weeks
    };
}

// Mapa declarativo: ID do modal -> função de fechamento correspondente
const MODAL_CLOSE_HANDLERS = {
    'orderModal':      () => closeModal(),
    'paymentModal':    () => closePaymentModal(),
    'editModal':       () => closeEditModal(),
    'editSalaryModal': () => closeEditSalaryModal(),
};

// Handler único orientado a dados — adicionar novo modal = 1 linha no objeto acima
window.addEventListener('click', function(event) {
    Object.entries(MODAL_CLOSE_HANDLERS).forEach(([modalId, closeFn]) => {
        const modal = document.getElementById(modalId);
        if (modal && event.target === modal) {
            closeFn();
        }
    });
});

function deveArquivarOrdemPaga(dataString) {
    if (!dataString || dataString === '-') return false;
    
    try {
        // Converter string de data para Date object (formato dd/mm/yyyy)
        const partesData = dataString.split('/');
        if (partesData.length !== 3) return false;
        
        const dataOrdem = new Date(partesData[2], partesData[1] - 1, partesData[0]);
        const hoje = new Date();
        const primeiroDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        
        // Ocultar se a data é anterior ao primeiro dia do mês atual
        return dataOrdem < primeiroDiaDoMes;
        
    } catch (error) {
        console.log('Erro ao processar data:', dataString, error);
        return false;
    }
}

// Função para aplicar o filtro de arquivamento nas ordens pagas
function aplicarFiltroArquivamento() {
    console.log('🗂️ Aplicando filtro de arquivamento mensal nas ordens pagas...');
        
    const paidTab = document.getElementById('paidTab');
    // REMOVIDA: A verificação paidTab.classList.contains('active') não é mais necessária aqui,
    // pois já garantimos que a classe 'active' foi adicionada antes de chamar esta função.
    if (!paidTab) { // Apenas uma verificação de segurança adicional
        console.log('❌ Elemento paidTab não encontrado (após verificação inicial).');
        return;
    }
        
    const tabela = paidTab.querySelector('table tbody') || paidTab.querySelector('table');
    if (!tabela) {
        console.log('❌ Tabela de ordens pagas não encontrada');
        return;
    }
    
    const linhas = Array.from(tabela.rows);
    let ordensOcultadas = 0;
    let ordensVisiveis = 0;
    
    console.log('📅 Filtrando ordens pagas de meses anteriores...');
    
    linhas.forEach((linha, index) => {
        // Pular cabeçalho
        if (index === 0 && linha.cells[0]?.tagName === 'TH') {
            return;
        }
        
        const cells = Array.from(linha.cells);
        if (cells.length < 6) return; // Garante que a linha tem colunas suficientes para verificar

        // A célula do status/data é a 7ª coluna (índice 6) da tabela `paidOrdersTableBody`
        // Favorecido (0), Valor da Ordem (1), Tipo (2), Prioridade (3), Solicitante (4), Processo (5), Status/Data (6), Ações (7)
        const statusTextFull = cells[6]?.textContent?.trim(); // Texto completo da célula Status/Data
        const status = statusTextFull ? statusTextFull.split('\n')[0]?.trim() : ''; // Pega só o status, antes da quebra de linha
        const dataCell = statusTextFull ? statusTextFull.split('\n')[1]?.trim() : ''; // Pega só a data

        // Verificação adicional para o caso da data não estar presente ou em formato inesperado
        if (!dataCell || dataCell === 'N/A') {
            // Se não tem data de pagamento, não tenta arquivar, apenas mostra
            linha.style.display = '';
            linha.classList.remove('ordem-arquivada');
            linha.removeAttribute('data-arquivada');
            ordensVisiveis++;
            return;
        }
        
        if (status && status.toUpperCase().includes('PAGA')) {
            if (deveArquivarOrdemPaga(dataCell)) {
                linha.style.display = 'none';
                linha.classList.add('ordem-arquivada');
                linha.setAttribute('data-arquivada', 'true');
                ordensOcultadas++;
            } else {
                linha.style.display = '';
                linha.classList.remove('ordem-arquivada');
                linha.removeAttribute('data-arquivada');
                ordensVisiveis++;
            }
        } else { // Se não é "Paga", não arquiva
            linha.style.display = '';
            linha.classList.remove('ordem-arquivada');
            linha.removeAttribute('data-arquivada');
            ordensVisiveis++;
        }
    });
    
    console.log(`📊 Resultado do filtro: ${ordensVisiveis} visíveis, ${ordensOcultadas} arquivadas`);
    
    // Adicionar indicador visual
    if (ordensOcultadas > 0) {
        adicionarIndicadorArquivamento(ordensOcultadas, paidTab);
    }
}

function addPaidFilterSummaryMessage(currentDisplayCount, totalFilteredItemsCount, totalValueDisplayedOnPage, containerElement) {
    // Remove qualquer mensagem existente para evitar duplicatas
    const existingMessage = containerElement.querySelector('.filtered-info-box');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Não exibe a mensagem se não houver itens para exibir e não há itens filtrados
    if (totalFilteredItemsCount === 0 && currentDisplayCount === 0) {
        // Se não há itens filtrados, vamos tentar obter o total de itens pagos no sistema (antes de qualquer filtro)
        // Isso requer uma função auxiliar que retorne todos os itens pagos sem filtros
        // Para simplificar, se não houver filtrados, assume-se que não há nada para mostrar.
        // Se precisar de um contador geral de "todos os pagos do sistema", precisaria de outra variável global ou função.
        return; // Não exibe mensagem nesse caso
    }

    // Lógica de pluralização para a mensagem, usando "ordem de pagamento"
    const itemNounSingular = 'ordem de pagamento';
    const itemNounPlural = 'ordens de pagamento';

    const currentItemNoun = currentDisplayCount === 1 ? itemNounSingular : itemNounPlural;
    const totalFilteredItemNoun = totalFilteredItemsCount === 1 ? itemNounSingular : itemNounPlural;

    let messageContent = '';
    if (paidShowAllItemsMode) { // Modo "Mostrar Todos"
        messageContent = `Mostrando <strong>todas</strong> as <strong>${totalFilteredItemsCount}</strong> ${totalFilteredItemNoun} (filtradas).`;
    } else { // Modo de Paginação
        messageContent = `<strong>${currentDisplayCount}</strong> ${currentItemNoun} exibido(s) nesta página (de <strong>${totalFilteredItemsCount}</strong> ${totalFilteredItemNoun} filtrada(s) no total).`;
    }
    
    // Adiciona o valor total filtrado na página atual
    messageContent += `<br>Valor Total Filtrado nesta página: <strong>${totalValueDisplayedOnPage.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' })}</strong>`;
    
    const infoBoxHtml = `<div class="filtered-info-box"><span class="text-content">${messageContent}</span></div>`;

    // Localiza o contêiner de filtros avançados e os botões de exportação
    const paidAdvancedFiltersContainer = containerElement.querySelector('#paidAdvancedFiltersContainer');
    const exportButtonsContainer = containerElement.querySelector('.export-buttons');

    // Insere a mensagem abaixo do contêiner de filtros avançados e acima dos botões de exportação
    if (paidAdvancedFiltersContainer && paidAdvancedFiltersContainer.parentElement) {
        if (exportButtonsContainer) {
            paidAdvancedFiltersContainer.parentElement.insertBefore(document.createRange().createContextualFragment(infoBoxHtml), exportButtonsContainer);
        } else {
            // Fallback se os botões de exportação não forem encontrados, insere após os filtros
            paidAdvancedFiltersContainer.parentElement.insertBefore(document.createRange().createContextualFragment(infoBoxHtml), paidAdvancedFiltersContainer.nextElementSibling);
        }
    } else if (containerElement) {
        // Fallback se o contêiner de filtros avançados não for encontrado, insere no início da aba
        containerElement.insertBefore(document.createRange().createContextualFragment(infoBoxHtml), containerElement.firstChild);
    }
}

function adicionarIndicadorArquivamento(ordensArquivadas, container) {
    // Remover indicador anterior se existir
    const indicadorExistente = container.querySelector('#indicador-arquivamento');
    if (indicadorExistente) {
        indicadorExistente.remove();
    }
    
    if (ordensArquivadas > 0) {
        const indicador = document.createElement('div');
        indicador.id = 'indicador-arquivamento';
        indicador.style.cssText = `
            background: #e8f5e8;
            border: 1px solid #4caf50;
            border-radius: 6px;
            padding: 12px 16px;
            margin-bottom: 15px;
            font-size: 14px;
            color: #2e7d32;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        
        indicador.innerHTML = `
            <span>
                <strong>📁 ${ordensArquivadas}</strong> ordem(ns) paga(s) de meses anteriores arquivada(s)
                <small style="display: block; margin-top: 4px; opacity: 0.8;">
                    (Ordens pagas antes de ${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('pt-BR')})
                </small>
            </span>
            <button onclick="mostrarOrdensArquivadas()" style="
                background: #4caf50;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                transition: background 0.3s;
            " onmouseover="this.style.background='#45a049'" onmouseout="this.style.background='#4caf50'">
                  ️ Ver Arquivadas
            </button>
        `;
        
        // --- CORREÇÃO AQUI ---
        // Vamos tentar encontrar o título da aba ou o primeiro div/h2 dentro do container
        // que seja um filho direto, para ter um ponto de inserção consistente.
        // O `container` aqui é a própria aba (ex: #paidTab).
        let referenceElementForInsertion = container.querySelector('h2') || // Tenta encontrar o h2 (título da aba)
                                           container.querySelector('div.filters-container') || // Tenta o contêiner de filtros
                                           container.querySelector('div.export-buttons-container') || // Tenta o contêiner de botões de exportação
                                           container.querySelector('div[style*="overflow-x: auto;"]') || // Tenta div de overflow
                                           container.querySelector('table') || // Tenta a própria tabela
                                           container.firstChild; // Último recurso: o primeiro filho do container
        
        // O importante é que `referenceElementForInsertion` seja um filho direto de `container`.
        // Se `container` não tem filhos ou só tem nós de texto, `firstChild` pode ser nulo.
        // Se `referenceElementForInsertion` for nulo, `insertBefore` falhará.
        
        if (referenceElementForInsertion) {
            container.insertBefore(indicador, referenceElementForInsertion);
        } else {
            // Fallback: se não encontrou nenhum elemento de referência, adiciona no final do container.
            // Isso evita o erro `insertBefore` mas o posicionamento pode não ser ideal.
            container.appendChild(indicador);
        }
        // --- FIM CORREÇÃO ---
    }
}

// Sistema de Histórico para Salários/Auxílios - Versão Compacta Otimizada
(function() {
    const STORAGE_KEY = 'salaryHistorySpecific'; // Chave diferente para não misturar com outros históricos
    const MAX_ITEMS = 10; // Reduzido para 10 itens por campo
    const fieldsToMonitor = [
        { sel: '#salaryFavoredName, #editSalaryFavoredName', name: 'favoredName' },
        { sel: '#salaryBank, #editSalaryBank', name: 'bank' },
        { sel: '#salaryAgency, #editSalaryAgency', name: 'agency' },
        { sel: '#salaryAccount, #editSalaryAccount', name: 'account' },
        { sel: '#salaryOperation, #editSalaryOperation', name: 'operationNumber' },
        { sel: '#salaryProcess, #editSalaryProcess', name: 'process' },
        { sel: '#salaryValue, #editSalaryValue', name: 'value' }
    ];

    // Carregar/Salvar histórico
    const loadHistory = () => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch (e) {
            console.error("Erro ao carregar histórico:", e);
            return {};
        }
    };
    const saveHistory = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    
    // Adicionar termo ao histórico
    const addToHistory = (field, term) => {
        term = term.trim();
        if (!term || term.length < 2) return;
        
        const history = loadHistory();
        if (!history[field]) history[field] = [];
        
        // Remove item duplicado e adiciona no início
        history[field] = [term, ...history[field].filter(i => i !== term)].slice(0, MAX_ITEMS);
        saveHistory(history);
    };
    
    // Criar o dropdown e anexar eventos
    const createDropdown = (inputElement, fieldName) => {
        const inputParent = inputElement.parentNode;
        
        // Evitar re-envolver o input se já foi processado
        if (inputElement.getAttribute('data-history-wrapped')) return;
        inputElement.setAttribute('data-history-wrapped', 'true');
        
        const container = document.createElement('div');
        container.className = 'salary-history-container'; // <--- ADICIONE ESTA LINHA
        container.style.cssText = 'position:relative;width:100%;';
        
        // Inserir o container antes do input
        inputParent.insertBefore(container, inputElement);
        // Mover o input para dentro do container
        container.appendChild(inputElement);
        
        const dropdown = document.createElement('div');
        dropdown.className = 'salary-history-dropdown'; // Para estilos CSS
        dropdown.style.cssText = `
            position:absolute;top:100%;left:0;right:0;background:white;
            border:1px solid #28a745;border-top:none;border-radius:0 0 4px 4px;
            box-shadow:0 2px 8px rgba(40,167,69,0.2);max-height:150px;
            overflow-y:auto;z-index:1000;display:none;
        `;
        container.appendChild(dropdown);
        
        // Mostrar histórico no dropdown
        const showHistory = () => {
            const currentInputValue = inputElement.value.trim().toLowerCase();
            const history = loadHistory()[fieldName] || [];
            const filtered = history.filter(item => item.toLowerCase().includes(currentInputValue)).slice(0, 8);
            
            if (filtered.length === 0) {
                dropdown.style.display = 'none';
                return;
            }
            
            dropdown.innerHTML = `
                <div style="padding:6px 10px;background:#28a745;color:white;font-size:11px;font-weight:bold;display:flex;justify-content:space-between;align-items:center;">
                    <span>💰 Histórico (${filtered.length} itens)</span>
                    <button style="background:none;border:none;color:white;cursor:pointer;font-size:10px;" onclick="
                        if(confirm('Limpar histórico deste campo?')){
                            const h = loadHistory();
                            delete h['${fieldName}'];
                            saveHistory(h);
                            this.closest('.salary-history-dropdown').style.display='none';
                        }
                    ">🗑️</button>
                </div>
                ${filtered.map(item => `
                    <div style="padding:8px 10px;cursor:pointer;border-bottom:1px solid #f0f0f0;font-size:13px;transition:background 0.2s;display:flex;justify-content:space-between;align-items:center;" 
                         onmouseover="this.style.background='#d4edda'" 
                         onmouseout="this.style.background='white'"
                         onclick="
                            const targetInput = this.closest('.salary-history-container').querySelector('input');
                            targetInput.value='${item.replace(/'/g, "\'") }';
                            targetInput.dispatchEvent(new Event('input', {bubbles:true}));
                            targetInput.dispatchEvent(new Event('change', {bubbles:true}));
                            this.closest('.salary-history-dropdown').style.display='none';
                            targetInput.focus();
                         ">
                        <span>${item}</span>
                        <button style="background:none;border:none;color:#999;cursor:pointer;font-size:10px;opacity:0.6;" 
                            onclick="event.stopPropagation();
                            const h = loadHistory();
                            h['${fieldName}'] = h['${fieldName}'].filter(i => i !== '${item.replace(/'/g, "\'") }');
                            saveHistory(h);
                            this.parentElement.remove();
                            if(h['${fieldName}'].length === 0) dropdown.style.display = 'none';
                            else showHistory(); // Atualiza a lista após remover
                        ">✕</button>
                    </div>
                `).join('')}
            `;
            dropdown.style.display = 'block';
        };
        
        // Eventos
        inputElement.addEventListener('input', showHistory);
        inputElement.addEventListener('focus', showHistory);
        inputElement.addEventListener('blur', () => setTimeout(() => dropdown.style.display = 'none', 150));
        inputElement.addEventListener('change', () => addToHistory(fieldName, inputElement.value.trim()));
        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && inputElement.value.trim()) {
                addToHistory(fieldName, inputElement.value.trim());
                dropdown.style.display = 'none';
            } else if (e.key === 'Escape') {
                dropdown.style.display = 'none';
            }
        });

        // Indicador visual
        inputElement.style.borderLeft = '3px solid #28a745';
        inputElement.style.paddingLeft = '5px'; // Ajuste para a borda
        inputElement.title = 'Campo com histórico de preenchimento ativo para Salários/Auxílios';
    };
    
    // Configurar campos
    const setupSpecificFields = () => {
        let configuredCount = 0;
        fieldsToMonitor.forEach(fieldConfig => {
            document.querySelectorAll(fieldConfig.sel).forEach(input => {
                // Verificar se o input está visível e não foi configurado ainda
                if (input.offsetParent !== null && !input.hasAttribute('data-history-setup')) {
                    createDropdown(input, fieldConfig.name);
                    input.setAttribute('data-history-setup', 'true');
                    configuredCount++;
                }
            });
        });
        if (configuredCount > 0) {
            console.log(`✅ ${configuredCount} campos de Salários/Auxílios configurados com histórico.`);
        }
    };
    
    // Inicializar e monitorar dinamicamente
    setupSpecificFields();
    setInterval(setupSpecificFields, 2000); // Re-verifica campos a cada 2 segundos para elementos dinâmicos
    
    // Adicionar estilos CSS (se necessário)
    const styleId = 'salary-history-styles-compact';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .salary-history-dropdown::-webkit-scrollbar { width: 6px; }
            .salary-history-dropdown::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px; }
            .salary-history-dropdown::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 3px; }
            .salary-history-dropdown::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
        `;
        document.head.appendChild(style);
    }
    
    // Funções globais de utilidade
    window.clearSalaryHistory = () => {
        if (confirm('Limpar todo o histórico de pesquisa de Salários/Auxílios?')) {
            localStorage.removeItem(STORAGE_KEY);
            alert('✅ Histórico limpo!');
            // Opcional: remover o atributo data-history-setup para reconfigurar os campos
            document.querySelectorAll('[data-history-setup="true"]').forEach(el => el.removeAttribute('data-history-setup'));
            document.querySelectorAll('[data-history-wrapped="true"]').forEach(el => el.removeAttribute('data-history-wrapped'));
            setupSpecificFields(); // Re-configura para limpar dropdowns
        }
    };
    window.showSalaryHistoryStats = () => {
        const history = loadHistory();
        console.log('📊 Estatísticas do Histórico de Salários/Auxílios:');
        Object.keys(history).forEach(field => {
            console.log(`  ${field}: ${history[field].length} itens`);
        });
        return history;
    };

    console.log('Sistema de histórico para Salários/Auxílios inicializado com sucesso!');
})();



// Função para alternar visualização das ordens arquivadas
function mostrarOrdensArquivadas() {
    const ordensArquivadas = document.querySelectorAll('[data-arquivada="true"]');
    const botao = document.querySelector('#indicador-arquivamento button');
    
    if (ordensArquivadas.length === 0) return;
    
    const primeiraArquivada = ordensArquivadas[0];
    const estaOculta = primeiraArquivada.style.display === 'none';
    
    ordensArquivadas.forEach(linha => {
        if (estaOculta) {
            linha.style.display = '';
            linha.style.opacity = '0.6';
            linha.style.background = '#f5f5f5';
        } else {
            linha.style.display = 'none';
            linha.style.opacity = '1';
            linha.style.background = '';
        }
    });
    
    if (botao) {
        botao.innerHTML = estaOculta ? 
            '✖️ Ocultar Arquivadas' : 
            '👁️ Ver Arquivadas';
        botao.style.background = estaOculta ? '#ff9800' : '#4caf50';
    }
}


// Função para disparar eventos personalizados que o bot pode escutar (se necessário no futuro)
function dispatchOrderEvent(eventType, orderData, extraData = {}) {
    if (typeof CustomEvent === 'function') { // Garante compatibilidade
        const event = new CustomEvent(eventType, {
            detail: { order: orderData, ...extraData }
        });
        document.dispatchEvent(event);
        console.log(`📡 [Sistema] Evento disparado: ${eventType} para ordem ${orderData.id}`);
    } else {
        console.warn(`⚠️ [Sistema] CustomEvent não suportado. Evento ${eventType} não disparado.`);
    }
}

// Função para notificar o bot sobre nova ordem de emergência
function notifyBotNewEmergencyOrder(order) {
    if (order.priority?.toLowerCase() === 'emergencia' || order.priority?.toLowerCase() === 'emergência') {
        // Notifica através do WhatsAppScheduler
        // CORRIGIDO: Chamar a instância global do scheduler e o método correto.
        if (window.whatsappScheduler && typeof window.whatsappScheduler.notifyNewEmergencyOrder === 'function') {
            window.whatsappScheduler.notifyNewEmergencyOrder(order);
        } else {
            console.warn('⚠️ [Sistema] whatsappScheduler.notifyNewEmergencyOrder não disponível para notificar nova emergência.');
        }
        
        // Notifica administradores via WhatsAppBotIntegration (se o bot estiver inicializado)
        // Se window.whatsappBotIntegration for undefined ou não inicializado, este warning aparecerá.
        if (window.whatsappBotIntegration && window.whatsappBotIntegration.isInitialized && typeof window.whatsappBotIntegration.sendAdminNotification === 'function') {
            const adminMessage = `🚨 **NOVA EMERGÊNCIA CADASTRADA**\n\n` +
                               `**ID:** ${order.id}\n` +
                               `**Favorecido:** ${order.favoredName}\n` +
                               `**Valor:** R$ ${parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                               `**Solicitante:** ${order.solicitant}\n\n` +

            window.whatsappBotIntegration.sendAdminNotification(adminMessage);
        } else {
            console.warn('⚠️ [Sistema] WhatsAppBotIntegration ou sendAdminNotification não disponíveis para notificar admin sobre nova emergência.');
        }
    }
}

// wscheduler.js (ou onde a função notifyBotStatusChange está definida)
function notifyBotStatusChange(order, oldStatus, newStatus, actorName = 'Sistema', reason = null, proofLink = null, groupEmergencyNotificationSent = false) {
    // Dispara evento para o bot escutar
    // Dentro de notifyBotStatusChange
    if (typeof dispatchOrderEvent === 'function') {
        dispatchOrderEvent('orderStatusChanged', order, { oldStatus, newStatus, actorName, reason, proofLink }); 
    }
    // Notificações específicas baseadas no status
    // Garante que o whatsappBotIntegration esteja inicializado e os comandos do bot disponíveis
    if (window.whatsappBotIntegration && window.whatsappBotIntegration.isInitialized && typeof window.WhatsAppBotCommands !== 'undefined') {
        let message = '';
        let targetPhone = null; // Telefone padrão para o solicitante, se aplicável
        // marinaPhone não será mais usado diretamente aqui para evitar confusão

        // 1. Tenta encontrar o telefone do solicitante (para notificações gerais)
        if (order.solicitant) {
            targetPhone = findContactPhoneByName(order.solicitant, 'solicitante');
        }

        // --- Lógica para Notificações de Status ---
        // Se a ordem foi paga, a notificação é tratada separadamente e não precisa de outras mensagens de status
        if (newStatus === 'Paga') {
             if (window.whatsappScheduler && typeof window.whatsappScheduler.notifyPaymentCompleted === 'function') {
                 window.whatsappScheduler.notifyPaymentCompleted(order, proofLink);
                 console.log(`🤖 [Bot Integration] Notificação de pagamento para ${order.favoredName} tratada por WhatsAppScheduler.`);
                 return; // Já foi notificado, sai da função
             }
        }

        switch (newStatus) {
            case 'Aguardando Financeiro': // Notificação para o solicitante quando a Diretoria aprova
                message = `✅ **ORDEM APROVADA PELA DIRETORIA**\n\n` +
                         `**ID:** ${order.id}\n` +
                         `**Favorecido:** ${order.favoredName}\n` +
                         `**Valor:** R$ ${parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
                         `Sua ordem foi aprovada pela Diretoria (${actorName}) e segue para análise financeira.`;
                // Envia para o solicitante
                if (message && targetPhone) {
                    window.WhatsAppBotCommands.sendNotification(targetPhone, message);
                    console.log(`🤖 [Bot Integration] Notificação de status '${newStatus}' para solicitante ${order.solicitant} (${targetPhone}).`);
                } else if (message) {
                    console.warn(`⚠️ [Bot Integration] Não foi possível encontrar telefone para solicitante '${order.solicitant}' para notificação de status '${newStatus}'.`);
                }
                break;
                
            case 'Pendente': // Notificação para o solicitante quando a ordem é rejeitada e retorna a Pendente
            case 'Rejeitada': // Se o fluxo explícita Rejeitada
                message = `❌ **ORDEM REJEITADA**\n\n` +
                         `**ID:** ${order.id}\n` +
                         `**Favorecido:** ${order.favoredName}\n` +
                         `**Perfil:** ${actorName}\n` +
                         `**Motivo:** ${reason || 'Não especificado'}\n\n` +
                         `Entre em contato para mais informações.`;
                // Envia para o solicitante
                if (message && targetPhone) {
                    window.WhatsAppBotCommands.sendNotification(targetPhone, message);
                    console.log(`🤖 [Bot Integration] Notificação de status '${newStatus}' para solicitante ${order.solicitant} (${targetPhone}).`);
                } else if (message) {
                    console.warn(`⚠️ [Bot Integration] Não foi possível encontrar telefone para solicitante '${order.solicitant}' para notificação de status '${newStatus}'.`);
                }
                break;
                
            case 'Aguardando Pagamento': // FINANCEIRO APROVA -> ORDEM VAI PARA PENDENTES PAGAMENTO
                // 1. Notificação para o SOLICITANTE (informando que a ordem foi aprovada para pagamento)
                let messageToSolicitant = `💳 **ORDEM LIBERADA PARA PAGAMENTO**\n\n` +
                                           `**ID:** ${order.id}\n` +
                                           `**Favorecido:** ${order.favoredName}\n` +
                                           `**Valor:** R$ ${parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
                                           `Sua ordem foi liberada pelo Financeiro (${actorName}) e está na fila de pagamento.`;
                if (messageToSolicitant && targetPhone) {
                    window.WhatsAppBotCommands.sendNotification(targetPhone, messageToSolicitant);
                    console.log(`🤖 [Bot Integration] Notificação para solicitante ${order.solicitant} (${targetPhone}) sobre 'Aguardando Pagamento'.`);
                } else if (messageToSolicitant) {
                    console.warn(`⚠️ [Bot Integration] Não foi possível encontrar telefone para solicitante '${order.solicitant}' para notificação 'Aguardando Pagamento'.`);
                }

                // 2. Notificação ESPECÍFICA e PRIORITÁRIA para MARINA (se a ordem for de emergência e direcionada a ela)
                // ENVIAR SOMENTE SE A NOTIFICAÇÃO DE GRUPO JÁ NÃO FOI ENVIADA.
                if (!groupEmergencyNotificationSent && (order.priority?.toLowerCase() === 'emergencia' || order.priority?.toLowerCase() === 'emergência') && order.direction === 'Marina') {
                    if (window.whatsappScheduler && typeof window.whatsappScheduler.notifyEmergencyOrdersToMarina === 'function') {
                         window.whatsappScheduler.notifyEmergencyOrdersToMarina(order); // Passa a ordem para o scheduler
                         console.log(`   [Bot Integration] Notificação de EMERGÊNCIA ESPECÍFICA para Marina tratada por WhatsAppScheduler.`);
                    } else { // Fallback se a função não existir ou o scheduler não estiver pronto
                        console.warn(`⚠️ [Bot Integration] Ordem de emergência para Marina (${order.id}), mas whatsappScheduler.notifyEmergencyOrdersToMarina não disponível.`);
                        // Se quiser um fallback para enviar diretamente aqui, adicione. Mas o ideal é que o scheduler a trate.
                    }
                } else if (groupEmergencyNotificationSent && (order.priority?.toLowerCase() === 'emergencia' || order.priority?.toLowerCase() === 'emergência') && order.direction === 'Marina') {
                    console.log(`ℹ️ [Bot Integration] Ordem de emergência para Marina (${order.id}) aprovada pelo Financeiro. Notificação específica para Marina PULADA porque a notificação de grupo JÁ FOI ENVIADA.`);
                }
                break;
            // Outros status podem ser adicionados conforme necessário
        }
    }
}

// Função auxiliar para encontrar o telefone de um contato pelo nome e papel
function findContactPhoneByName(contactName, role = null) {
    // É crucial que 'window.whatsappBot' e 'window.whatsappBot.userPINs' estejam populados
    // Isso acontece na inicialização do seu WhatsApp Bot Integration
    if (!window.whatsappBot || !window.whatsappBot.userPINs) {
        console.warn('⚠️ [Bot Integration] whatsappBot ou userPINs não disponíveis para encontrar contato.');
        return null;
    }
    
    const normalizedName = contactName.toLowerCase().trim();
    
    for (const pin in window.whatsappBot.userPINs) {
        const userData = window.whatsappBot.userPINs[pin];
        const userName = userData.name.toLowerCase().trim();
        
        // Verifica se o papel é especificado e se corresponde
        if (role && userData.role.toLowerCase() !== role.toLowerCase()) {
            continue;
        }

        // Verifica se o nome do contato está contido no nome buscado (ou vice-versa para flexibilidade)
        if (normalizedName.includes(userName) || userName.includes(normalizedName)) {
            return userData.phone;
        }
    }
    return null;
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

async function handleFavoredNameSuggestions(favoredName) {
    const processDatalist = document.getElementById('favoredProcessSuggestions'); // O datalist para sugestões de processo
    const paymentTypeSelect = document.getElementById('paymentType');             // O select para tipo de pagamento
    const pixKeyTypeSelect = document.getElementById('pixKeyType');               // O select para Tipo da Chave PIX
    const pixKeyInput = document.getElementById('pixKey');                        // O input para Chave PIX

    // Limpa sugestões antigas e campos PIX por padrão ANTES de buscar novas
    if (processDatalist) processDatalist.innerHTML = '';
    if (pixKeyTypeSelect) pixKeyTypeSelect.value = '';
    if (pixKeyInput) pixKeyInput.value = '';

    // Se o nome favorecido estiver vazio, apenas limpa e reseta
    if (!favoredName) {
        if (paymentTypeSelect) paymentTypeSelect.value = '';
        showPaymentFields(); // Reseta a visibilidade dos campos de pagamento
        return;
    }

    try {
        // Faz a requisição para a API PHP para obter sugestões
        const response = await fetch(`${API_BASE_URL}/get_favored_suggestions.php?favoredName=${encodeURIComponent(favoredName)}`);
        
        // Verifica se a requisição foi bem-sucedida
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro HTTP ao buscar sugestões:', response.status, response.statusText, errorText);
            return;
        }

        const data = await response.json(); // Converte a resposta para JSON
        
        if (data.success) {
            // 1. Popular o Datalist de Processos (se houver sugestões de processo)
            if (processDatalist && data.processes && Array.isArray(data.processes)) {
                processDatalist.innerHTML = ''; // Limpa o datalist antes de adicionar
                data.processes.forEach(process => {
                    const option = document.createElement('option');
                    option.value = process;
                    processDatalist.appendChild(option);
                });
            }

            // 2. Preencher o Tipo de Pagamento sugerido (se houver sugestão)
            if (paymentTypeSelect && data.suggestedPaymentType) {
                paymentTypeSelect.value = data.suggestedPaymentType;
                showPaymentFields(); // Atualiza a visibilidade dos campos específicos (PIX/Boleto/Outros)

                // 3. Se o tipo sugerido for PIX, preencher os detalhes da chave PIX
                if (data.suggestedPaymentType === 'PIX') {
                    if (pixKeyTypeSelect && data.suggestedPixKeyType) {
                        pixKeyTypeSelect.value = data.suggestedPixKeyType;
                    }
                    if (pixKeyInput && data.suggestedPixKey) {
                        pixKeyInput.value = data.suggestedPixKey;
                    }
                }
            } else if (paymentTypeSelect) {
                // Se não houver tipo de pagamento sugerido, limpa o campo
                paymentTypeSelect.value = '';
                showPaymentFields(); // Esconde os campos específicos
                // Garante que os campos PIX também sejam limpos
                if (pixKeyTypeSelect) pixKeyTypeSelect.value = '';
                if (pixKeyInput) pixKeyInput.value = '';
            }
        } else {
            console.warn('Erro ao buscar sugestões do favorecido:', data.error);
        }
    } catch (error) {
        console.error('Erro na requisição ou processamento de sugestões:', error);
    }
}
