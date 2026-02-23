# Teste do endpoint de vendedores

Write-Host "🧪 TESTE DO ENDPOINT DE VENDEDORES`n" -ForegroundColor Cyan

# 1. Login
Write-Host "1️⃣ Fazendo login..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@teste.com"
    senha = "123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json"
    
    $token = $loginResponse.token
    Write-Host "   ✅ Login realizado`n" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Erro no login: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Buscar regionais
Write-Host "2️⃣ Buscando regionais..." -ForegroundColor Yellow
$headers = @{
    Authorization = "Bearer $token"
}

try {
    $regionaisResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/regionais" `
        -Method GET `
        -Headers $headers
    
    $primeiraRegional = $regionaisResponse.regionais[0]
    Write-Host "   ✅ $($regionaisResponse.regionais.Count) regionais encontradas" -ForegroundColor Green
    Write-Host "   📍 Testando com: $($primeiraRegional.nome) ($($primeiraRegional.id))`n" -ForegroundColor White
} catch {
    Write-Host "   ❌ Erro ao buscar regionais: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 3. Testar endpoint de vendedores
Write-Host "3️⃣ Chamando /api/comissionamento/vendedores..." -ForegroundColor Yellow
$periodo = "Dez/25"
Write-Host "   Parâmetros: periodo=`"$periodo`", regionalId=`"$($primeiraRegional.id)`"`n" -ForegroundColor Gray

try {
    $uri = "http://localhost:3002/api/comissionamento/vendedores?periodo=$periodo" + "&regionalId=$($primeiraRegional.id)"
    $vendedoresResponse = Invoke-RestMethod -Uri $uri `
        -Method GET `
        -Headers $headers
    
    Write-Host "✅ RESPOSTA DA API:" -ForegroundColor Green
    Write-Host "   Período: $($vendedoresResponse.periodo)" -ForegroundColor White
    Write-Host "   Regional ID: $($vendedoresResponse.regionalId)" -ForegroundColor White
    Write-Host "   Total de vendedores: $($vendedoresResponse.vendedores.Count)`n" -ForegroundColor White
    
    if ($vendedoresResponse.vendedores.Count -gt 0) {
        Write-Host "Primeiros 3 vendedores:" -ForegroundColor Yellow
        $vendedoresResponse.vendedores | Select-Object -First 3 | ForEach-Object {
            Write-Host "   • $($_.nome)" -ForegroundColor White
            $percentual = [math]::Round($_.vendas.percentualAlcancado * 100, 2)
            Write-Host "     Vendas: $($_.vendas.quantidade) | R$ $($_.vendas.valorTotal) | $percentual%" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️ Nenhum vendedor retornado" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ ERRO:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "   Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
