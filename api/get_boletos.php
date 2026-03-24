<?php
ini_set('output_buffering', 'Off');
while (ob_get_level()) ob_end_clean();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/db_connect.php';

if (!isset($pdo)) {
    http_response_code(500);
    echo json_encode(array('success' => false, 'error' => 'PDO nao definido'));
    exit;
}

$sql = "SELECT 
            b.uuid as id, 
            b.vendor, 
            b.generation_date as generationDate, 
            b.total_value as totalValue, 
            b.first_due_date as firstDueDate, 
            b.process, 
            b.direction, 
            b.company, 
            b.observation, 
            b.is_fully_paid, 
            b.file_original_name, 
            b.file_name, 
            b.file_path, 
            b.file_size, 
            p.uuid as parcel_id, 
            p.parcel_number, 
            p.value as parcel_value, 
            p.due_date as parcel_due_date, 
            p.is_paid, 
            p.payment_order_id as paymentOrderId, 
            p.paid_at, 
            -- REMOVIDO intencionalmente: p.proof_data as proofData, 
            p.proof_file_name as proofFileName, 
            p.payment_observation as paymentObservation 
        FROM boletos b 
        LEFT JOIN boleto_parcels p ON b.id = p.boleto_id 
        ORDER BY b.generation_date DESC, p.parcel_number ASC";

try {
    $stmt = $pdo->query($sql);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $boletosAgrupados = array();
    
    foreach ($results as $row) {
        $boletoId = isset($row['id']) ? $row['id'] : null;
        if (empty($boletoId)) continue;
        
        if (!isset($boletosAgrupados[$boletoId])) {
            $boletosAgrupados[$boletoId] = array(
                'id' => $row['id'],
                'vendor' => isset($row['vendor']) ? $row['vendor'] : '',
                'generationDate' => isset($row['generationDate']) ? $row['generationDate'] : null,
                'totalValue' => floatval(isset($row['totalValue']) ? $row['totalValue'] : 0),
                'firstDueDate' => isset($row['firstDueDate']) ? $row['firstDueDate'] : null,
                'process' => isset($row['process']) ? $row['process'] : '',
                'direction' => isset($row['direction']) ? $row['direction'] : '',
                'company' => isset($row['company']) ? $row['company'] : '',
                'observation' => isset($row['observation']) ? $row['observation'] : '',
                'isFullyPaid' => (bool)(isset($row['is_fully_paid']) ? $row['is_fully_paid'] : false),
                'file_original_name' => isset($row['file_original_name']) ? $row['file_original_name'] : null,
                'file_name' => isset($row['file_name']) ? $row['file_name'] : null,
                'file_path' => isset($row['file_path']) ? $row['file_path'] : null,
                'file_size' => isset($row['file_size']) ? $row['file_size'] : null,
                'parcels' => array()
            );
        }
        
        if (!empty($row['parcel_id'])) {
            $boletosAgrupados[$boletoId]['parcels'][] = array(
                'id' => $row['parcel_id'],
                'parcelNumber' => intval(isset($row['parcel_number']) ? $row['parcel_number'] : 0),
                'value' => floatval(isset($row['parcel_value']) ? $row['parcel_value'] : 0),
                'dueDate' => isset($row['parcel_due_date']) ? $row['parcel_due_date'] : null,
                'isPaid' => (bool)(isset($row['is_paid']) ? $row['is_paid'] : false),
                'paymentOrderId' => isset($row['paymentOrderId']) ? $row['paymentOrderId'] : null,
                'paidAt' => isset($row['paid_at']) ? $row['paid_at'] : null,
                // REMOVIDO intencionalmente: 'proofData' => isset($row['proofData']) ? $row['proofData'] : null,
                'proofFileName' => isset($row['proofFileName']) ? $row['proofFileName'] : null,
                'paymentObservation' => isset($row['paymentObservation']) ? $row['paymentObservation'] : null
            );
        }
    }
    
    $boletos = array_values($boletosAgrupados);
    $response = array('success' => true, 'data' => $boletos);
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    flush();
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array('success' => false, 'error' => $e->getMessage()));
    flush();
}
?>