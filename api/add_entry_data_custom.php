<?php
// add_entry_data_custom.php
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

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!is_array($data)) {
    echo json_encode(['success' => false, 'error' => 'Dados JSON inválidos ou vazios.']);
    exit();
}

// Validação dos campos obrigatórios (agora inclui 'status' e 'observation' é opcional)
if (!isset($data['id'], $data['entry_date'], $data['company'], $data['process'], $data['value'], $data['status'], $data['created_by'], $data['created_at'])) {
    echo json_encode(['success' => false, 'error' => 'Dados incompletos. id, entry_date, company, process, value, status, created_by, created_at são obrigatórios.']);
    exit();
}

$id = $data['id'];
$entryDate = $data['entry_date'];
$company = $data['company'];
$process = $data['process'];
$category = $data['category'] ?? null; // Mantido, será null se não enviado
$description = $data['description'] ?? null; // Mantido, será null se não enviado
$observation = $data['observation'] ?? null; // NOVO: Captura a observação (opcional)
$value = $data['value'];
$status = $data['status']; // NOVO: Captura o status
$createdBy = $data['created_by'];
$createdAt = $data['created_at'];

try {
    $stmt = $pdo->prepare("INSERT INTO entry_data_custom (id, entry_date, company, process, category, description, observation, value, status, created_by, created_at) VALUES (:id, :entry_date, :company, :process, :category, :description, :observation, :value, :status, :created_by, :created_at)");
    $stmt->execute([
        'id' => $id,
        'entry_date' => $entryDate,
        'company' => $company,
        'process' => $process,
        'category' => $category,
        'description' => $description,
        'observation' => $observation, // NOVO: Inclui observação
        'value' => $value,
        'status' => $status, // NOVO: Inclui status
        'created_by' => $createdBy,
        'created_at' => $createdAt
    ]);

    echo json_encode(['success' => true, 'message' => 'Dado de entrada personalizado adicionado com sucesso.']);

} catch (PDOException $e) {
    error_log("Erro no banco de dados (add_entry_data_custom): " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Erro no banco de dados: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("Erro geral (add_entry_data_custom): " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Erro geral: ' . $e->getMessage()]);
}
?>