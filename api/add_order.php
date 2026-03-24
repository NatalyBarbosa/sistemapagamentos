<?php
// Cabeçalhos HTTP para JSON, CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Permite requisições de qualquer origem (ajuste para seu domínio em produção)
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'db_connect.php'; // Garante que as configurações de fuso horário do PHP e MySQL sejam aplicadas.

$input = json_decode(file_get_contents('php://input'), true);

// --- INÍCIO DO TRECHO DE DEBUG ADICIONADO (MANTIDO E MELHORADO) ---
error_log('DEBUG add_order.php: Dados recebidos via JSON: ' . print_r($input, true));
if (isset($input['direction'])) {
    error_log('DEBUG add_order.php: Valor de direction recebido: "' . $input['direction'] . '" (Tipo: ' . gettype($input['direction']) . ', Tamanho: ' . strlen($input['direction']) . ')');
} else {
    error_log('DEBUG add_order.php: Campo direction NÃO está presente no input.');
}
// NOVO DEBUG PARA sendProofToWhatsApp
if (isset($input['sendProofToWhatsApp'])) {
    error_log('DEBUG add_order.php: Valor de sendProofToWhatsApp recebido: "' . var_export($input['sendProofToWhatsApp'], true) . '" (Tipo: ' . gettype($input['sendProofToWhatsApp']) . ')');
} else {
    error_log('DEBUG add_order.php: Campo sendProofToWhatsApp NÃO está presente no input.');
}
// NOVO DEBUG PARA company <<<< ADICIONADO AQUI <<<<
if (isset($input['company'])) {
    error_log('DEBUG add_order.php: Valor de company recebido: "' . $input['company'] . '" (Tipo: ' . gettype($input['company']) . ', Tamanho: ' . strlen($input['company']) . ')');
} else {
    error_log('DEBUG add_order.php: Campo company NÃO está presente no input.');
}
// --- FIM DO TRECHO DE DEBUG ADICIONADO ---


// Verifica se o ID da ordem foi fornecido, que é essencial para o JavaScript do frontend
if (!isset($input['id'])) {
    echo json_encode(['success' => false, 'error' => 'ID da ordem não fornecido.']);
    exit();
}

