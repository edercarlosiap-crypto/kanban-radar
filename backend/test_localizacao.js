// Teste de normalização e localização
const normalizarNome = (nome) => {
  return String(nome || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toLowerCase()
    .replace(/\s+/g, ' ') // Normaliza espaços múltiplos
    .trim();
};

// Simular colaboradores do banco
const colaboradores = [
  { id: '1', nome: 'Vendedor Padrão' },
  { id: '2', nome: 'Maria Silva' },
  { id: '3', nome: 'João Paulo' }
];

const localizarVendedor = (valor) => {
  if (!valor) return null;
  const direto = colaboradores.find((c) => c.id === valor);
  if (direto) return direto.id;
  const valorNormalizado = normalizarNome(valor);
  const nome = colaboradores.find((c) => normalizarNome(c.nome) === valorNormalizado);
  return nome ? nome.id : null;
};

// Testes com diferentes variações
const testes = [
  'Vendedor Padrão',      // Com acento
  'Vendedor Padrao',      // Sem acento
  'vendedor padrão',      // Minúsculo
  'VENDEDOR PADRÃO',      // Maiúsculo
  '  Vendedor  Padrão  ', // Com espaços extras
  'Vendedor  Padrao'      // Sem acento + espaços
];

console.log('=== TESTE DE LOCALIZAÇÃO DE VENDEDOR ===\n');
testes.forEach(teste => {
  const resultado = localizarVendedor(teste);
  const status = resultado ? '✓ ENCONTRADO' : '✗ NÃO ENCONTRADO';
  console.log(`${status} - "${teste}" -> ID: ${resultado || 'null'}`);
});

console.log('\n=== TESTE DE VENDEDOR INEXISTENTE ===');
const inexistente = localizarVendedor('Vendedor Inexistente');
console.log(`${inexistente ? '✗ ERRO' : '✓ OK'} - "Vendedor Inexistente" -> ID: ${inexistente || 'null'}`);
