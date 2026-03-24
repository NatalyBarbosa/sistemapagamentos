<?php
// api/auth_utils.php

// Função para obter o usuário logado (simplificada)
function getCurrentUser() {
    // Em um ambiente de produção real, você usaria JWT, sessões seguras,
    // ou um sistema de autenticação mais robusto aqui.
    // Este exemplo simula a leitura do X-Auth-Token do seu JavaScript.
    
    $authToken = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? null;

    if ($authToken) {
        // Assume que o token é uma string base64_encode(role:timestamp)
        $decodedToken = base64_decode($authToken);
        
        // Verifica se a decodificação resultou em uma string válida antes de explodir
        if ($decodedToken === false) {
            error_log("Erro ao decodificar X-Auth-Token: " . ($authToken ?? 'null'));
            return null;
        }

        $parts = explode(':', $decodedToken);
        
        if (count($parts) === 2) {
            list($role, $timestamp) = $parts;

            // Validação básica: verifica se o token não é muito antigo (ex: 1 hora)
            if (time() - $timestamp < 3600) { // Token válido por 3600 segundos (1 hora)
                // Retorna um array com o papel (role) do usuário
                return ['username' => $role, 'role' => $role];
            } else {
                error_log("Token expirado para role: " . $role);
            }
        } else {
            error_log("Formato de token inválido após decodificação: " . $decodedToken);
        }
    }
    
    // Se não há token, ou token inválido/expirado, retorna null
    return null;
}

// Função auxiliar para verificar permissão
function hasPermission($allowedRoles) {
    $currentUser = getCurrentUser();
    if (!$currentUser) {
        return false; // Nenhum usuário logado ou token inválido
    }
    return in_array($currentUser['role'], $allowedRoles);
}