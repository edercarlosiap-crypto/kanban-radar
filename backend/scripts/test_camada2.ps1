Start-Sleep -Seconds 2

try {
  Invoke-RestMethod -Method Post -Uri 'http://localhost:5000/auth/register' `
    -Body (ConvertTo-Json @{ nome='Teste CAMADA2'; email='teste.camada2@example.com'; senha='senha123'; senhaConfirm='senha123' }) `
    -ContentType 'application/json' -ErrorAction SilentlyContinue
} catch {}

$login = Invoke-RestMethod -Method Post -Uri 'http://localhost:5000/auth/login' `
  -Body (ConvertTo-Json @{ email='teste.camada2@example.com'; senha='senha123' }) `
  -ContentType 'application/json'

$token = $login.token
Write-Host "Token: $token`n"

$headers = @{ Authorization = "Bearer $token" }

$payload = @{
  camada='🟡 CAMADA 2 — EXPANSÃO DE RECEITA (MÉDIO PRAZO)'
  tipo='Tarefa'
  acao='Teste'
  equipe='Comercial'
  responsavel='Osmilton'
  concluirAte='2026-02-28'
  kanban='Planejado'
  observacao='Teste'
  linkBitrix=''
}

Write-Host "Payload enviado:"
$payload | ConvertTo-Json

try {
  $res = Invoke-RestMethod -Method Post -Uri 'http://localhost:5000/radar' -Headers $headers -Body (ConvertTo-Json $payload) -ContentType 'application/json'
  Write-Host "`n✅ Sucesso!"
  Write-Host "ID: $($res.item.id)"
  Write-Host "Status: $($res.item.status)"
  $res | ConvertTo-Json -Depth 5
} catch {
  Write-Host "`n❌ Erro:"
  Write-Host $_.Exception.Response.StatusCode
  $_.Exception.Response.Content | ConvertFrom-Json | ConvertTo-Json
}
