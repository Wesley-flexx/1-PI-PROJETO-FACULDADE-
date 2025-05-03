// 1.ONTROLE DE ESTOQUE AVANÇADO
async function atualizarEstoque(id, operacao) {
    const produtoRef = doc(db, "produtos", id);
    const produto = produtos.find(p => p.id === id);
  
    if (!produto) return;
  
    let novaQuantidade;
    switch (operacao) {
      case 'INCREMENTAR':
        novaQuantidade = produto.quantidade + 1;
        break;
      case 'DECREMENTAR':
        novaQuantidade = Math.max(0, produto.quantidade - 1); // Impede valores negativos
        break;
      case 'AJUSTAR':
        const ajuste = parseInt(prompt("Digite o valor do ajuste:"));
        if (!isNaN(ajuste)) novaQuantidade = produto.quantidade + ajuste;
        break;
    }
  
    if (novaQuantidade >= 0) {
      await updateDoc(produtoRef, { 
        quantidade: novaQuantidade,
        ultimaModificacao: serverTimestamp() // Registro de data/hora
      });
    } else {
      alert("Quantidade não pode ser negativa!");
    }
  }
  
  // 2. HISTÓRICO DE MODIFICAÇÕES (Firestore Subcollection)
  async function registrarHistorico(produtoId, acao, dadosAntigos) {
    const historicoRef = collection(db, "produtos", produtoId, "historico");
    await addDoc(historicoRef, {
      acao,
      dadosAntigos,
      usuario: "Sistema", // Substituir por auth.currentUser?.email em sistemas com login
      data: serverTimestamp()
    });
  }
  
  // 3. BUSCA AVANÇADA
  function buscarProdutos(termo, filtro = 'todos') {
    let resultados = produtos;
    
    // Filtro por termo
    if (termo) {
      resultados = resultados.filter(p => 
        p.descricao.toLowerCase().includes(termo.toLowerCase())
    }
  
    // Filtros adicionais
    switch (filtro) {
      case 'estoque-baixo':
        resultados = resultados.filter(p => p.quantidade < 5);
        break
      case 'recentes':
        resultados.sort((a, b) => b.ultimaModificacao - a.ultimaModificacao);
        break;
    }
  
    return resultados;
  }
  
  // 5. VALIDAÇÃO DE FORMULÁRIO MELHORADA
  function validarProduto(dados) {
    const erros = [];
    
    if (!dados.descricao || dados.descricao.length < 3) {
      erros.push("Descrição deve ter pelo menos 3 caracteres");
    }
  
    if (isNaN(dados.quantidade) || dados.quantidade < 0) {
      erros.push("Quantidade inválida");
    }
  
    return erros;
  }
  
  // 6. SISTEMA DE NOTIFICAÇÕES
  function notificar(mensagem, tipo = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${tipo}`;
    notification.innerHTML = `
      <span>${mensagem}</span>
      <button class="btn-close-notification">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // Remove após 5 segundos
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 5000);
    
    // Fechar manualmente
    notification.querySelector('.btn-close-notification').addEventListener('click', () => {
      notification.remove();
    });
  }
  
  // 7. OTIMIZAÇÃO DE RENDERIZAÇÃO
  let ultimaRenderizacao = 0;
  function renderizarProdutosOtimizado(produtosParaRenderizar) {
    const agora = Date.now();
    if (agora - ultimaRenderizacao < 300) return; // Throttle de 300ms
    
    ultimaRenderizacao = agora;
    // ... código de renderização existente ...
  }
  
  // 8. CONTROLE DE CONCURRÊNCIA (Evita sobreposição de edições)
  const edicoesPendentes = new Set();
  async function editarProdutoSeguro(id) {
    if (edicoesPendentes.has(id)) {
      notificar("Este produto já está sendo editado", 'warning');
      return;
    }
  
    edicoesPendentes.add(id);
    try {
      await editarProduto(id);
    } finally {
      edicoesPendentes.delete(id);
    }
  }
  
  // 9. ESTATÍSTICAS EM TEMPO REAL
  function calcularEstatisticas() {
    const totalItens = produtos.length;
    const totalEstoque = produtos.reduce((sum, p) => sum + p.quantidade, 0);
    const produtosBaixoEstoque = produtos.filter(p => p.quantidade < 5).length;
    
    return {
      totalItens,
      totalEstoque,
      produtosBaixoEstoque,
      valorTotal: totalEstoque * 10 // Exemplo com valor médio
    };
  }
  
  // 10. PERSISTÊNCIA OFFLINE (Usando IndexedDB como fallback)
  async function salvarLocalmente(produtos) {
    if (!window.indexedDB) return;
    
    return new Promise((resolve) => {
      const request = indexedDB.open('EstoqueOffline', 1);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('produtos')) {
          db.createObjectStore('produtos', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('produtos', 'readwrite');
        const store = tx.objectStore('produtos');
        
        produtos.forEach(p => store.put(p));
        resolve();
      };
    });
  }
