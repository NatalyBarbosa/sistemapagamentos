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

$parcel_id = $_GET['parcel_id'] ?? null;
$boleto_id = $_GET['boleto_id'] ?? null;

if (empty($parcel_id) && empty($boleto_id)) {
    http_response_code(400);
    echo json_encode(array('success' => false, 'error' => 'parcel_id ou boleto_id nao fornecido.'));
    exit;
}

try {
    
    // Se é parcel_id: buscar em boleto_parcels
    if (!empty($parcel_id)) {
        $sql = "SELECT proof_data as proofData, proof_file_name as proofFileName FROM boleto_parcels WHERE uuid = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':id', $parcel_id);
    }
    // Se é boleto_id: buscar em boletos
    elseif (!empty($boleto_id)) {
        $sql = "SELECT 
                    JSON_EXTRACT(boletoData, '$.proofData') as proofData,
                    JSON_EXTRACT(boletoData, '$.proofFileName') as proofFileName
                FROM boletos 
                WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':id', $boleto_id);
    }
    
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result) {
        // Limpar dados JSON se necessário
        if (is_string($result['proofData']) && strpos($result['proofData'], '{') === 0) {
            $result['proofData'] = json_decode($result['proofData'], true);
        }
        if (is_string($result['proofFileName']) && strpos($result['proofFileName'], '"') === 0) {
            $result['proofFileName'] = json_decode($result['proofFileName'], true);
        }
        
        echo json_encode(array('success' => true, 'data' => $result), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } else {
        http_response_code(404);
        echo json_encode(array('success' => false, 'error' => 'Comprovante nao encontrado.'));
    }
    
    flush();
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array('success' => false, 'error' => $e->getMessage()));
    flush();
}

?>