try {
    // --- TRATAMENTO DE DATAS ---
    // Pega a data de geração do input e formata para 'YYYY-MM-DD'.
    // Adiciona ' 12:00:00' para evitar problemas de fuso horário em torno da meia-noite.
    // Se estiver vazio, define como null para o banco de dados.
    $generationDateInput = $input['generationDate'] ?? null;
    $formattedGenerationDate = !empty($generationDateInput) ? date('Y-m-d', strtotime($generationDateInput . ' 12:00:00')) : null;

    // Pega a previsão de pagamento do input e formata para 'YYYY-MM-DD'.
    $paymentForecastInput = $input['paymentForecast'] ?? null;
    $formattedPaymentForecast = !empty($paymentForecastInput) ? date('Y-m-d', strtotime($paymentForecastInput . ' 12:00:00')) : null;
    // --- FIM TRATAMENTO DE DATAS ---

    // --- NOVA LÓGICA PARA sendProofToWhatsApp ---
    // Converte o valor booleano do frontend (true/false) para 1 ou 0 para o TINYINT(1) no DB
    $sendProofToWhatsApp = isset($input['sendProofToWhatsApp']) ? (int)(bool)$input['sendProofToWhatsApp'] : 0;
    // --- FIM NOVA LÓGICA ---

    // --- NOVA VARIÁVEL: Extrai o campo 'company' do input <<<< ADICIONADO AQUI <<<< ---
    $company = $input['company'] ?? null;
    // --- FIM NOVA VARIÁVEL ---

    $stmt = $pdo->prepare("
        INSERT INTO orders (
            id, favoredName, priority, paymentType, paymentValue, status, generationDate, 
            paymentForecast, company, process, direction, reference, solicitant, otherSolicitantName, -- <<<< 'company' ADICIONADO AQUI <<<<
            observation, approvedByDiretoria, approvedByFinanceiro, isPaid, pixKeyType, 
            pixKey, linhaDigitavel, bankDetails, payments, 
            boletoData, boletoFileName, boletoMimeType,
            sendProofToWhatsApp,
            created_at, updated_at
        ) VALUES (
            :id, :favoredName, :priority, :paymentType, :paymentValue, :status, :generationDate, 
            :paymentForecast, :company, :process, :direction, :reference, :solicitant, :otherSolicitantName, -- <<<< ':company' ADICIONADO AQUI <<<<
            :observation, :approvedByDiretoria, :approvedByFinanceiro, :isPaid, :pixKeyType, 
            :pixKey, :linhaDigitavel, :bankDetails, :payments, 
            :boletoData, :boletoFileName, :boletoMimeType,
            :sendProofToWhatsApp,
            NOW(), NOW()
        )
    ");

    // Garante que o campo payments seja uma string JSON antes de salvar
    $paymentsJson = json_encode($input['payments'] ?? []);

    // --- NOVA LÓGICA MAIS EXPLÍCITA PARA O CAMPO 'direction' ---
    $directionToSave = null;
    if (isset($input['direction']) && is_string($input['direction'])) {
        $trimmedDirection = trim($input['direction']);
        // Verificação específica para 'Lucas' (caso haja algum problema de codificação invisível)
        if ($trimmedDirection === 'Lucas') {
            $directionToSave = 'Lucas';
        } 
        // Para qualquer outro valor não-vazio
        else if (strlen($trimmedDirection) > 0) {
            $directionToSave = $trimmedDirection;
        }
    }
    // --- FIM NOVA LÓGICA ---

    $stmt->execute([
        ':id' => $input['id'],
        ':favoredName' => $input['favoredName'],
        ':priority' => $input['priority'] ?? 'Normal',
        ':paymentType' => $input['paymentType'],
        ':paymentValue' => $input['paymentValue'],
        ':status' => $input['status'] ?? 'Pendente',
        ':generationDate' => $formattedGenerationDate, // Usando a data formatada
        ':paymentForecast' => $formattedPaymentForecast, // Usando a data formatada
        ':company' => $company, // <<<< ADICIONADO O BIND DO NOVO PARÂMETRO AQUI <<<<
        ':process' => $input['process'] ?? null,
        ':direction' => $directionToSave, // USANDO A NOVA VARIÁVEL AQUI
        ':reference' => $input['reference'] ?? null,
        ':solicitant' => $input['solicitant'] ?? null,
        ':otherSolicitantName' => $input['otherSolicitantName'] ?? null,
        ':observation' => $input['observation'] ?? null,
        ':approvedByDiretoria' => (int)($input['approvedByDiretoria'] ?? false),
        ':approvedByFinanceiro' => (int)($input['approvedByFinanceiro'] ?? false),
        ':isPaid' => (int)($input['isPaid'] ?? false),
        ':pixKeyType' => $input['pixKeyType'] ?? null,
        ':pixKey' => $input['pixKey'] ?? null,
        ':linhaDigitavel' => $input['linhaDigitavel'] ?? null,
        ':bankDetails' => $input['bankDetails'] ?? null,
        ':payments' => $paymentsJson,
        ':boletoData' => $input['boletoData'] ?? null,
        ':boletoFileName' => $input['boletoFileName'] ?? null,
        ':boletoMimeType' => $input['boletoMimeType'] ?? null,
        ':sendProofToWhatsApp' => $sendProofToWhatsApp
    ]);

    echo json_encode(['success' => true, 'message' => 'Ordem adicionada com sucesso.']);

} catch(PDOException $e) {
    // Melhorar o log de erro para incluir a mensagem completa da exceção
    error_log('Erro ao adicionar ordem: ' . $e->getMessage()); 
    // Em produção, evite mostrar $e->getMessage() diretamente ao usuário por segurança.
    echo json_encode(['success' => false, 'error' => 'Erro ao adicionar ordem. Por favor, tente novamente.', 'details' => $e->getMessage()]); // Adicionei 'details' para facilitar o debug
}
?>