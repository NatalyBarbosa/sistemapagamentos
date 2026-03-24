<?php
header('Content-Type: application/json');
// Adicione os headers CORS se necessário, dependendo de onde seu frontend está hospedado
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type');

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['boletoId'])) {
    echo json_encode(['success' => false, 'error' => 'Boleto ID not provided.']);
    exit;
}

$boletoId = $input['boletoId'];

// Inclua seu arquivo de configuração de banco de dados
// Certifique-se de que $pdo é sua instância PDO conectada ao banco de dados
require_once 'db_config.php'; // Ajuste o caminho conforme necessário

try {
    // Incrementa o views_count para o boleto especificado
    $stmt = $pdo->prepare("UPDATE boletos SET views_count = views_count + 1 WHERE id = ?");
    $stmt->execute([$boletoId]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'View count updated.']);
    } else {
        // Pode acontecer se o boletoId não existir
        echo json_encode(['success' => false, 'error' => 'Boleto not found or view count not updated.']);
    }
} catch (PDOException $e) {
    // Em caso de erro no banco de dados
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
?>