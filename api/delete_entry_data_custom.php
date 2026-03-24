<?php
// delete_entry_data_custom.php
header('Content-Type: application/json');
require_once '../config.php';

// --- GARANTIR DB_CHARSET COMO FALLBACK (mantido por segurança) ---
if (!defined('DB_CHARSET')) {
    define('DB_CHARSET', 'utf8mb4');
}
// --- FIM DO FALLBACK ---

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

if (!is_array($data) || !isset($data['id'])) {
    echo json_encode(['success' => false, 'error' => 'ID do registro ausente ou dados inválidos.']);
    exit();
}

$id = $data['id'];

try {
    $stmt = $pdo->prepare("DELETE FROM entry_data_custom WHERE id = :id");
    $stmt->execute(['id' => $id]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Dado de entrada excluído com sucesso.']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Registro não encontrado.']);
    }

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erro no banco de dados: ' . $e->getMessage()]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Erro geral: ' . $e->getMessage()]);
}
?>