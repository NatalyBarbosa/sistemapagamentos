<?php
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
die("EXECUTANDO NOVA VERSAO - " . date('Y-m-d H:i:s')); // Adicione esta linha temporariamente
require_once 'db_connect.php'; // Garante que as configurações de fuso horário do PHP e MySQL sejam aplicadas.

ini_set('display_errors', 0); // Não mostra erros no navegador (para JSON)
ini_set('log_errors', 1);     // Loga erros em arquivo
ini_set('error_log', __DIR__ . '/php_error.log'); // Defina um caminho real e gravável para o log

// Função para parsear a string de mês/13º salário (igual à do JavaScript)
function parseCustomMonthString($monthStr) {
    $data = ['year' => null, 'month' => null, 'part' => null];

    // Tenta formato AAAA-13-P1/P2
    if (preg_match('/^(\d{4})-13-(P[12])$/', $monthStr, $matches)) {
        $data['year'] = (int)$matches[1];
        $data['month'] = 13; // Indicador para 13º salário
        $data['part'] = $matches[2]; // 'P1' ou 'P2'
        return $data;
    }

    // Tenta formato AAAA-13 (13º genérico)
    if (preg_match('/^(\d{4})-13$/', $monthStr, $matches)) {
        $data['year'] = (int)$matches[1];
        $data['month'] = 13;
        $data['part'] = null; // Sem parte específica
        return $data;
    }

    // Tenta formato AAAA-MM (mês normal, 01-12)
    if (preg_match('/^(\d{4})-(0[1-9]|1[0-2])$/', $monthStr, $matches)) {
        $data['year'] = (int)$matches[1];
        $data['month'] = (int)$matches[2];
        $data['part'] = null;
        return $data;
    }

    return null; // Formato inválido
}

// Limpa o buffer de saída para evitar que warnings/notices PHP contaminem o JSON
if (ob_get_length()) {
    ob_clean();
}

$input = json_decode(file_get_contents('php://input'), true);

$sourceMonthStr = $input['sourceMonth'] ?? null;
$targetMonthStr = $input['targetMonth'] ?? null;
$favoredNameFilter = $input['favoredName'] ?? ''; // Opcional, para replicar apenas um favorecido
$forceReplicate = $input['force'] ?? false;

if (!$sourceMonthStr || !$targetMonthStr) {
    echo json_encode(['success' => false, 'error' => 'Os meses de origem e destino são obrigatórios.']);
    exit();
}

// === Parsear as strings de mês ===
$sourceData = parseCustomMonthString($sourceMonthStr);
$targetData = parseCustomMonthString($targetMonthStr);

if ($sourceData === null) {
    echo json_encode(['success' => false, 'error' => 'Formato de mês de origem inválido. Por favor, use AAAA-MM, AAAA-13 ou AAAA-13-P1/P2.']);
    exit();
}
if ($targetData === null) {
    echo json_encode(['success' => false, 'error' => 'Formato de mês de destino inválido. Por favor, use AAAA-MM, AAAA-13 ou AAAA-13-P1/P2.']);
    exit();
}

// === Construir a string de mês de destino para salvar no DB ===
// Esta é a string que será salva no campo 'month' da tabela 'salaries'
$finalTargetMonthDbString = $targetData['year'] . '-' . str_pad($targetData['month'], 2, '0', STR_PAD_LEFT);
if ($targetData['part']) {
    $finalTargetMonthDbString .= '-' . $targetData['part'];
}


