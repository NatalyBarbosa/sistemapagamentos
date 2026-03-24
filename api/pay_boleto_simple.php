<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include 'db_connect.php'; // Inclua seu arquivo de configuração do banco de dados

$response = ['success' => false, 'message' => ''];

try {
    $postData = file_get_contents('php://input');
    $data = json_decode($postData, true);

    // --- LOGS DETALHADOS NO BACKEND ---
    error_log("----------- Início pay_boleto_simple.php ----------");
    error_log("Dados RAW recebidos (postData): " . $postData);
    error_log("Dados JSON decodificados (data array): " . print_r($data, true));
    // --- FIM LOGS DETALHADOS ---
    
    if (!$data) {
        throw new Exception('Dados inválidos recebidos ou JSON mal formatado.');
    }
    
    $paymentCompletionDate = $data['paymentCompletionDate'] ?? null;
    $observation = $data['observation'] ?? null;

    // --- LOGS DETALHADOS APÓS EXTRAÇÃO ---
    error_log("boletoId extraído: " . ($data['boletoId'] ?? 'N/A'));
    error_log("parcelId extraído: " . ($data['parcelId'] ?? 'N/A'));
    error_log("proofData extraído (tamanho): " . (isset($data['proofData']) ? strlen($data['proofData']) . " bytes" : 'N/A'));
    error_log("proofFileName extraído: " . ($data['proofFileName'] ?? 'N/A'));
    error_log("paymentCompletionDate extraído: " . ($paymentCompletionDate ?? 'N/A'));
    // --- FIM LOGS DETALHADOS APÓS EXTRAÇÃO ---

    // Validação
    if (
        !isset($data['boletoId']) || empty($data['boletoId']) ||
        !isset($data['parcelId']) || empty($data['parcelId']) ||
        !isset($data['proofData']) || empty($data['proofData']) ||
        !isset($data['proofFileName']) || empty($data['proofFileName']) ||
        !isset($paymentCompletionDate) || empty($paymentCompletionDate) 
    ) {
        $missingFields = [];
        if (!isset($data['boletoId']) || empty($data['boletoId'])) $missingFields[] = 'boletoId';
        if (!isset($data['parcelId']) || empty($data['parcelId'])) $missingFields[] = 'parcelId';
        if (!isset($data['proofData']) || empty($data['proofData'])) $missingFields[] = 'proofData';
        if (!isset($data['proofFileName']) || empty($data['proofFileName'])) $missingFields[] = 'proofFileName';
        if (!isset($paymentCompletionDate) || empty($paymentCompletionDate)) $missingFields[] = 'paymentCompletionDate';

        throw new Exception('Dados incompletos fornecidos. Campos ausentes/vazios: ' . implode(', ', $missingFields));
    }
    
    $boletoId = $data['boletoId'];
    $parcelId = $data['parcelId'];
    $proofData = $data['proofData'];
    $proofFileName = $data['proofFileName'];

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        SELECT b.id as boleto_internal_id, b.uuid as boleto_uuid, b.vendor, b.process,
               bp.id as parcel_internal_id, bp.uuid as parcel_uuid, bp.value as parcel_value, 
               bp.parcel_number, bp.is_paid
        FROM boletos b 
        JOIN boleto_parcels bp ON b.id = bp.boleto_id 
        WHERE b.uuid = :boleto_uuid AND bp.uuid = :parcel_uuid
    ");
    $stmt->bindParam(':boleto_uuid', $boletoId); // Usar nomeado aqui também para consistência
    $stmt->bindParam(':parcel_uuid', $parcelId);
    $stmt->execute();
    $boleto = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$boleto) {
        throw new Exception('Boleto ou parcela não encontrada para o UUID fornecido.');
    }

    if ($boleto['is_paid'] == 1) {
        throw new Exception('Esta parcela já foi paga.');
    }

    $stmt = $pdo->prepare("
        UPDATE boleto_parcels 
        SET is_paid = 1, 
            paid_at = :paid_at, 
            proof_data = :proof_data, 
            proof_file_name = :proof_file_name,
            payment_observation = :payment_observation
        WHERE uuid = :parcel_uuid
    ");
    $stmt->bindParam(':paid_at', $paymentCompletionDate);
    $stmt->bindParam(':proof_data', $proofData);
    $stmt->bindParam(':proof_file_name', $proofFileName);
    $stmt->bindParam(':payment_observation', $observation);
    $stmt->bindParam(':parcel_uuid', $parcelId);
    $stmt->execute();

    $affectedRows = $stmt->rowCount();
    if ($affectedRows === 0) {
        throw new Exception('Erro: Nenhuma parcela foi atualizada. Verifique os IDs ou se já está paga.');
    }

    $stmt = $pdo->prepare("
        SELECT COUNT(*) as total_parcels, SUM(is_paid) as paid_parcels 
        FROM boleto_parcels 
        WHERE boleto_id = :boleto_internal_id
    ");
    $stmt->bindParam(':boleto_internal_id', $boleto['boleto_internal_id']);
    $stmt->execute();
    $parcelStatus = $stmt->fetch(PDO::FETCH_ASSOC);

    $isFullyPaid = false;
    if (intval($parcelStatus['total_parcels']) > 0 && intval($parcelStatus['total_parcels']) == intval($parcelStatus['paid_parcels'])) {
        // CORREÇÃO AQUI: Mudando 'id = ?' para 'id = :boleto_internal_id_param'
        $stmt = $pdo->prepare("UPDATE boletos SET is_fully_paid = 1, paid_at = :paid_at_boleto WHERE id = :boleto_internal_id_param");
        $stmt->bindParam(':paid_at_boleto', $paymentCompletionDate);
        $stmt->bindParam(':boleto_internal_id_param', $boleto['boleto_internal_id']); // Bind do novo parâmetro nomeado
        $stmt->execute();
        $isFullyPaid = true;
    }

    $pdo->commit();
    
    echo json_encode([
        'success' => true, 
        'message' => 'Parcela marcada como paga com sucesso', 
        'isFullyPaid' => $isFullyPaid,
        'orderData' => [
            'uuid' => 'boleto_payment_' . uniqid(),
            'vendor' => $boleto['vendor'],
            'process' => $boleto['process'] . ' - Parcela ' . $boleto['parcel_number'],
            'value' => $boleto['parcel_value']
        ],
        'parcelStatus' => $parcelStatus
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Erro em pay_boleto_simple.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>