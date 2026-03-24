<?php
require_once 'db_connect.php'; // Garante que as configurações de fuso horário do PHP e MySQL sejam aplicadas.

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['id'])) {
    echo json_encode(['success' => false, 'error' => 'ID do salário não fornecido.']);
    exit();
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO salaries (
            id, type, favoredName, bank, agency, account, operation, process, 
            value, month, createdBy, createdAt
        ) VALUES (
            :id, :type, :favoredName, :bank, :agency, :account, :operation, :process, 
            :value, :month, :createdBy, NOW() -- createdAt usando a hora atual do servidor (já configurada para Brasília)
        )
    ");

    $stmt->execute([
        ':id' => $input['id'],
        ':type' => $input['type'],
        ':favoredName' => $input['favoredName'],
        ':bank' => $input['bank'],
        ':agency' => $input['agency'],
        ':account' => $input['account'],
        ':operation' => $input['operation'] ?? null, // Garante que se 'operation' não vier, será NULL
        ':process' => $input['process'] ?? null,     // Garante que se 'process' não vier, será NULL
        ':value' => $input['value'],
        ':month' => $input['month'],                 // 'month' (YYYY-MM) não precisa de formatação de fuso
        ':createdBy' => $input['createdBy'] ?? null  // Garante que se 'createdBy' não vier, será NULL
    ]);

    echo json_encode(['success' => true, 'message' => 'Salário adicionado com sucesso.']);
} catch(PDOException $e) {
    // Melhorar o log de erro para incluir a mensagem completa da exceção
    error_log('Erro ao adicionar salário: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Erro ao adicionar salário: ' . $e->getMessage()]);
}
?>