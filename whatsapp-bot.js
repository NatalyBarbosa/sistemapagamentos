/*console.log("DEBUG: whatsapp-bot.js loaded.");

// ===== CENTRAL DE CONSULTAS WHATSAPP - ORDEM DE PAGAMENTO =====
// 🤖 Bot inteligente para consulta de ordens de pagamento via WhatsApp
// 📋 Autenticação por PIN e navegação por menus numerados (APENAS CONSULTA)

class WhatsAppBot {
    // Armazena a instância única do bot (singleton)
    static instance = null; 

    constructor(whatsAppIntegrationInstance) {
        console.log('🤖 [WhatsApp Bot] Constructor called.');
        this.whatsAppIntegration = whatsAppIntegrationInstance;
        this.activeSessions = new Map(); // Key: phoneNumber, Value: sessionData
        this.userPINs = this.loadUserPINs(); // Carrega PINs dos usuários
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutos em millisegundos
        this._isInitialized = false; // <<< NOVO: Flag interna para controlar a inicialização da instância >>>
        
        console.log('🤖 [WhatsApp Bot] Central de Consultas inicializada (somente consulta). Constructor finished.');
        // Removido this.startSessionCleanup(); daqui. Será chamado por this.initialize().
    }

    // <<< NOVO: Método de inicialização da instância (chamado uma vez para configurar o bot) >>>
    async initialize() {
        if (this._isInitialized) {
            console.warn('🤖 [WhatsApp Bot] A instância já está inicializada.');
            return true;
        }
        
        console.log('⚙️ [WhatsApp Bot] Iniciando setup da instância do bot...');
        // Iniciar a limpeza de sessões apenas APÓS a inicialização completa
        this.startSessionCleanup(); // <<< AGORA CHAMADO AQUI >>>
        
        this._isInitialized = true; // Define a flag como true após o setup
        console.log('✅ [WhatsApp Bot] Setup da instância do bot concluído. _isInitialized:', this._isInitialized);
        return true;
    }

    // ==============================================================================================================
    // CONFIGURAÇÃO DE USUÁRIOS E PINs
    // ==============================================================================================================
    loadUserPINs() {
        // Os permissions aqui são mais para documentação, o bot não executará ações.
        return {
            // PIN: { name, phone, role }
            '1234': { name: 'Rafael Sayd', phone: '5575992291117', role: 'solicitante' }, // Usando seu número para teste
            '5678': { name: 'Verônica Barbosa', phone: '5575997071069', role: 'solicitante' },
            '9012': { name: 'Lucas Silva', phone: '5575991602372', role: 'solicitante' },
            '3456': { name: 'Rafael Sagrilo', phone: '5575992601299', role: 'solicitante' },
            '7890': { name: 'Djael Jr', phone: '5575992291117', role: 'diretoria' }, // Usando seu número para teste
            '2468': { name: 'Nataly', phone: '5574981287058', role: 'diretoria' },
            '1357': { name: 'Tiago Santana', phone: '5575992291117', role: 'financeiro' }, // Usando seu número para teste
            '9753': { name: 'Marina', phone: '5575999154101', role: 'pagador' }
        };
    }

    // ==============================================================================================================
    // GERENCIAMENTO DE SESSÕES
    // ==============================================================================================================
    createSession(phoneNumber, userData) {
        const session = {
            user: userData,
            loginTime: new Date(),
            lastActivity: new Date(),
            currentMenu: 'main',
            menuHistory: [],
            tempData: {}
        };
        this.activeSessions.set(phoneNumber, session);
        return session;
    }

    getSession(phoneNumber) {
        const session = this.activeSessions.get(phoneNumber);
        if (session) {
            // Verifica se a sessão ainda é válida
            const now = new Date();
            if (now - session.lastActivity > this.sessionTimeout) {
                this.activeSessions.delete(phoneNumber);
                return null;
            }
            session.lastActivity = now; // Atualiza a atividade
        }
        return session;
    }

    endSession(phoneNumber) {
        this.activeSessions.delete(phoneNumber);
    }

    startSessionCleanup() {
        setInterval(() => {
            const now = new Date();
            for (const [phoneNumber, session] of this.activeSessions) {
                if (now - session.lastActivity > this.sessionTimeout) {
                    this.activeSessions.delete(phoneNumber);
                    console.log(`🕒 [WhatsApp Bot] Sessão expirada para ${phoneNumber}`);
                }
            }
        }, WHATSAPP_BOT_CONFIG.SESSION.CLEANUP_INTERVAL_MINUTES * 60 * 1000); // Verifica a cada 5 minutos
    }

    // ==============================================================================================================
    // PROCESSAMENTO DE MENSAGENS PRINCIPAIS
    // ==============================================================================================================
    async processMessage(phoneNumber, message) {
        console.log('⚙️ [WhatsApp Bot] processMessage chamado. Estado atual _isInitialized:', this._isInitialized); // NOVO LOG
        if (!this._isInitialized) { // <<< AGORA USAMOS A FLAG _isInitialized >>>
            console.warn('⚠️ [WhatsApp Bot] Sistema não inicializado. Mensagem ignorada.');
            return;
        }

        try {
            const normalizedMessage = message.trim().toLowerCase();
            console.log(`[WhatsApp Bot DEBUG] Processando mensagem: '${message}' de ${phoneNumber}`);
            const session = this.getSession(phoneNumber);

            // --- Se não há sessão ativa, solicita autenticação ---
            if (!session) {
                console.log(`[WhatsApp Bot DEBUG] Sessão inativa para ${phoneNumber}. Iniciando autenticação.`);
                return await this.handleAuthentication(phoneNumber, message);
            }
            console.log(`[WhatsApp Bot DEBUG] Sessão ativa para ${phoneNumber}. Menu atual: ${session.currentMenu}`);

            // --- Comandos Globais (funcionam a qualquer momento com sessão ativa) ---
            if (['sair', 'logout', 'exit'].includes(normalizedMessage)) {
                console.log(`[WhatsApp Bot DEBUG] Comando global 'sair' detectado.`);
                this.endSession(phoneNumber);
                return await this.sendMessage(phoneNumber, WHATSAPP_BOT_CONFIG.TEMPLATES.GOODBYE);
            }
            if (['ajuda', 'help'].includes(normalizedMessage)) {
                console.log(`[WhatsApp Bot DEBUG] Comando global 'ajuda' detectado.`);
                return await this.sendHelpMessage(phoneNumber);
            }
            if (['menu', 'inicio'].includes(normalizedMessage)) {
                console.log(`[WhatsApp Bot DEBUG] Comando global 'menu' detectado.`);
                session.currentMenu = 'main';
                session.menuHistory = []; // Limpa histórico para ir para o menu principal
                return await this.sendMainMenu(session);
            }
            if (normalizedMessage === '0' || ['voltar', 'back'].includes(normalizedMessage)) {
                console.log(`[WhatsApp Bot DEBUG] Comando global 'voltar/0' detectado.`);
                return await this.handleBackNavigation(session);
            }

            // --- REENGANAMENTO APRIMORADO: Se a sessão está ativa e a mensagem é genérica ---
            // Detecta se a mensagem é um número puro (para opções de menu) - CORRIGIDO O REGEX
            const isPureNumber = /^\d+$/.test(normalizedMessage);
            // Detecta se é um comando especial (ex: status OP-123)
            const isSpecialCommand = normalizedMessage.startsWith('status') || normalizedMessage.startsWith('saldo');
            // Detecta saudações comuns
            const isGenericGreeting = ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'e ai', 'iai', 'tudo bem', 'blz'].includes(normalizedMessage);

            // Se for um cumprimento genérico OU a mensagem não é um número puro E não é um comando especial
            // E o usuário não está em um menu onde se espera texto livre (como search_order)
            if (isGenericGreeting || (!isPureNumber && !isSpecialCommand && session.currentMenu !== 'search_order')) {
                console.log(`[WhatsApp Bot DEBUG] Mensagem '${message}' detectada como genérica/não numérica/comando especial. Reenviando menu principal.`);
                session.currentMenu = 'main'; // Garante que está no menu principal
                session.menuHistory = [];
                return await this.sendMainMenu(session);
            }
            // -- FIM REENGANAMENTO --

            // Processa navegação de menus (se a mensagem for um número ou um comando específico de menu)
            return await this.handleMenuNavigation(session, message);

        } catch (error) {
            console.error('❌ [WhatsApp Bot] Erro ao processar mensagem:', error);
            await this.sendMessage(phoneNumber, WHATSAPP_BOT_CONFIG.TEMPLATES.ERROR_GENERIC);
        }
    }

    // ==============================================================================================================
    // AUTENTICAÇÃO
    // ==============================================================================================================
    async handleAuthentication(phoneNumber, message) {
        const pin = message.trim();
        
        // Verifica se é um PIN válido (apenas números, 4 a 6 dígitos) - CORRIGIDO O REGEX
        if (!/^\d{4,6}$/.test(pin)) {
            return await this.sendMessage(phoneNumber, 
                WHATSAPP_BOT_CONFIG.TEMPLATES.WELCOME
            );
        }

        const userData = this.userPINs[pin];
        if (!userData) {
            return await this.sendMessage(phoneNumber, 
                WHATSAPP_BOT_CONFIG.TEMPLATES.INVALID_PIN
            );
        }

        // Verifica se o número de telefone corresponde ao usuário
        if (userData.phone !== phoneNumber) {
            return await this.sendMessage(phoneNumber, 
                '⚠️ **ACESSO NEGADO**\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                'Este PIN não está associado ao seu número de telefone.\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                'Entre em contato com a administração para verificação.'
            );
        }

        // Cria sessão e envia menu principal
        const session = this.createSession(phoneNumber, userData);
        
        await this.sendMessage(phoneNumber, 
            `✅ **AUTENTICADO COM SUCESSO**\n\n` + // CORRIGIDO O ESCAPE DE NOVA LINHA
            `👤 **Usuário:** ${userData.name}\n` + // CORRIGIDO O ESCAPE DE NOVA LINHA
            `📋 **Perfil:** ${this.getRoleDisplayName(userData.role)}\n\n` + // CORRIGIDO O ESCAPE DE NOVA LINHA
            `🕒 Sessão válida por ${WHATSAPP_BOT_CONFIG.SESSION.TIMEOUT_MINUTES} minutos.\n\n` + // CORRIGIDO O ESCAPE DE NOVA LINHA
            `━━━━━━━━━━━━━━━━━━━━━`
        );

        return await this.sendMainMenu(session);
    }

    getRoleDisplayName(role) {
        const roles = {
            'solicitante': 'Solicitante',
            'diretoria': 'Diretoria',
            'financeiro': 'Financeiro',
            'pagador': 'Pagador'
        };
        return roles[role] || 'Usuário';
    }

    // ==============================================================================================================
    // MENUS PRINCIPAIS POR PERFIL (APENAS CONSULTA)
    // ==============================================================================================================
    async sendMainMenu(session) {
        const { user } = session;
        session.currentMenu = 'main';
        
        let menuText = `📋 **MENU PRINCIPAL - ${this.getRoleDisplayName(user.role).toUpperCase()}**\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        menuText += `Olá, ${user.name.split(' ')[0]}! Escolha uma opção:\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA

        switch (user.role) {
            case 'solicitante':
                menuText += 
                    '1️⃣ Minhas Ordens\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '2️⃣ Consultar Ordem Específica\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '3️⃣ Ordens Pendentes\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '4️⃣ Ordens Pagas\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '5️⃣ Emergências\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '6️⃣ Saldo Disponível\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '7️⃣ Relatórios\n\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
                break;

            case 'diretoria':
                menuText += 
                    '1️⃣ Ordens Pendentes de Aprovação\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '2️⃣ Relatório Diário\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '3️⃣ Valor Total Pendente\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '4️⃣ Top 5 Solicitantes\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '5️⃣ Todas as Ordens\n\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
                break;

            case 'financeiro':
                menuText += 
                    '1️⃣ Ordens Aguardando Análise\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '2️⃣ Fluxo de Caixa\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '3️⃣ Relatório Semanal\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '4️⃣ Todas as Ordens\n\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
                break;

            case 'pagador':
                menuText += 
                    '1️⃣ Fila de Pagamento\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '2️⃣ Próximos Vencimentos\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '3️⃣ Pagamentos de Hoje\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '4️⃣ Relatório\n\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
                break;
        }

        menuText += '0️⃣ Sair\n\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
        menuText += '━━━━━━━━━━━━━━━━━━━━━\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
        menuText += 'Digite o número da opção desejada:';

        return await this.sendMessage(session.user.phone, menuText);
    }

    // ==============================================================================================================
    // NAVEGAÇÃO DE MENUS
    // ==============================================================================================================
    async handleMenuNavigation(session, message) {
        const option = message.trim();
        const { user } = session;

        // Comandos de navegação (já tratados em processMessage, mas aqui para menus específicos)
        if (option === '0' || ['voltar', 'back'].includes(option.toLowerCase())) {
            return await this.handleBackNavigation(session);
        }
        if (option.toLowerCase() === 'menu') {
            session.currentMenu = 'main';
            session.menuHistory = [];
            return await this.sendMainMenu(session);
        }

        // Processa baseado no menu atual e perfil do usuário
        switch (session.currentMenu) {
            case 'main':
                return await this.handleMainMenuSelection(session, option);
            
            case 'my_orders':
            case 'order_list_filtered': 
            case 'pending_approval':
            case 'payment_queue':
                // Se o usuário digitou um número, assume que é para ver detalhes da ordem
                if (!isNaN(parseInt(option))) {
                    return await this.handleOrderListSelection(session, option); // Novo handler genérico para listas
                }
                break; 

            case 'order_details':
                return await this.handleOrderDetailsSelection(session, option);
            
            case 'search_order': // Estado para o usuário digitar o ID
                return await this.handleSpecificOrderSearch(session, option);

            default:
                // Se chegou aqui e não processou a opção, é inválida para o menu atual
                // ou o usuário está em um submenu que não tem opções numéricas e digitou algo inválido.
                return await this.sendMessage(session.user.phone, 
                    '❌ Opção inválida para o menu atual. Por favor, digite um número da lista, 0 para voltar, ou MENU para o principal.'
                );
        }
    }

    async handleBackNavigation(session) {
        if (session.menuHistory.length > 0) {
            session.currentMenu = session.menuHistory.pop();
        } else {
            session.currentMenu = 'main'; // Volta para o menu principal se não houver histórico
        }

        // Redireciona para o menu correto
        switch (session.currentMenu) {
            case 'main':
                return await this.sendMainMenu(session);
            case 'my_orders':
                return await this.sendMyOrders(session);
            case 'pending_approval':
                return await this.sendPendingApprovalOrders(session);
            case 'payment_queue':
                return await this.sendPaymentQueue(session);
            case 'order_list_filtered': 
                if (session.tempData.lastFilterType === 'status') {
                    return await this.sendOrdersByStatus(session, session.tempData.lastFilterValue);
                } else if (session.tempData.lastFilterType === 'emergency') {
                    return await this.sendEmergencyOrders(session);
                } else if (session.tempData.lastFilterType === 'pending_approval') {
                     return await this.sendPendingApprovalOrders(session);
                } else if (session.tempData.lastFilterType === 'awaiting_financial') {
                     return await this.sendAwaitingFinancialAnalysis(session);
                } else if (session.tempData.lastFilterType === 'payment_queue') {
                     return await this.sendPaymentQueue(session);
                }
                return await this.sendMainMenu(session); // Fallback
            default:
                // Fallback, caso o histórico esteja inconsistente
                session.currentMenu = 'main';
                return await this.sendMainMenu(session);
        }
    }

    // ==============================================================================================================
    // MANIPULAÇÃO DE SELEÇÃO EM LISTAS DE ORDEM (Handler Genérico)
    // ==============================================================================================================
    async handleOrderListSelection(session, option) {
        const orderIndex = parseInt(option) - 1;
        const orders = session.tempData.currentOrders; // Pega a lista de ordens do menu anterior

        if (!orders || orderIndex < 0 || orderIndex >= orders.length) {
            return await this.sendMessage(session.user.phone, 
                '❌ Número inválido. Digite um número válido da lista ou 0 para voltar.'
            );
        }

        const selectedOrder = orders[orderIndex];
        session.tempData.selectedOrder = selectedOrder; // Armazena a ordem selecionada
        session.menuHistory.push(session.currentMenu); // Adiciona o menu atual ao histórico
        session.currentMenu = 'order_details'; // Define o próximo menu

        return await this.sendOrderDetails(session, selectedOrder);
    }

    // ==============================================================================================================
    // MENU PRINCIPAL - SELEÇÕES POR PERFIL
    // ==============================================================================================================
    async handleMainMenuSelection(session, option) {
        const { user } = session;

        switch (user.role) {
            case 'solicitante':
                return await this.handleSolicitanteMainMenu(session, option);
            case 'diretoria':
                return await this.handleDiretoriaMainMenu(session, option);
            case 'financeiro':
                return await this.handleFinanceiroMainMenu(session, option);
            case 'pagador':
                return await this.handlePagadorMainMenu(session, option);
            default:
                return await this.sendMessage(session.user.phone, '❌ Perfil não reconhecido.');
        }
    }

    // ==============================================================================================================
    // SOLICITANTE - MENUS (APENAS CONSULTA)
    // ==============================================================================================================
    async handleSolicitanteMainMenu(session, option) {
        session.menuHistory.push('main'); // Salva o menu principal no histórico

        switch (option) {
            case '1':
                session.currentMenu = 'my_orders';
                return await this.sendMyOrders(session);
            case '2':
                session.currentMenu = 'search_order';
                return await this.sendMessage(session.user.phone, 
                    '🔍 **CONSULTAR ORDEM ESPECÍFICA**\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    'Digite o ID da ordem (ex: OP-2024-001):'
                );
            case '3':
                return await this.sendOrdersByStatus(session, 'Pendente'); 
            case '4':
                return await this.sendOrdersByStatus(session, 'Paga');
            case '5':
                return await this.sendEmergencyOrders(session);
            case '6':
                return await this.sendAvailableBalance(session);
            case '7':
                return await this.sendReportsMenu(session);
            
            default:
                session.menuHistory.pop(); // Remove "main" do histórico se a opção for inválida
                return await this.sendMessage(session.user.phone, 
                    '❌ Opção inválida. Digite um número de 1 a 7, ou 0 para sair/voltar.'
                );
        }
    }

    async sendMyOrders(session) {
        try {
            const ordersSource = (typeof orders !== 'undefined' && Array.isArray(orders)) ? orders : [];
            const userOrders = ordersSource.filter(order => 
                order.solicitant === session.user.name || 
                (order.solicitant && session.user.name && order.solicitant.toLowerCase().includes(session.user.name.toLowerCase()))
            );

            if (userOrders.length === 0) {
                return await this.sendMessage(session.user.phone, 
                    '📋 **MINHAS ORDENS**\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '📄 Nenhuma ordem encontrada.\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '━━━━━━━━━━━━━━━━━━━━━\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '0️⃣ Voltar ao menu'
                );
            }

            const sortedOrders = this.sortOrdersForDisplay(userOrders);

            let message = `📋 **MINHAS ORDENS ATIVAS (${sortedOrders.length})**\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA

            sortedOrders.forEach((order, index) => {
                const value = parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2, 
                    style: 'currency', 
                    currency: 'BRL' 
                });
                
                const urgencyIcon = order.priority?.toLowerCase() === 'emergencia' || order.priority?.toLowerCase() === 'emergência' ? ' 🚨' : '';
                const statusIcon = this.getStatusIcon(order.status);
                
                let forecastInfo = '⏰ N/A';
                if (order.paymentForecast) {
                    const forecastDate = new Date(order.paymentForecast);
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    forecastDate.setHours(0,0,0,0);

                    if (forecastDate.getTime() === today.getTime()) {
                        forecastInfo = '⏰ VENCE HOJE';
                    } else if (forecastDate < today) {
                        forecastInfo = `⏰ VENCIDA em ${new Date(order.paymentForecast).toLocaleDateString('pt-BR')}`;
                    } else {
                        forecastInfo = `⏰ Vence: ${new Date(order.paymentForecast).toLocaleDateString('pt-BR')}`;
                    }
                }
                
                message += `${index + 1}️⃣ ${order.id} | ${value}${urgencyIcon}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                message += `   📦 ${order.favoredName}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                message += `   ${statusIcon} ${order.status} | ${forecastInfo}\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
            });

            const totalValue = sortedOrders.reduce((sum, order) => sum + parseFloat(order.paymentValue || 0), 0);
            message += '━━━━━━━━━━━━━━━━━━━━━\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
            message += `💰 **Total:** ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' })}\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
            message += 'Digite o **NÚMERO** da ordem para ver detalhes\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
            message += 'ou 0 para voltar ao menu.';

            session.tempData.currentOrders = sortedOrders;
            session.tempData.lastFilterType = 'my_orders';
            
            return await this.sendMessage(session.user.phone, message);

        } catch (error) {
            console.error('❌ [WhatsApp Bot] Erro ao buscar ordens do usuário:', error);
            return await this.sendMessage(session.user.phone, 
                '❌ Erro ao carregar suas ordens. Tente novamente.'
            );
        }
    }

    getStatusIcon(status) {
        const icons = {
            'Pendente': '📍',
            'Aguardando Financeiro': '📊',
            'Aguardando Pagamento': '💳',
            'Aguardando Diretoria': '👔',
            'Paga': '✅',
            'Rejeitada': '❌',
            'Cancelada': '🚫'
        };
        return icons[status] || '📄';
    }

    // ==============================================================================================================
    // DETALHES DA ORDEM (Consulta Apenas)
    // ==============================================================================================================
    async handleOrderDetailsSelection(session, option) {
        const selectedOrder = session.tempData.selectedOrder;
        if (!selectedOrder) {
            return await this.sendMessage(session.user.phone, '❌ Nenhuma ordem selecionada. Digite 0 para voltar.');
        }

        let optionsCount = 1; // 1 para Histórico Completo
        const paymentProofsCount = selectedOrder.payments ? selectedOrder.payments.filter(p => p.proofData).length : 0;
        const hasBoletoData = !!selectedOrder.boletoData;
        const totalAttachments = paymentProofsCount + (hasBoletoData ? 1 : 0);
        if (totalAttachments > 0) {
            optionsCount++; // +1 para Anexos se houver
        }
        optionsCount++; // +1 para Voltar para Lista

        switch (parseInt(option)) { // Converte option para número para comparação
            case 1: // Ver Histórico Completo
                return await this.sendOrderHistory(session, selectedOrder);
            case 2: 
                if (totalAttachments > 0) { // Se 2 é Anexos
                    return await this.sendOrderAttachments(session, selectedOrder);
                } else if (optionsCount === 2) { // Se 2 é Voltar para Lista
                    return await this.handleBackNavigation(session);
                }
                break;
            case 3: // Se 3 é Voltar para Lista (só acontece se houver Anexos)
                if (totalAttachments > 0 && optionsCount === 3) {
                    return await this.handleBackNavigation(session);
                }
                break;
            case 0: // Menu Principal
                session.menuHistory = [];
                session.currentMenu = 'main';
                return await this.sendMainMenu(session);
        }
        return await this.sendMessage(session.user.phone, '❌ Opção inválida. Digite um número válido, ou 0 para voltar.');
    }

    async handleSpecificOrderSearch(session, orderId) {
        const ordersSource = (typeof orders !== 'undefined' && Array.isArray(orders)) ? orders : [];
        const foundOrder = ordersSource.find(order => order.id.toLowerCase() === orderId.toLowerCase());

        if (!foundOrder) {
            return await this.sendMessage(session.user.phone, 
                `❌ Ordem com ID "${orderId}" não encontrada.\n\n` + // CORRIGIDO O ESCAPE DE NOVA LINHA
                'Verifique o ID e tente novamente, ou digite 0 para voltar.'
            );
        }

        // Permissão para consultar (Solicitante só pode consultar as próprias ordens)
        if (session.user.role === 'solicitante' && 
            !(foundOrder.solicitant === session.user.name || (foundOrder.solicitant && session.user.name && foundOrder.solicitant.toLowerCase().includes(session.user.name.toLowerCase())))) {
            return await this.sendMessage(session.user.phone, 
                '⚠️ Você não tem permissão para consultar esta ordem.\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                'Apenas ordens que você solicitou podem ser visualizadas.'
            );
        }

        session.tempData.selectedOrder = foundOrder;
        session.menuHistory.push('main'); // Coloca o main menu no histórico
        session.currentMenu = 'order_details'; // Define o próximo menu

        return await this.sendOrderDetails(session, foundOrder);
    }

    async sendOrderDetails(session, order) {
        const value = parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', { 
            minimumFractionDigits: 2, 
            style: 'currency', 
            currency: 'BRL' 
        });

        const urgencyText = order.priority?.toLowerCase() === 'emergencia' || order.priority?.toLowerCase() === 'emergência' ? 
            '🚨 **PRIORIDADE: EMERGÊNCIA**' : '';

        const creationDate = order.generationDate ? 
            new Date(order.generationDate).toLocaleDateString('pt-BR') + ' ' + 
            new Date(order.generationDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A';

        const forecastDate = order.paymentForecast ? 
            new Date(order.paymentForecast).toLocaleDateString('pt-BR') : 'N/A';

        // Detalhes de aprovação
        let approvalDetails = '';
        if (order.approvedByDiretoria) {
            approvalDetails += `✅ Aprovado por Diretoria em ${new Date(order.approvalDateDiretoria).toLocaleDateString('pt-BR')}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        }
        if (order.approvedByFinanceiro) {
            approvalDetails += `✅ Liberado por Financeiro em ${new Date(order.approvalDateFinanceiro).toLocaleDateString('pt-BR')}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        }
        if (order.status === 'Rejeitada' && order.rejectionReason) {
            approvalDetails += `❌ Rejeitado: ${order.rejectionReason}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        }


        let message = `📄 **DETALHES DA ORDEM ${order.id}**\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        if (urgencyText) message += urgencyText + '\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
        message += `━━━━━━━━━━━━━━━━━━━━━\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        message += `📦 **Favorecido:** ${order.favoredName}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        message += `💰 **Valor:** ${value}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        message += `📋 **Status:** ${order.status}\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        message += `📅 **Data Cadastro:** ${creationDate}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        message += `⏰ **Previsão Pagamento:** ${forecastDate}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        
        if (order.process) {
            message += `⚙️ **Processo:** ${order.process}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        }
        if (order.direction) {
            message += `➡ **Direcionamento:** ${order.direction}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        }
        if (order.solicitant) {
            message += `👤 **Solicitante:** ${order.solicitant}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        }
        if (order.reference) {
            message += `📝 **Referência:** ${order.reference}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        }
        if (order.observation) {
            message += `💬 **Observação:** ${order.observation}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        }

        if (approvalDetails) {
            message += '\n━━━━━━━━━━━━━━━━━━━━━\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
            message += approvalDetails;
        }

        message += '\n━━━━━━━━━━━━━━━━━━━━━\n\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA

        let optionsCount = 1;
        message += `${optionsCount}️⃣ Ver Histórico Completo\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        optionsCount++;

        // Verifica se há comprovantes de pagamento ou boleto anexado
        const paymentProofsCount = order.payments ? order.payments.filter(p => p.proofData).length : 0;
        const hasBoletoData = !!order.boletoData;
        const totalAttachments = paymentProofsCount + (hasBoletoData ? 1 : 0);

        if (totalAttachments > 0) {
            message += `${optionsCount}️⃣ Ver Anexos (${totalAttachments} arquivo${totalAttachments > 1 ? 's' : ''})\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
            optionsCount++;
        }
        
        message += `${optionsCount}️⃣ Voltar para Lista\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA // "Voltar para Lista" pode ser 2 ou 3
        message += '0️⃣ Menu Principal\n\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
        message += 'Digite o número:';

        return await this.sendMessage(session.user.phone, message);
    }
    
    async sendOrderHistory(session, order) {
        let message = `📜 **HISTÓRICO COMPLETO DA ORDEM ${order.id}**\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        
        // Histórico de status
        message += `**➡️ Fluxo de Aprovação:**\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        message += `   • Criada: ${new Date(order.generationDate).toLocaleDateString('pt-BR')} ${new Date(order.generationDate).toLocaleTimeString('pt-BR')}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        if (order.approvedByDiretoria && order.approvalDateDiretoria) {
            message += `   • Aprovada Diretoria: ${new Date(order.approvalDateDiretoria).toLocaleDateString('pt-BR')} ${new Date(order.approvalDateDiretoria).toLocaleTimeString('pt-BR')}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        }
        if (order.approvedByFinanceiro && order.approvalDateFinanceiro) {
            message += `   • Liberada Financeiro: ${new Date(order.approvalDateFinanceiro).toLocaleDateString('pt-BR')} ${new Date(order.approvalDateFinanceiro).toLocaleTimeString('pt-BR')}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        }
        if (order.paymentCompletionDate) {
            message += `   • Paga: ${new Date(order.paymentCompletionDate).toLocaleDateString('pt-BR')} ${new Date(order.paymentCompletionDate).toLocaleTimeString('pt-BR')}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        }
        if (order.status === 'Rejeitada' && order.rejectionReason) {
             message += `   • Rejeitada: ${order.rejectionReason}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        }
        message += '\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA

        // Histórico de Pagamentos (se houver parcelas ou múltiplos pagamentos)
        if (order.payments && order.payments.length > 0) {
            message += `**💰 Histórico de Pagamentos (${order.payments.length}):**\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
            order.payments.forEach((payment, index) => {
                message += `   • Pagamento ${index + 1}: R$ ${parseFloat(payment.amount || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})} em ${new Date(payment.date).toLocaleDateString('pt-BR')}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                if (payment.description) {
                    message += `     Descrição: ${payment.description}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                }
            });
            message += '\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
        } else {
             message += `💰 *Nenhum pagamento registrado ainda.*\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        }

        message += '━━━━━━━━━━━━━━━━━━━━━\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
        message += '1️⃣ Voltar para Detalhes\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
        message += '0️⃣ Menu Principal';

        session.menuHistory.push('order_details'); // Retorna para detalhes da ordem
        session.currentMenu = 'order_history'; // Menu temporário para histórico
        
        return await this.sendMessage(session.user.phone, message);
    }

    async sendOrderAttachments(session, order) {
        let message = `📎 **ANEXOS DA ORDEM ${order.id}**\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        const attachmentsToSend = [];

        // Boleto anexado
        if (order.boletoData) {
            message += `• Boleto da Ordem\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
            attachmentsToSend.push({ type: 'file', data: order.boletoData, name: order.boletoFileName || `boleto_${order.id}.pdf` });
        }

        // Comprovantes de pagamento
        if (order.payments && order.payments.length > 0) {
            order.payments.forEach((payment, index) => {
                if (payment.proofData) {
                    message += `• Comprovante Pagamento ${index + 1}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                    attachmentsToSend.push({ type: 'file', data: payment.proofData, name: payment.proofFileName || `comprovante_${order.id}_${index+1}.pdf` });
                }
            });
        }

        if (attachmentsToSend.length === 0) {
            message += `*Nenhum anexo encontrado para esta ordem.*\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        } else {
             message += `_Os arquivos serão enviados separadamente após esta mensagem._\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
        }

        message += '━━━━━━━━━━━━━━━━━━━━━\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
        message += '1️⃣ Voltar para Detalhes\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
        message += '0️⃣ Menu Principal';

        // Envia a mensagem de texto primeiro
        await this.sendMessage(session.user.phone, message);

        // Envia os anexos individualmente
        for (const attachment of attachmentsToSend) {
            try {
                 await this.whatsAppIntegration.sendMedia(
                    { name: session.user.name, phone: session.user.phone }, // Destinatário
                    attachment.data, // base64
                    attachment.type === 'file' ? 'document' : 'image', // type
                    attachment.name // filename
                 );
                 console.log(`✅ Anexo ${attachment.name} enviado para ${session.user.phone}`);
            } catch (error) {
                console.error(`❌ Erro ao enviar anexo ${attachment.name}:`, error);
                await this.sendMessage(session.user.phone, `❌ Erro ao enviar o arquivo ${attachment.name}.`);
            }
        }
        
        session.menuHistory.push('order_details');
        session.currentMenu = 'order_attachments'; // Menu temporário
        return; 
    }


    // ==============================================================================================================
    // DIRETORIA - MENUS (APENAS CONSULTA)
    // ==============================================================================================================
    async handleDiretoriaMainMenu(session, option) {
        session.menuHistory.push('main');

        switch (option) {
            case '1':
                session.currentMenu = 'pending_approval';
                return await this.sendPendingApprovalOrders(session);
            
            case '2':
                return await this.sendDailyReport(session);
            
            case '3':
                return await this.sendTotalPendingValue(session);
            
            case '4':
                return await this.sendTopRequesters(session);
            
            case '5':
                return await this.sendAllOrdersMenu(session);
            
            default:
                session.menuHistory.pop();
                return await this.sendMessage(session.user.phone, 
                    '❌ Opção inválida. Digite um número de 1 a 5, ou 0 para sair/voltar.'
                );
        }
    }

    async sendPendingApprovalOrders(session) {
        try {
            const ordersSource = (typeof orders !== 'undefined' && Array.isArray(orders)) ? orders : [];
            const pendingOrders = ordersSource.filter(order => order.status === 'Pendente'); // Apenas as Pendentes de Diretoria

            if (pendingOrders.length === 0) {
                return await this.sendMessage(session.user.phone, 
                    '⏳ **PENDENTES DE APROVAÇÃO**\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '✅ Nenhuma ordem pendente de aprovação.\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '━━━━━━━━━━━━━━━━━━━━━\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '0️⃣ Voltar ao menu'
                );
            }

            const sortedOrders = this.sortOrdersForDisplay(pendingOrders);

            let message = `⏳ **PENDENTES DE APROVAÇÃO (${sortedOrders.length})**\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA

            sortedOrders.forEach((order, index) => {
                const value = parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2, 
                    style: 'currency', 
                    currency: 'BRL' 
                });
                
                const urgencyIcon = order.priority?.toLowerCase() === 'emergencia' || order.priority?.toLowerCase() === 'emergência' ? ' 🚨' : '';
                
                const timeAgo = this.getTimeAgo(order.generationDate);

                message += `${index + 1}️⃣ ${order.id} | ${value}${urgencyIcon}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                message += `   📦 ${order.favoredName}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                message += `   👤 ${order.solicitant}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                message += `   ⏰ Cadastrada ${timeAgo}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                message += '\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
            });

            const totalValue = sortedOrders.reduce((sum, order) => sum + parseFloat(order.paymentValue || 0), 0);
            message += '━━━━━━━━━━━━━━━━━━━━━\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
            message += `💰 **Total Aguardando:** ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' })}\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
            message += 'Digite o **NÚMERO** para ver detalhes (aprovação via web) ou 0 para voltar.';

            session.tempData.currentOrders = sortedOrders;
            session.tempData.lastFilterType = 'pending_approval';
            
            return await this.sendMessage(session.user.phone, message);

        } catch (error) {
            console.error('❌ [WhatsApp Bot] Erro ao buscar ordens pendentes:', error);
            return await this.sendMessage(session.user.phone, 
                '❌ Erro ao carregar ordens pendentes. Tente novamente.'
            );
        }
    }
    
    // Opcional: handler para o submenu de detalhes da diretoria
    async handleDiretoriaOrderDetailsSelection(session, option) {
        // Assume que já está nos detalhes e o usuário digitou uma opção
        switch (option) {
            case '1': // Ver Histórico Completo
                return await this.sendOrderHistory(session, session.tempData.selectedOrder);
            case '2': // Ver Anexos
                return await this.sendOrderAttachments(session, session.tempData.selectedOrder);
            case '3': // Aprovar (via sistema web)
                return await this.sendMessage(session.user.phone, 
                    '✅ **APROVAÇÃO**\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    'A aprovação desta ordem deve ser realizada via sistema web.\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '0️⃣ Voltar'
                );
            case '4': // Rejeitar (via sistema web)
                return await this.sendMessage(session.user.phone, 
                    '❌ **REJEIÇÃO**\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    'A rejeição desta ordem deve ser realizada via sistema web.\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '0️⃣ Voltar'
                );
            case '0':
                return await this.handleBackNavigation(session);
            default:
                return await this.sendMessage(session.user.phone, '❌ Opção inválida. Digite um número válido, ou 0 para voltar.');
        }
    }


    getTimeAgo(dateString) {
        if (!dateString) return 'Data não disponível';
        
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffMonths = Math.floor(diffDays / 30); // Aproximação

        if (diffMonths > 0) {
            return `${diffMonths} mês${diffMonths > 1 ? 'es' : ''} atrás`;
        } else if (diffDays > 0) {
            return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`;
        } else if (diffHours > 0) {
            return `${diffHours} hora${diffHours > 1 ? 's' : ''} atrás`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''} atrás`;
        } else {
            return `agora mesmo`;
        }
    }

    // ==============================================================================================================
    // FINANCEIRO - MENUS (APENAS CONSULTA)
    // ==============================================================================================================
    async handleFinanceiroMainMenu(session, option) {
        session.menuHistory.push('main');

        switch (option) {
            case '1':
                session.currentMenu = 'awaiting_financial_analysis';
                return await this.sendAwaitingFinancialAnalysis(session);
            
            case '2':
                return await this.sendCashFlow(session);
            
            case '3':
                return await this.sendWeeklyReport(session);
            
            case '4':
                return await this.sendAllOrdersMenu(session);
            
            default:
                session.menuHistory.pop();
                return await this.sendMessage(session.user.phone, 
                    '❌ Opção inválida. Digite um número de 1 a 4, ou 0 para sair/voltar.'
                );
        }
    }
    
    async sendAwaitingFinancialAnalysis(session) {
        try {
            const ordersSource = (typeof orders !== 'undefined' && Array.isArray(orders)) ? orders : [];
            const awaitingFinanceiroOrders = ordersSource.filter(order => order.status === 'Aguardando Financeiro');

            if (awaitingFinanceiroOrders.length === 0) {
                return await this.sendMessage(session.user.phone, 
                    '📊 **AGUARDANDO ANÁLISE FINANCEIRA**\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '✅ Nenhuma ordem aguardando análise.\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '━━━━━━━━━━━━━━━━━━━━━\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '0️⃣ Voltar ao menu'
                );
            }

            const sortedOrders = this.sortOrdersForDisplay(awaitingFinanceiroOrders);

            let message = `📊 **AGUARDANDO ANÁLISE FINANCEIRA (${sortedOrders.length})**\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA

            sortedOrders.forEach((order, index) => {
                const value = parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2, 
                    style: 'currency', 
                    currency: 'BRL' 
                });
                
                const urgencyIcon = order.priority?.toLowerCase() === 'emergencia' || order.priority?.toLowerCase() === 'emergência' ? ' 🚨' : '';
                
                const approvedByDiretoriaTime = order.approvalDateDiretoria ? 
                    this.getTimeAgo(order.approvalDateDiretoria) : 'N/A';

                message += `${index + 1}️⃣ ${order.id} | ${value}${urgencyIcon}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                message += `   📦 ${order.favoredName}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                message += `   👤 ${order.solicitant}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                message += `   ✅ Aprovado por Diretoria ${approvedByDiretoriaTime}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                message += `   ⏰ Vence ${order.paymentForecast ? new Date(order.paymentForecast).toLocaleDateString('pt-BR') : 'N/A'}\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
            });

            const totalValue = sortedOrders.reduce((sum, order) => sum + parseFloat(order.paymentValue || 0), 0);
            message += '━━━━━━━━━━━━━━━━━━━━━\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
            message += `💰 **Total Aguardando:** ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' })}\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
            message += 'Digite o **NÚMERO** para ver detalhes (aprovação via web) ou 0 para voltar.';

            session.tempData.currentOrders = sortedOrders;
            session.tempData.lastFilterType = 'awaiting_financial';
            
            return await this.sendMessage(session.user.phone, message);

        } catch (error) {
            console.error('❌ [WhatsApp Bot] Erro ao buscar ordens aguardando análise financeira:', error);
            return await this.sendMessage(session.user.phone, 
                '❌ Erro ao carregar ordens. Tente novamente.'
            );
        }
    }
    
    // Opcional: handler para o submenu de detalhes do financeiro
    async handleFinanceiroOrderAnalysisSelection(session, option) {
        // Assume que já está nos detalhes e o usuário digitou uma opção
        switch (option) {
            case '1': // Ver Anexos
                return await this.sendOrderAttachments(session, session.tempData.selectedOrder);
            case '2': // Aprovar para Pagamento (via sistema web)
                return await this.sendMessage(session.user.phone, 
                    '💰 **LIBERAÇÃO PARA PAGAMENTO**\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    'A liberação para pagamento desta ordem deve ser realizada via sistema web.\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '0️⃣ Voltar'
                );
            case '3': // Rejeitar (via sistema web)
                return await this.sendMessage(session.user.phone, 
                    '❌ **REJEIÇÃO**\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    'A rejeição desta ordem deve ser realizada via sistema web.\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '0️⃣ Voltar'
                );
            case '0':
                return await this.handleBackNavigation(session);
            default:
                return await this.sendMessage(session.user.phone, '❌ Opção inválida. Digite um número válido, ou 0 para voltar.');
        }
    }


    // ==============================================================================================================
    // PAGADOR - MENUS (APENAS CONSULTA)
    // ==============================================================================================================
    async handlePagadorMainMenu(session, option) {
        session.menuHistory.push('main');

        switch (option) {
            case '1':
                session.currentMenu = 'payment_queue';
                return await this.sendPaymentQueue(session);
            
            case '2':
                return await this.sendUpcomingDueDates(session);
            
            case '3':
                return await this.sendTodayPayments(session);
            
            case '4':
                return await await this.sendPaymentReport(session);
            
            default:
                session.menuHistory.pop();
                return await this.sendMessage(session.user.phone, 
                    '❌ Opção inválida. Digite um número de 1 a 4, ou 0 para sair/voltar.'
                );
        }
    }

    async sendPaymentQueue(session) {
        try {
            const ordersSource = (typeof orders !== 'undefined' && Array.isArray(orders)) ? orders : [];
            const paymentOrders = ordersSource.filter(order => order.status === 'Aguardando Pagamento');

            if (paymentOrders.length === 0) {
                return await this.sendMessage(session.user.phone, 
                    '💳 **FILA DE PAGAMENTO**\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '✅ Nenhuma ordem na fila de pagamento.\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '━━━━━━━━━━━━━━━━━━━━━\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '0️⃣ Voltar ao menu'
                );
            }

            // Separa por urgência e data de vencimento
            const today = new Date();
            today.setHours(0,0,0,0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            const urgentOrders = [];
            const tomorrowOrders = [];
            const futureOrders = [];

            paymentOrders.forEach(order => {
                let isUrgent = false;
                if (order.priority?.toLowerCase() === 'emergencia' || order.priority?.toLowerCase() === 'emergência') {
                    isUrgent = true;
                } else if (order.paymentForecast) {
                    const forecastDate = new Date(order.paymentForecast);
                    forecastDate.setHours(0,0,0,0);
                    if (forecastDate.getTime() <= today.getTime()) { // Vence hoje ou já vencida
                        isUrgent = true;
                    }
                }

                if (isUrgent) {
                    urgentOrders.push(order);
                } else if (order.paymentForecast) {
                    const forecastDate = new Date(order.paymentForecast);
                    forecastDate.setHours(0,0,0,0);
                    if (forecastDate.getTime() === tomorrow.getTime()) {
                        tomorrowOrders.push(order);
                    } else if (forecastDate > tomorrow.getTime()) {
                        futureOrders.push(order);
                    }
                } else { // Sem previsão de pagamento, trata como futuro
                    futureOrders.push(order);
                }
            });

            // Ordena as listas
            urgentOrders.sort((a, b) => new Date(a.paymentForecast || a.generationDate) - new Date(b.paymentForecast || b.generationDate));
            tomorrowOrders.sort((a, b) => new Date(a.paymentForecast || a.generationDate) - new Date(b.paymentForecast || b.generationDate));
            futureOrders.sort((a, b) => new Date(a.paymentForecast || a.generationDate) - new Date(b.paymentForecast || b.generationDate));

            let message = `💳 **FILA DE PAGAMENTO (${paymentOrders.length})**\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
            let orderIndex = 1;
            const displayedOrders = []; // Para armazenar as ordens na ordem de exibição

            if (urgentOrders.length > 0) {
                message += '🚨 **URGENTE (Vencem hoje ou atrasadas):**\n\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
                urgentOrders.forEach(order => {
                    const value = parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', { 
                        minimumFractionDigits: 2, 
                        style: 'currency', 
                        currency: 'BRL' 
                    });
                    
                    let timeInfo = '';
                    if (order.paymentForecast) {
                        const forecastDate = new Date(order.paymentForecast);
                        const todayFormatted = today.toLocaleDateString('pt-BR');
                        const forecastFormatted = forecastDate.toLocaleDateString('pt-BR');
                        
                        if (forecastFormatted === todayFormatted) {
                            timeInfo = `Vence HOJE`;
                        } else if (forecastDate < today) {
                            timeInfo = `VENCIDA desde ${forecastFormatted}`;
                        }
                    } else {
                        timeInfo = 'Vencimento N/A';
                    }

                    message += `${orderIndex}️⃣ ${order.id} | ${value}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                    message += `   📦 ${order.favoredName}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                    message += `   ⏰ ${timeInfo}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                    if (order.approvedByFinanceiro) {
                        message += `   ✅ Liberado ${this.getTimeAgo(order.approvalDateFinanceiro || order.generationDate)}\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                    } else {
                        message += `   ⚠️ Aguardando liberação financeira\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                    }
                    displayedOrders.push(order);
                    orderIndex++;
                });
                message += '━━━━━━━━━━━━━━━━━━━━━\n\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
            }

            if (tomorrowOrders.length > 0) {
                message += '📅 **Amanhã:**\n\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
                tomorrowOrders.forEach(order => {
                    const value = parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', { 
                        minimumFractionDigits: 2, 
                        style: 'currency', 
                        currency: 'BRL' 
                    });

                    message += `${orderIndex}️⃣ ${order.id} | ${value}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                    message += `   📦 ${order.favoredName}\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                    displayedOrders.push(order);
                    orderIndex++;
                });
                message += '━━━━━━━━━━━━━━━━━━━━━\n\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
            }

            if (futureOrders.length > 0) {
                message += '🗓️ **Próximos dias:**\n\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
                futureOrders.slice(0, 5).forEach(order => { // Mostra até os 5 próximos
                    const value = parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', { 
                        minimumFractionDigits: 2, 
                        style: 'currency', 
                        currency: 'BRL' 
                    });
                    
                    const dueDate = order.paymentForecast ? 
                        new Date(order.paymentForecast).toLocaleDateString('pt-BR') : 'N/A';

                    message += `${orderIndex}️⃣ ${order.id} | ${value}\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                    message += `   📦 ${order.favoredName} | ${dueDate}\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
                    displayedOrders.push(order);
                    orderIndex++;
                });
            }

            const totalValue = paymentOrders.reduce((sum, order) => sum + parseFloat(order.paymentValue || 0), 0);
            message += '━━━━━━━━━━━━━━━━━━━━━\n'; // CORRIGIDO O ESCAPE DE NOVA LINHA
            message += `💰 **Total na Fila:** ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' })}\n\n`; // CORRIGIDO O ESCAPE DE NOVA LINHA
            message += 'Digite o **NÚMERO** para ver detalhes (pagamento via sistema web) ou 0 para voltar.';

            session.tempData.currentOrders = displayedOrders;
            session.tempData.lastFilterType = 'payment_queue';

            return await this.sendMessage(session.user.phone, message);

        } catch (error) {
            console.error('❌ [WhatsApp Bot] Erro ao buscar fila de pagamento:', error);
            return await this.sendMessage(session.user.phone, 
                '❌ Erro ao carregar fila de pagamento. Tente novamente.'
            );
        }
    }

    // Opcional: handler para o submenu de detalhes do pagador
    async handlePagadorPaymentDetailsSelection(session, option) {
        // Assume que já está nos detalhes e o usuário digitou uma opção
        switch (option) {
            case '1': // Ver Boleto/Nota
                return await this.sendOrderAttachments(session, session.tempData.selectedOrder);
            case '2': // Confirmar Pagamento (via sistema web)
                return await this.sendMessage(session.user.phone, 
                    '✅ **CONFIRMAÇÃO DE PAGAMENTO**\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    'A confirmação de pagamento desta ordem deve ser realizada via sistema web.\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '0️⃣ Voltar'
                );
            case '3': // Reportar Problema (via sistema web)
                return await this.sendMessage(session.user.phone, 
                    '💬 **PROBLEMA NO PAGAMENTO**\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    'O reporte de problemas no pagamento deve ser realizado via sistema web.\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
                    '0️⃣ Voltar'
                );
            case '0':
                return await this.handleBackNavigation(session);
            default:
                return await this.sendMessage(session.user.phone, '❌ Opção inválida. Digite um número válido, ou 0 para voltar.');
        }
    }


    // ==============================================================================================================
    // UTilitários
    // ==============================================================================================================
    async sendMessage(phoneNumber, message) {
        try {
            let targetContact;
            if (WHATSAPP_CONFIG.IS_TEST_MODE) {
                targetContact = { name: "MODO TESTE Bot", phone: WHATSAPP_CONFIG.TEST_PHONE_NUMBER };
                console.log(`DEBUG: [Bot] Redirecionando mensagem para ${WHATSAPP_CONFIG.TEST_PHONE_NUMBER} (original: ${phoneNumber})`);
            } else {
                targetContact = { name: "Bot User", phone: phoneNumber };
            }

            return await this.whatsAppIntegration.sendMessage(targetContact, message);
        } catch (error) {
            console.error('❌ [WhatsApp Bot] Erro ao enviar mensagem:', error);
        }
    }

    async sendHelpMessage(phoneNumber) {
        const helpText = 
            '🤖 **CENTRAL DE CONSULTAS - AJUDA**\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
            '**Comandos Disponíveis:**\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
            '🔹 **MENU** ou **INICIO** - Volta ao menu principal\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
            '🔹 **VOLTAR** ou **0** - Volta ao menu anterior\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
            '🔹 **SAIR** ou **LOGOUT** - Encerra a sessão\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
            '🔹 **AJUDA** - Mostra esta mensagem\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
            '**Navegação:**\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
            '• Digite números (1, 2, 3...) para navegar\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
            '• Sessão expira em ${WHATSAPP_BOT_CONFIG.SESSION.TIMEOUT_MINUTES} minutos de inatividade\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
            '• Use seu PIN de 4-6 dígitos para entrar\n\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
            '**Suporte:**\n' + // CORRIGIDO O ESCAPE DE NOVA LINHA
            'Para problemas técnicos, entre em contato com a administração.';

        return await this.sendMessage(phoneNumber, helpText);
    }
    
    // Método auxiliar para ordenar ordens
    sortOrdersForDisplay(ordersArray) {
        return [...ordersArray].sort((a, b) => {
            const aEmergency = a.priority?.toLowerCase() === 'emergencia' || a.priority?.toLowerCase() === 'emergência';
            const bEmergency = b.priority?.toLowerCase() === 'emergencia' || b.priority?.toLowerCase() === 'emergência';
            
            // Ordens de emergência vêm primeiro
            if (aEmergency && !bEmergency) return -1;
            if (!aEmergency && bEmergency) return 1;

            // Depois, ordena por data de vencimento (as mais próximas primeiro)
            const dateA = a.paymentForecast ? new Date(a.paymentForecast) : new Date('9999-12-31');
            const dateB = b.paymentForecast ? new Date(b.paymentForecast) : new Date('9999-12-31');
            
            return dateA.getTime() - dateB.getTime();
        });
    }

    // Método auxiliar para normalizar número de telefone (usado pelo webhook)
    normalizePhoneNumber(phoneNumber) {
        let cleaned = phoneNumber.replace(/\D/g, ''); // Remove caracteres não numéricos
        
        // Se já está no formato 55DDNNNNNNNNN
        if (cleaned.length === 13 && cleaned.startsWith('55')) {
            return cleaned;
        }
        
        // Se está no formato DDNNNNNNNNN (11 dígitos)
        if (cleaned.length === 11) {
            return '55' + cleaned;
        }
        
        // Se está no formato NNNNNNNNN (9 dígitos) - adiciona DDD padrão 75 (EXEMPLO)
        if (cleaned.length === 9) {
            return '5575' + cleaned;
        }
        
        return cleaned; // Retorna o que sobrou, pode ser um número internacional
    }
    
    // ==============================================================================================================
    // INTEGRAÇÃO COM O SISTEMA EXISTENTE (STATIC METHODS)
    // ==============================================================================================================
    // Método estático para inicializar e retornar a instância do bot
    static async initialize(whatsAppIntegrationInstance) { // Adicionado 'async'
        if (!WhatsAppBot.instance) {
            console.log('🤖 [WhatsApp Bot] Static initialize(): Criando nova instância.');
            WhatsAppBot.instance = new WhatsAppBot(whatsAppIntegrationInstance);
            // <<< NOVO: Chama o método de inicialização da instância recém-criada >>>
            await WhatsAppBot.instance.initialize(); 
            console.log('🤖 [WhatsApp Bot] Static initialize(): Instância criada e inicializada.');
        } else {
            console.log('🤖 [WhatsApp Bot] Static initialize(): Instância já existe.');
            // Garante que a instância existente também seja inicializada, caso não tenha sido.
            if (!WhatsAppBot.instance._isInitialized) {
                await WhatsAppBot.instance.initialize();
            }
        }
        return WhatsAppBot.instance; // Retorna a instância do bot
    }

    // Método estático para processar mensagens (para ser chamado globalmente)
    static async processIncomingMessage(phoneNumber, message) { // Adicionado 'async'
        console.log('⚙️ [WhatsApp Bot] Static processIncomingMessage chamado. WhatsAppBot.instance existe:', !!WhatsAppBot.instance); // NOVO LOG
        if (WhatsAppBot.instance) {
            const normalizedPhone = WhatsAppBot.instance.normalizePhoneNumber(phoneNumber); 
            return await WhatsAppBot.instance.processMessage(normalizedPhone, message);
        } else {
            console.warn('⚠️ [WhatsApp Bot] Sistema não inicializado (instância não existe). Mensagem ignorada.');
            return false;
        }
    }
}

// **EXPOR A CLASSE GLOBALMENTE** (para que o orquestrador possa chamar WhatsAppBot.initialize)
window.WhatsAppBot = WhatsAppBot;

console.log('✅ [WhatsApp Bot] Módulo Bot carregado e exposto globalmente como window.WhatsAppBot (Classe).');*/