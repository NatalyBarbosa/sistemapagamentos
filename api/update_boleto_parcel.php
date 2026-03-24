<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include 'db_connect.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $pdo->prepare("UPDATE boleto_parcels SET is_paid = ?, payment_order_id = ?, paid_at = ? WHERE uuid = ?");
    
    $paid_at = $input['isPaid'] ? date('Y-m-d H:i:s') : null;
    
    $result = $stmt->execute([
        $input['isPaid'] ? 1 : 0,
        $input['paymentOrderId'],
        $paid_at,
        $input['parcelId']
    ]);

    if ($result) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Erro ao atualizar parcela']);
    }

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>