Start-Sleep -Seconds 2

# Registrar
Write-Host "Registrando usuario..."
curl.exe -s -X POST http://localhost:5000/auth/register -H "Content-Type: application/json" --data-binary "@login.json" | Out-Null

# Login
Write-Host "Login..."
$loginRes = curl.exe -s -X POST http://localhost:5000/auth/login -H "Content-Type: application/json" --data-binary "@login_only.json"
Write-Host "Login response: $loginRes"
$login = $loginRes | ConvertFrom-Json
$token = $login.token
Write-Host "Token: $token`n"

# POST CAMADA 2 usando arquivo JSON
Write-Host "Enviando CAMADA 2..."
$header = "Authorization: Bearer $token"
$res = curl.exe -s -X POST http://localhost:5000/radar -H "Content-Type: application/json" -H $header --data-binary "@payload_camada2.json"
Write-Host "Resposta:"
Write-Host $res

$data = $res | ConvertFrom-Json

if ($data.item) {
  Write-Host "`nSUCESSO!"
  Write-Host "ID: $($data.item.id)"
  Write-Host "Camada: $($data.item.camada)"
  Write-Host "Status: $($data.item.status)"
} else {
  Write-Host "`nERRO:"
  Write-Host "Erro: $($data.erro)"
}
