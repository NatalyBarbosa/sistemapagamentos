<?php

// replicate_salaries.php (Versão Corrigida - Apenas Parâmetros Nomeados)

// ABRIR BUFFER DE SAÍDA IMEDIATAMENTE.
ob_start();

// Configurações de exibição de erros agressivas para depuração
ini_set('display_errors', 1);
error_reporting(E_ALL);

// CORS headers - Devem ser enviados antes de qualquer conteúdo.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle pre-flight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    exit(0);
}

$configFilePath = __DIR__ . '/config.php'; 

if (!file_exists($configFilePath)) {
    log_message("CRITICAL ERROR: config.php not found at: " . $configFilePath, 'CRITICAL');
    ob_end_clean();
    echo json_encode(['success' => false, 'error' => 'Configuration file not found. Please contact support.']);
    exit();
}

require_once $configFilePath; 

if (!function_exists('log_message')) {
    error_log("CRITICAL ERROR: log_message function not available after including config.php. Check config.php for issues.");
    
    function log_message($message, $level = 'info', $logFileName = 'general_log.log') {
        file_put_contents(__DIR__ . '/fallback_log.log', date('Y-m-d H:i:s') . " [{$level}] " . $message . PHP_EOL, FILE_APPEND);
    }
}

log_message("Script replicate_salaries.php iniciado.", 'DEBUG');

// Função para parsear a string de mês/13º salário (igual à do JavaScript)
function parseCustomMonthString($monthStr) {
    $data = ['year' => null, 'month' => null, 'part' => null];

    // Tenta formato AAAA-13-P1/P2
    if (preg_match('/^(\d{4})-13-(P[12])$/', $monthStr, $matches)) {
        $data['year'] = (int)$matches[1];
        $data['month'] = 13;
        $data['part'] = $matches[2];
        return $data;
    }

    // Tenta formato AAAA-13 (13º genérico)
    if (preg_match('/^(\d{4})-13$/', $monthStr, $matches)) {
        $data['year'] = (int)$matches[1];
        $data['month'] = 13;
        $data['part'] = null;
        return $data;
    }

    // Tenta formato AAAA-MM (mês normal, 01-12)
    if (preg_match('/^(\d{4})-(0[1-9]|1[0-2])$/', $monthStr, $matches)) {
        $data['year'] = (int)$matches[1];
        $data['month'] = (int)$matches[2];
        $data['part'] = null;
        return $data;
    }

    return null;
}

$pdo = null;

