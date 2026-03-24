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

    // ✅ PASSO 1: Buscar dados do boleto e parcela usando UUIDs
    $stmt = $pdo->prepare("
        SELECT b.id as boleto_internal_id, 
               b.uuid as boleto_uuid, 
               b.vendor, 
               b.process, 
               b.direction, 
               b.observation,
               b.company,
               bp.id as parcel_internal_id, 
               bp.uuid as parcel_uuid, 
               bp.value as parcel_value, 
               bp.due_date as parcel_due_date, 
               bp.parcel_number, 
               bp.is_paid
        FROM boletos b 
        JOIN boleto_parcels bp ON b.id = bp.boleto_id 
        WHERE b.uuid = :boleto_uuid AND bp.uuid = :parcel_uuid
    ");
    
    $stmt->bindParam(':boleto_uuid', $input['boletoId']);
    $stmt->bindParam(':parcel_uuid', $input['parcelId']);
    $stmt->execute();

    $boleto = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$boleto) {
        throw new Exception('Boleto ou parcela não encontrada');
    }

    if ($boleto['is_paid'] == 1) {
        throw new Exception('Esta parcela já foi paga');
    }

    // ✅ PASSO 2: Gerar UUID para a ordem de pagamento
    $orderUuid = bin2hex(random_bytes(16));
    $paymentDate = isset($input['paymentCompletionDate']) ? $input['paymentCompletionDate'] : date('Y-m-d');

    // ✅ PASSO 3: Inserir ordem de pagamento na tabela orders
    $stmt = $pdo->prepare("
        INSERT INTO orders (
            uuid, 
            favored_name, 
            payment_value, 
            payment_type, 
            priority, 
            status, 
            generation_date, 
            payment_completion_date,
            process, 
            direction, 
            company,
            approved_by_diretoria, 
            approved_by_financeiro,
            is_paid,
            created_at
        ) VALUES (
            :uuid,
            :favored_name,
            :payment_value,
            'Boleto',
            'Normal',
            'Paga',
            CURDATE(),
            :payment_completion_date,
            :process,
            :direction,
            :company,
            1,
            1,
            1,
            NOW()
        )
    ");

    $stmt->bindParam(':uuid', $orderUuid);
    $stmt->bindParam(':favored_name', $boleto['vendor']);
    $stmt->bindParam(':payment_value', $boleto['parcel_value']);
    $stmt->bindParam(':payment_completion_date', $paymentDate);
    $stmt->bindParam(':process', $boleto['process']);
    $stmt->bindParam(':direction', $boleto['direction']);
    $stmt->bindParam(':company', $boleto['company']);
    
    $stmt->execute();

    // ✅ PASSO 4: Inserir comprovante de pagamento na tabela order_payments
    if (isset($input['proofData']) && !empty($input['proofData'])) {
        $paymentUuid = bin2hex(random_bytes(16));
        
        $stmt = $pdo->prepare("
            INSERT INTO order_payments (
                uuid,
                order_id,
                amount,
                payment_date,
                description,
                proof_data,
                proof_file_name,
                proof_mime_type,
                created_at
            ) VALUES (
                :uuid,
                :order_id,
                :amount,
                :payment_date,
                :description,
                :proof_data,
                :proof_file_name,
                :proof_mime_type,
                NOW()
            )
        ");

        $stmt->bindParam(':uuid', $paymentUuid);
        $stmt->bindParam(':order_id', $orderUuid);
        $stmt->bindParam(':amount', $boleto['parcel_value']);
        $stmt->bindParam(':payment_date', $paymentDate);
        $stmt->bindParam(':description', 'Pagamento de Boleto - Parcela ' . $boleto['parcel_number']);
        $stmt->bindParam(':proof_data', $input['proofData']);
        $stmt->bindParam(':proof_file_name', $input['proofFileName']);
        $stmt->bindParam(':proof_mime_type', 'application/pdf'); // Ajustar conforme necessário
        
        $stmt->execute();
    }

    // ✅ PASSO 5: Atualizar parcela como paga usando NAMED PARAMETER
    $stmt = $pdo->prepare("
        UPDATE boleto_parcels 
        SET is_paid = 1, 
            payment_order_id = :order_uuid, 
            paid_at = :paid_at,
            proof_data = :proof_data,
            proof_file_name = :proof_file_name,
            payment_observation = :observation
        WHERE uuid = :parcel_uuid
    ");

    $stmt->bindParam(':order_uuid', $orderUuid);
    $stmt->bindParam(':paid_at', $paymentDate . ' ' . date('H:i:s'));
    $stmt->bindParam(':proof_data', $input['proofData'] ?? null);
    $stmt->bindParam(':proof_file_name', $input['proofFileName'] ?? null);
    $stmt->bindParam(':observation', $input['observation'] ?? null);
    $stmt->bindParam(':parcel_uuid', $input['parcelId']);
    
    $stmt->execute();

    $affectedRows = $stmt->rowCount();

    if ($affectedRows === 0) {
        throw new Exception('Erro: Nenhuma parcela foi atualizada.');
    }

    // ✅ PASSO 6: Verificar se todas as parcelas foram pagas
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as total_parcels, 
               SUM(CASE WHEN is_paid = 1 THEN 1 ELSE 0 END) as paid_parcels 
        FROM boleto_parcels 
        WHERE boleto_id = :boleto_internal_id
    ");

    $stmt->bindParam(':boleto_internal_id', $boleto['boleto_internal_id']);
    $stmt->execute();

    $parcelStatus = $stmt->fetch(PDO::FETCH_ASSOC);

    // ✅ PASSO 7: Se todas as parcelas foram pagas, marcar boleto como totalmente pago
    if ($parcelStatus['total_parcels'] == $parcelStatus['paid_parcels']) {
        $stmt = $pdo->prepare("
            UPDATE boletos 
            SET is_fully_paid = 1, 
                paid_at = :paid_at 
            WHERE id = :boleto_internal_id
        ");

        $stmt->bindParam(':paid_at', $paymentDate . ' ' . date('H:i:s'));
        $stmt->bindParam(':boleto_internal_id', $boleto['boleto_internal_id']);
        $stmt->execute();
    }

    $pdo->commit();

    // ✅ PASSO 8: Retornar estrutura correta para o FRONTEND
    // Este é o objeto que o frontend espera sincronizar com fullOrdersList
    echo json_encode([
        'success' => true,
        'message' => 'Pagamento processado com sucesso',
        'order' => [
            'id' => $orderUuid,
            'uuid' => $orderUuid,
            'favoredName' => $boleto['vendor'],
            'paymentValue' => floatval($boleto['parcel_value']),
            'paymentType' => 'Boleto',
            'priority' => 'Normal',
            'status' => 'Paga',
            'generationDate' => date('Y-m-d'),
            'paymentCompletionDate' => $paymentDate,
            'process' => $boleto['process'],
            'direction' => $boleto['direction'],
            'company' => $boleto['company'],
            'approvedByDiretoria' => true,
            'approvedByFinanceiro' => true,
            'isPaid' => true,
            'payments' => [
                [
                    'amount' => floatval($boleto['parcel_value']),
                    'date' => $paymentDate,
                    'description' => 'Pagamento de Boleto - Parcela ' . $boleto['parcel_number'],
                    'proofData' => $input['proofData'] ?? null,
                    'proofFileName' => $input['proofFileName'] ?? null
                ]
            ]
        ],
        'parcelStatus' => $parcelStatus,
        'isFullyPaid' => intval($parcelStatus['total_parcels']) === intval($parcelStatus['paid_parcels'])
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log("Erro ao processar pagamento de boleto: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

?>