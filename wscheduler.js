// ===== VERSÃO FINAL OTIMIZADA: WhatsAppScheduler Funcional (sem lembretes periódicos de emergência) =====

class WhatsAppScheduler {
    constructor() {
        this.isInitialized = false;
        this.scheduledTasks = new Map();
        
        this.contacts = {};
        if (typeof WHATSAPP_CONFIG !== 'undefined' && WHATSAPP_CONFIG.RECIPIENTS) {
            for (const name in WHATSAPP_CONFIG.RECIPIENTS) {
                this.contacts[name] = { 
                    name: name, 
                    phone: WHATSAPP_CONFIG.RECIPIENTS[name], 
                    role: this.getRoleForContact(name) 
                };
            }
        }
        
        // REMOVIDO: Variáveis de lembretes periódicos não são mais necessárias
        // this.lastEmergencyNotificationContent = new Map(); 
        // this.lastEmergencyNotificationDate = new Map();
        
        this.instanceId = Math.random().toString(36).substr(2, 9);
        console.log(`   [WhatsApp Scheduler V1] Initializing scheduler (Instance ID: ${this.instanceId})...`);
    }

    getRoleForContact(name) {
        if (['Rafael Sayd', 'Verônica', 'Lucas Silva', 'Rafael Sagrilo'].includes(name)) return 'solicitante';
        if (name === 'Djael Jr') return 'diretoria';
        if (name === 'Tiago Santana') return 'financeiro';
        if (name === 'Marina') return 'pagador';
        return 'desconhecido';
    }

    async initialize() {
        try {
            if (typeof window.whatsAppIntegration === 'undefined') {
                console.warn('⚠️ WhatsApp Integration not found, continuing...');
            }
            this.whatsAppIntegration = window.whatsAppIntegration;
            
            await this.ensureFreshOrders(); 
            
            this.init();
            this.isInitialized = true;
            console.log('✅ [WhatsApp Scheduler V1] Initialized successfully');

        } catch (error) {
            console.error('❌ [WhatsApp Scheduler V1] Error during initialization:', error);
        }
    }
        
