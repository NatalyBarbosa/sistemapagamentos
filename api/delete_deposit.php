<?php
require_once 'db_connect.php'; // Para corresponder ao seu arquivo 'db_connect.php'

header('Content-Type: application/json');
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['id'])) {
    echo json_encode(['success' => false, 'error' => 'ID do depósito não fornecido.']);
    exit;
}

$id = $input['id'];

try {
    $pdo->beginTransaction();

    // 1. Obter o valor do depósito a ser excluído (para subtrair do caixa)
    $stmt = $pdo->prepare("SELECT deposit_value FROM deposits WHERE id = ?");
    $stmt->execute([$id]);
    $deposit_value_to_remove = $stmt->fetchColumn();

    if ($deposit_value_to_remove === false) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => 'Depósito não encontrado.']);
        exit;
    }

    // 2. Excluir o depósito
    $stmt = $pdo->prepare("DELETE FROM deposits WHERE id = ?");
    $stmt->execute([$id]);

    // 3. Atualizar o valor do caixa (subtrair)
    $stmt = $pdo->prepare("UPDATE app_settings SET setting_value = setting_value - ? WHERE setting_name = 'cash_value'");
    $stmt->execute([$deposit_value_to_remove]);

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => 'Depósito excluído e caixa atualizado com sucesso.']);

} catch (PDOException $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => 'Erro ao excluir depósito: ' . $e->getMessage()]);
}
?>