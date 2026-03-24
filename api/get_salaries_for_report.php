<?php
// Cabeçalhos HTTP para JSON, CORS e controle de cache
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Sat, 26 Jul 1997 05:00:00 GMT');

require_once 'db_connect.php';

try {
    // Para relatórios (Dados de Saída 2), queremos VER TODOS os registros,
    // incluindo os arquivados (isBackedUp = 1) e os não arquivados (isBackedUp = 0).
    // Por isso, removemos o filtro "WHERE isBackedUp = 0".
    $sql = "SELECT * FROM salaries"; // <--- LINHA ALTERADA AQUI
    $stmt = $pdo->query($sql);
    $salaries = $stmt->fetchAll();

    // Garante que o 'value' seja um float para cálculos no JS
    foreach ($salaries as &$salary) {
        if (isset($salary['value'])) {
            $salary['value'] = (float)$salary['value'];
        }
        // Converte TINYINT(1) para boolean, útil para o frontend interpretar
        // 0 como false e 1 como true.
        $salary['isBackedUp'] = (bool)$salary['isBackedUp'];
    }

    echo json_encode(["success" => true, "data" => $salaries]);

} catch(PDOException $e) {
    error_log('Erro ao buscar salários para relatório: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Erro ao buscar salários. Por favor, tente novamente mais tarde.']);
}
?>