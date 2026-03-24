<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit;
}

include 'db_connect.php';

try {
    // Ler dados JSON do corpo da requisição
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['boletoId']) || !isset($input['parcelId'])) {
        throw new Exception('Dados obrigatórios não fornecidos');
    }
    
    $boletoId = $input['boletoId'];
    $parcelId = $input['parcelId'];
    $vendor = $input['vendor'] ?? '';
    $process = $input['process'] ?? '';
    $value = $input['value'] ?? 0;
    $dueDate = $input['dueDate'] ?? '';
    $direction = $input['direction'] ?? '';
    $observation = $input['observation'] ?? '';
    
    // Validações
    if (empty($vendor) || empty($process) || $value <= 0 || empty($dueDate) || empty($direction)) {
        throw new Exception('Todos os campos obrigatórios devem ser preenchidos');
    }
    
    // Iniciar transação
    $pdo->beginTransaction();
    
    try {
        // Verificar se o boleto existe e pegar o ID interno
        $stmt = $pdo->prepare("SELECT id FROM boletos WHERE uuid = ?");
        $stmt->execute([$boletoId]);
        $boleto = $stmt->fetch();
        
        if (!boleto) {
            throw new Exception('Boleto não encontrado');
        }
        
        $boletoInternalId = $boleto['id'];
        
        // Verificar se a parcela existe e não está paga
        $stmt = $pdo->prepare("SELECT id, is_paid FROM boleto_parcels WHERE uuid = ? AND boleto_id = ?");
        $stmt->execute([$parcelId, $boletoInternalId]);
        $parcela = $stmt->fetch();
        
        if (!$parcela) {
            throw new Exception('Parcela não encontrada');
        }
        
        if ($parcela['is_paid']) {
            throw new Exception('Não é possível editar uma parcela que já foi paga');
        }
        
        // Atualizar dados do boleto
        $stmt = $pdo->prepare("
            UPDATE boletos 
            SET vendor = ?, process = ?, direction = ?, observation = ? 
            WHERE uuid = ?
        ");
        $stmt->execute([$vendor, $process, $direction, $observation, $boletoId]);
        
        // Atualizar dados da parcela
        $stmt = $pdo->prepare("
            UPDATE boleto_parcels 
            SET value = ?, due_date = ? 
            WHERE uuid = ?
        ");
        $stmt->execute([$value, $dueDate, $parcelId]);
        
        // Recalcular o valor total do boleto
        $stmt = $pdo->prepare("
            SELECT SUM(value) as total_value, MIN(due_date) as first_due_date 
            FROM boleto_parcels 
            WHERE boleto_id = ?
        ");
        $stmt->execute([$boletoInternalId]);
        $totals = $stmt->fetch();
        
        // Atualizar totais do boleto
        $stmt = $pdo->prepare("
            UPDATE boletos 
            SET total_value = ?, first_due_date = ? 
            WHERE id = ?
        ");
        $stmt->execute([$totals['total_value'], $totals['first_due_date'], $boletoInternalId]);
        
        // Confirmar transação
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Parcela editada com sucesso',
            'data' => [
                'boletoId' => $boletoId,
                'parcelId' => $parcelId,
                'newValue' => $value,
                'newDueDate' => $dueDate,
                'newTotalValue' => $totals['total_value']
            ]
        ]);
        
    } catch (Exception $e) {
        // Reverter transação em caso de erro
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>