<?php
// get_entry_data_custom.php
header('Content-Type: application/json');
require_once '../config.php';

if (!defined('DB_CHARSET')) {
    define('DB_CHARSET', 'utf8mb4');
}

$pdo = null;
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erro de conexão com o banco de dados: ' . $e->getMessage()]);
    exit();
}

try {
    // CORREÇÃO: Selecionando apenas as colunas que sabemos que existem.
    // Removidas 'updated_by' e 'updated_at' para resolver o erro 'Column not found'.
    // Incluímos 'observation' e 'status' que adicionamos anteriormente.
    $sql = "SELECT id, entry_date, company, process, category, description, observation, value, status, created_by, created_at FROM entry_data_custom ORDER BY created_at DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $data = $stmt->fetchAll();

    $totalRecords = count($data);

    echo json_encode(['success' => true, 'data' => $data, 'total_records' => $totalRecords]);

} catch (PDOException $e) {
    error_log("Erro no banco de dados (get_entry_data_custom): " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Erro no banco de dados: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("Erro geral (get_entry_data_custom): " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Erro geral: ' . $e->getMessage()]);
}
?>