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
    
    if (!$input || !isset($input['boletoId']) || !isset($input['parcelId'])) {
        throw new Exception('Dados inválidos');
    }

    $pdo->beginTransaction();

    // Buscar dados do boleto e parcela
    $stmt = $pdo->prepare("
        SELECT b.*, bp.value as parcel_value, bp.due_date as parcel_due_date, bp.parcel_number
        FROM boletos b 
        JOIN boleto_parcels bp ON b.uuid = bp.boleto_uuid 
        WHERE b.uuid = ? AND bp.uuid = ?
    ");
    $stmt->execute([$input['boletoId'], $input['parcelId']]);
    $boleto = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$boleto) {
        throw new Exception('Boleto ou parcela não encontrada');
    }

    // Criar ordem de pagamento
    $orderData = [
        'id' => 'order_' . uniqid(),
        'date' => date('Y-m-d'),
        'vendor' => $boleto['vendor'],
        'process' => $boleto['process'] . ' - Parcela ' . $boleto['parcel_number'],
        'value' => $boleto['parcel_value'],
        'status' => 'Pago',
        'proof_data' => $input['proofData'] ?? null,
        'proof_file_name' => $input['proofFileName'] ?? null,
        'boleto_origin' => true,
        'boleto_id' => $input['boletoId'],
        'parcel_id' => $input['parcelId']
    ];

    // Inserir na tabela orders
    $stmt = $pdo->prepare("
        INSERT INTO orders (uuid, order_date, vendor, process, value, status, proof_data, proof_file_name, boleto_origin, boleto_id, parcel_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $orderData['id'],
        $orderData['date'],
        $orderData['vendor'],
        $orderData['process'],
        $orderData['value'],
        $orderData['status'],
        $orderData['proof_data'],
        $orderData['proof_file_name'],
        1, // boleto_origin
        $orderData['boleto_id'],
        $orderData['parcel_id']
    ]);

    // Marcar parcela como paga
    $stmt = $pdo->prepare("UPDATE boleto_parcels SET is_paid = 1, payment_order_id = ? WHERE uuid = ?");
    $stmt->execute([$orderData['id'], $input['parcelId']]);

    // Verificar se todas as parcelas foram pagas
    $stmt = $pdo->prepare("SELECT COUNT(*) as total, SUM(is_paid) as paid FROM boleto_parcels WHERE boleto_uuid = ?");
    $stmt->execute([$input['boletoId']]);
    $parcelStatus = $stmt->fetch(PDO::FETCH_ASSOC);

    // Se todas as parcelas foram pagas, marcar boleto como pago
    if ($parcelStatus['total'] == $parcelStatus['paid']) {
        $stmt = $pdo->prepare("UPDATE boletos SET is_fully_paid = 1 WHERE uuid = ?");
        $stmt->execute([$input['boletoId']]);
    }

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => 'Pagamento processado com sucesso', 'orderData' => $orderData]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>