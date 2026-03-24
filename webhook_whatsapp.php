<?php
// Ativa a exibição de todos os erros PHP na tela. ESSENCIAL para depuração.
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

file_put_contents(__DIR__ . '/debug_permission_test.log', date('Y-m-d H:i:s') . ' [PERMISSION_TEST] Script started.' . PHP_EOL, FILE_APPEND);

// =================================================================================
// webhook_whatsapp.php
//
// Este script atua como o receptor de Webhooks da Z-API e orquestra a comunicação
// com a classe WhatsAppBotPHP para processar e responder às mensagens.
// =================================================================================

// --- INCLUSÕES ESSENCIAIS ---
// Inclua seu arquivo de configuração que contém as constantes para Z-API e BOT_API_TOKEN,
// e a função log_message.
require_once __DIR__ . '/config.php'; 
file_put_contents(__DIR__ . '/debug_permission_test.log', date('Y-m-d H:i:s') . ' [PERMISSION_TEST] config.php included.' . PHP_EOL, FILE_APPEND);

// Inclua a classe do seu bot. Ajuste o caminho se WhatsAppBotPHP.php estiver em outro diretório.
require_once __DIR__ . '/WhatsAppBotPHP.php'; 
file_put_contents(__DIR__ . '/debug_permission_test.log', date('Y-m-d H:i:s') . ' [PERMISSION_TEST] WhatsAppBotPHP.php included.' . PHP_EOL, FILE_APPEND);

// --- PONTO DE DEBUG ADICIONAL (Para verificar se tudo está sendo incluído) ---
file_put_contents(__DIR__ . '/debug_permission_test.log', date('Y-m-d H:i:s') . ' [PERMISSION_TEST] All includes complete. Attempting first log_message call.' . PHP_EOL, FILE_APPEND);

// --- TESTE DIRETO DE ESCRITA DE ARQUIVO (Confirma que a pasta tem permissão de escrita) ---
$testLogContent = date('Y-m-d H:i:s') . ' [DIRECT_TEST] This is a direct file write test.' . PHP_EOL;
$directTestResult = file_put_contents(__DIR__ . '/direct_write_test.log', $testLogContent, FILE_APPEND);

if ($directTestResult === false) {
    file_put_contents(__DIR__ . '/debug_permission_test.log', date('Y-m-d H:i:s') . ' [PERMISSION_TEST] DIRECT_WRITE_FAILED. Check folder permissions!' . PHP_EOL, FILE_APPEND);
} else {
    file_put_contents(__DIR__ . '/debug_permission_test.log', date('Y-m-d H:i:s') . ' [PERMISSION_TEST] DIRECT_WRITE_SUCCESS. file_put_contents is working.' . PHP_EOL, FILE_APPEND);
}
// --- FIM DO TESTE DIRETO DE ESCRITA DE ARQUIVO ---

// Loga o início da execução do webhook, usando a função de log de config.php
log_message('Iniciando execução de webhook_whatsapp.php', 'INIT', 'webhook_log.txt');
file_put_contents(__DIR__ . '/debug_permission_test.log', date('Y-m-d H:i:s') . ' [PERMISSION_TEST] First log_message call successful. Proceeding with headers.' . PHP_EOL, FILE_APPEND);


// --- CONFIGURAÇÃO DE HEADERS ---
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

// --- Lidar com requisições OPTIONS (pré-voo CORS) ---
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// =================================================================================
// 1. Lidar com a Validação do Webhook (GET request da Z-API)
// =================================================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    log_message("Webhook GET request received.", 'INFO', 'webhook_log.txt');
    http_response_code(200);
    echo json_encode(['status' => 'ok', 'message' => 'Webhook is alive.']);
    exit();
}

