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
    // Obter o cabeçalho de autenticação
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

    // Ler dados JSON do corpo da requisição
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['boletoId']) || empty($input['boletoId'])) {
        throw new Exception('ID do boleto é obrigatório');
    }
    
    $boletoId = $input['boletoId'];
    
    // Iniciar transação
    $pdo->beginTransaction();
    
    try {
        // Verificar se o boleto existe (usando uuid)
        $stmt = $pdo->prepare("SELECT id, uuid FROM boletos WHERE uuid = ?");
        $stmt->execute([$boletoId]);
        $boleto = $stmt->fetch();
        
        if (!$boleto) {
            throw new Exception('Boleto não encontrado');
        }
        
        $boletoInternalId = $boleto['id']; // ID interno (inteiro) para usar nas JOINs
        
        // Verificar se há parcelas pagas, exceto para o perfil 'Geral'
        if ($userRole !== 'Geral') {
            $stmt = $pdo->prepare("SELECT COUNT(*) as pagas FROM boleto_parcels WHERE boleto_id = ? AND is_paid = 1");
            $stmt->execute([$boletoInternalId]);
            $result = $stmt->fetch();
            
            $debugInfo['parcelas_pagas'] = $result['pagas'];
            $debugInfo['vai_bloquear'] = $result['pagas'] > 0 ? 'SIM' : 'NAO';
            
            if ($result['pagas'] > 0) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Não é possível excluir boletos que possuem parcelas já pagas',
                    'debug' => $debugInfo
                ]);
                exit;
            }
        } else {
            $debugInfo['perfil_geral'] = 'Permitindo exclusão - usuário é Geral';
        }
        
        // Excluir todas as parcelas do boleto (usando o ID interno)
        $stmt = $pdo->prepare("DELETE FROM boleto_parcels WHERE boleto_id = ?");
        $stmt->execute([$boletoInternalId]);
        $parcelasExcluidas = $stmt->rowCount();
        
        // Excluir o boleto (usando o uuid)
        $stmt = $pdo->prepare("DELETE FROM boletos WHERE uuid = ?");
        $stmt->execute([$boletoId]);
        $boletosExcluidos = $stmt->rowCount();
        
        // Confirmar transação
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Boleto excluído com sucesso pelo perfil ' . $userRole,
            'debug' => $debugInfo,
            'data' => [
                'boletoId' => $boletoId,
                'parcelasExcluidas' => $parcelasExcluidas,
                'boletosExcluidos' => $boletosExcluidos
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
        'error' => $e->getMessage(),
        'debug' => $debugInfo ?? []
    ]);
}
?>