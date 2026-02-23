// Script para debugar a conversão de datas do Excel

console.log('🔍 Debugando conversão de datas\n');

// Teste 1: Qual serial corresponde a 2024-02-07?
const data1 = new Date(2024, 1, 7); // Fevereiro 7, 2024 (note: mês é 0-indexed)
console.log(`Teste 1: Qual serial é 2024-02-07?`);
console.log(`  new Date(2024, 1, 7) = ${data1}`);
console.log(`  getTime(): ${data1.getTime()}`);
console.log(`  getUTCFullYear(): ${data1.getUTCFullYear()}`);
console.log(`  getUTCMonth(): ${data1.getUTCMonth()}`);
console.log(`  getUTCDate(): ${data1.getUTCDate()}`);

// Converter para serial
const unixEpoch = new Date(1970, 0, 1).getTime();
console.log(`\n  Unix Epoch (1970-01-01): ${unixEpoch}`);
const diasDesdeEpoch = (data1.getTime() - unixEpoch) / (24 * 60 * 60 * 1000);
console.log(`  Dias desde Unix Epoch: ${diasDesdeEpoch}`);
const excelSerial1 = diasDesdeEpoch + 25569;
console.log(`  Excel Serial (diasDesdeEpoch + 25569): ${excelSerial1}`);

// Do lado oposto: qual a data para 45328?
console.log(`\n\nTeste 2: Qual data é o serial 45328?`);
const milisegundosPorDia = 24 * 60 * 60 * 1000;
const excelEpochDate = new Date(1899, 11, 30); // 1899-12-30 (base do Excel, ou 1900-01-01 ajustado)
console.log(`  Excel Epoch (1899-12-30): ${excelEpochDate}`);
const millisFrom1899Dec30 = (45328 - 1) * milisegundosPorDia;
console.log(`  Milisegundos from 1899-12-30: ${millisFrom1899Dec30}`);
const dataConverted1 = new Date(excelEpochDate.getTime() + millisFrom1899Dec30);
console.log(`  Data convertida: ${dataConverted1}`);
console.log(`  Ano: ${dataConverted1.getFullYear()}, Mês: ${dataConverted1.getMonth() + 1}, Dia: ${dataConverted1.getDate()}`);

// Usando UTC
console.log(`\n\nTeste 3: Usando UTC para 45328`);
const millisFromUtc = (45328 - 1) * milisegundosPorDia;
const dataUtc = new Date(millisFromUtc);
console.log(`  Milisegundos: ${millisFromUtc}`);
console.log(`  Data UTC: ${dataUtc}`);
console.log(`  Ano UTC: ${dataUtc.getUTCFullYear()}, Mês UTC: ${dataUtc.getUTCMonth() + 1}, Dia UTC: ${dataUtc.getUTCDate()}`);

// Teste com offset
console.log(`\n\nTeste 4: Qual é o serial de 1970-01-01?`);
const epoch1970 = new Date(1970, 0, 1);
const excelSerial1970 = ((epoch1970.getTime() - excelEpochDate.getTime()) / milisegundosPorDia) + 1;
console.log(`  Usando (epoch1970 - excelEpochDate) / ms_per_day + 1: ${excelSerial1970}`);

// Teste ao contrário: serial 25569 (que deveria ser 1970-01-01)
console.log(`\n\nTeste 5: Decodificando serial 25569`);
const data25569 = new Date(((25569 - 1) * milisegundosPorDia) + excelEpochDate.getTime());
console.log(`  Data: ${data25569}`);
console.log(`  Ano: ${data25569.getFullYear()}, Mês: ${data25569.getMonth() + 1}, Dia: ${data25569.getDate()}`);

// Teste com UTC
const data25569Utc = new Date((25569 - 1) * milisegundosPorDia);
console.log(`  Data UTC direto: ${data25569Utc}`);
console.log(`  Ano UTC: ${data25569Utc.getUTCFullYear()}, Mês UTC: ${data25569Utc.getUTCMonth() + 1}, Dia UTC: ${data25569Utc.getUTCDate()}`);

// Conclusão
console.log(`\n\n✓ CONCLUSÃO:`);
console.log(`  Serial 45328 deveria corresponder a 2024-02-07`);
console.log(`  Seu serial calculado: ${excelSerial1}`);
console.log(`  Diferença: ${Math.round(excelSerial1 - 45328)} dias`);
