<?php

// delete_salary.php - Versão Corrigida (GET e POST)

// Configurações imediatas
ob_start();
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Headers JSON
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    http_response_code(200);
    exit(0);
}

// Incluir configuração
$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Arquivo de configuração não encontrado']);
    exit();
}

require_once $configPath;

// Verificar se função de log está disponível
if (!function_exists('log_message')) {
    function log_message($msg, $level = 'info', $logFile = 'general_log.log') {
        $logsDir = __DIR__ . '/logs';
        if (!is_dir($logsDir)) {
            mkdir($logsDir, 0755, true);
        }
        $timestamp = date('Y-m-d H:i:s');
        file_put_contents($logsDir . '/' . $logFile, "[$timestamp] [$level] $msg" . PHP_EOL, FILE_APPEND);
    }
}

log_message('delete_salary.php iniciado - Método: ' . $_SERVER['REQUEST_METHOD'], 'DEBUG');

try {
    // ===== OBTER ID DO SALÁRIO =====
    // Tentar GET primeiro, depois POST
    $salaryId = $_GET['id'] ?? null;
    
    if (!$salaryId && $_SERVER['REQUEST_METHOD'] === 'POST') {
        // Se POST, tentar ler do body como JSON
        $input = file_get_contents('php://input');
        if (!empty($input)) {
            $data = json_decode($input, true);
            $salaryId = $data['id'] ?? null;
        }
    }
    
    // Se ainda não tem ID, tentar parâmetro POST direto
    if (!$salaryId && isset($_POST['id'])) {
        $salaryId = $_POST['id'];
    }
    
    if (!$salaryId) {
        log_message('ID do salário não fornecido. GET: ' . json_encode($_GET) . ', POST: ' . json_encode($_POST), 'WARNING');
        throw new Exception('ID do salário não fornecido');
    }
    
    // Sanitizar ID
    $salaryId = trim($salaryId);
    
    log_message("Tentando deletar salário com ID: $salaryId", 'DEBUG');
    
    // ===== CONECTAR AO BANCO =====
    $pdo = getDBConnection();
    
    if (!$pdo) {
        throw new Exception('Falha ao conectar ao banco de dados');
    }
    
    // ===== VERIFICAR SE SALÁRIO EXISTE =====
    $checkStmt = $pdo->prepare("SELECT id FROM salaries WHERE id = :id LIMIT 1");
    $checkStmt->execute([':id' => $salaryId]);
    
    $existingRecord = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existingRecord) {
        log_message("Salário com ID $salaryId não encontrado no banco", 'WARNING');
        throw new Exception("Salário com ID $salaryId não encontrado");
    }
    
    // ===== DELETAR SALÁRIO =====
    $deleteStmt = $pdo->prepare("DELETE FROM salaries WHERE id = :id");
    $deleteStmt->execute([':id' => $salaryId]);
    
    $rowsDeleted = $deleteStmt->rowCount();
    
    if ($rowsDeleted === 0) {
        throw new Exception("Nenhum registro foi deletado. ID: $salaryId");
    }
    
    log_message("Salário $salaryId deletado com sucesso. Linhas afetadas: $rowsDeleted", 'INFO');
    
    // ===== RESPOSTA DE SUCESSO =====
    $output = [
        'success' => true,
        'message' => "Salário com ID $salaryId foi deletado com sucesso",
        'deletedId' => $salaryId,
        'rowsAffected' => $rowsDeleted
    ];
    
    $buffer = ob_get_clean();
    if (!empty($buffer)) {
        log_message("Buffer capturado (sucesso): " . substr($buffer, 0, 100), 'WARNING');
    }
    
    http_response_code(200);
    echo json_encode($output, JSON_UNESCAPED_UNICODE);
    exit(0);
    
} catch (PDOException $e) {
    log_message("Erro PDO ao deletar salário: " . $e->getMessage() . " (Arquivo: " . $e->getFile() . ", Linha: " . $e->getLine() . ")", 'ERROR');
    
    $buffer = ob_get_clean();
    if (!empty($buffer)) {
        log_message("Buffer com erro PDO: " . substr($buffer, 0, 100), 'WARNING');
    }
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao acessar o banco de dados: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit(1);
    
} catch (Exception $e) {
    log_message("Erro geral ao deletar salário: " . $e->getMessage(), 'ERROR');
    
    $buffer = ob_get_clean();
    if (!empty($buffer)) {
        log_message("Buffer com erro geral: " . substr($buffer, 0, 100), 'WARNING');
    }
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit(1);
    
} finally {
    log_message('delete_salary.php finalizado', 'DEBUG');
}

?>