try {

    $pdo = getDBConnection();

    $input = file_get_contents('php://input');
    log_message("Recebendo input RAW: " . $input, 'DEBUG'); 

    $data = json_decode($input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        $jsonError = json_last_error_msg();
        log_message("Erro ao decodificar JSON de entrada: " . $jsonError . " Input RAW: " . $input, 'ERROR');
        throw new Exception("Dados de entrada inválidos (JSON malformado): " . $jsonError);
    }

    log_message("Input JSON decodificado: " . json_encode($data), 'DEBUG');

    // ===== VALIDAR PARÂMETROS OBRIGATÓRIOS =====
    if (!isset($data['sourceMonth']) || !isset($data['targetMonth'])) {
        log_message("Requisição inválida: sourceMonth ou targetMonth ausentes. Data recebida: " . json_encode($data), 'WARNING');
        throw new Exception("Os meses de origem e destino são obrigatórios.");
    }

    $sourceMonthStr = $data['sourceMonth']; 
    $targetMonthStr = $data['targetMonth']; 
    $forceReplicate = (isset($data['force'])) ? $data['force'] : false;

    // ===== OBTER ARRAY DE IDs SELECIONADOS =====
    $selectedIds = isset($data['selectedIds']) && is_array($data['selectedIds']) ? $data['selectedIds'] : [];
    
    log_message("IDs selecionados para replicação: " . json_encode($selectedIds), 'DEBUG');
    log_message("Total de IDs selecionados: " . count($selectedIds), 'DEBUG');

    // Validar e limpar os IDs
    $selectedIds = array_map('strval', $selectedIds);
    $selectedIds = array_filter($selectedIds);

    $sourceData = parseCustomMonthString($sourceMonthStr);
    $targetData = parseCustomMonthString($targetMonthStr);

    if ($sourceData === null) {
        log_message("Formato de mês de origem inválido. sourceMonthStr={$sourceMonthStr}.", 'WARNING');
        throw new Exception("Formato de mês de origem inválido. Por favor, use YYYY-MM, YYYY-13, ou YYYY-13-P1/P2.");
    }

    if ($targetData === null) {
        log_message("Formato de mês de destino inválido. targetMonthStr={$targetMonthStr}.", 'WARNING');
        throw new Exception("Formato de mês de destino inválido. Por favor, use YYYY-MM, YYYY-13, ou YYYY-13-P1/P2.");
    }

    if ($sourceMonthStr === $targetMonthStr) {
        log_message("Tentativa de replicar o mês {$sourceMonthStr} para ele mesmo. Operação cancelada.", 'INFO');
        throw new Exception("O mês de origem e o mês de destino não podem ser os mesmos.");
    }

    $finalTargetMonthDbString = $targetData['year'] . '-' . str_pad($targetData['month'], 2, '0', STR_PAD_LEFT);

    if ($targetData['part']) {
        $finalTargetMonthDbString .= '-' . $targetData['part'];
    }

    log_message("String de destino final para o DB (finalTargetMonthDbString): '{$finalTargetMonthDbString}'", 'DEBUG');

    $pdo->beginTransaction();
    log_message("Transação do DB iniciada para replicação de {$sourceMonthStr} para {$finalTargetMonthDbString}.", 'DEBUG');

    $targetMonthCheckPattern = $targetData['year'] . '-' . str_pad($targetData['month'], 2, '0', STR_PAD_LEFT);
    log_message("Padrão de checagem para mês de destino (targetMonthCheckPattern): '{$targetMonthCheckPattern}%'", 'DEBUG');

    $checkExistingStmt = $pdo->prepare("SELECT COUNT(*) FROM salaries WHERE month LIKE :targetMonthPattern");
    $checkExistingStmt->execute([':targetMonthPattern' => $targetMonthCheckPattern . '%']);
    $existingSalariesCount = $checkExistingStmt->fetchColumn();

    if ($existingSalariesCount > 0 && !$forceReplicate) {
        $pdo->rollBack();
        log_message("Já existem {$existingSalariesCount} registros para o mês de destino ({$finalTargetMonthDbString}). Requer confirmação.", 'INFO');
        
        $output = ['success' => false, 'requireConfirmation' => true, 'error' => "Já existem $existingSalariesCount registro(s) para o mês de destino ({$finalTargetMonthDbString}). Deseja forçar a replicação? (Os registros existentes NÃO serão sobrescritos, mas novos serão adicionados.)"];
        
        $buffer_content = ob_get_clean(); 
        if (!empty($buffer_content)) {
            log_message("BUFFER CAPTURADO ANTES DO JSON: " . trim($buffer_content), 'WARNING', 'buffer_output.log');
        }

        echo json_encode($output);
        exit();
    }

    $sourceMonthSearchPattern = $sourceData['year'] . '-' . str_pad($sourceData['month'], 2, '0', STR_PAD_LEFT);

    if ($sourceData['part']) {
        $sourceMonthSearchPattern .= '-' . $sourceData['part'];
    }

    log_message("Padrão de busca para o mês de origem (sourceMonthSearchPattern): '{$sourceMonthSearchPattern}%'", 'DEBUG');

    // ===== CONSTRUIR SQL BASEADO EM IDs SELECIONADOS OU TODOS OS REGISTROS =====
    
    if (!empty($selectedIds) && count($selectedIds) > 0) {
        // Se há IDs selecionados, replicar APENAS esses
        
        log_message("Replicando salários SELECIONADOS. Total: " . count($selectedIds), 'DEBUG');
        
        // Criar placeholders nomeados para os IDs (:id_0, :id_1, etc.)
        $idPlaceholders = [];
        $paramsSelect = [];
        
        foreach ($selectedIds as $index => $id) {
            $paramName = ':id_' . $index;
            $idPlaceholders[] = $paramName;
            $paramsSelect[$paramName] = $id;
        }
        
        // Adicionar o padrão de mês aos parâmetros nomeados
        $paramsSelect[':sourceMonthPattern'] = $sourceMonthSearchPattern . '%';
        
        // IMPORTANTE: Usar APENAS parâmetros nomeados
        $sqlSelect = "SELECT id, type, favoredName, bank, agency, account, operation, process, value, createdBy 
                      FROM salaries 
                      WHERE id IN (" . implode(',', $idPlaceholders) . ") 
                      AND month LIKE :sourceMonthPattern 
                      AND isBackedUp = 0";
        
        log_message("SQL SELECT query para IDs selecionados: " . $sqlSelect, 'DEBUG');
        log_message("Parâmetros do SQL SELECT: " . json_encode($paramsSelect), 'DEBUG');
        
        $selectStmt = $pdo->prepare($sqlSelect);
        $selectStmt->execute($paramsSelect);
        $sourceSalaries = $selectStmt->fetchAll(PDO::FETCH_ASSOC);
        
        log_message("Número de salários SELECIONADOS encontrados no DB: " . count($sourceSalaries), 'DEBUG');
        
    } else {
        // Se nenhum ID foi selecionado, replicar TODOS do mês (comportamento original)
        
        log_message("Replicando TODOS os salários do mês {$sourceMonthStr}.", 'DEBUG');
        
        $sqlSelect = "SELECT id, type, favoredName, bank, agency, account, operation, process, value, createdBy 
                      FROM salaries 
                      WHERE month LIKE :sourceMonthPattern 
                      AND isBackedUp = 0";
        
        log_message("SQL SELECT query para TODOS os registros do mês: " . $sqlSelect, 'DEBUG');
        
        $selectStmt = $pdo->prepare($sqlSelect);
        $paramsSelect = [':sourceMonthPattern' => $sourceMonthSearchPattern . '%'];
        
        log_message("Parâmetros do SQL SELECT: " . json_encode($paramsSelect), 'DEBUG');
        
        $selectStmt->execute($paramsSelect);
        $sourceSalaries = $selectStmt->fetchAll(PDO::FETCH_ASSOC);
        
        log_message("Número de salários de origem encontrados no DB: " . count($sourceSalaries), 'DEBUG');
    }

    if (empty($sourceSalaries)) {
        $pdo->rollBack();
        log_message("Nenhum registro válido encontrado no mês {$sourceMonthStr} para replicar, após a consulta ao DB.", 'INFO');
        
        $output = ['success' => false, 'error' => "Nenhum registro válido encontrado no mês {$sourceMonthStr} para replicação. Verifique se o mês de origem contém salários visíveis."];
        $buffer_content = ob_get_clean();
        if (!empty($buffer_content)) {
            log_message("BUFFER CAPTURADO ANTES DO JSON: " . trim($buffer_content), 'WARNING', 'buffer_output.log');
        }

        echo json_encode($output);
        exit();
    }

    $addedCount = 0;

    foreach ($sourceSalaries as $salary) {
        $uniqueId = uniqid('rep_', true) . bin2hex(random_bytes(4));

        $stmtInsert = $pdo->prepare("
            INSERT INTO salaries (
                id, type, favoredName, bank, agency, account, operation, process, 
                value, month, createdBy, createdAt, isBackedUp
            ) VALUES (
                :newId, :type, :favoredName, :bank, :agency, :account, :operation, :process, 
                :value, :finalTargetMonthDbString, :createdBy, NOW(), :isBackedUp
            )
        ");

        $stmtInsert->execute([
            ':newId' => $uniqueId,
            ':type' => $salary['type'],
            ':favoredName' => $salary['favoredName'],
            ':bank' => $salary['bank'],
            ':agency' => $salary['agency'],
            ':account' => $salary['account'],
            ':operation' => $salary['operation'],
            ':process' => $salary['process'],
            ':value' => $salary['value'],
            ':finalTargetMonthDbString' => $finalTargetMonthDbString,
            ':createdBy' => (isset($salary['createdBy']) ? $salary['createdBy'] : 'Sistema (Replicação)'),
            ':isBackedUp' => 0 
        ]);

        $addedCount++;
    }

    $pdo->commit();

    // Mensagem específica
    $replicationMode = (!empty($selectedIds) && count($selectedIds) > 0) ? "SELECIONADOS" : "TODOS";
    $message = "Sucesso! {$addedCount} registro(s) ({$replicationMode}) replicado(s) de {$sourceMonthStr} para {$finalTargetMonthDbString}.";

    if ($existingSalariesCount > 0) {
        $message .= " Já existiam {$existingSalariesCount} registro(s) no mês de destino. Total agora: " . ($existingSalariesCount + $addedCount) . ".";
    } else {
        $message .= " Nenhum registro existia previamente no mês de destino.";
    }

    log_message("Transação do DB para replicação de {$sourceMonthStr} para {$finalTargetMonthDbString} confirmada. {$addedCount} registros adicionados. Replicação: {$replicationMode}. Mensagem final: {$message}", 'INFO', 'replication_log.log');

    $output = ['success' => true, 'message' => $message, 'addedCount' => $addedCount];

    $buffer_content = ob_get_clean();
    if (!empty($buffer_content)) {
        log_message("BUFFER CAPTURADO ANTES DO JSON (SUCCESS): " . trim($buffer_content), 'WARNING', 'buffer_output.log');
    }

    echo json_encode($output);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
        log_message("Transação de replicação revertida devido a erro: " . $e->getMessage(), 'ERROR');
    }

    $errorMessage = "Erro ao replicar os registros: " . $e->getMessage();
    log_message($errorMessage . " (Origem: " . ($sourceMonthStr ?? 'N/A') . ", Destino: " . ($targetMonthStr ?? 'N/A') . ")", 'ERROR', 'replication_error.log');

    $output = ['success' => false, 'error' => $errorMessage];
    $buffer_content = ob_get_clean();
    if (!empty($buffer_content)) {
        log_message("BUFFER CAPTURADO ANTES DO JSON (ERROR): " . trim($buffer_content), 'WARNING', 'buffer_output.log');
    }

    echo json_encode($output);

} finally {
    log_message("Script replicate_salaries.php finalizado.", 'DEBUG');
}

?>