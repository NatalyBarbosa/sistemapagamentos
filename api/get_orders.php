<?php

// get_orders.php - Versão otimizada para all=true com streaming de dados

// ===== CONFIGURAÇÕES CRÍTICAS =====
set_time_limit(300); // 5 minutos de timeout
ini_set('memory_limit', '512M'); // Aumenta limite de memória
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// ===== CABEÇALHOS HTTP =====
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Sat, 26 Jul 1997 05:00:00 GMT');

// Log de início
error_log("[get_orders.php] INÍCIO - GET params: " . json_encode($_GET));

require_once 'db_connect.php';

try {
    // ===== VALIDAÇÃO DO PARÂMETRO 'all' =====
    $getAllRecords = isset($_GET['all']) && $_GET['all'] === 'true';
    
    // ===== INICIALIZAR CONDIÇÕES WHERE =====
    $whereConditions = ["isBackedUp = 0"];
    $queryParams = [];

    // --- FILTROS PADRÃO ---
    
    if (isset($_GET['status']) && is_array($_GET['status']) && !empty($_GET['status'])) {
        $statusPlaceholders = [];
        foreach ($_GET['status'] as $index => $statusValue) {
            $paramName = ":status_" . $index;
            $statusPlaceholders[] = $paramName;
            $queryParams[$paramName] = $statusValue;
        }
        $whereConditions[] = "status IN (" . implode(', ', $statusPlaceholders) . ")";
    }

    if (isset($_GET['priority']) && !empty($_GET['priority']) && $_GET['priority'] !== 'Todas') {
        $whereConditions[] = "priority = :priority";
        $queryParams[':priority'] = $_GET['priority'];
    }

    if (isset($_GET['paymentType']) && !empty($_GET['paymentType']) && $_GET['paymentType'] !== 'Todos') {
        $whereConditions[] = "paymentType = :paymentType";
        $queryParams[':paymentType'] = $_GET['paymentType'];
    }

    if (isset($_GET['direction']) && !empty($_GET['direction']) && $_GET['direction'] !== 'Todos') {
        $whereConditions[] = "direction = :direction";
        $queryParams[':direction'] = $_GET['direction'];
    }

    if (isset($_GET['solicitant']) && !empty($_GET['solicitant']) && $_GET['solicitant'] !== 'Todos') {
        $whereConditions[] = "solicitant = :solicitant";
        $queryParams[':solicitant'] = $_GET['solicitant'];
    }

    if (isset($_GET['company']) && !empty($_GET['company']) && $_GET['company'] !== 'Todas as Empresas') {
        $whereConditions[] = "company = :company";
        $queryParams[':company'] = $_GET['company'];
    }

    if (isset($_GET['process']) && !empty($_GET['process'])) {
        $whereConditions[] = "process LIKE :process";
        $queryParams[':process'] = '%' . $_GET['process'] . '%';
    }

    if (isset($_GET['searchTerm']) && !empty($_GET['searchTerm'])) {
        $searchTerm = '%' . $_GET['searchTerm'] . '%';
        $whereConditions[] = "(favoredName LIKE :searchTerm OR process LIKE :searchTerm2 OR reference LIKE :searchTerm3 OR observation LIKE :searchTerm4)";
        $queryParams[':searchTerm'] = $searchTerm;
        $queryParams[':searchTerm2'] = $searchTerm;
        $queryParams[':searchTerm3'] = $searchTerm;
        $queryParams[':searchTerm4'] = $searchTerm;
    }

    if (isset($_GET['valueMin']) && is_numeric($_GET['valueMin']) && $_GET['valueMin'] > 0) {
        $whereConditions[] = "paymentValue >= :valueMin";
        $queryParams[':valueMin'] = (float)$_GET['valueMin'];
    }

    if (isset($_GET['valueMax']) && is_numeric($_GET['valueMax'])) {
        $whereConditions[] = "paymentValue <= :valueMax";
        $queryParams[':valueMax'] = (float)$_GET['valueMax'];
    }

    if (isset($_GET['dateStart']) && !empty($_GET['dateStart'])) {
        $whereConditions[] = "generationDate >= :dateStart";
        $queryParams[':dateStart'] = $_GET['dateStart'];
    }

    if (isset($_GET['dateEnd']) && !empty($_GET['dateEnd'])) {
        $whereConditions[] = "generationDate <= :dateEnd";
        $queryParams[':dateEnd'] = $_GET['dateEnd'];
    }

    if (isset($_GET['forecastDateStart']) && !empty($_GET['forecastDateStart'])) {
        $whereConditions[] = "paymentForecast >= :forecastDateStart";
        $queryParams[':forecastDateStart'] = $_GET['forecastDateStart'];
    }

    if (isset($_GET['forecastDateEnd']) && !empty($_GET['forecastDateEnd'])) {
        $whereConditions[] = "paymentForecast <= :forecastDateEnd";
        $queryParams[':forecastDateEnd'] = $_GET['forecastDateEnd'];
    }

    // ===== CONSTRUIR CLÁUSULA WHERE =====
    $finalWhereClause = " WHERE " . implode(" AND ", $whereConditions);

    // ===== CONSTRUIR CLÁUSULA ORDER BY =====
    $orderByClause = " ORDER BY created_at DESC";
    
    if (isset($_GET['sortBy']) && !empty($_GET['sortBy'])) {
        $sortField = $_GET['sortBy'];
        $allowedSortFields = ['priority_date', 'paymentForecast', 'generationDate', 'paymentValue', 'paymentValue_asc', 'status', 'favoredName', 'process'];

        if ($sortField === 'priority_date') {
            $orderByClause = " ORDER BY 
                CASE priority
                    WHEN 'Emergencia' THEN 1
                    WHEN 'Urgencia' THEN 2
                    WHEN 'Normal' THEN 3
                    ELSE 4
                END ASC, paymentForecast ASC, generationDate DESC";
        } elseif (in_array($sortField, $allowedSortFields)) {
            $sortDirection = isset($_GET['sortDirection']) && strtoupper($_GET['sortDirection']) === 'ASC' ? 'ASC' : 'DESC';
            $orderByClause = " ORDER BY $sortField $sortDirection";
        }
    }

    // ===== CONTAR TOTAL DE REGISTROS FILTRADOS =====
    $sqlCount = "SELECT COUNT(*) AS total_filtered_records FROM orders" . $finalWhereClause;
    $stmtCount = $pdo->prepare($sqlCount);
    
    foreach ($queryParams as $paramName => $paramValue) {
        $stmtCount->bindValue($paramName, $paramValue);
    }
    
    $stmtCount->execute();
    $totalFilteredRecords = $stmtCount->fetch(PDO::FETCH_ASSOC)['total_filtered_records'];
    
    error_log("[get_orders.php] Total de registros filtrados: " . $totalFilteredRecords);

    // ===== CONSTRUIR QUERY PRINCIPAL =====
    if ($getAllRecords) {
        $sqlOrdersSelect = "SELECT
            id, favoredName, paymentValue, paymentType, priority, status,
            generationDate, paymentForecast, company, process, direction, reference,
            solicitant, otherSolicitantName, observation,
            approvedByDiretoria, approvedByFinanceiro, isPaid,
            approvalDateDiretoria, approvalDateFinanceiro, paymentCompletionDate,
            pixKeyType, pixKey, linhaDigitavel, bankDetails, payments,
            NULL as boletoData,
            boletoFileName, boletoMimeType, isBackedUp,
            sendProofToWhatsApp, created_at, updated_at
            FROM orders";
    } else {
        $sqlOrdersSelect = "SELECT
            id, favoredName, paymentValue, paymentType, priority, status,
            generationDate, paymentForecast, company, process, direction, reference,
            solicitant, otherSolicitantName, observation,
            approvedByDiretoria, approvedByFinanceiro, isPaid,
            approvalDateDiretoria, approvalDateFinanceiro, paymentCompletionDate,
            pixKeyType, pixKey, linhaDigitavel, bankDetails, payments,
            boletoData, boletoFileName, boletoMimeType, isBackedUp,
            sendProofToWhatsApp, created_at, updated_at
            FROM orders";
    }
    
    $finalSql = $sqlOrdersSelect . $finalWhereClause . $orderByClause;
    
    // ===== APLICAR LIMIT/OFFSET APENAS SE NÃO FOR all=true =====
    if (!$getAllRecords) {
        $limit = isset($_GET['limit']) ? max(1, min((int)$_GET['limit'], 500)) : 50;
        $offset = isset($_GET['offset']) ? max(0, (int)$_GET['offset']) : 0;

        $finalSql .= " LIMIT :limit OFFSET :offset";
        $queryParams[':limit'] = $limit;
        $queryParams[':offset'] = $offset;
        
        error_log("[get_orders.php] Modo paginado: limit=$limit, offset=$offset");
    } else {
        error_log("[get_orders.php] Modo all=true: retornando TODOS os $totalFilteredRecords registros");
    }

    // ===== EXECUTAR QUERY =====
    error_log("[get_orders.php] Executando query...");
    
    $stmt = $pdo->prepare($finalSql);

    foreach ($queryParams as $paramName => $paramValue) {
        $paramType = PDO::PARAM_STR;
        
        if (is_int($paramValue)) {
            $paramType = PDO::PARAM_INT;
        } elseif (is_float($paramValue)) {
            $paramType = PDO::PARAM_STR;
        } elseif (is_bool($paramValue)) {
            $paramType = PDO::PARAM_BOOL;
        }

        $stmt->bindValue($paramName, $paramValue, $paramType);
    }

    $stmt->execute();
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    error_log("[get_orders.php] Query executada com sucesso. Linhas retornadas: " . count($orders));

    // ===== PROCESSAR DADOS =====
    foreach ($orders as &$order) {
        // Processar payments JSON
        if (isset($order['payments']) && is_string($order['payments']) && !empty($order['payments'])) {
            $decoded_payments = json_decode($order['payments'], true);
            $order['payments'] = (json_last_error() === JSON_ERROR_NONE) ? $decoded_payments : [];
        } else {
            $order['payments'] = [];
        }

        // Converter booleanos
        $order['approvedByDiretoria'] = (bool)(int)($order['approvedByDiretoria'] ?? 0);
        $order['approvedByFinanceiro'] = (bool)(int)($order['approvedByFinanceiro'] ?? 0);
        $order['isPaid'] = (bool)(int)($order['isPaid'] ?? 0);
        $order['isBackedUp'] = (bool)(int)($order['isBackedUp'] ?? 0);
        $order['sendProofToWhatsApp'] = (bool)(int)($order['sendProofToWhatsApp'] ?? 0);

        // Converter paymentValue para float
        if (isset($order['paymentValue'])) {
            $order['paymentValue'] = (float)$order['paymentValue'];
        }

        // Garantir que campos opcionais existam
        $order['boletoData'] = $order['boletoData'] ?? null;
        $order['boletoFileName'] = $order['boletoFileName'] ?? null;
        $order['boletoMimeType'] = $order['boletoMimeType'] ?? null;
        $order['company'] = $order['company'] ?? null;
    }

    error_log("[get_orders.php] Dados processados. Retornando JSON com " . count($orders) . " ordens");

    // ===== RETORNAR JSON =====
    $response = [
        'success' => true,
        'data' => $orders,
        'total_filtered_records' => $totalFilteredRecords
    ];

    // Verificar tamanho do JSON antes de enviar
    $jsonOutput = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("[get_orders.php] ❌ ERRO ao fazer encode JSON: " . json_last_error_msg());
        throw new Exception("Erro ao codificar resposta JSON: " . json_last_error_msg());
    }

    error_log("[get_orders.php] Tamanho da resposta JSON: " . strlen($jsonOutput) . " bytes");
    
    echo $jsonOutput;
    error_log("[get_orders.php] ✅ SUCESSO - JSON enviado com " . count($orders) . " registros");

} catch(PDOException $e) {
    error_log('❌ [get_orders.php] ERRO PDO: ' . $e->getMessage());
    error_log('Arquivo: ' . $e->getFile() . ' Linha: ' . $e->getLine());
    
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'Erro ao buscar ordens do banco de dados',
        'message' => $e->getMessage()
    ]);

} catch(Exception $e) {
    error_log('❌ [get_orders.php] ERRO GERAL: ' . $e->getMessage());
    error_log('Arquivo: ' . $e->getFile() . ' Linha: ' . $e->getLine());
    
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'Erro inesperado ao processar requisição',
        'message' => $e->getMessage()
    ]);
}

?>