<?php
// Cabeçalhos HTTP para JSON, CORS e controle de cache
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Ajuste conforme sua política de CORS em produção
header('Access-Control-Allow-Methods: POST, OPTIONS'); // OPTIONS para preflight requests
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Cabeçalhos para desativar o cache (garante que o navegador sempre busque dados novos)
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Sat, 26 Jul 1997 05:00:00 GMT'); // Data no passado distante

// IMPORTANTE: Adiciona a conexão com o banco de dados MySQL via db_connect.php
require_once 'db_connect.php'; 

// Adicione esta verificação para requisições OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Método não permitido
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['favoredName']) || !isset($input['paymentValue'])) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Dados incompletos (favoredName ou paymentValue ausentes)']);
    exit;
}

$favoredName = trim($input['favoredName']);
$paymentValue = floatval($input['paymentValue']);

try {
    // ATENÇÃO: Agora $pdo vem de db_connect.php e aponta para o banco de dados MySQL
    $stmt = $pdo->prepare("
        SELECT id, favoredName, paymentValue, status, generationDate 
        FROM orders 
        WHERE LOWER(TRIM(favoredName)) = LOWER(?) 
        AND ABS(paymentValue - ?) < 0.01
        AND isBackedUp = 0 /* <--- Adicionado: Somente verifica duplicatas em ordens ATIVAS */
        ORDER BY generationDate DESC 
        LIMIT 1
    ");
    
    // ATENÇÃO: Usando favoredName e paymentValue conforme as colunas do seu banco MySQL (case-sensitive)
    $stmt->execute([$favoredName, $paymentValue]);
    $duplicate = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($duplicate) {
        echo json_encode([
            'isDuplicate' => true,
            'existingOrder' => [
                'id' => $duplicate['id'],
                'favoredName' => $duplicate['favoredName'], // Coluna do seu MySQL
                'paymentValue' => $duplicate['paymentValue'], // Coluna do seu MySQL
                'status' => $duplicate['status'],
                'generationDate' => $duplicate['generationDate']
            ]
        ]);
    } else {
        echo json_encode(['isDuplicate' => false]);
    }
    
} catch (PDOException $e) {
    http_response_code(500); // Internal Server Error
    error_log('Erro no banco de dados (check_duplicate.php): ' . $e->getMessage()); // Loga o erro no servidor
    echo json_encode(['error' => 'Erro no banco de dados ao verificar duplicatas.']);
}