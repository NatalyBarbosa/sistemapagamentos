<?php
// Inclua o arquivo de configuração e a conexão com o banco de dados
require_once __DIR__ . '/config.php';

class WhatsAppBotPHP {
    private $zapiInstanceId;
    private $zapiToken;
    private $zapiClientToken;
    private $conn;
    private $sessionTimeout = 300; // Tempo de expiração da sessão em segundos (5 minutos)
    private $sessionFolder;
    private $allowedUsers; // Substitui userPINs para refletir que são usuários permitidos

    public function __construct() {
        $this->zapiInstanceId = ZAPI_INSTANCE_ID;
        $this->zapiToken = ZAPI_TOKEN;
        $this->zapiClientToken = ZAPI_CLIENT_TOKEN;
        $this->conn = getDBConnection();
        $this->sessionFolder = __DIR__ . '/sessions/';
        if (!is_dir($this->sessionFolder)) {
            mkdir($this->sessionFolder, 0775, true); // Garante que a pasta 'sessions' exista
        }
        $this->allowedUsers = $this->loadAllowedUsers(); // Carrega todos os usuários permitidos
    }

    // ==============================================================================================================
    // FUNÇÕES DE UTILIDADE GERAL
    // ==============================================================================================================

    private function sendMessage($to, $message) {
        $url = "https://api.z-api.io/instances/{$this->zapiInstanceId}/token/{$this->zapiToken}/send-text";
        $data = [
            "phone" => $to,
            "message" => $message
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Client-Token: ' . $this->zapiClientToken
        ]);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            log_message("✅ Mensagem enviada para {$to}: '{$message}'", 'INFO');
            log_message("🚀 [DEBUG] HTTP Code: {$httpCode}", 'DEBUG');
            log_message("🚀 [DEBUG] Response: {$response}", 'DEBUG');
            return true;
        } else {
            log_message("❌ Erro ao enviar mensagem para {$to} (HTTP: {$httpCode}): '{$response}'", 'ERROR');
            return false;
        }
    }

    private function normalizePhoneNumber($phoneNumber) {
        // Remove caracteres não numéricos
        $phoneNumber = preg_replace('/[^0-9]/', '', $phoneNumber);
        // Garante que tenha o código do país (55 para Brasil) e o 9º dígito, se faltar e for um número móvel.
        if (strlen($phoneNumber) === 10) { // Ex: 719XXXXYYYY (faltando o 9)
            $phoneNumber = substr($phoneNumber, 0, 2) . '9' . substr($phoneNumber, 2);
        } elseif (strlen($phoneNumber) === 11 && substr($phoneNumber, 2, 1) !== '9') { // Ex: 718XXXXYYYY (faltando o 9)
            $phoneNumber = substr($phoneNumber, 0, 2) . '9' . substr($phoneNumber, 2);
        }
        // Adiciona 55 se não tiver código do país
        if (strlen($phoneNumber) === 11 && substr($phoneNumber, 0, 2) !== '55') {
            $phoneNumber = '55' . $phoneNumber;
        }
        return $phoneNumber;
    }

    // Carrega usuários permitidos (substitui loadUserPINs)
    private function loadAllowedUsers() {
        // Em um sistema real, esta lista viria do seu banco de dados.
        // Por agora, um array simples para demonstração:
        return [
            $this->normalizePhoneNumber('5575991602730') => [ // Seu número
                'phone' => $this->normalizePhoneNumber('5575991602730'),
                'name' => 'Djael Jr.',
                'role' => 'diretoria', // Exemplo de perfil
                'pin' => '12345' // PIN pode ser mantido para outros fins, mas não para autenticação inicial
            ],
            $this->normalizePhoneNumber('557481287058') => [ // Número da Nataly
                'phone' => $this->normalizePhoneNumber('557481287058'),
                'name' => 'Nataly',
                'role' => 'solicitante', // Exemplo de perfil
                'pin' => '54321' 
            ],
            // Adicione mais usuários e seus perfis conforme necessário
            // $this->normalizePhoneNumber('55XXYYYYZZZZZ') => [
            //    'phone' => $this->normalizePhoneNumber('55XXYYYYZZZZZ'),
            //    'name' => 'Nome do Usuário',
            //    'role' => 'solicitante', // ou 'financeiro', 'pagador', 'rh', 'comum'
            //    'pin' => '99999'
            // ]
        ];
    }

    // ==============================================================================================================
    // GERENCIAMENTO DE SESSÃO
    // ==============================================================================================================

    private function getSessionFilePath($phoneNumber) {
        return $this->sessionFolder . $this->normalizePhoneNumber($phoneNumber) . '.json';
    }

    private function loadSession($phoneNumber) {
        $filePath = $this->getSessionFilePath($phoneNumber);
        if (file_exists($filePath)) {
            $sessionData = json_decode(file_get_contents($filePath), true);
            if ($sessionData && (time() - $sessionData['lastActivity']) < $this->sessionTimeout) {
                return $sessionData;
            } else {
                log_message("🕒 [WhatsApp Bot PHP] Sessão expirada ou inválida para {$phoneNumber}");
                if (file_exists($filePath)) { // Verifica novamente antes de tentar deletar
                    unlink($filePath); // Remove sessão expirada
                }
            }
        }
        return null;
    }

    private function saveSessionToFile($phoneNumber, $sessionData) {
        $sessionData['lastActivity'] = time();
        file_put_contents($this->getSessionFilePath($phoneNumber), json_encode($sessionData));
    }

    private function clearSession($phoneNumber) {
        $filePath = $this->getSessionFilePath($phoneNumber);
        if (file_exists($filePath)) {
            unlink($filePath);
            log_message("🗑️ [WhatsApp Bot PHP] Sessão limpa para {$phoneNumber}");
        }
    }

    // ==============================================================================================================
    // PROCESSAMENTO PRINCIPAL DE MENSAGENS (MODIFICADO SEM AUTENTICAÇÃO POR PIN)
    // ==============================================================================================================

    public function processIncomingMessage($phoneNumber, $message) {
        log_message("[WhatsApp Bot PHP DEBUG] Processando mensagem: '{$message}' de {$phoneNumber}", 'DEBUG');

        // Normaliza o número do remetente
        $normalizedPhoneNumber = $this->normalizePhoneNumber($phoneNumber);
        
        // Carrega a sessão do usuário
        $session = $this->loadSession($normalizedPhoneNumber);

        // --- VERIFICAÇÃO SE O USUÁRIO É RECONHECIDO ---
        $userData = $this->allowedUsers[$normalizedPhoneNumber] ?? null;

        if (!$userData) {
            // Se o número não está na lista de usuários permitidos
            return $this->sendMessage($normalizedPhoneNumber, 
                "⛔ **ACESSO NÃO AUTORIZADO**\n\n" .
                "Seu número de telefone não está registrado para acessar esta Central de Consultas.\n" .
                "Por favor, entre em contato com a administração para ser cadastrado."
            );
        }

        // --- Usuário reconhecido, continua o processamento ---
        if (!$session) {
            // Se não há sessão ativa, cria uma nova para o usuário reconhecido e o cumprimenta
            $session = $this->createSession($normalizedPhoneNumber, $userData);
            $welcomeMessage = sprintf(
                "✅ **AUTENTICADO COM SUCESSO**\n\n" .
                "👤 **Usuário:** %s\n" .
                "📋 **Perfil:** %s\n\n" .
                "🕒 Sessão válida por %s minutos.\n\n" .
                "━━━━━━━━━━━━━━━━━━━━━",
                $userData['name'],
                $this->getRoleDisplayName($userData['role']),
                (string)(int)($this->sessionTimeout / 60)
            );
            $this->sendMessage($normalizedPhoneNumber, $welcomeMessage);
            log_message("[WhatsApp Bot PHP DEBUG] Nova sessão criada para {$normalizedPhoneNumber}. Enviando menu principal.", 'INFO');
            return $this->sendMainMenu($session);
        }
        
        // --- Atualiza a atividade da sessão ---
        $this->saveSessionToFile($normalizedPhoneNumber, $session);

        // --- Lógica para processar comandos globais em qualquer menu ---
        $lowerMessage = strtolower(trim($message));
        if ($lowerMessage === '0' || $lowerMessage === 'sair') {
            $this->clearSession($normalizedPhoneNumber);
            return $this->sendMessage($normalizedPhoneNumber, "👋 Obrigado por usar a Central de Consultas. Sua sessão foi encerrada.");
        }
        if ($lowerMessage === 'menu' || $lowerMessage === 'inicio') {
            $session['currentMenu'] = 'main';
            $session['menuHistory'] = []; // Limpa o histórico para ir ao menu principal
            $this->saveSessionToFile($normalizedPhoneNumber, $session);
            return $this->sendMainMenu($session);
        }

        // --- Navegação de menu ---
        return $this->handleMenuNavigation($session, $message);
    }

    private function createSession($phoneNumber, $userData) {
        $session = [
            'phoneNumber' => $phoneNumber,
            'user' => $userData,
            'currentMenu' => 'main',
            'menuHistory' => [], // Armazena a sequência de menus visitados
            'lastActivity' => time()
        ];
        $this->saveSessionToFile($phoneNumber, $session);
        return $session;
    }

    // ==============================================================================================================
    // FUNÇÕES DE MENU E NAVEGAÇÃO
    // ==============================================================================================================
    
    // --- Menus Principais (UNIFICADO PARA TODOS) ---
    private function sendMainMenu($session) {
        $user = $session['user'];
        $session['currentMenu'] = 'main';
        $this->saveSessionToFile($session['phoneNumber'], $session);
        
        $menuText = "📋 **MENU PRINCIPAL**\n\n"; 
        $menuText .= "Olá, " . explode(' ', $user['name'])[0] . "! Escolha uma opção:\n\n";

        // === MENU UNIFICADO PARA TODOS OS PERFIS ===
        $menuText .= "1️⃣ Minhas Ordens (Solicitante)\n";
        $menuText .= "2️⃣ Consultar Ordem Específica (Todos)\n";
        $menuText .= "3️⃣ Ordens Pendentes de Aprovação (Diretoria)\n";
        $menuText .= "4️⃣ Ordens Aguardando Análise (Financeiro)\n";
        $menuText .= "5️⃣ Fila de Pagamento (Pagador)\n";
        $menuText .= "6️⃣ Ordens Pendentes (Solicitante)\n";
        $menuText .= "7️⃣ Ordens Pagas (Solicitante)\n";
        $menuText .= "8️⃣ Emergências (Todos)\n"; 
        $menuText .= "9️⃣ Saldo Disponível (Solicitante)\n";
        $menuText .= "🔟 Relatórios (Todos)\n"; 

        $menuText .= "\n0️⃣ Sair\n\n";
        $menuText .= "━━━━━━━━━━━━━━━━━━━━━\n";
        $menuText .= "Digite o número da opção desejada:";

        return $this->sendMessage($session['phoneNumber'], $menuText);
    }

    public function handleMenuNavigation($session, $message) {
        $option = trim($message);
        $user = $session['user'];
        $phoneNumber = $session['phoneNumber'];
    
        log_message("[DEBUG] handleMenuNavigation - Menu: {$session['currentMenu']}, Opção: '{$option}'");
    
        // Comandos globais como '0', 'sair', 'menu', 'inicio' já são tratados na processIncomingMessage.
        // O PIN não é mais uma autenticação, mas pode ser digitado por engano. Se for número e estiver no menu principal, reenviar menu.
        if ($session['currentMenu'] === 'main' && preg_match('/^\d{4,6}$/', $option)) {
            log_message("[DEBUG] Sequência numérica recebida no menu principal - reenviando menu.", 'INFO');
            return $this->sendMainMenu($session);
        }
    
        switch ($session['currentMenu']) {
            case 'main':
                return $this->handleUnifiedMainMenuSelection($session, $option);
                
            case 'my_orders':
            case 'order_list_filtered': 
            case 'pending_approval':
            case 'awaiting_financial_analysis': // Adicionado este case para o menu de lista de ordens
            case 'payment_queue':
            case 'emergency_orders': // Adicionado este case para o menu de lista de ordens
                if (is_numeric($option)) {
                    return $this->handleOrderListSelection($session, $option);
                }
                break; 
                
            case 'order_details':
                if (is_numeric($option)) {
                    return $this->handleOrderDetailsSelection($session, $option);
                }
                break;
                
            case 'order_history':
                if (strtolower($option) === '1') {
                    // Voltar para os detalhes da ordem
                    $this->popMenuHistory($session); // Remove 'order_history'
                    $session['currentMenu'] = array_pop($session['menuHistory']); // Volta para 'order_details'
                    $this->saveSessionToFile($phoneNumber, $session);
                    return $this->sendOrderDetails($session, $session['tempData']['selectedOrder']);
                }
                break;
                
            case 'order_attachments':
                if (strtolower($option) === '1') {
                    // Voltar para os detalhes da ordem
                    $this->popMenuHistory($session); // Remove 'order_attachments'
                    $session['currentMenu'] = array_pop($session['menuHistory']); // Volta para 'order_details'
                    $this->saveSessionToFile($phoneNumber, $session);
                    return $this->sendOrderDetails($session, $session['tempData']['selectedOrder']);
                }
                break;
                
            case 'search_order':
                return $this->handleSpecificOrderSearch($session, $message); // Passar a mensagem completa
            
            case 'reports_menu': // Novo menu para relatórios
                return $this->handleReportsMenuSelection($session, $option);

            default:
                log_message("[DEBUG] Menu desconhecido: {$session['currentMenu']}", 'WARNING');
                // Se a sessão entrou em um estado desconhecido, volta para o menu principal
                $session['currentMenu'] = 'main';
                $session['menuHistory'] = [];
                $this->saveSessionToFile($phoneNumber, $session);
                return $this->sendMainMenu($session);
        }
        
        // Se chegou aqui, opção inválida para o menu atual
        log_message("[DEBUG] Opção '{$option}' inválida para menu '{$session['currentMenu']}'", 'INFO');
        return $this->sendMessage($phoneNumber, "❌ Opção inválida. Tente novamente ou digite MENU para o principal.");
    }

    // Auxiliar para remover o último item do histórico de menu
    private function popMenuHistory(&$session) {
        if (!empty($session['menuHistory'])) {
            array_pop($session['menuHistory']);
        }
    }

    private function handleBackNavigation($session) {
        $phoneNumber = $session['phoneNumber'];
        // Remove o menu atual do histórico (que foi adicionado ao entrar nele)
        if (!empty($session['menuHistory'])) {
            $lastMenu = array_pop($session['menuHistory']);
            $session['currentMenu'] = $lastMenu;
            $this->saveSessionToFile($phoneNumber, $session);
        } else {
            // Se o histórico estiver vazio, volta para o menu principal
            $session['currentMenu'] = 'main';
            $this->saveSessionToFile($phoneNumber, $session);
            return $this->sendMainMenu($session);
        }
        
        // Redireciona para o menu correto
        switch ($session['currentMenu']) {
            case 'main':
                return $this->sendMainMenu($session);
            case 'my_orders':
                return $this->sendMyOrders($session);
            case 'pending_approval':
                return $this->sendPendingApprovalOrders($session);
            case 'awaiting_financial_analysis': 
                return $this->sendAwaitingFinancialAnalysis($session);
            case 'payment_queue':
                return $this->sendPaymentQueue($session);
            case 'emergency_orders': // Adicionado para voltar à lista de emergências
                return $this->sendEmergencyOrders($session);
            case 'order_details': 
                return $this->sendOrderDetails($session, $session['tempData']['selectedOrder']);
            case 'order_list_filtered': 
                if (isset($session['tempData']['lastFilterType'])) {
                    if ($session['tempData']['lastFilterType'] === 'status') {
                        return $this->sendOrdersByStatus($session, $session['tempData']['lastFilterValue']);
                    } elseif ($session['tempData']['lastFilterType'] === 'emergency') {
                        return $this->sendEmergencyOrders($session);
                    } elseif ($session['tempData']['lastFilterType'] === 'pending_approval') {
                         return $this->sendPendingApprovalOrders($session);
                    } elseif ($session['tempData']['lastFilterType'] === 'awaiting_financial_analysis') {
                         return $this->sendAwaitingFinancialAnalysis($session);
                    } elseif ($session['tempData']['lastFilterType'] === 'payment_queue') {
                         return $this->sendPaymentQueue($session);
                    } elseif ($session['tempData']['lastFilterType'] === 'paid_orders') {
                        return $this->sendOrdersByStatus($session, 'Paga');
                    }
                }
                // Fallback se não conseguir identificar o tipo de filtro
                $session['currentMenu'] = 'main';
                $this->saveSessionToFile($phoneNumber, $session);
                return $this->sendMainMenu($session);
            case 'reports_menu':
                return $this->sendReportsMenu($session);
            default:
                // Fallback para o menu principal se o menu anterior for desconhecido
                $session['currentMenu'] = 'main';
                $this->saveSessionToFile($phoneNumber, $session);
                return $this->sendMainMenu($session);
        }
    }
    
    // --- Manuseio de seleção em listas de ordem ---
    private function handleOrderListSelection($session, $option) {
        $orderIndex = (int)$option - 1;
        $orders = $session['tempData']['currentOrders'] ?? [];

        if (empty($orders) || $orderIndex < 0 || $orderIndex >= count($orders)) {
            return $this->sendMessage($session['phoneNumber'], 
                "❌ Número inválido. Digite um número válido da lista ou 0 para voltar."
            );
        }

        $selectedOrder = $orders[$orderIndex];
        $session['tempData']['selectedOrder'] = $selectedOrder;
        $session['menuHistory'][] = $session['currentMenu']; // Adiciona o menu da lista ao histórico
        $session['currentMenu'] = 'order_details';
        $this->saveSessionToFile($session['phoneNumber'], $session);

        return $this->sendOrderDetails($session, $selectedOrder);
    }


    // --- Menu Principal - Seleções (UNIFICADO PARA TODOS) ---
    private function handleUnifiedMainMenuSelection($session, $option) {
        $phoneNumber = $session['phoneNumber'];
        $userRole = $session['user']['role'];

        // O 'main' já está no histórico se a mensagem não for 'menu' ou 'inicio'
        // Adiciona 'main' ao histórico ANTES de ir para um sub-menu, para que 'voltar' funcione.
        $session['menuHistory'][] = 'main';
        $this->saveSessionToFile($phoneNumber, $session);

        switch ($option) {
            case '1': // Minhas Ordens (Solicitante)
                if ($userRole === 'solicitante') {
                    $session['currentMenu'] = 'my_orders';
                    $this->saveSessionToFile($phoneNumber, $session);
                    return $this->sendMyOrders($session);
                }
                return $this->sendMessage($phoneNumber, "⚠️ Opção disponível apenas para Solicitantes.");

            case '2': // Consultar Ordem Específica (Todos)
                $session['currentMenu'] = 'search_order';
                $this->saveSessionToFile($phoneNumber, $session);
                return $this->sendMessage($phoneNumber, 
                    "🔍 **CONSULTAR ORDEM ESPECÍFICA**\n\n" .
                    "Digite o ID da ordem (ex: OP-2024-001):"
                );

            case '3': // Ordens Pendentes de Aprovação (Diretoria)
                if (in_array($userRole, ['diretoria', 'solicitante', 'financeiro', 'pagador', 'geral'])) { // Permissão ampliada
                    $session['currentMenu'] = 'pending_approval';
                    $this->saveSessionToFile($phoneNumber, $session);
                    return $this->sendPendingApprovalOrders($session);
                }
                return $this->sendMessage($phoneNumber, "⚠️ Opção disponível apenas para Diretoria, Solicitantes, Financeiro e Pagador.");

            case '4': // Ordens Aguardando Análise (Financeiro)
                if (in_array($userRole, ['financeiro', 'solicitante', 'diretoria', 'pagador', 'geral'])) { // Permissão ampliada
                    $session['currentMenu'] = 'awaiting_financial_analysis';
                    $this->saveSessionToFile($phoneNumber, $session);
                    return $this->sendAwaitingFinancialAnalysis($session);
                }
                return $this->sendMessage($phoneNumber, "⚠️ Opção disponível apenas para Financeiro, Solicitantes, Diretoria e Pagador.");

            case '5': // Fila de Pagamento (Pagador)
                if (in_array($userRole, ['pagador', 'financeiro', 'solicitante', 'diretoria', 'geral'])) {
                    $session['currentMenu'] = 'payment_queue';
                    $this->saveSessionToFile($phoneNumber, $session);
                    return $this->sendPaymentQueue($session);
                }
                return $this->sendMessage($phoneNumber, "⚠️ Opção disponível apenas para Pagadores, Financeiro, Solicitantes e Diretoria.");

            case '6': // Ordens Pendentes (Solicitante)
                if ($userRole === 'solicitante') {
                    // Este menu não muda o currentMenu da sessão para uma lista, mas usa sendOrdersByStatus
                    // O 'order_list_filtered' será o currentMenu após a chamada.
                    return $this->sendOrdersByStatus($session, 'Pendente'); 
                }
                return $this->sendMessage($phoneNumber, "⚠️ Opção disponível apenas para Solicitantes.");

            case '7': // Ordens Pagas (Solicitante)
                if ($userRole === 'solicitante') {
                    return $this->sendOrdersByStatus($session, 'Paga');
                }
                return $this->sendMessage($phoneNumber, "⚠️ Opção disponível apenas para Solicitantes.");

            case '8': // Emergências (Todos)
                if (in_array($userRole, ['solicitante', 'diretoria', 'financeiro', 'pagador', 'rh', 'comum', 'geral'])) {
                    $session['currentMenu'] = 'emergency_orders'; // Adicionado para gerenciar o retorno
                    $this->saveSessionToFile($phoneNumber, $session);
                    return $this->sendEmergencyOrders($session);
                }
                return $this->sendMessage($phoneNumber, "⚠️ Você não tem permissão para ver Ordens de Emergência.");
            
            case '9': // Saldo Disponível (Solicitante)
                if ($userRole === 'solicitante') {
                    // Este menu não muda o currentMenu da sessão
                    return $this->sendAvailableBalance($session);
                }
                return $this->sendMessage($phoneNumber, "⚠️ Opção disponível apenas para Solicitantes.");

            case '10': // Relatórios (Todos)
                return $this->sendReportsMenu($session);

            default:
                // Se a opção for inválida, remove 'main' do histórico que foi adicionado no início da função
                array_pop($session['menuHistory']);
                $this->saveSessionToFile($phoneNumber, $session);
                return $this->sendMessage($phoneNumber, 
                    "❌ Opção inválida. Digite um número de 1 a 10, ou 0 para sair/voltar."
                );
        }
    }


    // ==============================================================================================================
    // FUNÇÕES DE EXIBIÇÃO DE ORDENS E DETALHES (FILTRADO POR STATUS, SOLICITANTE, ETC.)
    // ==============================================================================================================

    // Função para buscar ordens filtradas por solicitante
    private function getOrdersFromDBBySolicitant($solicitantName) {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM orders WHERE solicitant = :solicitantName ORDER BY generationDate DESC");
            $stmt->bindParam(':solicitantName', $solicitantName);
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            log_message("❌ Erro no DB ao buscar ordens por solicitante: " . $e->getMessage(), 'ERROR', 'db_error.log');
            return [];
        }
    }

    // Função para buscar ordens filtradas por status
    private function getOrdersFromDBByStatus($status) {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM orders WHERE status = :status ORDER BY generationDate DESC");
            $stmt->bindParam(':status', $status);
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            log_message("❌ Erro no DB ao buscar ordens por status: " . $e->getMessage(), 'ERROR', 'db_error.log');
            return [];
        }
    }

    // Função para buscar ordens pendentes de aprovação da diretoria
    private function getPendingApprovalOrdersFromDB() {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM orders WHERE status = 'Pendente' ORDER BY generationDate DESC");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            log_message("❌ Erro no DB ao buscar ordens pendentes de aprovação: " . $e->getMessage(), 'ERROR', 'db_error.log');
            return [];
        }
    }

    // Função para buscar ordens aguardando análise financeira
    private function getAwaitingFinancialAnalysisFromDB() {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM orders WHERE status = 'Aguardando Financeiro' ORDER BY generationDate DESC");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            log_message("❌ Erro no DB ao buscar ordens aguardando análise financeira: " . $e->getMessage(), 'ERROR', 'db_error.log');
            return [];
        }
    }

    // Função para buscar ordens na fila de pagamento
    private function getPaymentQueueFromDB() {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM orders WHERE status = 'Aguardando Pagamento' ORDER BY paymentForecast ASC");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            log_message("❌ Erro no DB ao buscar ordens na fila de pagamento: " . $e->getMessage(), 'ERROR', 'db_error.log');
            return [];
        }
    }

    // Função para buscar ordens de emergência
    private function getEmergencyOrdersFromDB() {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM orders WHERE priority = 'Emergencia' AND status <> 'Paga' ORDER BY generationDate DESC");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            log_message("❌ Erro no DB ao buscar ordens de emergência: " . $e->getMessage(), 'ERROR', 'db_error.log');
            return [];
        }
    }

    // Função para buscar ordem por ID
    private function getOrderByIdFromDB($orderId) {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM orders WHERE id = :orderId LIMIT 1");
            $stmt->bindParam(':orderId', $orderId);
            $stmt->execute();
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            log_message("❌ Erro no DB ao buscar ordem por ID: " . $e->getMessage(), 'ERROR', 'db_error.log');
            return null;
        }
    }

    // Função genérica para exibir listas de ordens
    private function displayOrderList($session, $orders, $menuTitle, $emptyMessage, $filterType, $filterValue = null) {
        $phoneNumber = $session['phoneNumber'];

        if (empty($orders)) {
            return $this->sendMessage($phoneNumber, 
                "{$menuTitle}\n\n" .
                "{$emptyMessage}\n\n" .
                "━━━━━━━━━━━━━━━━━━━━━\n" .
                "0️⃣ Voltar ao menu principal"
            );
        }

        $sortedOrders = $this->sortOrdersForDisplay($orders);

        $message = "{$menuTitle} (" . count($sortedOrders) . ")\n\n";

        foreach ($sortedOrders as $index => $order) {
            $value = number_format((float)$order['paymentValue'], 2, ',', '.') . ' R$';
            
            $urgencyIcon = (isset($order['priority']) && (strtolower($order['priority']) === 'emergencia' || strtolower($order['priority']) === 'emergência')) ? ' 🚨' : '';
            $statusIcon = $this->getStatusIcon($order['status']);
            
            $forecastInfo = '⏰ N/A';
            if (!empty($order['paymentForecast'])) {
                $forecastDate = new DateTime($order['paymentForecast']);
                $today = new DateTime('today');

                if ($forecastDate == $today) {
                    $forecastInfo = '⏰ VENCE HOJE';
                } elseif ($forecastDate < $today) {
                    $forecastInfo = '⏰ VENCIDA em ' . $forecastDate->format('d/m/Y');
                } else {
                    $forecastInfo = '⏰ Vence: ' . $forecastDate->format('d/m/Y');
                }
            }
            
            $message .= ($index + 1) . "️⃣ " . ($order['id'] ?? 'N/A') . " | " . $value . $urgencyIcon . "\n";
            $message .= "   📦 " . ($order['favoredName'] ?? 'N/A') . "\n";
            $message .= "   " . $statusIcon . " " . ($order['status'] ?? 'N/A') . " | " . $forecastInfo . "\n\n";
        }

        $totalValue = array_reduce($sortedOrders, function($sum, $order) {
            return $sum + (float)($order['paymentValue'] ?? 0);
        }, 0);
        $message .= "━━━━━━━━━━━━━━━━━━━━━\n";
        $message .= "💰 **Total:** " . number_format($totalValue, 2, ',', '.') . " R$\n\n";
        $message .= "Digite o **NÚMERO** da ordem para ver detalhes\n";
        $message .= "ou 0 para voltar ao menu principal.";

        $session['tempData']['currentOrders'] = $sortedOrders;
        $session['tempData']['lastFilterType'] = $filterType;
        $session['tempData']['lastFilterValue'] = $filterValue;
        $session['currentMenu'] = 'order_list_filtered'; // Menu genérico para listas
        $this->saveSessionToFile($phoneNumber, $session);
        
        return $this->sendMessage($phoneNumber, $message);
    }

    // --- Funções de envio de listas específicas ---
    private function sendMyOrders($session) {
        $userName = $session['user']['name'];
        $orders = $this->getOrdersFromDBBySolicitant($userName);
        return $this->displayOrderList($session, $orders, "📋 **MINHAS ORDENS**", "📄 Nenhuma ordem solicitada por você encontrada.", 'my_orders');
    }

    private function sendOrdersByStatus($session, $status) {
        $orders = $this->getOrdersFromDBByStatus($status);
        // O currentMenu da sessão já é atualizado dentro de displayOrderList para 'order_list_filtered'
        return $this->displayOrderList($session, $orders, "📋 **ORDENS STATUS: " . strtoupper($status) . "**", "📄 Nenhuma ordem com status '{$status}' encontrada.", 'status', $status);
    }

    private function sendPendingApprovalOrders($session) {
        $orders = $this->getPendingApprovalOrdersFromDB();
        return $this->displayOrderList($session, $orders, "📋 **PENDENTES DE APROVAÇÃO (DIRETORIA)**", "✅ Nenhuma ordem aguardando aprovação da Diretoria.", 'pending_approval');
    }

    private function sendAwaitingFinancialAnalysis($session) {
        $orders = $this->getAwaitingFinancialAnalysisFromDB();
        return $this->displayOrderList($session, $orders, "📋 **AGUARDANDO ANÁLISE (FINANCEIRO)**", "✅ Nenhuma ordem aguardando análise financeira.", 'awaiting_financial');
    }

    private function sendPaymentQueue($session) {
        $orders = $this->getPaymentQueueFromDB();
        return $this->displayOrderList($session, $orders, "📋 **FILA DE PAGAMENTO**", "✅ Nenhuma ordem na fila de pagamento.", 'payment_queue');
    }

    private function sendEmergencyOrders($session) {
        $orders = $this->getEmergencyOrdersFromDB();
        return $this->displayOrderList($session, $orders, "🚨 **ORDENS DE EMERGÊNCIA**", "✅ Nenhuma ordem de emergência ativa.", 'emergency');
    }

    // ==============================================================================================================
    // FUNÇÕES DE EXIBIÇÃO DE DETALHES DE ORDEM
    // ==============================================================================================================

    // --- Auxiliar para formatar o texto dos detalhes da ordem ---
    private function getOrderBasicDetailsText($order) {
        $value = number_format((float)($order['paymentValue'] ?? 0), 2, ',', '.') . ' R$';
        $creationDate = !empty($order['generationDate']) ? (new DateTime($order['generationDate']))->format('d/m/Y H:i') : 'N/A';
        $forecastDate = !empty($order['paymentForecast']) ? (new DateTime($order['paymentForecast']))->format('d/m/Y') : 'N/A';
        
        $text = "📦 **Favorecido:** " . ($order['favoredName'] ?? 'N/A') . "\n";
        $text .= "💰 **Valor:** " . $value . "\n";
        $text .= "📋 **Status:** " . ($order['status'] ?? 'N/A') . "\n\n";
        $text .= "📅 **Data Cadastro:** " . $creationDate . "\n";
        $text .= "⏰ **Previsão Pagamento:** " . $forecastDate . "\n";
        
        if (!empty($order['process'])) $text .= "⚙️ **Processo:** " . $order['process'] . "\n";
        if (!empty($order['direction'])) $text .= "➡ **Direcionamento:** " . $order['direction'] . "\n";
        if (!empty($order['solicitant'])) $text .= "👤 **Solicitante:** " . $order['solicitant'] . "\n";
        if (!empty($order['reference'])) $text .= "📝 **Referência:** " . $order['reference'] . "\n";
        if (!empty($order['observation'])) $text .= "💬 **Observação:** " . $order['observation'] . "\n";

        // Detalhes de aprovação/rejeição
        $approvalDetails = '';
        if (($order['approvedByDiretoria'] ?? false) && !empty($order['approvalDateDiretoria'])) {
            $approvalDetails .= "✅ Aprovado por Diretoria em " . (new DateTime($order['approvalDateDiretoria']))->format('d/m/Y') . "\n";
        }
        if (!empty($order['reprovedByDiretoriaReason'])) {
            $approvalDetails .= "❌ Reprovado pela Diretoria: " . ($order['reprovedByDiretoriaReason']) . "\n";
        }
        if (($order['approvedByFinanceiro'] ?? false) && !empty($order['approvalDateFinanceiro'])) {
            $approvalDetails .= "✅ Liberado por Financeiro em " . (new DateTime($order['approvalDateFinanceiro']))->format('d/m/Y') . "\n";
        }
        if (!empty($order['reprovedByFinanceiroReason'])) {
            $approvalDetails .= "❌ Reprovado pelo Financeiro: " . ($order['reprovedByFinanceiroReason']) . "\n";
        }
        if ($approvalDetails) {
            $text .= "\n━━━━━━━━━━━━━━━━━━━━━\n" . $approvalDetails;
        }

        return $text;
    }

    // Auxiliar para texto de urgência
    private function getUrgencyText($order) {
        if (isset($order['priority']) && (strtolower($order['priority']) === 'emergencia' || strtolower($order['priority']) === 'emergência')) {
            return "🚨 **PRIORIDADE: EMERGÊNCIA**\n";
        }
        return '';
    }

    private function sendOrderDetails($session, $order) {
        $phoneNumber = $session['phoneNumber'];
        
        $message = "📄 **DETALHES DA ORDEM " . ($order['id'] ?? 'N/A') . "**\n\n";
        $message .= $this->getUrgencyText($order);
        $message .= "━━━━━━━━━━━━━━━━━━━━━\n\n";
        $message .= $this->getOrderBasicDetailsText($order);
        $message .= "\n━━━━━━━━━━━━━━━━━━━━━\n\n";

        $optionsCount = 1;
        $message .= ($optionsCount++) . "️⃣ Ver Histórico Completo\n";

        $paymentProofsCount = 0;
        $paymentsDecoded = !empty($order['payments']) && is_string($order['payments']) ? 
                           json_decode($order['payments'], true) : ($order['payments'] ?? []);
        if (!empty($paymentsDecoded)) {
            foreach ($paymentsDecoded as $payment) {
                if (!empty($payment['proofData'])) $paymentProofsCount++;
            }
        }
        $hasBoletoData = !empty($order['boletoData']);
        $totalAttachments = $paymentProofsCount + ($hasBoletoData ? 1 : 0);

        if ($totalAttachments > 0) {
            $message .= ($optionsCount++) . "️⃣ Ver Anexos (" . $totalAttachments . " arquivo" . ($totalAttachments > 1 ? 's' : '') . ")\n";
        }
        
        $message .= ($optionsCount++) . "️⃣ Voltar para Lista\n\n"; // Esta opção de "Voltar" leva ao menu anterior
        $message .= "0️⃣ Menu Principal\n\n"; // Esta opção de "0" leva diretamente ao menu principal
        $message .= "Digite o número:";

        return $this->sendMessage($phoneNumber, $message);
    }
    
    private function sendOrderHistory($session, $order) {
        $phoneNumber = $session['phoneNumber'];
        $message = "📜 **HISTÓRICO COMPLETO DA ORDEM " . ($order['id'] ?? 'N/A') . "**\n\n";
        
        // Histórico de status
        $message .= "**➡️ Fluxo de Aprovação:**\n";
        $message .= "   • Criada: " . (new DateTime($order['generationDate']))->format('d/m/Y H:i') . "\n";
        if (($order['approvedByDiretoria'] ?? false) && !empty($order['approvalDateDiretoria'])) {
            $message .= "   • Aprovada Diretoria: " . (new DateTime($order['approvalDateDiretoria']))->format('d/m/Y H:i') . "\n";
        }
        if (!empty($order['reprovedByDiretoriaReason'])) { 
            $message .= "   • Reprovada Diretoria: " . ($order['reprovedByDiretoriaReason']) . "\n";
        }
        if (($order['approvedByFinanceiro'] ?? false) && !empty($order['approvalDateFinanceiro'])) {
            $message .= "   • Liberada Financeiro: " . (new DateTime($order['approvalDateFinanceiro']))->format('d/m/Y H:i') . "\n";
        }
        if (!empty($order['reprovedByFinanceiroReason'])) { 
            $message .= "   • Reprovado Financeiro: " . ($order['reprovedByFinanceiroReason']) . "\n";
        }
        if (!empty($order['paymentCompletionDate'])) {
            $message .= "   • Paga: " . (new DateTime($order['paymentCompletionDate']))->format('d/m/Y H:i') . "\n";
        }
        $message .= "\n";

        // Histórico de Pagamentos (se houver parcelas ou múltiplos pagamentos)
        if (!empty($order['payments'])) {
            // Decodifica payments se for string JSON
            $paymentsDecoded = is_string($order['payments']) ? 
                               json_decode($order['payments'], true) : ($order['payments'] ?? []);

            if (!empty($paymentsDecoded)) {
                $message .= "**💰 Histórico de Pagamentos (" . count($paymentsDecoded) . "):**\n";
                foreach ($paymentsDecoded as $index => $payment) {
                    $message .= "   • Pagamento " . ($index + 1) . ": R$ " . number_format((float)($payment['amount'] ?? 0), 2, ',', '.') . " em " . (new DateTime($payment['date']))->format('d/m/Y') . "\n";
                    if (!empty($payment['description'])) {
                        $message .= "     Descrição: " . $payment['description'] . "\n";
                    }
                }
                $message .= "\n";
            }
        } else {
             $message .= "💰 *Nenhum pagamento registrado ainda.*\n\n";
        }

        $message .= "━━━━━━━━━━━━━━━━━━━━━\n";
        $message .= "1️⃣ Voltar para Detalhes\n";
        $message .= "0️⃣ Menu Principal";

        $session['menuHistory'][] = 'order_details'; // O menu anterior ao histórico é sempre os detalhes da ordem
        $session['currentMenu'] = 'order_history';
        $this->saveSessionToFile($phoneNumber, $session);
        
        return $this->sendMessage($phoneNumber, $message);
    }

    private function sendOrderAttachments($session, $order) {
        $phoneNumber = $session['phoneNumber'];
        $message = "📎 **ANEXOS DA ORDEM " . ($order['id'] ?? 'N/A') . "**\n\n";
        $attachmentsToSend = [];

        // Boleto anexado (se boletoData for o base64)
        if (!empty($order['boletoData'])) {
            $message .= "• Boleto da Ordem\n";
            $attachmentsToSend[] = ['type' => 'file', 'data' => $order['boletoData'], 'name' => $order['boletoFileName'] ?? 'boleto_' . ($order['id'] ?? 'N/A') . '.pdf'];
        }

        // Comprovantes de pagamento
        if (!empty($order['payments'])) {
            $payments = is_string($order['payments']) ? json_decode($order['payments'], true) : $order['payments'];
            foreach ($payments as $index => $payment) {
                if (!empty($payment['proofData'])) {
                    $message .= "• Comprovante Pagamento " . ($index + 1) . "\n";
                    $attachmentsToSend[] = ['type' => 'file', 'data' => $payment['proofData'], 'name' => $payment['proofFileName'] ?? 'comprovante_' . ($order['id'] ?? 'N/A') . '_' . ($index + 1) . '.pdf'];
                }
            }
        }

        if (empty($attachmentsToSend)) {
            $message .= "*Nenhum anexo encontrado para esta ordem.*\n\n";
        } else {
             $message .= "_Os arquivos serão enviados separadamente após esta mensagem._\n\n";
        }

        $message .= "━━━━━━━━━━━━━━━━━━━━━\n";
        $message .= "1️⃣ Voltar para Detalhes\n";
        $message .= "0️⃣ Menu Principal";

        // Envia a mensagem de texto primeiro
        $this->sendMessage($phoneNumber, $message);

        // Envia os anexos individualmente (adapte para a API da Z-API)
        foreach ($attachmentsToSend as $attachment) {
            try {
                // Determine o tipo de anexo (imagem ou documento) para escolher o endpoint correto
                $isImage = false;
                $mimeType = 'application/octet-stream'; // Default
                if (isset($attachment['data']) && strpos($attachment['data'], 'data:') === 0) {
                    $mimeType = substr($attachment['data'], 5, strpos($attachment['data'], ';') - 5);
                } elseif (isset($attachment['name'])) {
                    $extension = pathinfo($attachment['name'], PATHINFO_EXTENSION);
                    $mimeTypes = [
                        'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
                        'pdf' => 'application/pdf',
                    ];
                    $mimeType = $mimeTypes[strtolower($extension)] ?? $mimeType;
                }

                if (strpos($mimeType, 'image/') === 0) {
                    $isImage = true;
                }
                
                $urlPath = $isImage ? 'send-image' : 'send-document';
                $attachmentUrl = "https://api.z-api.io/instances/{$this->zapiInstanceId}/token/{$this->zapiToken}/{$urlPath}";
                
                $postFields = [
                    "phone" => $phoneNumber,
                    // Para Z-API, 'document' ou 'image' esperam Base64 puro, NÃO data:image/png;base64,...
                    $isImage ? "image" : "document" => $this->extractBase64Data($attachment['data']),
                    "fileName" => $attachment['name']
                ];

                $ch = curl_init($attachmentUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Content-Type: application/json',
                    'Client-Token: ' . $this->zapiClientToken // <<< USE A PROPRIEDADE AQUI TAMBÉM 
                ]);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postFields));
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($httpCode >= 200 && $httpCode < 300) {
                    log_message("✅ Anexo {$attachment['name']} enviado para {$phoneNumber}");
                } else {
                    log_message("❌ Erro ao enviar anexo {$attachment['name']} (HTTP: {$httpCode}): '{$response}'", 'ERROR');
                    $this->sendMessage($phoneNumber, "❌ Erro ao enviar o arquivo {$attachment['name']}.");
                }
            } catch (Exception $e) {
                log_message("❌ Erro ao enviar anexo {$attachment['name']}: " . $e->getMessage(), 'ERROR');
                $this->sendMessage($phoneNumber, "❌ Erro ao enviar o arquivo {$attachment['name']}.");
            }
        }
        
        $session['menuHistory'][] = 'order_details'; 
        $session['currentMenu'] = 'order_attachments';
        $this->saveSessionToFile($phoneNumber, $session);
        return true; 
    }

    /**
     * Extrai os dados Base64 puros de uma string no formato data:image/png;base64,...
     * @param string $base64String A string Base64 completa com o prefixo do tipo MIME.
     * @return string O dado Base64 puro.
     */
    private function extractBase64Data($base64String) {
        if (strpos($base64String, 'base64,') !== false) {
            return substr($base64String, strpos($base64String, 'base64,') + 7);
        }
        return $base64String; 
    }

    // ==============================================================================================================
    // FUNÇÕES DE EXIBIÇÃO DE RELATÓRIOS E SALDO
    // ==============================================================================================================

    private function sendAvailableBalance($session) {
        // Implementar a lógica para buscar o saldo disponível do banco de dados
        // Por exemplo, buscar de uma tabela 'caixa' ou 'saldo'.
        // Por agora, um valor mock
        $balance = rand(1000, 5000) + rand(0, 99) / 100; // Valor aleatório para demonstração
        
        return $this->sendMessage($session['phoneNumber'], 
            "💰 **SALDO DISPONÍVEL**\n\n" .
            "Seu saldo disponível para movimentação é de: **R$ " . number_format($balance, 2, ',', '.') . "**\n\n" .
            "━━━━━━━━━━━━━━━━━━━━━\n" .
            "0️⃣ Voltar ao menu principal"
        );
    }

    private function sendReportsMenu($session) {
        $phoneNumber = $session['phoneNumber'];
        $userRole = $session['user']['role'];

        $session['currentMenu'] = 'reports_menu';
        $this->saveSessionToFile($phoneNumber, $session);

        $menuText = "📊 **MENU DE RELATÓRIOS**\n\n";
        $menuText .= "Escolha o tipo de relatório:\n\n";
        $menuText .= "1️⃣ Relatório de Ordens por Status\n";
        $menuText .= "2️⃣ Relatório de Pagamentos por Período\n";
        // Adicione mais opções de relatório aqui conforme necessário
        
        $menuText .= "\n0️⃣ Voltar ao menu principal\n\n";
        $menuText .= "━━━━━━━━━━━━━━━━━━━━━\n";
        $menuText .= "Digite o número da opção desejada:";

        return $this->sendMessage($phoneNumber, $menuText);
    }

    private function handleReportsMenuSelection($session, $option) {
        $phoneNumber = $session['phoneNumber'];
        $userRole = $session['user']['role'];

        switch ($option) {
            case '1': // Relatório de Ordens por Status
                if (in_array($userRole, ['diretoria', 'financeiro', 'geral'])) {
                    return $this->generateAndSendOrderStatusReport($session);
                }
                return $this->sendMessage($phoneNumber, "⚠️ Você não tem permissão para este relatório.");
            case '2': // Relatório de Pagamentos por Período
                if (in_array($userRole, ['financeiro', 'geral'])) {
                    return $this->generateAndSendPaymentsByPeriodReport($session);
                }
                return $this->sendMessage($phoneNumber, "⚠️ Você não tem permissão para este relatório.");
            // Adicione cases para outras opções de relatório
            default:
                return $this->sendMessage($phoneNumber, "❌ Opção inválida. Digite um número da lista, ou 0 para voltar.");
        }
    }

    private function generateAndSendOrderStatusReport($session) {
        // Implemente a lógica para buscar dados e formatar o relatório de status
        // Por exemplo: Contagem de ordens por status (Pendente, Aguardando Financeiro, Paga, etc.)
        $reportData = $this->getOrdersSummaryByStatusFromDB();
        
        $message = "📊 **RELATÓRIO: ORDENS POR STATUS**\n\n";
        if (empty($reportData)) {
            $message .= "Nenhum dado encontrado para o relatório.\n";
        } else {
            foreach ($reportData as $status => $count) {
                $message .= "• {$status}: {$count} ordem(s)\n";
            }
        }
        $message .= "\n━━━━━━━━━━━━━━━━━━━━━\n";
        $message .= "0️⃣ Voltar ao menu de relatórios";

        return $this->sendMessage($session['phoneNumber'], $message);
    }

    private function getOrdersSummaryByStatusFromDB() {
        try {
            $stmt = $this->conn->query("SELECT status, COUNT(*) as count FROM orders GROUP BY status");
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $summary = [];
            foreach ($results as $row) {
                $summary[$row['status']] = $row['count'];
            }
            return $summary;
        } catch (PDOException $e) {
            log_message("❌ Erro no DB ao gerar relatório de status: " . $e->getMessage(), 'ERROR', 'db_error.log');
            return [];
        }
    }

    private function generateAndSendPaymentsByPeriodReport($session) {
        // Implementar a lógica para relatórios de pagamentos por período.
        // Pode ser necessário pedir ao usuário um período de datas.
        // Por agora, um relatório simplificado.
        $message = "📊 **RELATÓRIO: PAGAMENTOS POR PERÍODO**\n\n";
        $message .= "Este relatório está em desenvolvimento. Em breve, você poderá especificar o período.\n\n";
        $message .= "_Exemplo: Total pago no último mês: R$ 15.000,00_\n\n";
        $message .= "━━━━━━━━━━━━━━━━━━━━━\n";
        $message .= "0️⃣ Voltar ao menu de relatórios";
        return $this->sendMessage($session['phoneNumber'], $message);
    }
    
    // ==============================================================================================================
    // FUNÇÕES AUXILIARES DE ORDENAÇÃO
    // ==============================================================================================================

    private function sortOrdersForDisplay($orders) {
        usort($orders, function($a, $b) {
            $priorityA = $this->getPriorityValue($a['priority'] ?? 'Normal');
            $priorityB = $this->getPriorityValue($b['priority'] ?? 'Normal');
            
            // Prioriza emergências e urgências
            if ($priorityA !== $priorityB) {
                return $priorityB <=> $priorityA; // Maior prioridade primeiro
            }

            // Em seguida, ordens vencidas
            $forecastA = isset($a['paymentForecast']) ? new DateTime($a['paymentForecast']) : null;
            $forecastB = isset($b['paymentForecast']) ? new DateTime($b['paymentForecast']) : null;
            $today = new DateTime('today');

            $isOverdueA = ($forecastA && $forecastA < $today);
            $isOverdueB = ($forecastB && $forecastB < $today);

            if ($isOverdueA && !$isOverdueB) return -1; // A vencida vem antes
            if (!$isOverdueA && $isOverdueB) return 1;  // B vencida vem antes

            // Se ambos são vencidos ou nenhum é, ordena pela data de vencimento (mais antiga primeiro)
            if ($forecastA && $forecastB) {
                return $forecastA <=> $forecastB;
            } elseif ($forecastA) {
                return -1; // Ordem com previsão vem antes
            } elseif ($forecastB) {
                return 1;  // Ordem com previsão vem antes
            }

            // Finalmente, ordena pela data de criação (mais recente primeiro, para ordens sem previsão)
            $creationA = isset($a['generationDate']) ? new DateTime($a['generationDate']) : null;
            $creationB = isset($b['generationDate']) ? new DateTime($b['generationDate']) : null;
            if ($creationA && $creationB) {
                return $creationB <=> $creationA;
            }

            return 0;
        });
        return $orders;
    }

    private function getPriorityValue($priority) {
        switch (strtolower($priority)) {
            case 'emergencia':
            case 'emergência':
                return 3;
            case 'urgencia':
            case 'urgência':
                return 2;
            case 'normal':
                return 1;
            default:
                return 0; // Baixa
        }
    }

    // --- Auxiliar para obter nome de perfil para exibição ---
    private function getRoleDisplayName($role) {
        $roles = [
            'geral' => 'Geral',
            'diretoria' => 'Diretoria',
            'financeiro' => 'Financeiro',
            'pagador' => 'Pagador',
            'solicitante' => 'Solicitante',
            'rh' => 'RH',
            'comum' => 'Comum'
        ];
        return $roles[strtolower($role)] ?? ucfirst($role);
    }
}