    // NOVA FUNÇÃO: Enviar notificação de emergência para o grupo após aprovação do Financeiro
    async sendEmergencyNotificationApprovedByFinanceiro(order) {
        console.log(`🚨 [SCHEDULER] Iniciando notificação de EMERGÊNCIA APROVADA PELO FINANCEIRO: ${order.id}`);
        try {
            if (!(order.priority?.toLowerCase() === 'emergencia' || order.priority?.toLowerCase() === 'emergência')) {
                console.log(`ℹ️ [SCHEDULER] Ordem ${order?.id} não é de emergência. Pulando notificação.`);
                return;
            }
    
            // Destinatários consolidados conforme o exemplo da mensagem
            const intendedRecipients = ['Rafael Sayd', 'Marina', 'Djael Jr', 'Tiago Santana'];
            const recipientsByPhone = new Map(); // Map<phoneNumber, Set<recipientName>>
    
            for (const recipientName of intendedRecipients) {
                const contact = this.contacts[recipientName];
                if (!contact) {
                    console.warn(`⚠️ [SCHEDULER] Contato '${recipientName}' não encontrado no this.contacts. Pulando.`);
                    continue;
                }
                if (!recipientsByPhone.has(contact.phone)) {
                    recipientsByPhone.set(contact.phone, new Set());
                }
                recipientsByPhone.get(contact.phone).add(contact.name);
            }
            console.log(`   [SCHEDULER] Destinatários agrupados por telefone para notificação de emergência:`, recipientsByPhone);
    
            for (const [phoneNumber, namesSet] of recipientsByPhone.entries()) {
                const namesForMessage = Array.from(namesSet).join(', ');
                const firstRecipientName = Array.from(namesSet)[0];
    
                // A chave do localStorage deve ser específica para esta notificação
                const notifiedKey = `whatsapp_emergency_approved_by_financeiro_group_notified_${firstRecipientName}_${order.id}`;
                const lastNotifiedDate = localStorage.getItem(notifiedKey);
                const today = new Date().toISOString().split('T')[0];
                
                if (lastNotifiedDate === today) {
                    console.log(`   ℹ️ [SCHEDULER] Ordem ${order.id} já notificada (APROVADA FINANCEIRO) para o número ${phoneNumber} hoje (via ${firstRecipientName}). Pulando.`);
                    continue;
                }
                
                const formattedValue = parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2, 
                    style: 'currency', 
                    currency: 'BRL' 
                });
                const formattedForecast = order.paymentForecast ? 
                    new Date(order.paymentForecast).toLocaleDateString('pt-BR') : 'N/A';
                
                // MENSAGEM ATUALIZADA conforme seu pedido
                const message = `*🚨  ORDEM DE EMERGÊNCIA PENDENTE*\n\n` + 
                              `*Ordem ID:* ${order.id}\n` +
                              `*Favorecido:* ${order.favoredName}\n` +
                              `*Valor:* ${formattedValue}\n` +
                              `*Status:* Aguardando Pagamento\n` + // Status correto após aprovação do Financeiro
                              `*Previsão:* ${formattedForecast}\n\n` ;
                              
                if (this.whatsAppIntegration) {
                    const targetContact = { name: firstRecipientName, phone: phoneNumber };
                    console.log(`   [SCHEDULER] Enviando mensagem via WhatsAppIntegration para ${targetContact.name} (${targetContact.phone})...`);
                    await this.whatsAppIntegration.sendMessage(targetContact, message);
                } else {
                    console.warn(`⚠️ [SCHEDULER] WhatsAppIntegration não disponível. Mensagem NÃO enviada para o número ${phoneNumber} (para: ${namesForMessage}).`);
                }
                
                localStorage.setItem(notifiedKey, today); 
                console.log(`✅ [SCHEDULER] Notificação de emergência marcada como enviada e salva no localStorage para o número ${phoneNumber} (via ${firstRecipientName}).`);
            }
            
        } catch (error) {
            console.error('❌ [SCHEDULER] Erro na função sendEmergencyNotificationApprovedByFinanceiro:', error);
        }
    }

    async ensureFreshOrders() {
        // CORREÇÃO: Chamar loadFullOrdersList() para carregar TODAS as ordens do DB.
        // A função loadOrders() original não existe mais ou está comentada.
        if (typeof window.loadFullOrdersList === 'function') {
            console.log('🔄 [Scheduler V1] Carregando a lista COMPLETA de ordens para relatórios...');
            await window.loadFullOrdersList(); // Chama a função que popula fullOrdersList
            console.log('✅ [Scheduler V1] Lista de ordens atualizada para relatórios.');
        } else {
            console.warn('⚠️ [Scheduler V1] window.loadFullOrdersList() não encontrada. Relatórios podem usar dados desatualizados.');
        }
    }

    init() {
        console.log('🔔 [WhatsApp Scheduler V1] Initializing notification system...');
        this.setupPeriodicTasks();
        this.startScheduler();
    }

    setupPeriodicTasks() {
        console.log('⏰ [WhatsApp Scheduler V1] Configuring periodic tasks...');
        
        // Relatórios da Diretoria (Rafael Sayd)
        if (this.contacts['Rafael Sayd']) { 
            this.scheduleWeeklyTask('diretoria_report_rafael', { 
                days: WHATSAPP_CONFIG.SCHEDULE.DIRETORIA_REPORT_DAYS, 
                time: WHATSAPP_CONFIG.SCHEDULE.DIRETORIA_REPORT_TIME, 
                callback: () => this.sendDiretoriaReport(this.contacts['Rafael Sayd']) 
            });
        }
        
        // Relatórios do Financeiro (Rafael Sayd)
        if (this.contacts['Rafael Sayd']) { 
            this.scheduleWeeklyTask('financeiro_report_rafael', { 
                days: WHATSAPP_CONFIG.SCHEDULE.FINANCEIRO_REPORT_DAYS, 
                time: WHATSAPP_CONFIG.SCHEDULE.FINANCEIRO_REPORT_TIME, 
                callback: () => this.sendFinanceiroReport(this.contacts['Rafael Sayd']) 
            });
        }

        // REMOVIDO: Agendamentos de lembretes periódicos de emergência não são mais necessários

        console.log('✅ [WhatsApp Scheduler V1] Periodic tasks configured.');
    }

    scheduleWeeklyTask(taskId, config) {
        const task = {
            id: taskId,
            type: 'weekly',
            days: config.days,
            time: config.time,
            callback: config.callback,
            lastRun: null,
            nextRun: this.calculateNextWeeklyRunTime(config.days, config.time)
        };
        this.scheduledTasks.set(taskId, task);
        console.log(`[Scheduler V1] Weekly task '${taskId}' scheduled for ${task.nextRun.toLocaleString()}.`);
    }

    calculateNextWeeklyRunTime(days, timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const now = new Date();
        let nextRunCandidate = null;
        
        for (let i = 0; i < 7; i++) {
            const candidateDate = new Date(now);
            candidateDate.setDate(now.getDate() + i);
            candidateDate.setHours(hours, minutes, 0, 0);
            const dayOfWeek = candidateDate.getDay();
            
            if (days.includes(dayOfWeek)) {
                if (candidateDate.getTime() > now.getTime()) { 
                    nextRunCandidate = candidateDate;
                    break;
                }
            }
        }
        
        if (!nextRunCandidate) {
            const earliestDay = Math.min(...days);
            let daysToAdd = (earliestDay - now.getDay() + 7) % 7;
            if (daysToAdd === 0) daysToAdd = 7;
            
            nextRunCandidate = new Date(now);
            nextRunCandidate.setDate(now.getDate() + daysToAdd);
            nextRunCandidate.setHours(hours, minutes, 0, 0);
        }
        
        return nextRunCandidate;
    }

    startScheduler() {
        const randomDelay = Math.floor(Math.random() * 5000);
        console.log(`⏰ [WhatsApp Scheduler V1] Scheduler starting with a random delay of ${randomDelay}ms.`);
        
        setTimeout(() => {
            setInterval(() => {
                this.checkScheduledTasks();
            }, 60000); // Verifica a cada minuto
            console.log('⏰ [WhatsApp Scheduler V1] Scheduler started (checking every minute).');
        }, randomDelay);
    }

    checkScheduledTasks() {
    const now = new Date(); 

    for (const [taskId, task] of this.scheduledTasks) {
        if (now.getTime() >= task.nextRun.getTime()) {
            const lastExecutionTimestamp = parseInt(localStorage.getItem(`scheduler_last_exec_${taskId}`) || '0');
            const MIN_EXECUTION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

            if (now.getTime() - lastExecutionTimestamp < MIN_EXECUTION_INTERVAL_MS) {
                console.log(`ℹ️ [Scheduler V1] Task '${taskId}' skipped (Instance ${this.instanceId}: already executed recently in another tab/process).`);
                if (task.type === 'weekly') {
                    task.nextRun = this.calculateNextWeeklyRunTime(task.days, task.time);
                }
                continue;
            }

            console.log(`   [Scheduler V1] Executing task: ${taskId} (Instance ID: ${this.instanceId})`);
            
            // --- MUDANÇA AQUI: Adicionar um bloco try-catch mais robusto para a execução da tarefa ---
            try {
                this.ensureFreshOrders().then(async () => { // Usar async aqui para o await no callback
                    await task.callback(); // <-- Garante que o callback termine antes de marcar como executado
                    
                    task.lastRun = now;
                    localStorage.setItem(`scheduler_last_exec_${taskId}`, now.getTime().toString());

                    if (task.type === 'weekly') {
                        task.nextRun = this.calculateNextWeeklyRunTime(task.days, task.time);
                    }
                    console.log(`✅ [Scheduler V1] Task '${taskId}' executed. Next scheduled: ${task.nextRun.toLocaleString()}`);
                }).catch(error => {
                    console.error(`❌ [Scheduler V1] Error refreshing data or executing task callback for '${taskId}':`, error);
                    // IMPORTANTE: Se houve erro, NÃO atualize nextRun ou localStorage.
                    // Isso permitirá que outra instância ou a próxima verificação tente novamente,
                    // assumindo que a causa do erro seja temporária.
                });
            } catch (error) {
                console.error(`❌ [Scheduler V1] Critical error setting up task '${taskId}' execution:`, error);
                // IMPORTANTE: Similarmente, não atualize o estado se houver um erro crítico aqui.
            }
        }
    }
}

