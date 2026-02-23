$body = @{ email = "admin@example.com"; senha = "123456" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:3002/api/auth/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.token

$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "🔐 Token obtido com sucesso`n"

Write-Host "📊 Buscando vendedores para Alta Floresta Doeste (Dez/25)...`n"

$result = Invoke-RestMethod -Uri "http://localhost:3002/api/comissionamento/vendedores?periodo=Dez/25&regionalId=bd402487-06a3-40c3-b206-2fc7bf5d9db4" -Headers $headers

Write-Host "✅ Resposta recebida:`n"
$result | ConvertTo-Json -Depth 10 | Write-Host
