<?php
require_once 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['id'])) {
    echo json_encode(['success' => false, 'error' => 'ID da ordem não fornecido.']);
    exit();
}

$orderId = $input['id'];

try {
    $stmt = $pdo->prepare("DELETE FROM orders WHERE id = :id");
    $result = $stmt->execute([':id' => $orderId]);

    echo json_encode(['success' => $result, 'message' => 'Ordem excluída com sucesso.']);
} catch(PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erro ao excluir ordem: ' . $e->getMessage()]);
}
?>