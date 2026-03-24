<?php
require_once 'db_connect.php'; // Garante que as configurações de fuso horário do PHP e MySQL sejam aplicadas.

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['id'])) {
    echo json_encode(['success' => false, 'error' => 'ID do salário não fornecido.']);
    exit();
}

$salaryId = $input['id'];

$updateFields = [];
$params = [];

if (isset($input['type'])) { $updateFields[] = 'type = :type'; $params[':type'] = $input['type']; }
if (isset($input['favoredName'])) { $updateFields[] = 'favoredName = :favoredName'; $params[':favoredName'] = $input['favoredName']; }
if (isset($input['bank'])) { $updateFields[] = 'bank = :bank'; $params[':bank'] = $input['bank']; }
if (isset($input['agency'])) { $updateFields[] = 'agency = :agency'; $params[':agency'] = $input['agency']; }
if (isset($input['account'])) { $updateFields[] = 'account = :account'; $params[':account'] = $input['account']; }
if (isset($input['operation'])) { $updateFields[] = 'operation = :operation'; $params[':operation'] = $input['operation']; }
if (isset($input['process'])) { $updateFields[] = 'process = :process'; $params[':process'] = $input['process']; }
if (isset($input['value'])) { $updateFields[] = 'value = :value'; $params[':value'] = $input['value']; }

// Para o campo 'month' (espera YYYY-MM).
// Se a coluna 'month' no seu DB for VARCHAR ou TEXT, nenhuma alteração é necessária aqui.
// Se fosse DATE, você precisaria formatar para YYYY-MM-01, por exemplo.
if (isset($input['month'])) { 
    $updateFields[] = 'month = :month'; 
    $params[':month'] = $input['month']; 
}

if (empty($updateFields)) {
    echo json_encode(['success' => false, 'error' => 'Nenhum campo para atualizar fornecido.']);
    exit();
}

try {
    $query = "UPDATE salaries SET " . implode(', ', $updateFields) . " WHERE id = :id";
    $params[':id'] = $salaryId;
    
    $stmt = $pdo->prepare($query);
    $result = $stmt->execute($params);

    echo json_encode(['success' => $result, 'message' => 'Salário atualizado com sucesso.']);
} catch(PDOException $e) {
    // Melhorar o log de erro para incluir a mensagem completa da exceção
    error_log('Erro ao atualizar salário: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Erro ao atualizar salário: ' . $e->getMessage()]);
}
?>