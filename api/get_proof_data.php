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
if (empty($parcel_id)) {
    http_response_code(400);
    echo json_encode(array('success' => false, 'error' => 'ID da parcela nao fornecido.'));
    exit;
}

$sql = "SELECT proof_data as proofData, proof_file_name as proofFileName FROM boleto_parcels WHERE uuid = :parcel_id";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':parcel_id', $parcel_id);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($result) {
        echo json_encode(array('success' => true, 'data' => $result), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } else {
        http_response_code(404);
        echo json_encode(array('success' => false, 'error' => 'Comprovante nao encontrado para o ID da parcela.'));
    }
    flush();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array('success' => false, 'error' => $e->getMessage()));
    flush();
}
?>