try {
    $pdo->beginTransaction();

    // 1. Verificar se já existem salários para o mês de destino (targetMonth)
    // Usamos LIKE para cobrir AAAA-MM, AAAA-13, AAAA-13-P1/P2 de forma flexível
    $checkExistingStmt = $pdo->prepare("SELECT COUNT(*) FROM salaries WHERE month LIKE :targetMonthPattern");
    $checkExistingStmt->execute([':targetMonthPattern' => $finalTargetMonthDbString . '%']); // '2029-13-P2%'
    $existingSalariesCount = $checkExistingStmt->fetchColumn();

    if ($existingSalariesCount > 0 && !$forceReplicate) {
        $pdo->rollBack();
        echo json_encode([
            'success' => false,
            'requireConfirmation' => true,
            'error' => "Já existem $existingSalariesCount registros para o mês de destino ({$finalTargetMonthDbString}). Deseja forçar a replicação? (Os registros existentes NÃO serão sobrescritos, mas novos serão adicionados.)"
        ]);
        exit();
    }

    // 2. Selecionar os salários do mês de origem (sourceData)
    $sourceMonthPattern = $sourceData['year'] . '-' . str_pad($sourceData['month'], 2, '0', STR_PAD_LEFT);
    if ($sourceData['part']) {
        $sourceMonthPattern .= '-' . $sourceData['part'];
    }
    // Usamos LIKE para a seleção, caso o DB tenha '2028-13-P2' e a busca seja '2028-13' (genérico)
    // ou para garantir que a parte seja exata se especificada.
    $selectStmt = $pdo->prepare("SELECT * FROM salaries WHERE month LIKE :sourceMonthPattern AND (:favoredName IS NULL OR favoredName = :favoredName)");
    $selectStmt->execute([
        ':sourceMonthPattern' => $sourceMonthPattern . '%', // Adiciona '%' para buscar a parte específica ou genérica
        ':favoredName' => $favoredNameFilter ?: null
    ]);
    $sourceSalaries = $selectStmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($sourceSalaries)) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => "Nenhum salário encontrado para o mês de origem ($sourceMonthStr)."]);
        exit();
    }

    $replicatedCount = 0;
    foreach ($sourceSalaries as $salary) {
        $newId = uniqid('', true); // Gerar um ID único para cada salário replicado

        // Inserir o novo salário com o mês de destino
        $insertStmt = $pdo->prepare("
            INSERT INTO salaries (
                id, type, favoredName, bank, agency, account, operation, process, 
                value, month, createdBy, createdAt, isBackedUp
            ) VALUES (
                :newId, :type, :favoredName, :bank, :agency, :account, :operation, :process, 
                :value, :finalTargetMonthDbString, :createdBy, NOW(), :isBackedUp
            )
        ");

        $insertStmt->execute([
            ':newId' => $newId,
            ':type' => $salary['type'],
            ':favoredName' => $salary['favoredName'],
            ':bank' => $salary['bank'],
            ':agency' => $salary['agency'],
            ':account' => $salary['account'],
            ':operation' => $salary['operation'],
            ':process' => $salary['process'],
            ':value' => $salary['value'],
            ':finalTargetMonthDbString' => $finalTargetMonthDbString, // Usa a string de destino completa
            ':createdBy' => $salary['createdBy'],
            ':isBackedUp' => 0 // Salários replicados não devem ser arquivados por padrão
        ]);
        $replicatedCount++;
    }

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => "$replicatedCount salários replicados com sucesso de $sourceMonthStr para $finalTargetMonthDbString."]);

} catch(PDOException $e) {
    $pdo->rollBack();
    error_log('Erro na replicação de salários: ' . $e->getMessage() . ' - SQLSTATE: ' . $e->getCode());
    echo json_encode(['success' => false, 'error' => 'Erro ao replicar salários: ' . $e->getMessage()]);
}

function uniqid($prefix = '', $more_entropy = false) {
    // Implementação simples de uniqid se não estiver disponível
    if (function_exists('uniqid')) {
        return uniqid($prefix, $more_entropy);
    } else {
        // Fallback simples para ambientes sem uniqid, não garantido ser único globalmente.
        // Melhorar para um gerador de UUID real se a unicidade for crítica.
        $s = microtime(true);
        $s = str_replace('.', '', $s);
        $s .= mt_rand(1000, 999999);
        return $prefix . $s;
    }
}
?>