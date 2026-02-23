// Teste direto da função converterData()

// Função cópia do controller para testar
const converterData = (valor) => {
  if (!valor) return '';
  
  // Se já é string in ISO ou formato esperado, retorna como-é
  if (typeof valor === 'string' && valor.match(/^\d{4}-\d{2}-\d{2}/)) {
    return valor;
  }

  // Se é número serial do Excel
  if (typeof valor === 'number' && valor > 0) {
    // Excel armazena datas como número de dias desde 1900-01-01 (com bug para 29 fev 1900)
    // Serial conhecido: 25569 = 1970-01-01 (Unix Epoch)
    // Então: dias desde 1970 = serial - 25569
    const milisegundosPorDia = 24 * 60 * 60 * 1000;
    const excelEpoch = 25569; // Dias entre 1900-01-01 (Excel base) e 1970-01-01 (Unix base)
    
    // Calcula milisegundos desde Unix Epoch
    const diasDesdeUnixEpoch = valor - excelEpoch;
    const milissegundosDesdeEpoch = diasDesdeUnixEpoch * milisegundosPorDia;
    
    // Cria data
    const data = new Date(milissegundosDesdeEpoch);
    
    // Retorna em formato ISO YYYY-MM-DD (usando UTC)
    const ano = data.getUTCFullYear();
    const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(data.getUTCDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  // Se é string em outro formato, tenta parsing
  if (typeof valor === 'string') {
    try {
      const parsed = new Date(valor);
      if (!isNaN(parsed.getTime())) {
        const ano = parsed.getUTCFullYear();
        const mes = String(parsed.getUTCMonth() + 1).padStart(2, '0');
        const dia = String(parsed.getUTCDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
      }
    } catch (e) {
      return valor; // retorna valor original se não conseguir parsear
    }
  }

  return valor;
};

// Testes com valores conhecidos
console.log('🧪 Testando converterData()\n');

console.log('Teste 1: Data serial 45328 (deveria ser ~2024-02-07)');
const resultado1 = converterData(45328);
console.log(`  Input: 45328 (type: number)`);
console.log(`  Output: ${resultado1}`);
console.log(`  Expected: 2024-02-07\n`);

console.log('Teste 2: Data serial com decimal 45328.83310185185');
const resultado2 = converterData(45328.83310185185);
console.log(`  Input: 45328.83310185185 (type: number)`);
console.log(`  Output: ${resultado2}`);
console.log(`  Expected: 2024-02-07\n`);

console.log('Teste 3: Data serial 45365 (deveria ser ~2024-03-15)');
const resultado3 = converterData(45365);
console.log(`  Input: 45365 (type: number)`);
console.log(`  Output: ${resultado3}`);
console.log(`  Expected: 2024-03-15\n`);

console.log('Teste 4: Data serial com decimal 45365.83310185185');
const resultado4 = converterData(45365.83310185185);
console.log(`  Input: 45365.83310185185 (type: number)`);
console.log(`  Output: ${resultado4}`);
console.log(`  Expected: 2024-03-15\n`);

console.log('Teste 5: String ISO');
const resultado5 = converterData('2024-02-07');
console.log(`  Input: '2024-02-07' (type: string)`);
console.log(`  Output: ${resultado5}`);
console.log(`  Expected: 2024-02-07\n`);

console.log('Teste 6: Vazio');
const resultado6 = converterData('');
console.log(`  Input: '' (type: string)`);
console.log(`  Output: '${resultado6}'`);
console.log(`  Expected: ''\n`);

// Teste com mapping de linha
console.log('Teste 7: Simulando linha com mapeamento');
const linha = {
  'Data criação': 45328.83310185185,
  'Concluir até': 45365.83310185185,
  'Ação': 'Teste'
};

const novaLinha = {};
for (const [chave, valor] of Object.entries(linha)) {
  const deveConverterData = chave.toLowerCase().includes('data') || 
                            chave.toLowerCase().includes('até') ||
                            chave.toLowerCase().includes('concluir');
  console.log(`  Chave: "${chave}" -> deve converter? ${deveConverterData}`);
  if (deveConverterData) {
    novaLinha[chave] = converterData(valor);
  } else {
    novaLinha[chave] = valor;
  }
}

console.log('\n  Resultado:');
console.log('  ', JSON.stringify(novaLinha, null, 2));
