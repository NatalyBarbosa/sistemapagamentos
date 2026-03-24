<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Auth-Token');

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
    // Obter o cabeçalho de autenticação com debug
    $authToken = '';
    $debugInfo = [];
    
    // Verificar $_SERVER
    if (isset($_SERVER['HTTP_X_AUTH_TOKEN'])) {
        $authToken = $_SERVER['HTTP_X_AUTH_TOKEN'];
        $debugInfo['fonte'] = 'HTTP_X_AUTH_TOKEN';
    }
    
    // Verificar getallheaders se disponível
    if (empty($authToken) && function_exists('getallheaders')) {
        $headers = getallheaders();
        if (isset($headers['X-Auth-Token'])) {
            $authToken = $headers['X-Auth-Token'];
            $debugInfo['fonte'] = 'getallheaders';
        }
        $debugInfo['all_headers'] = array_keys($headers);
    }
    
    $debugInfo['authToken_recebido'] = $authToken;
    
    $userRole = '';
    if (!empty($authToken)) {
        $decodedToken = base64_decode($authToken);
        $parts = explode(':', $decodedToken);
        $debugInfo['token_decodificado'] = $decodedToken;
        $debugInfo['parts'] = $parts;
        
        if (count($parts) === 2) {
            $userRole = $parts[0];
        }
    }
    
    $debugInfo['userRole_final'] = $userRole;
    $debugInfo['eh_geral'] = ($userRole === 'Geral') ? 'SIM' : 'NAO';

    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['boletoId']) || !isset($input['parcelId'])) {
        throw new Exception('Dados obrigatórios não fornecidos');
    }
    
    $boletoId = $input['boletoId'];
    $parcelId = $input['parcelId'];
    
    $pdo->beginTransaction();
    
    try {
        // Verificar se o boleto existe e pegar o ID interno
        $stmt = $pdo->prepare("SELECT id FROM boletos WHERE uuid = ?");
        $stmt->execute([$boletoId]);
        $boleto = $stmt->fetch();
        
        if (!$boleto) {
            throw new Exception('Boleto não encontrado');
        }
        
        $boletoInternalId = $boleto['id'];
        
        // Verificar se a parcela existe
        $stmt = $pdo->prepare("SELECT id, is_paid, parcel_number FROM boleto_parcels WHERE uuid = ? AND boleto_id = ?");
        $stmt->execute([$parcelId, $boletoInternalId]);
        $parcela = $stmt->fetch();
        
        if (!$parcela) {
            throw new Exception('Parcela não encontrada');
        }
        
        $debugInfo['parcela_is_paid'] = $parcela['is_paid'];
        $debugInfo['condicao_bloquear'] = ($parcela['is_paid'] && $userRole !== 'Geral') ? 'SIM' : 'NAO';
        
        // CONDIÇÃO CRÍTICA: APENAS SE O PERFIL NÃO FOR GERAL, VERIFICA SE ESTÁ PAGA
        if ($parcela['is_paid'] && $userRole !== 'Geral') { 
            // Retornar debug em caso de bloqueio
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Não é possível excluir uma parcela que já foi paga',
                'debug' => $debugInfo
            ]);
            exit;
        }
        
        // Verificar quantas parcelas o boleto tem
        $stmt = $pdo->prepare("SELECT COUNT(*) as total_parcels FROM boleto_parcels WHERE boleto_id = ?");
        $stmt->execute([$boletoInternalId]);
        $totalParcels = $stmt->fetch()['total_parcels'];
        
        if ($totalParcels <= 1) {
            // Se for a última parcela, exclui o boleto inteiro junto
            $stmt = $pdo->prepare("DELETE FROM boleto_parcels WHERE boleto_id = ?");
            $stmt->execute([$boletoInternalId]);
            
            $stmt = $pdo->prepare("DELETE FROM boletos WHERE id = ?");
            $stmt->execute([$boletoInternalId]);
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Última parcela e boleto excluídos com sucesso',
                'data' => [
                    'boletoId' => $boletoId,
                    'deletedParcelId' => $parcelId,
                    'deletedParcelNumber' => $parcela['parcel_number'],
                    'newTotalValue' => 0,
                    'remainingParcels' => 0,
                    'boletoDeleted' => true
                ]
            ]);
            exit;
        }
        
        // Excluir a parcela específica
        $stmt = $pdo->prepare("DELETE FROM boleto_parcels WHERE uuid = ?");
        $stmt->execute([$parcelId]);
        
        $affectedRows = $stmt->rowCount();
        if ($affectedRows === 0) {
            throw new Exception('Nenhuma parcela foi excluída');
        }
        
        // Recalcular valores do boleto após exclusão da parcela
        $stmt = $pdo->prepare("
            SELECT SUM(value) as new_total_value, MIN(due_date) as new_first_due_date, COUNT(*) as remaining_parcels
            FROM boleto_parcels 
            WHERE boleto_id = ?
        ");
        $stmt->execute([$boletoInternalId]);
        $newTotals = $stmt->fetch();
        
        // Atualizar dados do boleto
        $stmt = $pdo->prepare("
            UPDATE boletos 
            SET total_value = ?, first_due_date = ? 
            WHERE id = ?
        ");
        $stmt->execute([$newTotals['new_total_value'], $newTotals['new_first_due_date'], $boletoInternalId]);
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Parcela excluída com sucesso pelo perfil Geral',
            'debug' => $debugInfo,
            'data' => [
                'boletoId' => $boletoId,
                'deletedParcelId' => $parcelId,
                'deletedParcelNumber' => $parcela['parcel_number'],
                'newTotalValue' => $newTotals['new_total_value'],
                'remainingParcels' => $newTotals['remaining_parcels']
            ]
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => $debugInfo ?? []
    ]);
}
?>