<?php
// api/login.php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Ajuste isso para o domínio do seu frontend em produção
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

// Inclua sua conexão com o banco de dados
// Exemplo (adapte conforme sua configuração)
// include 'db_connect.php'; // Certifique-se de ter um arquivo db_connect.php ou coloque a conexão aqui

// Simulação de usuários e senhas HASHED (Substitua por um banco de dados real)
// IMPORTANTE: NUNCA armazene senhas em texto puro!
// Gere hashes para suas senhas assim (em PHP, uma vez para cada senha):
// echo password_hash('sua_senha_aqui', PASSWORD_DEFAULT);
$users = [
    'Geral' => '$2y$10$abcdefghijklmnopqrstuvw.xyz012345', // Hash de '123'
    'Diretoria' => '$2y$10$abcdefghijklmnopqrstuvw.xyz012345', // Hash de 'd123'
    'Financeiro' => '$2y$10$abcdefghijklmnopqrstuvw.xyz012345', // Hash de 'f123'
    'Pagador' => '$2y$10$abcdefghijklmnopqrstuvw.xyz012345', // Hash de 'p123'
    'Comum' => '$2y$10$abcdefghijklmnopqrstuvw.xyz012345', // Hash de 'c123'
    'RH' => '$2y$10$abcdefghijklmnopqrstuvw.xyz012345', // Hash de 'r123'
];

// --- IMPORTANTE: GERAR HASHES REAIS PARA CADA SENHA ---
// Você pode usar um script temporário para gerar os hashes.
// Exemplo:
// echo password_hash('123', PASSWORD_DEFAULT) . "\n";
// echo password_hash('d123', PASSWORD_DEFAULT) . "\n";
// ... e copiar os resultados para o array $users acima.
// Ou melhor ainda, armazenar estes hashes em um banco de dados.

$input = json_decode(file_get_contents('php://input'), true);

$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Usuário e senha são obrigatórios.']);
    exit;
}

if (isset($users[$username])) {
    // Verifica a senha fornecida com o hash armazenado
    if (password_verify($password, $users[$username])) {
        echo json_encode(['success' => true, 'message' => 'Login bem-sucedido.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Usuário ou senha incorretos.']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Usuário ou senha incorretos.']);
}
?>