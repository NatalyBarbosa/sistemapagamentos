<?php
// api/login.php

// Tratar OPTIONS (preflight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 86400');
    http_response_code(200);
    exit;
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

// Hashes gerados anteriormente
$users = [
    'Geral' => '$2y$10$cmPT0fTsmI2Yh4HRY9.4NuZYtPhG2xrBU295x/UU84bXqpYUHbxFa', // 123
    'Diretoria' => '$2y$10$tcV26sy.KbcJTubcSjCT..E6XrHnGLJ7mmddsRR4f51CwSeLQ2vrW', // d123
    'Financeiro' => '$2y$10$Zf01AdonypoFsxqw9IL5IewYP44rClVJ531giE.BLsZNmhLc2tlAW', // f123
    'Pagador' => '$2y$10$7CB5nj0c/iYCpq2ousVeJOVXk0ImHY.Sx7Fygy4zCWRqszTXMVsL6',    // p123
    'Comum' => '$2y$10$pSJ3bWoXbgsaIQ5u6Z5Dp.pbSnG/K7PaOzbaiXtAI9cdZL7/RHZ/.',      // d123
    'RH' => '$2y$10$7BVR9DOslT.b5kXfLsLPreQHqvXG6eyxe6rL92fD5DudWSYb0lF/G'          // r123
];


$input = json_decode(file_get_contents('php://input'), true);
$role = $input['role'] ?? '';
$password = $input['password'] ?? '';

if (empty($role) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Usuário e senha são obrigatórios.']);
    exit;
}

if (isset($users[$role]) && password_verify($password, $users[$role])) {
    // Gera um token simples
    $token = base64_encode($role . ':' . time() . ':' . bin2hex(random_bytes(16)));
    echo json_encode([
        'success' => true,
        'token' => $token,
        'user' => [
            'role' => $role,
            'username' => $role
        ]
    ]);
} else {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Usuário ou senha incorretos.']);
}