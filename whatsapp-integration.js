// ===================================================================
// INTEGRAÇÃO WHATSAPP VIA Z-API (APENAS FUNÇÕES DE ENVIO)
// ===================================================================

class WhatsAppIntegration {
constructor() {
this.isInitialized = false;

}

async initialize() {
    console.log('🚀 [WhatsApp Integration] Inicializando módulo de envio WhatsApp...');
    
    // validateWhatsAppConfig é definida em whatsapp-config.js
    if (!validateWhatsAppConfig()) {
        console.error('❌ [WhatsApp Integration] Falha na validação da configuração. Módulo de envio desabilitado.');
        return false;
    }

    this.isInitialized = true;
    
    if (WHATSAPP_CONFIG.IS_TEST_MODE) {
        console.warn('⚠️ [WhatsApp Integration] MODO DE TESTE ATIVO - Todas as mensagens serão enviadas para:', WHATSAPP_CONFIG.TEST_PHONE_NUMBER);
    }
    
    console.log('✅ [WhatsApp Integration] Módulo de envio inicializado com sucesso.');
    return true;
}

// ===================================================================
// FUNÇÕES AUXILIARES DE TELEFONE (Ainda necessárias para formatar o número)
// ===================================================================

formatPhoneNumber(rawNumber) {
    if (!rawNumber) return null;
    let cleaned = rawNumber.replace(/\D/g, '');
    
    // Se já está no formato 55DDNNNNNNNNN (ex: 5575992291117)
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
        return cleaned;
    }
    
    // Se está no formato DDNNNNNNNNN (11 dígitos, ex: 75992291117)
    if (cleaned.length === 11) {
        return `55${cleaned}`;
    }
    
    // Se está no formato NNNNNNNNN (9 dígitos, ex: 992291117) - ASSUME DDD 75
    // Ajuste esta lógica se você precisa suportar múltiplos DDDs dinamicamente
    if (cleaned.length === 9) {
        return `5575${cleaned}`;
    }
    
    return cleaned; // Retorna o número limpo caso nenhum padrão seja aplicado ou seja inválido
}


// ===================================================================
// FUNÇÕES DE ENVIO PRINCIPAIS (sendMessage e sendFile)
// ===================================================================

// Resolve o identificador do destinatário para um número de telefone formatado
getResolvedPhoneNumber(recipientIdentifier) {
    let rawNumber = null;
    let recipientNameForLog = recipientIdentifier; // Para o log, inicialmente usa o que foi passado

    if (typeof recipientIdentifier === 'object' && recipientIdentifier !== null && recipientIdentifier.phone) {
        // Se recipientIdentifier é um objeto (e.g., { name: 'Djael Jr', phone: '55...' })
        rawNumber = recipientIdentifier.phone;
        recipientNameForLog = recipientIdentifier.name || recipientIdentifier.phone; // Usa o nome para o log se existir
    } else if (typeof recipientIdentifier === 'string') {
        // Se recipientIdentifier é uma string (nome ou número)
        rawNumber = WHATSAPP_CONFIG.RECIPIENTS[recipientIdentifier]; // Tenta buscar pelo nome no config
        if (!rawNumber) {
            // Se não encontrou pelo nome, assume que recipientIdentifier já é um número de telefone
            rawNumber = recipientIdentifier;
        }
    }

    if (!rawNumber) {
        console.error(`❌ [WhatsApp Integration] Número não encontrado ou inválido para: ${recipientNameForLog}`);
        return null;
    }
    
    // Se o modo de teste está ativo, substitui o número pelo número de teste configurado
    const finalPhoneNumber = WHATSAPP_CONFIG.IS_TEST_MODE 
        ? WHATSAPP_CONFIG.TEST_PHONE_NUMBER 
        : this.formatPhoneNumber(rawNumber);

    // Ajustar o log para refletir o nome/identificador correto se um objeto foi passado
    return finalPhoneNumber;
}

// Adapte sendMessage e sendFile para usar o recipientNameForLog na saída de console
async sendMessage(recipientIdentifier, message) {
    if (!this.isInitialized) {
        console.warn('⚠️ [WhatsApp Integration] Módulo de envio não inicializado. Mensagem não enviada.');
        return false;
    }

    // NOVO: Extrai o nome para o log de forma mais robusta
    const recipientNameForLog = (typeof recipientIdentifier === 'object' && recipientIdentifier !== null && recipientIdentifier.name) 
                                ? recipientIdentifier.name 
                                : recipientIdentifier;

    const phoneNumber = this.getResolvedPhoneNumber(recipientIdentifier);
    if (!phoneNumber) {
         console.error(`❌ [WhatsApp Integration] Falha ao resolver número para: ${recipientNameForLog}. Mensagem não enviada.`);
         return false;
    }

    const logPrefix = WHATSAPP_CONFIG.IS_TEST_MODE ? '[TEST]' : '';
    console.log(`📱 ${logPrefix} [WhatsApp Integration] Enviando mensagem para ${recipientNameForLog} (${phoneNumber})...`);

    // ... o resto da função sendMessage permanece o mesmo ...
    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (ZAPI_CONFIG.CLIENT_TOKEN && ZAPI_CONFIG.CLIENT_TOKEN !== 'SEU_CLIENT_TOKEN_AQUI') {
            headers['Client-Token'] = ZAPI_CONFIG.CLIENT_TOKEN;
        }

        const response = await fetch(`${ZAPI_CONFIG.BASE_URL}/send-text`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                phone: phoneNumber,
                message: message
            })
        });

        const data = await response.json();
        
        if (response.ok && (data.zaapId || data.messageId || data.id)) {
            console.log(`✅ ${logPrefix} [WhatsApp Integration] Mensagem enviada com sucesso para ${recipientNameForLog}.`);
            return true;
        } else {
            console.error(`❌ ${logPrefix} [WhatsApp Integration] Erro ao enviar mensagem para ${recipientNameForLog}:`, data);
            return false;
        }
    } catch (error) {
        console.error(`❌ ${logPrefix} [WhatsApp Integration] Erro de conexão ao enviar mensagem para ${recipientNameForLog}:`, error);
        return false;
    }
}

