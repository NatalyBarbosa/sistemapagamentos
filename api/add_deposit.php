<?php
// Linhas para depuração: Ativam a exibição de todos os erros PHP.
// REMOVA OU COMENTE ESTAS LINHAS EM AMBIENTE DE PRODUÇÃO.
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Garante que nenhum output é enviado antes do cabeçalho
ob_start(); 

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Ajuste conforme sua política de CORS
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Para requisições OPTIONS, apenas envia cabeçalhos e sai.
    http_response_code(200);
    ob_end_clean(); // Limpa qualquer output bufferizado
    exit();
}

// Inclua o seu arquivo de conexão com o nome CORRETO 'db_connect.php'.
require_once 'db_connect.php'; 

// **VERIFICAÇÃO CRÍTICA DE CONEXÃO PDO:**
// Garante que $pdo foi realmente criado e é um objeto PDO válido.
if (!isset($pdo) || !$pdo instanceof PDO) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Falha crítica na conexão com o banco de dados.']);
    ob_end_flush();
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

// --- Validação dos dados obrigatórios ---
if (!isset($input['id']) || !isset($input['date']) || !isset($input['value'])) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'error' => 'ID, data e valor do depósito são obrigatórios.']);
    ob_end_flush();
    exit();
}

$depositId = $input['id'];
$depositDate = $input['date'];
$depositValue = floatval($input['value']); 

// Campos opcionais, permitindo que sejam null se não enviados
$proofData = isset($input['proofData']) ? $input['proofData'] : null;
$proofFileName = isset($input['proofFileName']) ? $input['proofFileName'] : null;

try {
    // Inicia uma transação para garantir a atomicidade
    $pdo->beginTransaction();

    // Inserir o novo depósito na tabela 'deposits'
    $stmt = $pdo->prepare("INSERT INTO deposits (id, deposit_date, deposit_value, proof_data, proof_file_name) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$depositId, $depositDate, $depositValue, $proofData, $proofFileName]);

    // *** CORREÇÃO AQUI: Atualizar o valor do caixa usando 'cash_value' no 'setting_name'. ***
    $updateCashStmt = $pdo->prepare("UPDATE app_settings SET setting_value = CAST(setting_value AS DECIMAL(10,2)) + ? WHERE setting_name = 'cash_value'"); 
    $updateCashStmt->execute([$depositValue]);

    // Se tudo correu bem, confirma as operações.
    $pdo->commit();

    echo json_encode(['success' => true, 'message' => 'Depósito adicionado e caixa atualizado com sucesso.']);

} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500); // Internal Server Error
    error_log("Erro PDO em add_deposit.php: " . $e->getMessage()); // Loga o erro no servidor
    echo json_encode(['success' => false, 'error' => 'Erro no banco de dados: ' . $e->getMessage()]);
} catch (Exception $e) {
    $pdo->rollBack(); // Garante rollback mesmo para erros não-PDO
    http_response_code(500); // Internal Server Error
    error_log("Erro geral em add_deposit.php: " . $e->getMessage()); // Loga o erro no servidor
    echo json_encode(['success' => false, 'error' => 'Ocorreu um erro inesperado: ' . $e->getMessage()]);
} finally {
    ob_end_flush(); // Envia o buffer final
}
// NADA deve estar abaixo desta linha para evitar output não-JSON.