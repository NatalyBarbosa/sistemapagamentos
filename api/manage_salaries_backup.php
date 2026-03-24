<?php
// Cabeçalhos HTTP para JSON, CORS e controle de cache
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Permite requisições de qualquer origem, ajuste para segurança se necessário
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

// Responde a requisições OPTIONS pré-voo (preflight requests)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Inclui o arquivo de conexão com o banco de dados MySQL
// Certifique-se de que 'db_connect.php' está no caminho correto
require_once 'db_connect.php';

// Decodifica o input JSON do corpo da requisição
$input = json_decode(file_get_contents('php://input'), true);

// Verifica se a ação foi especificada no input
if (!isset($input['action'])) {
    echo json_encode(['success' => false, 'error' => 'Ação não especificada.']);
    exit;
}

try {
    // A variável $pdo é fornecida pelo db_connect.php
    // Não crie uma nova conexão PDO aqui.

    $action = $input['action'];

    switch ($action) {
        case 'backup_by_month_range':
            // Verifica se as datas inicial e final do período foram especificadas
            if (!isset($input['startDate']) || !isset($input['endDate'])) {
                echo json_encode(['success' => false, 'error' => 'Datas inicial e final do período não especificadas.']);
                exit;
            }
            $startDate = $input['startDate']; // Formato YYYY-MM
            $endDate = $input['endDate'];   // Formato YYYY-MM

            // Prepara a query SQL para atualizar os salários/auxílios
            // Marca isBackedUp como 1 (arquivado) para o período especificado
            // Apenas atualiza os que não estão já arquivados (isBackedUp = 0)
            $stmt = $pdo->prepare("UPDATE salaries SET isBackedUp = 1 WHERE month BETWEEN :startMonth AND :endMonth AND isBackedUp = 0");
            $stmt->bindValue(':startMonth', $startDate);
            $stmt->bindValue(':endMonth', $endDate);
            $stmt->execute();

            echo json_encode(['success' => true, 'message' => 'Salários/auxílios arquivados com sucesso.']);
            break;

        case 'restore_by_month_range':
            // Validar entrada - usando $input consistentemente
            $startDate = trim($input['startDate'] ?? '');
            $endDate = trim($input['endDate'] ?? '');
            
            if (empty($startDate) || empty($endDate)) {
                echo json_encode(['success' => false, 'error' => 'Datas inicial e final do período não especificadas.']);
                exit;
            }
            
            // Validar formato das datas
            if (!preg_match('/^\d{4}-\d{2}$/', $startDate) || !preg_match('/^\d{4}-\d{2}$/', $endDate)) {
                echo json_encode(['success' => false, 'error' => 'Formato de data inválido. Use YYYY-MM']);
                exit;
            }
            
            try {
                // Contar registros antes da recuperação
                $countSql = "SELECT COUNT(*) as total FROM salaries WHERE month BETWEEN :startMonth AND :endMonth AND isBackedUp = 1";
                $countStmt = $pdo->prepare($countSql);
                $countStmt->bindValue(':startMonth', $startDate);
                $countStmt->bindValue(':endMonth', $endDate);
                $countStmt->execute();
                $beforeCount = $countStmt->fetch()['total'];
                
                if ($beforeCount == 0) {
                    echo json_encode(['success' => false, 'error' => 'Nenhum registro arquivado encontrado no período especificado.']);
                    exit;
                }
                
                // Executar recuperação - APENAS COM COLUNAS QUE EXISTEM
                $sql = "UPDATE salaries 
                        SET isBackedUp = 0
                        WHERE month BETWEEN :startMonth AND :endMonth AND isBackedUp = 1";
                
                $stmt = $pdo->prepare($sql);
                $stmt->bindValue(':startMonth', $startDate);
                $stmt->bindValue(':endMonth', $endDate);
                $result = $stmt->execute();
                
                if ($result) {
                    $affected = $stmt->rowCount();
                    
                    // Log da operação
                    error_log("Salários recuperados: $affected registros do período $startDate a $endDate.");
                    
                    echo json_encode([
                        'success' => true, 
                        'message' => "Recuperados $affected registros do período $startDate a $endDate.",
                        'affected' => $affected,
                        'period' => "$startDate a $endDate"
                    ]);
                } else {
                    echo json_encode(['success' => false, 'error' => 'Erro ao executar recuperação no banco de dados.']);
                }
                
            } catch (Exception $e) {
                error_log("Erro na recuperação de salários: " . $e->getMessage());
                echo json_encode(['success' => false, 'error' => 'Erro interno do servidor: ' . $e->getMessage()]);
            }
            break;

        case 'get_backed_up':
            // Retorna todos os salários/auxílios que foram arquivados (isBackedUp = 1)
            $stmt = $pdo->prepare("SELECT * FROM salaries WHERE isBackedUp = 1 ORDER BY createdAt DESC");
            $stmt->execute();
            $backedUpSalaries = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Garante que o 'value' seja um float e 'isBackedUp' seja boolean para o frontend
            foreach ($backedUpSalaries as &$salary) {
                if (isset($salary['value'])) {
                    $salary['value'] = (float)$salary['value'];
                }
                $salary['isBackedUp'] = (bool)$salary['isBackedUp'];
            }

            echo json_encode(['success' => true, 'data' => $backedUpSalaries]);
            break;

        case 'restore_selected':
            // Verifica se os IDs dos salários para restaurar foram especificados e são um array
            if (!isset($input['salaryIds']) || !is_array($input['salaryIds'])) {
                echo json_encode(['success' => false, 'error' => 'IDs dos salários para restaurar não especificados.']);
                exit;
            }
            $salaryIds = $input['salaryIds'];

            // Constrói placeholders para a cláusula IN da query
            $placeholders = implode(',', array_fill(0, count($salaryIds), '?'));

            // Prepara a query SQL para restaurar os salários/auxílios
            // Marca isBackedUp como 0 (não arquivado) para os IDs selecionados
            $stmt = $pdo->prepare("UPDATE salaries SET isBackedUp = 0 WHERE id IN ($placeholders)");
            // Executa a query passando os IDs como parâmetros
            $stmt->execute($salaryIds);

            echo json_encode(['success' => true, 'message' => 'Salários/auxílios restaurados com sucesso.']);
            break;
            
        case 'restore_all_salaries':
            try {
                // Contar registros antes da recuperação
                $countSql = "SELECT COUNT(*) as total FROM salaries WHERE isBackedUp = 1";
                $countStmt = $pdo->prepare($countSql);
                $countStmt->execute();
                $beforeCount = $countStmt->fetch()['total'];
                
                if ($beforeCount == 0) {
                    echo json_encode(['success' => false, 'error' => 'Nenhum registro arquivado encontrado para restaurar.']);
                    exit;
                }
                
                // Executar recuperação para TODOS os registros arquivados
                $sql = "UPDATE salaries 
                        SET isBackedUp = 0
                        WHERE isBackedUp = 1";
                
                $stmt = $pdo->prepare($sql);
                $result = $stmt->execute();
                
                if ($result) {
                    $affected = $stmt->rowCount();
                    
                    // Log da operação
                    error_log("Recuperação completa: $affected registros restaurados");
                    
                    echo json_encode([
                        'success' => true, 
                        'message' => "Recuperação completa: $affected registros restaurados.",
                        'affected' => $affected
                    ]);
                } else {
                    echo json_encode(['success' => false, 'error' => 'Erro ao executar recuperação completa no banco de dados.']);
                }
                
            } catch (Exception $e) {
                error_log("Erro na recuperação completa: " . $e->getMessage());
                echo json_encode(['success' => false, 'error' => 'Erro interno do servidor: ' . $e->getMessage()]);
            }
            break;

        default:
            echo json_encode(['success' => false, 'error' => 'Ação inválida.']);
            break;
    }

} catch (PDOException $e) {
    // Captura erros específicos do PDO (banco de dados)
    error_log('Erro PDO em manage_salaries_backup.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Erro no banco de dados: ' . $e->getMessage()]);
} catch (Exception $e) {
    // Captura outros tipos de erros
    error_log('Erro geral em manage_salaries_backup.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Erro inesperado: ' . $e->getMessage()]);
}
?>