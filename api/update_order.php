<?php
// update_order.php
require_once 'db_connect.php'; // Certifique-se de que o caminho para sua conexão com o BD está correto.
// O arquivo db_connect.php deve configurar o PDO para lançar exceções para que o try/catch funcione corretamente.
// Ex: $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

header('Content-Type: application/json');
$input = json_decode(file_get_contents('php://input'), true);

// 1. Validação inicial: ID da ordem é obrigatório.
if (!isset($input['id'])) {
    echo json_encode(['success' => false, 'error' => 'ID da ordem não fornecido.']);
    exit();
}

$orderId = $input['id'];
$updateFields = [];
$params = [];

// 2. Mapeamento de campos: Define como cada campo da entrada deve ser tratado.
// 'input_key' => ['db_column_name', 'type', 'allow_null_if_exists']
// - 'db_column_name': Nome da coluna no banco de dados.
// - 'type': Define o tipo de tratamento (string, float, boolean, date, json_string, raw_if_exists).
// - 'allow_null_if_exists': Se true, usa array_key_exists para verificar se o campo existe (permitindo null).
//                           Se false (padrão), usa isset (não permite null explícito).
$fieldMap = [
    // Campos de texto/string gerais
    'favoredName'           => ['favoredName', 'string'],
    'priority'              => ['priority', 'string'],
    'paymentValue'          => ['paymentValue', 'float'], // Tratado como float para valores monetários
    'status'                => ['status', 'string'], // Campo de status
    'process'               => ['process', 'string'],
    'direction'             => ['direction', 'string'],
    'reference'             => ['reference', 'string'],
    'solicitant'            => ['solicitant', 'string'],
    'otherSolicitantName'   => ['otherSolicitantName', 'string'],
    'observation'           => ['observation', 'string'],
    'company'               => ['company', 'string'],

    // Campos booleanos (convertidos para 0 ou 1)
    'approvedByDiretoria'   => ['approvedByDiretoria', 'boolean'],
    'approvedByFinanceiro'  => ['approvedByFinanceiro', 'boolean'],
    'isPaid'                => ['isPaid', 'boolean'], // Campo isPaid
    'sendProofToWhatsApp'   => ['sendProofToWhatsApp', 'boolean'], // Novo campo

    // Campos de data (formatados para YYYY-MM-DD, aceitam null)
    'generationDate'        => ['generationDate', 'date'],
    'paymentForecast'       => ['paymentForecast', 'date'],
    'approvalDateDiretoria' => ['approvalDateDiretoria', 'date'],
    'approvalDateFinanceiro'=> ['approvalDateFinanceiro', 'date'],
    'paymentCompletionDate' => ['paymentCompletionDate', 'date'],

    // Campos específicos de tipo de pagamento
    'pixKeyType'            => ['pixKeyType', 'string'],
    'pixKey'                => ['pixKey', 'string'],
    'linhaDigitavel'        => ['linhaDigitavel', 'string'],
    'bankDetails'           => ['bankDetails', 'string'],

    // Campo 'payments' (já vem como string JSON do frontend)
    'payments'              => ['payments', 'json_string'],

    // Campos de boleto e comprovante (permitem null explícito do frontend, ex: para limpar um campo)
    'boletoData'            => ['boletoData', 'raw_if_exists', true],
    'boletoFileName'        => ['boletoFileName', 'raw_if_exists', true],
    'boletoMimeType'        => ['boletoMimeType', 'raw_if_exists', true],
    'proofOfPaymentFile'    => ['proofOfPaymentFile', 'raw_if_exists', true],
    'proofOfPaymentData'    => ['proofOfPaymentData', 'raw_if_exists', true],
    'proofOfPaymentType'    => ['proofOfPaymentType', 'raw_if_exists', true],
];