// =================================================================================
// 2. Lidar com as Mensagens e Eventos do Webhook (POST request da Z-API)
// =================================================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw_input = file_get_contents('php://input');
    log_message("Raw POST data received: " . $raw_input, 'DEBUG', 'webhook_log.txt');

    $payload = json_decode($raw_input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        log_message("JSON decoding failed: " . json_last_error_msg(), 'ERROR', 'webhook_log.txt');
        http_response_code(400); 
        echo json_encode(['status' => 'error', 'message' => 'Invalid JSON data received']);
        exit();
    }

    // --- IMPORTANTE: IGNORAR MENSAGENS ENVIADAS PELO PRÓPRIO BOT PARA EVITAR LOOPS! ---
    if (isset($payload['fromMe']) && $payload['fromMe'] === true) {
        log_message("Ignorando mensagem enviada pelo próprio bot (fromMe: true). MessageId: " . ($payload['messageId'] ?? 'N/A'), 'INFO', 'webhook_log.txt');
        http_response_code(200);
        echo json_encode(['status' => 'ignored', 'message' => 'Message sent by self, ignored.']);
        exit();
    }
    
    // --- EXTRAIR DADOS DA MENSAGEM ---
    $phoneNumber = null;
    $messageText = null;

    // NOVO BLOCO: Lida PRIMEIRO com payloads do tipo "ReceivedCallback"
    if (isset($payload['type']) && $payload['type'] === 'ReceivedCallback' && isset($payload['phone']) && isset($payload['text']['message'])) {
        $phoneNumber = $payload['phone']; 
        $messageText = $payload['text']['message'];
        log_message("Payload Type 'ReceivedCallback' matched. Phone: {$phoneNumber}, Message: {$messageText}", 'DEBUG', 'webhook_log.txt');
    }
    // Tenta extrair de 'messages' (formato comum de lista da Z-API, ex: de 'events')
    else if (isset($payload['messages']) && is_array($payload['messages'])) {
        foreach ($payload['messages'] as $message) {
            if (isset($message['type']) && $message['type'] === 'chat' && isset($message['text'])) {
                $phoneNumber = $message['senderNumber'] ?? null; 
                $messageText = $message['text']['content'] ?? null; 
                log_message("Payload Type 'messages' array matched. Phone: {$phoneNumber}, Message: {$messageText}", 'DEBUG', 'webhook_log.txt');
                break; 
            }
        }
    }
    // Tenta extrair de 'event' (formato de evento específico da Z-API)
    else if (isset($payload['event']) && $payload['event'] === 'MESSAGE' && isset($payload['message'])) {
        $message = $payload['message'];
        if (isset($message['type']) && $message['type'] === 'chat' && isset($message['text'])) {
            $phoneNumber = $message['senderNumber'] ?? null;
            $messageText = $message['text']['content'] ?? null;
            log_message("Payload Type 'event MESSAGE' matched. Phone: {$phoneNumber}, Message: {$messageText}", 'DEBUG', 'webhook_log.txt');
        }
    }
    // Tenta extrair de payload raiz (formato mais antigo ou de API da Z-API)
    else if (isset($payload['longText']) && isset($payload['sender'])) { 
        $phoneNumber = $payload['sender'];
        $messageText = $payload['longText'];
        log_message("Payload Type 'longText/sender' matched. Phone: {$phoneNumber}, Message: {$messageText}", 'DEBUG', 'webhook_log.txt');
    }
    // Fallback para outros formatos ou se não encontrar nos anteriores (ajustado para texto aninhado)
    else if (isset($payload['text']) && isset($payload['from'])) { 
        $phoneNumber = $payload['from'];
        $messageText = is_array($payload['text']) ? ($payload['text']['content'] ?? $payload['text']['message'] ?? null) : $payload['text'];
        log_message("Payload Type 'text/from' matched. Phone: {$phoneNumber}, Message: {$messageText}", 'DEBUG', 'webhook_log.txt');
    } else {
        log_message("No specific payload type matched. Attempting to extract from common fields.", 'DEBUG', 'webhook_log.txt');
    }


    if ($phoneNumber && $messageText !== null) { 
        log_message("Mensagem recebida de {$phoneNumber}: '{$messageText}'", 'INFO', 'webhook_log.txt');
        
        try {
            $bot = new WhatsAppBotPHP();
            $bot->processIncomingMessage($phoneNumber, $messageText);
        } catch (Exception $e) {
            log_message("❌ Erro ao processar mensagem com WhatsAppBotPHP: " . $e->getMessage(), 'ERROR', 'webhook_log.txt');
        }

    } else {
        log_message("Payload recebido não contém mensagem de texto ou número do remetente identificável. Payload: " . $raw_input, 'WARNING', 'webhook_log.txt');
    }

    http_response_code(200);
    echo json_encode(['status' => 'received', 'message' => 'Event processed']);
    exit();
}

log_message("Received unsupported HTTP method: " . $_SERVER['REQUEST_METHOD'], 'ERROR', 'webhook_log.txt');
http_response_code(405); 
echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
exit();
?>