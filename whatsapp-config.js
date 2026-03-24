// whatsapp-config.js

const WHATSAPP_CONFIG = {
    SCHEDULE: {
        DIRETORIA_REPORT_DAYS: [1, 3, 5],
        DIRETORIA_REPORT_TIME: '08:30',

        FINANCEIRO_REPORT_DAYS: [1, 4],
        FINANCEIRO_REPORT_TIME: '08:30',

        EMERGENCY_CHECK_INTERVAL_MINUTES: 5,
    },
    RECIPIENTS: {
        'Rafael Sayd': '5575981664190',
        'Verônica': '5575997071069',
        'Lucas Silva': '5575991602372',
        'Rafael Sagrilo': '5575992601299',
        'Djael Jr': '5575981664190',
        'Nataly': '557481287058',
        'Tiago Santana': '5575981664190',
        'Marina': '5575981664190',
    },

    IS_TEST_MODE: false,
};

const ZAPI_CONFIG = {
    INSTANCE_ID: '3E8927A89445C179E5E6FA5FB5498E95',
    TOKEN: 'A2BE318D5AF857C8B693E139',
    CLIENT_TOKEN: 'F2e26928c126c4ff28d15c2ebf910fae2S',
    BASE_URL: null
};

ZAPI_CONFIG.BASE_URL = `https://api.z-api.io/instances/${ZAPI_CONFIG.INSTANCE_ID}/token/${ZAPI_CONFIG.TOKEN}`;

function validateWhatsAppConfig() {
    let isValid = true;
    console.log('   [WhatsApp Config] Validando configurações...');

    if (ZAPI_CONFIG.INSTANCE_ID === 'SEU_INSTANCIA_ID' || ZAPI_CONFIG.TOKEN === 'SEU_TOKEN_AQUI') {
        console.error('❌ [WhatsApp Config] ZAPI_CONFIG.INSTANCE_ID ou ZAPI_CONFIG.TOKEN não configurados. As mensagens não serão enviadas.');
        isValid = false;
    }
    if (ZAPI_CONFIG.CLIENT_TOKEN === 'SEU_CLIENT_TOKEN_AQUI') {
        console.warn('⚠️ [WhatsApp Config] ZAPI_CONFIG.CLIENT_TOKEN não configurado. Verifique se sua instância da Z-API exige um Client-Token.');
    }
    if (isValid) {
        console.log('✅ [WhatsApp Config] Configuração validada com sucesso.');
    } else {
        console.error('❌ [WhatsApp Config] Falha na validação da configuração.');
    }
    return isValid;
}

validateWhatsAppConfig();