async sendDiretoriaReport(contact) {
    try {
        const pendingOrders = window.fullOrdersList.filter(order => order.status === 'Pendente');
        
        const totalValue = pendingOrders.reduce((sum, order) => sum + parseFloat(order.paymentValue || 0), 0); // Descomentado e usado
        const scheduleTime = WHATSAPP_CONFIG.SCHEDULE.DIRETORIA_REPORT_TIME;

        const message = `*RELATÓRIO DA DIRETORIA*\n\n` + 
                      `📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}\n` +
                      `📋 *Ordens Pendentes (Aprovação):* ${pendingOrders.length}\n` ;
        
        if (this.whatsAppIntegration) {
            await this.whatsAppIntegration.sendMessage(contact, message);
        }
        console.log(`✉️ [Scheduler V1] Diretoria report sent to ${contact.name} (${contact.role}).`);
    } catch (error) {
        console.error('❌ [Scheduler V1] Error sending Diretoria Report:', error);
    }
}

async sendFinanceiroReport(contact) {
    try {
        // REMOVIDO: await this.ensureFreshOrders(); // Já é chamado antes no checkScheduledTasks

        // --- MUDANÇA AQUI: Usar window.fullOrdersList ---
        const awaitingFinanceiroOrders = window.fullOrdersList.filter(order => order.status === 'Aguardando Financeiro');
        // --- FIM DA MUDANÇA ---

        const totalAwaitingFinanceiroValue = awaitingFinanceiroOrders.reduce((sum, order) => sum + parseFloat(order.paymentValue || 0), 0);
        
        const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const today = new Date();
        const scheduleTime = WHATSAPP_CONFIG.SCHEDULE.FINANCEIRO_REPORT_TIME;

        const message = `*RELATÓRIO FINANCEIRO*\n\n` +
                      `📅 *Data:* ${today.toLocaleDateString('pt-BR')} (${dayNames[today.getDay()]})\n` +
                      `💰 *Valor Total Aguardando:* ${totalAwaitingFinanceiroValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' })}\n\n` +
                      `Este é um relatório automático enviado às segundas e quintas às ${scheduleTime}.`;
        
        if (this.whatsAppIntegration) {
            await this.whatsAppIntegration.sendMessage(contact, message);
        }
        console.log(`✉️ [Scheduler V1] Financeiro report sent to ${contact.name} (${contact.role}).`);
    } catch (error) {
        console.error('❌ [Scheduler V1] Error sending Financeiro Report:', error);
        // Opcional: Aqui você pode adicionar um mecanismo para tentar novamente mais tarde,
        // ou registrar que este envio falhou e não foi "concluído".
    }
}
    
    // NOVA FUNÇÃO: Notificar Marina sobre ordens de emergência AGUARDANDO PAGAMENTO
    async notifyEmergencyOrdersToMarina(order) {
        console.log(`🚨 [Scheduler V1] Iniciando notificação de EMERGÊNCIA para Marina (Ordem ID: ${order.id})...`);
        try {
            if (!order || order.direction !== 'Marina' || !(order.priority?.toLowerCase() === 'emergencia' || order.priority?.toLowerCase() === 'emergência')) {
                console.log(`ℹ️ [Scheduler V1] Ordem ${order?.id} não é de emergência para Marina. Pulando notificação.`);
                return;
            }
    
            const marinaContact = this.contacts['Marina'];
            if (!marinaContact || !marinaContact.phone) {
                console.warn(`⚠️ [Scheduler V1] Contato 'Marina' não encontrado ou sem telefone. Notificação de emergência NÃO enviada.`);
                return;
            }
    
            const formattedValue = parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                style: 'currency',
                currency: 'BRL'
            });
            const formattedForecast = order.paymentForecast ?
                new Date(order.paymentForecast).toLocaleDateString('pt-BR') : 'N/A';
    
            const message = `🚨 **URGENTE: ORDEM DE EMERGÊNCIA AGUARDANDO PAGAMENTO!** 🚨\n\n` +
                          `Olá Marina, uma *nova ordem de emergência* foi liberada pelo Financeiro para pagamento imediato:\n\n` +
                          `*ID da Ordem:* ${order.id}\n` +
                          `*Favorecido:* ${order.favoredName}\n` +
                          `*Valor:* ${formattedValue}\n` +
                          `*Previsão de Pagamento:* ${formattedForecast}\n` +
                          `*Solicitante:* ${order.solicitant || 'N/A'}\n\n` +
                          `⚠️ *Por favor, acesse o sistema e priorize o pagamento desta ordem o quanto antes!*`;
    
            if (this.whatsAppIntegration) {
                await this.whatsAppIntegration.sendMessage(marinaContact, message);
                console.log(`✅ [Scheduler V1] Notificação de emergência enviada para Marina (${marinaContact.phone}).`);
            } else {
                console.warn(`⚠️ [Scheduler V1] WhatsAppIntegration não disponível. Mensagem de emergência para Marina NÃO enviada.`);
            }
    
        } catch (error) {
            console.error('❌ [Scheduler V1] Erro na notificação de emergência para Marina:', error);
        }
    }
    

    findSolicitantContact(solicitantName) {
        if (!solicitantName) {
            console.warn('⚠️ [findSolicitantContact] Solicitant name is empty.');
            return null;
        }
        
        const normalizedSolicitantName = solicitantName.toLowerCase().trim();
        for (const contactKey in this.contacts) {
            const contact = this.contacts[contactKey];
            if (contact.role === 'solicitante') {
                const normalizedContactName = contact.name.toLowerCase().trim();
                if (normalizedSolicitantName === normalizedContactName) {
                    return contact;
                }
            }
        }
        
        for (const contactKey in this.contacts) {
            const contact = this.contacts[contactKey];
            if (contact.role === 'solicitante') {
                const normalizedContactName = contact.name.toLowerCase().trim();
                if (normalizedSolicitantName.includes(normalizedContactName) || 
                    normalizedContactName.includes(normalizedContactName)) { // Correção aqui: era normalizedContactName.includes(normalizedSolicitantName)
                    return contact;
                }
            }
        }
        
        console.warn(`❌ Solicitant not found: "${solicitantName}"`);
        return null;
    }

    async notifyPaymentCompleted(order, proofLink = null) {
        try {
            if (!order.sendProofToWhatsApp) {
                console.log(`ℹ️ [Payment Notif V1] Order ${order.id} has sendProofToWhatsApp=false. Skipping payment notification.`);
                return;
            }

            const solicitantContact = this.findSolicitantContact(order.solicitant || order.favoredName);
            
            let targetContact;
            if (solicitantContact) {
                targetContact = solicitantContact;
                console.log(`DEBUG: REAL MODE. Notification will be sent to solicitant ${targetContact.name} (${targetContact.phone}).`);
            } else {
                console.warn(`⚠️ [Scheduler V1] Real solicitant '${order.solicitant || order.favoredName}' not found and TEST MODE DEACTIVATED. Notification NOT SENT.`);
                return;
            }

            if (!targetContact) {
                console.warn(`⚠️ [Scheduler V1] Target contact not defined for payment notification. Notification NOT SENT.`);
                return;
            }
        
            const actualPaymentDate = order.paymentCompletionDate ? 
                                      new Date(order.paymentCompletionDate).toLocaleDateString('pt-BR') :
                                      new Date().toLocaleDateString('pt-BR');
            
            const formattedValue = parseFloat(order.paymentValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' });

            let fullMessage = `✅ *PAGAMENTO REALIZADO COM SUCESSO*  \n\n` +
                              `--- *Detalhes da Transação* ---\n\n`;

            fullMessage += ` *Ordem ID:* ${order.id}\n`;
            
            if (order.supplier) {
                fullMessage += ` *Fornecedor:* ${order.supplier}\n`;
            }
            
            if (order.direction) {
                fullMessage += `➡ *Direcionamento:* ${order.direction}\n`;
            }

            if (order.favoredName) {
                fullMessage += `*Favorecido:* ${order.favoredName}\n`;
            }
            
            fullMessage += `💰 *Valor Pago:* ${formattedValue}\n`;
            fullMessage += `📅 *Data do Pagamento:* ${actualPaymentDate}\n\n`;
            fullMessage += `Sua ordem de pagamento foi processada com êxito.\n`;


            if (this.whatsAppIntegration) {
                await this.whatsAppIntegration.sendMessage(targetContact, fullMessage);
            }
            console.log(`✉️ [Scheduler V1] Payment notification sent to ${targetContact.name} (${targetContact.phone}).`);

            this.cleanupEmergencyNotifications(order.id);

        } catch (error) {
            console.error('❌ [Scheduler V1] General error notifying payment:', error);
        }
    }

    // wscheduler.js (dentro da classe WhatsAppScheduler)
    
    cleanupEmergencyNotifications(orderId) {
        console.log(`   [Cleanup V1] Initiating cleanup for order ${orderId}...`);
        
        let cleanedCount = 0;
        
        // --- LÓGICA DE LIMPEZA PARA NOTIFICAÇÕES GERAIS ANTIGAS (e para Marina específica) ---
        // Itera sobre todos os contatos configurados para tentar limpar chaves antigas e da Marina
        for (const contactName in this.contacts) { // Use this.contacts que já está populado
            // Chave antiga para 'notifyNewEmergencyOrder' (se ela ainda estivesse ativa)
            const oldEmergencyKey = `whatsapp_emergency_notified_${contactName}_${orderId}`;
            if (localStorage.getItem(oldEmergencyKey)) {
                localStorage.removeItem(oldEmergencyKey);
                cleanedCount++;
                console.log(`   ✅ Order ${orderId} removed from OLD general emergency list for ${contactName}`);
            }
    
            // Chave para a notificação específica da Marina (se ela fosse usada e a ordem fosse para ela)
            // Note que esta chave é diferente da 'approved_by_financeiro_group_notified'
            const marinaSpecificKey = `whatsapp_emergency_notified_to_marina_${orderId}`;
            if (localStorage.getItem(marinaSpecificKey)) {
                localStorage.removeItem(marinaSpecificKey);
                cleanedCount++;
                console.log(`   ✅ Order ${orderId} removed from Marina's specific emergency list.`);
            }
        }
    
        // --- LÓGICA DE LIMPEZA PARA NOTIFICAÇÕES DE EMERGÊNCIA PÓS-APROVAÇÃO DO FINANCEIRO (Grupo) ---
        // Esta notificação usa a chave `whatsapp_emergency_approved_by_financeiro_group_notified_${firstRecipientName}_${order.id}`.
        // Para limpar corretamente, precisamos iterar sobre os destinatários que PODERIAM ter recebido essa notificação.
        const groupRecipients = ['Rafael Sayd', 'Marina', 'Djael Jr', 'Tiago Santana']; // Lista de quem compõe o grupo da notificação
        
        for (const recipientName of groupRecipients) {
            // Precisamos do `firstRecipientName` que foi usado na chave.
            // Como ele é o próprio recipientName neste loop, podemos usar diretamente.
            const groupNotificationKey = `whatsapp_emergency_approved_by_financeiro_group_notified_${recipientName}_${orderId}`;
            
            if (localStorage.getItem(groupNotificationKey)) {
                localStorage.removeItem(groupNotificationKey);
                cleanedCount++;
                console.log(`   ✅ Order ${orderId} removed from APPROVED BY FINANCEIRO group notification list for ${recipientName}`);
            }
        }
        
        console.log(`✅ [Cleanup V1] Order ${orderId} removed from ${cleanedCount} notification list(s).`);
    }
}

// ===== SUBSTITUIÇÃO DA INSTÂNCIA ATUAL (Mantido como antes) =====

console.log('🔄 [Substituição] Substituindo WhatsAppScheduler pela Versão 1...');

if (window.whatsappScheduler && typeof window.whatsappScheduler.cancelAllJobs === 'function') {
    window.whatsappScheduler.cancelAllJobs();
}

const whatsappSchedulerV1 = new WhatsAppScheduler();
window.whatsappScheduler = whatsappSchedulerV1;

setTimeout(async () => {
    try {
        await whatsappSchedulerV1.initialize();
    } catch (error) {
        console.error('❌ [Substituição] Erro ao inicializar Versão 1:', error);
    }
}, 1000);