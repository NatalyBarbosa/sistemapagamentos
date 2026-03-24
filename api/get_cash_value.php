<?php
// Linhas para depuração: Ativam a exibição de todos os erros PHP.
// REMOVA OU COMENTE ESTAS LINHAS EM AMBIENTE DE PRODUÇÃO.
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Garante que nenhum output é enviado antes do cabeçalho
ob_start();

// Inclua seu arquivo de conexão com o banco de dados
require_once 'db_connect.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Ajuste conforme sua política de CORS
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Para requisições OPTIONS, apenas envia cabeçalhos e sai.
    http_response_code(200);
    ob_end_clean(); // Limpa qualquer output bufferizado
    exit();
}

// **VERIFICAÇÃO CRÍTICA DE CONEXÃO PDO:**
// Garante que $pdo foi realmente criado e é um objeto PDO válido.
if (!isset($pdo) || !$pdo instanceof PDO) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Falha crítica na conexão com o banco de dados.']);
    ob_end_flush();
    exit();
}

try {
    // *** CORREÇÃO AQUI: Busca pelo 'setting_name' correto, que é 'cash_value'. ***
    $stmt = $pdo->prepare("SELECT setting_value FROM app_settings WHERE setting_name = 'cash_value'");
    $stmt->execute();
    $cash_value = $stmt->fetchColumn();

    // Se 'cash_value' não existir, inicializa com 0.00
    if ($cash_value === false) {
        // *** CORREÇÃO AQUI: Usa o 'setting_name' correto 'cash_value' para inserção inicial. ***
        $stmt = $pdo->prepare("INSERT INTO app_settings (setting_name, setting_value) VALUES ('cash_value', '0.00') ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        $stmt->execute();
        $cash_value = '0.00';
    }

    echo json_encode(['success' => true, 'cashValue' => (float)$cash_value]);

} catch (PDOException $e) {
    http_response_code(500); // Internal Server Error
    error_log("Erro PDO em get_cash_value.php: " . $e->getMessage()); // Loga o erro no servidor
    echo json_encode(['success' => false, 'error' => 'Erro ao obter valor do caixa: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    error_log("Erro geral em get_cash_value.php: " . $e->getMessage()); // Loga o erro no servidor
    echo json_encode(['success' => false, 'error' => 'Ocorreu um erro inesperado: ' . $e->getMessage()]);
} finally {
    ob_end_flush(); // Envia o buffer final
}
// NADA deve estar abaixo desta linha para evitar output não-JSON.