async sendFile(recipientIdentifier, fileBase64, fileName, message = '') {
    if (!this.isInitialized) {
        console.warn('⚠️ [WhatsApp Integration] Módulo de envio não inicializado. Arquivo não enviado.');
        return false;
    }

    // NOVO: Extrai o nome para o log de forma mais robusta
    const recipientNameForLog = (typeof recipientIdentifier === 'object' && recipientIdentifier !== null && recipientIdentifier.name) 
                                ? recipientIdentifier.name 
                                : recipientIdentifier;

    const phoneNumber = this.getResolvedPhoneNumber(recipientIdentifier);
    if (!phoneNumber) {
        console.error(`❌ [WhatsApp Integration] Falha ao resolver número para: ${recipientNameForLog}. Arquivo não enviado.`);
        return false;
    }

    const logPrefix = WHATSAPP_CONFIG.IS_TEST_MODE ? '[TEST]' : '';
    console.log(`📎 ${logPrefix} [WhatsApp Integration] Enviando arquivo para ${recipientNameForLog} (${phoneNumber}) - ${fileName}...`);

    // ... o resto da função sendFile permanece o mesmo ...
    try {
        const base64Content = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
        
        console.log(`DEBUG: Base64 original (início): ${fileBase64.substring(0, 100)}...`);
        console.log(`DEBUG: Base64 limpo (início): ${base64Content.substring(0, 100)}...`);
        console.log(`DEBUG: Base64 limpo (tamanho): ${base64Content.length}`);
        console.log(`DEBUG: Nome do arquivo: ${fileName}`);
        console.log(`DEBUG: Telefone formatado: ${phoneNumber}`);
        console.log(`DEBUG: URL da API: ${ZAPI_CONFIG.BASE_URL}/send-document/base64`);

        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (ZAPI_CONFIG.CLIENT_TOKEN && ZAPI_CONFIG.CLIENT_TOKEN !== 'SEU_CLIENT_TOKEN_AQUI') {
            headers['Client-Token'] = ZAPI_CONFIG.CLIENT_TOKEN;
        }

        const requestBody = {
            phone: phoneNumber,
            base64: base64Content,
            fileName: fileName,
            message: message || ''
        };
        
        console.log(`DEBUG: Corpo da requisição:`, JSON.stringify(requestBody, null, 2));

        const response = await fetch(`${ZAPI_CONFIG.BASE_URL}/send-document/base64`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        console.log(`DEBUG: Status da resposta: ${response.status}`);
        console.log(`DEBUG: Resposta completa da API:`, data);
        
        if (response.ok && (data.zaapId || data.messageId || data.id)) {
            console.log(`✅ ${logPrefix} [WhatsApp Integration] Arquivo enviado com sucesso para ${recipientNameForLog}.`);
            return true;
        } else {
            console.error(`❌ ${logPrefix} [WhatsApp Integration] Erro ao enviar arquivo para ${recipientNameForLog}:`, data);
            return false;
        }
    } catch (error) {
        console.error(`❌ ${logPrefix} [WhatsApp Integration] Erro de conexão ao enviar arquivo para ${recipientNameForLog}:`, error);
        return false;
    }
}
}

// ===================================================================
// INSTÂNCIA GLOBAL E FUNÇÕES DE CONVENIÊNCIA
// ===================================================================

// Criar instância global do módulo de integração
window.whatsAppIntegration = new WhatsAppIntegration();
console.log("DEBUG: ✅ window.whatsAppIntegration foi criado e exposto globalmente!"); // <-- ADICIONE ESTA LINHA


// Funções de conveniência para uso global (ESSAS SÃO AS QUE SERÃO CHAMADAS POR OUTROS SCRIPTS)
// recipientIdentifier pode ser um nome ('Djael Jr') ou um número de telefone ('55759XXXXYYYY')
window.sendWhatsAppMessage = (recipientIdentifier, message) => {
// console.log("Chamada global sendWhatsAppMessage", { recipientIdentifier, message }); // Descomente para debug
return window.whatsAppIntegration.sendMessage(recipientIdentifier, message);
};

// recipientIdentifier pode ser um nome ('Djael Jr') ou um número de telefone ('55759XXXXYYYY')
window.sendWhatsAppFile = (recipientIdentifier, fileBase64, fileName, message = '') => {
// console.log("Chamada global sendWhatsAppFile", { recipientIdentifier, fileName, message }); // Descomente para debug
return window.whatsAppIntegration.sendFile(recipientIdentifier, fileBase64, fileName, message);
};

console.log('📱 [WhatsApp Integration] Módulo de envio WhatsApp carregado e funções globais expostas.');