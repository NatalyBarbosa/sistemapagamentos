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

$boleto_id = $_GET['boleto_id'] ?? null;
if (empty($boleto_id)) {
    http_response_code(400);
    echo json_encode(array('success' => false, 'error' => 'ID do boleto nao fornecido.'));
    exit;
}

$sql = "SELECT file_data as fileData, file_original_name as fileName, file_mime_type as mimeType FROM boletos WHERE uuid = :boleto_id";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':boleto_id', $boleto_id);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($result) {
        echo json_encode(array('success' => true, 'data' => $result), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } else {
        http_response_code(404);
        echo json_encode(array('success' => false, 'error' => 'Boleto original nao encontrado para o ID.'));
    }
    flush();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array('success' => false, 'error' => $e->getMessage()));
    flush();
}
?>