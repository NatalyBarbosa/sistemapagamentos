<?php
// api_bot.php
// Este arquivo é o endpoint da API para o bot do WhatsApp.
// Ele autentica requisições do bot e roteia para as funções apropriadas.

require_once __DIR__ . '/config.php'; // Inclui as configurações globais e a função de log
// Aqui você pode incluir outras funções de API (get_orders.php, etc.)

// Autenticação simples baseada no BOT_API_TOKEN
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (!defined('BOT_API_TOKEN') || strpos($authHeader, 'Bearer ') !== 0 || substr($authHeader, 7) !== BOT_API_TOKEN) {
    log_message("❌ Acesso não autorizado à API do bot.", 'WARNING', 'api_bot_log.log');
    http_response_code(401); // Unauthorized
    echo json_encode(['success' => false, 'message' => 'Acesso não autorizado.']);
    exit();
}

// Extrair o endpoint da requisição (ex: ordens/solicitante, relatorios/diario)
$endpoint = $_GET['endpoint'] ?? '';
$params = $_GET; // Todos os parâmetros GET, incluindo o endpoint

// Lógica de roteamento para diferentes endpoints
switch ($endpoint) {
    case 'ordens/solicitante':
        // Exemplo: Incluir e chamar uma função do arquivo api_orders.php
        // require_once __DIR__ . '/api_orders.php';
        // $response = getOrdersBySolicitant($params['solicitant']);
        // Mas por enquanto, vamos mockar uma resposta
        log_message("Chamada à API: ordens/solicitante para " . ($params['solicitant'] ?? 'N/A'), 'INFO', 'api_bot_log.log');
        echo json_encode([
            'success' => true,
            'data' => [
                ['id' => 'OP-001', 'favoredName' => 'Empresa A', 'paymentValue' => 100.00, 'status' => 'Pendente', 'priority' => 'Normal', 'generationDate' => '2025-12-19', 'paymentForecast' => '2025-12-25', 'solicitant' => 'Rafael Sayd'],
                ['id' => 'OP-002', 'favoredName' => 'Empresa B', 'paymentValue' => 250.00, 'status' => 'Aguardando Financeiro', 'priority' => 'Urgencia', 'generationDate' => '2025-12-18', 'paymentForecast' => '2025-12-20', 'solicitant' => 'Rafael Sayd'],
            ],
            'total_valor' => 350.00
        ]);
        break;

    case 'ordens/detalhes':
        log_message("Chamada à API: ordens/detalhes para ID " . ($params['id'] ?? 'N/A'), 'INFO', 'api_bot_log.log');
        // Você precisará implementar a lógica real para buscar detalhes da ordem do DB
        echo json_encode([
            'success' => true,
            'data' => ['id' => 'OP-001', 'favoredName' => 'Empresa A', 'paymentValue' => 100.00, 'status' => 'Pendente', 'priority' => 'Normal', 'generationDate' => '2025-12-19', 'paymentForecast' => '2025-12-25', 'solicitant' => 'Rafael Sayd', 'process' => 'Vendas', 'direction' => 'Tiago', 'reference' => 'Pedido #123', 'observation' => 'Observação teste.', 'approvedByDiretoria' => false, 'approvedByFinanceiro' => false, 'payments' => []],
        ]);
        break;

    case 'ordens/pendentes-aprovacao':
        log_message("Chamada à API: ordens/pendentes-aprovacao", 'INFO', 'api_bot_log.log');
        echo json_encode([
            'success' => true,
            'data' => [
                ['id' => 'OP-003', 'favoredName' => 'Fornecedor X', 'paymentValue' => 500.00, 'status' => 'Pendente', 'priority' => 'Emergencia', 'generationDate' => '2025-12-19', 'paymentForecast' => '2025-12-19', 'solicitant' => 'Verônica'],
            ],
            'total_valor' => 500.00
        ]);
        break;

    // ... implementar outros cases para os endpoints que seu bot chama
    // (ordens/aguardando-financeiro, ordens/fila-pagamento, ordens/por-status, ordens/emergencia, etc.)

    default:
        log_message("❌ Endpoint da API do bot não encontrado: " . $endpoint, 'ERROR', 'api_bot_log.log');
        http_response_code(404); // Not Found
        echo json_encode(['success' => false, 'message' => 'Endpoint não encontrado.']);
        break;
}
?>