// 3. Processamento dos campos com base no mapeamento
foreach ($fieldMap as $inputKey => $config) {
    // Extrai a configuração, definindo 'allow_null_if_exists' como false por padrão se não especificado
    list($dbColumn, $type, $allowNullIfExists) = array_pad($config, 3, false);

    // Determina se o campo deve ser processado (isset ou array_key_exists)
    $shouldProcess = $allowNullIfExists ? array_key_exists($inputKey, $input) : isset($input[$inputKey]);

    if ($shouldProcess) {
        $value = $input[$inputKey];
        $processedValue = null; // Valor padrão para campos que podem ser nulos

        switch ($type) {
            case 'string':
                $processedValue = (string)$value;
                break;
            case 'float':
                $processedValue = (float)$value;
                break;
            case 'boolean':
                $processedValue = (int)(bool)$value; // Garante 0 ou 1 no banco de dados
                break;
            case 'date':
                // Formata a data para YYYY-MM-DD. O ' 12:00:00' ajuda a evitar problemas de fuso horário.
                $processedValue = !empty($value) ? date('Y-m-d', strtotime($value . ' 12:00:00')) : null;
                break;
            case 'json_string':
            case 'raw_if_exists':
                $processedValue = $value; // Assume que o valor já está no formato correto ou é null
                break;
            default:
                error_log("Tipo desconhecido '$type' para o campo '$inputKey'.");
                continue 2; // Pula para a próxima iteração do foreach
        }

        $updateFields[] = "`$dbColumn` = :$dbColumn";
        $params[":$dbColumn"] = $processedValue;
    }
}

// 4. Verificação final: Se nenhum campo foi fornecido para atualização.
if (empty($updateFields)) {
    echo json_encode(['success' => false, 'error' => 'Nenhum campo para atualizar fornecido.']);
    exit();
}

try {
    $pdo->beginTransaction(); // INICIA A TRANSAÇÃO para garantir atomicidade.

    // 5. Constrói e executa a query SQL de atualização para a tabela 'orders'.
    $query = "UPDATE orders SET " . implode(', ', $updateFields) . ", updated_at = NOW() WHERE id = :id";
    $params[':id'] = $orderId; // Adiciona o ID da ordem aos parâmetros.

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);

    // 6. Lógica de dedução do `cash_value` no `app_settings` (corrigida para concorrência).
    if (isset($input['amountPaidInThisTransaction']) && $input['amountPaidInThisTransaction'] !== null) {
        $amountPaidInThisTransaction = (float)$input['amountPaidInThisTransaction'];

        if ($amountPaidInThisTransaction > 0) { // Apenas deduzir se o valor for positivo
            // 6.1. Obtenha o valor atual do caixa com um bloqueio (FOR UPDATE) para evitar corridas
            // de concorrência se múltiplas requisições tentarem atualizar o caixa ao mesmo tempo.
            $stmt_cash = $pdo->prepare("SELECT setting_value FROM app_settings WHERE setting_name = 'cash_value' LIMIT 1 FOR UPDATE");
            $stmt_cash->execute();
            $current_cash_value = (float)$stmt_cash->fetchColumn();

            // 6.2. Calcule o novo valor, garantindo que nunca seja negativo.
            $new_cash_value = max(0, $current_cash_value - $amountPaidInThisTransaction);

            // 6.3. Atualize o valor do caixa.
            $stmt_update_cash = $pdo->prepare("UPDATE app_settings SET setting_value = :new_value WHERE setting_name = 'cash_value'");
            $stmt_update_cash->execute([':new_value' => $new_cash_value]);

            // Opcional: Verifique se a atualização do caixa afetou alguma linha.
            if ($stmt_update_cash->rowCount() === 0) {
                // Isso pode indicar que a entrada 'cash_value' não existe em app_settings.
                error_log("Alerta: Não foi possível atualizar 'cash_value' em app_settings. A entrada pode não existir.");
            }
        }
    }

    $pdo->commit(); // CONFIRMA A TRANSAÇÃO se todas as operações foram bem-sucedidas.
    echo json_encode(['success' => true, 'message' => 'Ordem atualizada com sucesso.']);

} catch(PDOException $e) {
    $pdo->rollBack(); // REVERTE A TRANSAÇÃO em caso de erro de banco de dados.
    error_log('Erro PDO ao atualizar ordem: ' . $e->getMessage() . ' - Query: ' . ($query ?? 'N/A'));
    // Em produção, remova 'details' para não expor informações sensíveis.
    echo json_encode(['success' => false, 'error' => 'Erro ao atualizar ordem. Por favor, tente novamente.', 'details' => $e->getMessage()]);
} catch(Exception $e) {
    $pdo->rollBack(); // REVERTE A TRANSAÇÃO em caso de outras exceções.
    error_log('Erro geral ao atualizar ordem: ' . $e->getMessage());
    // Em produção, remova 'details'.
    echo json_encode(['success' => false, 'error' => 'Erro ao atualizar ordem. Por favor, tente novamente.', 'details' => $e->getMessage()]);
}