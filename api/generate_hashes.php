<?php
// generate_hashes.php (EXECUTE ESTE ARQUIVO APENAS UMA VEZ E DEPOIS O DELETE!)

echo "Hash para '123': " . password_hash('123', PASSWORD_DEFAULT) . "\n";
echo "Hash para 'd123': " . password_hash('d123', PASSWORD_DEFAULT) . "\n";
echo "Hash para 'f123': " . password_hash('f123', PASSWORD_DEFAULT) . "\n";
echo "Hash para 'p123': " . password_hash('p123', PASSWORD_DEFAULT) . "\n";
echo "Hash para 'c123': " . password_hash('c123', PASSWORD_DEFAULT) . "\n";
echo "Hash para 'r123': " . password_hash('r123', PASSWORD_DEFAULT) . "\n";
?>