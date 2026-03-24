<?php
// api/get_favored_suggestions.php

// --- ATIVAR EXIBIÇÃO E LOG DE ERROS DO PHP ---
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_error_suggestions.log'); // ✅ Arquivo de log de erro PHP específico
// --- FIM DA ATIVAÇÃO DE ERROS ---

header('Content-Type: application/json');

// --- Função de log personalizada para este script ---
$customLogFile = __DIR__ . '/favored_suggestions_debug.log'; // ✅ Arquivo de log de depuração
function custom_log($message) {
    global $customLogFile;
    file_put_contents($customLogFile, date('Y-m-d H:i:s') . " - {$message}\n", FILE_APPEND);
}
custom_log("----------------------------------");
custom_log("Iniciando get_favored_suggestions.php");

// --- Configuração de Conexão com o Banco de Dados ---
// **VERIFIQUE E ADAPTE ESTAS CREDENCIAIS DO SEU BANCO DE DADOS**
$host = 'localhost'; 
$db   = 'u787670524_ordempagamento'; // Seu nome de banco de dados
$user = 'u787670524_Facilita';     // Seu usuário do banco de dados
$pass = 'Fac1l1ta*';               // Sua senha do banco de dados
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

$pdo = null; // Inicializa pdo como nulo
try {
    custom_log("Tentando conectar ao DB: {$host}, {$db}, {$user}");
    $pdo = new PDO($dsn, $user, $pass, $options);
    custom_log("Conexão com o DB estabelecida com sucesso.");
} catch (\PDOException $e) {
    custom_log("❌ ERRO DE CONEXÃO COM O BANCO DE DADOS: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erro de conexão com o banco de dados: ' . $e->getMessage()]);
    exit();
}
// --- FIM Configuração de Conexão ---


// --- Lógica de Sugestão ---
$favoredNameSearch = $_GET['favoredName'] ?? '';
custom_log("FavoredName recebido: '{$favoredNameSearch}'");

if (empty($favoredNameSearch)) {
    custom_log("FavoredName vazio. Retornando array vazio.");
    echo json_encode(['success' => true, 'processes' => [], 'suggestedPaymentType' => null, 'suggestedPixKeyType' => null, 'suggestedPixKey' => null]);
    exit();
}

// Prepara o termo de busca para LIKE (case-insensitive e busca parcial)
$searchTerm = '%' . strtolower($favoredNameSearch) . '%';
custom_log("Search Term para SQL: '{$searchTerm}'");

try {
    // 1. Buscar Processos, Tipos de Pagamento, e DADOS PIX mais recentes para o favorecido
    $sql = "
        SELECT process, paymentType, pixKeyType, pixKey -- ✅ AGORA INCLUINDO pixKeyType e pixKey
        FROM orders
        WHERE LOWER(favoredName) LIKE :favoredNameSearch
        AND status != 'Cancelada'
        ORDER BY generationDate DESC -- Ordena para priorizar os mais recentes na análise
    ";
    custom_log("Executando SQL para busca inicial: " . $sql);
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':favoredNameSearch', $searchTerm);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    custom_log("Resultados da busca inicial (" . count($results) . " registros):");

    $processes = [];
    $paymentTypeCounts = [];
    $seenProcesses = []; // Para garantir unicidade e ordem dos processos
    $suggestedPixKeyType = null;
    $suggestedPixKey = null;
    $foundMostRecentPix = false; // Flag para pegar a chave PIX da ordem PIX mais recente

    foreach ($results as $row) {
        // Coleta processos
        if (!empty($row['process']) && !in_array($row['process'], $seenProcesses)) {
            $processes[] = $row['process'];
            $seenProcesses[] = $row['process'];
        }
        
        // Coleta tipos de pagamento para contagem
        if (!empty($row['paymentType'])) {
            $paymentType = $row['paymentType'];
            $paymentTypeCounts[$paymentType] = ($paymentTypeCounts[$paymentType] ?? 0) + 1;

            // ✅ Lógica para pegar a chave PIX da ordem PIX MAIS RECENTE
            // A ordem já está por generationDate DESC, então a primeira vez que encontrarmos
            // um PIX com chaves preenchidas, será a mais recente.
            if ($paymentType === 'PIX' && !$foundMostRecentPix && !empty($row['pixKeyType']) && !empty($row['pixKey'])) {
                $suggestedPixKeyType = $row['pixKeyType'];
                $suggestedPixKey = $row['pixKey'];
                $foundMostRecentPix = true; // Marca que já encontramos, não precisa buscar em ordens PIX mais antigas
            }
        }
    }

    // Encontrar o Tipo de Pagamento mais frequente
    $suggestedPaymentType = null;
    if (!empty($paymentTypeCounts)) {
        arsort($paymentTypeCounts); // Ordena do mais frequente para o menos
        $suggestedPaymentType = key($paymentTypeCounts); // Pega a chave (nome do tipo) do primeiro elemento
    }
    custom_log("Processos encontrados: " . implode(', ', $processes));
    custom_log("Tipo de Pagamento sugerido: " . ($suggestedPaymentType ?? 'Nenhum'));
    custom_log("Tipo da Chave PIX sugerida (mais recente): " . ($suggestedPixKeyType ?? 'Nenhum'));
    custom_log("Chave PIX sugerida (mais recente): " . ($suggestedPixKey ?? 'Nenhum'));


    // Se não encontrou resultados, tentar com o nome exato (removendo %) - mantido para robustez
    // Esta parte também precisa das colunas PIX
    if (empty($processes) && empty($suggestedPaymentType) && strtolower($favoredNameSearch) !== strtolower(trim($favoredNameSearch))) { 
        $exactSearchTerm = strtolower(trim($favoredNameSearch)); // Garante que a busca exata seja feita com o termo limpo
        custom_log("Nenhum resultado, tentando busca exata: '{$exactSearchTerm}'");
        $sqlExact = "
            SELECT process, paymentType, pixKeyType, pixKey -- ✅ Adicionado aqui também
            FROM orders
            WHERE LOWER(favoredName) = :favoredNameSearch
            AND status != 'Cancelada'
            ORDER BY generationDate DESC
        ";
        $stmtExact = $pdo->prepare($sqlExact);
        $stmtExact->bindParam(':favoredNameSearch', $exactSearchTerm);
        $stmtExact->execute();
        $exactResults = $stmtExact->fetchAll(PDO::FETCH_ASSOC);
        custom_log("Resultados da busca exata (" . count($exactResults) . " registros):");

        $exactProcesses = [];
        $exactPaymentTypeCounts = [];
        $foundMostRecentPixExact = false;

        foreach ($exactResults as $row) {
            if (!empty($row['process']) && !in_array($row['process'], $exactProcesses)) {
                $exactProcesses[] = $row['process'];
            }
            if (!empty($row['paymentType'])) {
                $paymentType = $row['paymentType'];
                $exactPaymentTypeCounts[$paymentType] = ($exactPaymentTypeCounts[$paymentType] ?? 0) + 1;
                
                // ✅ Lógica para pegar a chave PIX da ordem PIX MAIS RECENTE (na busca exata)
                if ($paymentType === 'PIX' && !$foundMostRecentPixExact && !empty($row['pixKeyType']) && !empty($row['pixKey'])) {
                    $suggestedPixKeyType = $row['pixKeyType'];
                    $suggestedPixKey = $row['pixKey'];
                    $foundMostRecentPixExact = true;
                }
            }
        }
        if (!empty($exactProcesses)) {
            $processes = $exactProcesses;
        }
        if (!empty($exactPaymentTypeCounts)) {
            arsort($exactPaymentTypeCounts);
            $suggestedPaymentType = key($exactPaymentTypeCounts);
        }
        custom_log("Processos da busca exata: " . implode(', ', $processes));
        custom_log("Tipo de Pagamento sugerido da busca exata: " . ($suggestedPaymentType ?? 'Nenhum'));
        custom_log("Tipo da Chave PIX sugerida (mais recente - busca exata): " . ($suggestedPixKeyType ?? 'Nenhum'));
        custom_log("Chave PIX sugerida (mais recente - busca exata): " . ($suggestedPixKey ?? 'Nenhum'));
    }


    $response = [
        'success' => true,
        'processes' => $processes,
        'suggestedPaymentType' => $suggestedPaymentType,
        'suggestedPixKeyType' => $suggestedPixKeyType, // ✅ AGORA INCLUÍDO NA RESPOSTA
        'suggestedPixKey' => $suggestedPixKey        // ✅ AGORA INCLUÍDO NA RESPOSTA
    ];
    custom_log("Resposta final: " . json_encode($response));
    echo json_encode($response);

} catch (\PDOException $e) {
    custom_log("❌ ERRO NA CONSULTA SQL: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erro ao consultar o banco de dados: ' . $e->getMessage()]);
} catch (\Exception $e) {
    custom_log("❌ ERRO INESPERADO: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erro inesperado no servidor: ' . $e->getMessage()]);
}
custom_log("Finalizando get_favored_suggestions.php");
?>