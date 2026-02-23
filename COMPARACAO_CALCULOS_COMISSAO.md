# 📊 Comparação: Cálculo Comissão Vendas vs Mudança de Titularidade

## Resumo Executivo
⚠️ **INCONSISTÊNCIA DETECTADA**: Os dois cálculos usam lógicas diferentes para determinar o percentual alcançado, gerando resultados inconsistentes.

---

## 1️⃣ CÁLCULO DE COMISSÃO (Função Comum)

```javascript
const calcularComissaoTipo = (valorFinanceiro, percentualAlcancadoTipo) => {
  if (!valorFinanceiro || valorFinanceiro === 0) return 0;
  return (valorFinanceiro * percentualAlcancadoTipo) + 
         (valorFinanceiro * somaPercentuaisPonderados);
};
```

**Lógica:** 
- Comissão = (Valor Financeiro × Percentual Alcançado do Tipo) + (Valor Financeiro × Soma Percentuais Ponderados)
- ✅ Esta parte é idêntica para ambos

---

## 2️⃣ CÁLCULO DO PERCENTUAL ALCANÇADO - DIFERENCENÇAS

### 🔴 VENDAS (Linhas 680-704)

```javascript
const volumeVendas = vendas.vendas_volume || 0;
let percentualAlcancado = 0;

// Percentuais individuais
const meta1PercentIndividual = normalizarPercentual(metaVendas.meta1PercentIndividual);
const meta2PercentIndividual = normalizarPercentual(metaVendas.meta2PercentIndividual);
const meta3PercentIndividual = normalizarPercentual(metaVendas.meta3PercentIndividual);

// Metas individuais (compartilhadas entre vendedores)
// metaIndividual1, metaIndividual2, metaIndividual3 são calculadas como:
// metaIndividual1 = (meta1Volume / totalVendedores) * (1 + incrementoGlobal)

// Lógica em escada
if (volumeVendas >= metaIndividual3) {
  if (volumeVendas >= metaIndividual2) {
    if (volumeVendas >= metaIndividual1) {
      percentualAlcancado = meta1PercentIndividual;
    } else {
      percentualAlcancado = meta2PercentIndividual;
    }
  } else {
    percentualAlcancado = meta3PercentIndividual;
  }
}
```

**Características:**
- ✅ Usa metas INDIVIDUAIS divididas pelo número de vendedores
- ✅ Aplica fator de incremento global: `(1 + incrementoGlobal)`
- ✅ Lógica em escada manual (3 níveis)
- ✅ Compara VOLUME de vendas com VOLUME de meta

### 🟠 MUDANÇA DE TITULARIDADE, MIGRAÇÃO, RENOVAÇÃO, etc (Linhas 706-725)

```javascript
const percentualMudancaTitularidadeVendedor = metaMudancaTitularidade 
  ? calcularPercentualPorMeta(vendas.mudanca_titularidade_volume || 0, metaMudancaTitularidade)
  : 0;
```

**Que chama (função genérica - Linhas 28-85):**

```javascript
const calcularPercentualPorMeta = (valorAtingido, meta, inverterPolaridade = false) => {
  if (!meta || valorAtingido === 0) return 0;

  const meta1Volume = normalizarNumero(meta.meta1Volume);
  const meta2Volume = normalizarNumero(meta.meta2Volume);
  const meta3Volume = normalizarNumero(meta.meta3Volume);

  const meta1Percent = normalizarPercentual(meta.meta1Percent);
  const meta2Percent = normalizarPercentual(meta.meta2Percent);
  const meta3Percent = normalizarPercentual(meta.meta3Percent);

  // Lógica em escada (vendas: quanto maior, melhor)
  if (valorAtingido >= meta3Volume) {
    if (valorAtingido >= meta2Volume) {
      if (valorAtingido >= meta1Volume) {
        return meta1Percent;
      } else {
        return meta2Percent;
      }
    } else {
      return meta3Percent;
    }
  }
  return 0;
};
```

**Características:**
- ❌ Usa metas GLOBAIS (não divididas por número de vendedores)
- ❌ NÃO aplica fator de incremento global
- ✅ Lógica em escada manual (3 níveis)
- ✅ Compara VOLUME com VOLUME de meta

---

## 3️⃣ DIFERENÇAS CRÍTICAS

| Aspecto | VENDAS | OUTROS TIPOS |
|---------|--------|--------------|
| **Fonte de Metas** | `metaIndividual1/2/3` (linha ~620) | `meta.meta1Volume/2Volume/3Volume` direto |
| **Metas Divisão** | ÷ totalVendedores | Sem divisão |
| **Incremento Global** | × (1 + incrementoGlobal) | Sem aplicação |
| **Percentual** | `meta*PercentIndividual` | `meta.*Percent` |
| **Função** | Lógica inline manual | `calcularPercentualPorMeta()` |
| **Tipo Comparação** | Volume individual vs meta individual | Volume individual vs meta global |

---

## 4️⃣ IMPACTO DO PROBLEMA

### Exemplo Prático
Suponha:
- 3 vendedores na regional
- Meta Vendas Meta1: 300 unidades
- Meta Mudança Titularidade Meta1: 300 unidades
- Vendedor A: 100 unidades em ambos

**Cálculo para VENDAS:**
1. metaIndividual1 = 300 / 3 = 100 unidades
2. Se vendedor atinge 100 >= 100: ganha percentual Meta1
3. ✅ Comparação justa

**Cálculo para MUDANÇA TITULARIDADE:**
1. Compara diretamente: 100 >= 300?
2. ❌ NÃO! Meta está em nível global
3. Vendedor recebe 0% mesmo tendo quantidades iguais

### Resultado
**Um vendedor pode receber comissões muito diferentes** mesmo com volumes idênticos!

---

## 5️⃣ RECOMENDAÇÕES

### Opção 1: Padronizar para VENDAS (Recomendado)
Aplicar o mesmo sistema de metas individuais para todos os tipos:
- Dividir meta global por número de vendedores
- Aplicar incremento global
- Usar percentuais individuais

### Opção 2: Padronizar para GENÉRICO
Modificar VENDAS para usar `calcularPercentualPorMeta()`:
- Mais simples e centralizado
- Mais fácil manutenção
- Menos código duplicado

### Opção 3: Documentação Explícita
Se a diferença é intencional:
- Documentar por escrito o porquê
- Criar variáveis e funções nomeadas claramente
- Adicionar comentários explicativos

---

## 6️⃣ VERIFICAÇÃO NECESSÁRIA

⚠️ **Perguntas para responder:**
1. É intencional que Vendas tenha metas divisíveis por vendedor enquanto outros tipos não?
2. Por que Vendas aplica `incrementoGlobal` e outros não?
3. Como o usuário espera que essas métricas se comportem?
4. Os dados no banco estão preenchidos corretamente com metas globais ou individuais?

---

## 7️⃣ CÓDIGO A CORRIGIR

**Arquivo:** `backend/src/controllers/comissionamentoController.js`

**Linhas afetadas:**
- 680-704: Cálculo de percentual para VENDAS
- 706-725: Cálculo de percentual para outros tipos
- 633-638: Função calcularComissaoTipo (idêntica para ambos ✅)

