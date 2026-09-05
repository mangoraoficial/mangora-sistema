
// Remove produtos antigos do modelo genérico criado antes do cardápio oficial.
// O À la Carte atual usa as 9 receitas fixas e não depende mais desses registros.
function limparProdutosLegadosMangora(){
  const chave = "mangora_v6_legado_limpo";
  if(localStorage.getItem(chave) === "1") return;

  const antigos = lerJSON("mangora_produtos", []);
  if(Array.isArray(antigos) && antigos.length){
    localStorage.setItem("mangora_produtos_backup_v5", JSON.stringify(antigos));
    localStorage.setItem("mangora_produtos", JSON.stringify([]));
    produtos = [];
  }
  localStorage.setItem(chave, "1");
}


// ==================== PRODUTOS: À LA CARTE / MONTE DO SEU JEITO ====================
function abrirTipoProduto(tipo){
  const carte = document.getElementById("produtosCarteAdmin");
  const monte = document.getElementById("produtosMonteAdmin");
  const btnCarte = document.getElementById("btnProdutosCarte");
  const btnMonte = document.getElementById("btnProdutosMonte");

  if(!carte || !monte) return;

  const ehMonte = tipo === "monte";
  carte.style.display = ehMonte ? "none" : "block";
  monte.style.display = ehMonte ? "block" : "none";

  if(btnCarte) btnCarte.classList.toggle("ativo", !ehMonte);
  if(btnMonte) btnMonte.classList.toggle("ativo", ehMonte);
}

// ==========================================================
// MANGORA - PAINEL DA LOJA
// Base estável: produtos, clientes, pedidos, cozinha,
// financeiro e backup.
// ==========================================================

let produtos = lerJSON("mangora_produtos", []);
let clientes = lerJSON("mangora_clientes", []);
let pedidos = lerJSON("mangora_pedidos", []);
let despesas = lerJSON("mangora_despesas", []);
let materiasPrimas = lerJSON("mangora_materias_primas", []);
let configuracaoMonte = lerJSON("mangora_config_monte",{base500:5,manga:7,abacaxi:7,kiwi:8,morango:8,tempero:2,leiteCondensado:3,cremeNinho:5,cremeChocolate:5,cremeMaracuja:5,mel:5,iogurte:5});
let carrinho = [];

// Migração leve para pedidos antigos.
pedidos = pedidos.map(normalizarPedido);
salvarDados();

function lerJSON(chave, fallback){
  try{
    const valor = localStorage.getItem(chave);
    return valor ? JSON.parse(valor) : fallback;
  }catch(e){
    console.error("Erro lendo", chave, e);
    return fallback;
  }
}

function moeda(valor){
  return Number(valor || 0).toLocaleString("pt-BR", {
    style:"currency",
    currency:"BRL"
  });
}


function chaveDataLocal(data=new Date()){
  const d = data instanceof Date ? data : new Date(data);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dia = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dia}`;
}

function proximoNumeroPedido(){
  const hoje = chaveDataLocal();
  let controle = lerJSON("mangora_sequencia_pedido", {data:hoje,sequencia:0});
  if(!controle || controle.data !== hoje){
    controle = {data:hoje,sequencia:0};
  }
  controle.sequencia = Number(controle.sequencia || 0) + 1;
  localStorage.setItem("mangora_sequencia_pedido", JSON.stringify(controle));
  return controle.sequencia;
}

function referenciaPedido(pedido){
  if(!pedido) return "#---";
  if(Number(pedido.numeroPedido || 0) > 0){
    return `#${String(pedido.numeroPedido).padStart(3,"0")}`;
  }
  const legado = String(pedido.id || "").slice(-6);
  return legado ? `#${legado}` : "#---";
}

function normalizarTelefoneBrasil(valor){
  let n = String(valor || "").replace(/\D/g,"");
  if(!n) return "";
  if(n.startsWith("0055")) n = n.slice(4);
  if(n.startsWith("55") && n.length >= 12) return n;
  return `55${n}`;
}

function dataSistema(valor){
  if(!valor) return null;
  if(valor instanceof Date) return valor;
  const texto = String(valor).trim();

  const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*|\s+)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if(br){
    return new Date(Number(br[3]), Number(br[2])-1, Number(br[1]), Number(br[4]), Number(br[5]), Number(br[6] || 0));
  }

  const iso = new Date(texto);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function inicioDoDia(data=new Date()){
  const d = new Date(data);
  d.setHours(0,0,0,0);
  return d;
}

function pedidoCancelado(p){
  return p && p.status === "Cancelado";
}

function normalizarPedido(p){
  const pedido = {...p};

  if(!Array.isArray(pedido.itens)){
    pedido.itens = [];

    if(pedido.produto){
      pedido.itens.push({
        produtoId: pedido.produtoId || null,
        nome: pedido.produto,
        quantidade: Number(pedido.quantidade || 1),
        preco: Number(pedido.preco || pedido.total || 0),
        total: Number(pedido.total || 0)
      });
    }
  }

  pedido.total = Number(pedido.total || 0);
  pedido.status = pedido.status || "Recebido";
  pedido.numeroPedido = Number(pedido.numeroPedido || 0) || null;
  pedido.cliente = pedido.cliente || "Cliente";
  pedido.telefone = pedido.telefone || "";
  pedido.endereco = pedido.endereco || "";
  pedido.pagamento = pedido.pagamento || "Não informado";
  pedido.statusPagamento = pedido.statusPagamento || (
    String(pedido.pagamento).toLowerCase()==="pix"
      ? "Aguardando pagamento"
      : "Pagamento na entrega/loja"
  );
  pedido.taxaEntrega = Number(pedido.taxaEntrega || pedido.taxa_entrega || 0);
  pedido.data = pedido.data || new Date().toLocaleString("pt-BR");

  return pedido;
}


function detalhesItemPedido(item){
  if(!item) return "";

  if(item.montagem){
    const m = item.montagem;
    const frutas = Array.isArray(m.frutas) ? m.frutas.join(", ") : "";
    const temperos = Array.isArray(m.temperos) ? m.temperos.join(", ") : "";
    const coberturas = Array.isArray(m.coberturas) ? m.coberturas.join(", ") : "";

    return [
      frutas ? `Frutas: ${frutas}` : "",
      temperos ? `Temperos: ${temperos}` : "Temperos: sem tempero",
      coberturas ? `Coberturas: ${coberturas}` : "Coberturas: sem cobertura"
    ].filter(Boolean).join(" • ");
  }

  return item.detalhes || "";
}

function detalhesItemPedidoHTML(item){
  const texto = detalhesItemPedido(item);
  if(!texto) return "";
  return `<div class="detalhes-pedido-admin">${texto}</div>`;
}

function mostrarTela(nome, botao){
  document.querySelectorAll(".tela").forEach(t => t.classList.add("oculto"));

  const tela = document.getElementById(nome);
  if(tela) tela.classList.remove("oculto");

  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("ativo"));

  if(botao){
    botao.classList.add("ativo");
  }else{
    const alvo = document.querySelector(`.nav-btn[data-tela="${nome}"]`);
    if(alvo) alvo.classList.add("ativo");
  }

  atualizarSistema();
}

// ==================== PRODUTOS ====================

function salvarProduto(){
  const nome = document.getElementById("produtoNome").value.trim();
  const categoria = document.getElementById("produtoCategoria").value.trim();
  const tamanho = document.getElementById("produtoTamanho").value;
  const custoFruta = Number(document.getElementById("produtoCustoFruta").value || 0);
  const custoEmbalagem = Number(document.getElementById("produtoCustoEmbalagem").value || 0);
  const preco = Number(document.getElementById("produtoPreco").value || 0);
  const estoque = Number(document.getElementById("produtoEstoque").value || 0);
  const minimo = Number(document.getElementById("produtoMinimo").value || 0);

  if(!nome){
    alert("Informe o nome do produto.");
    return;
  }

  if(preco <= 0){
    alert("Informe um preço de venda válido.");
    return;
  }

  const custoTotal = custoFruta + custoEmbalagem;
  const lucro = preco - custoTotal;
  const margem = preco > 0 ? (lucro / preco) * 100 : 0;

  produtos.push({
    id:Date.now(),
    nome,
    categoria,
    tamanho,
    custoFruta,
    custoEmbalagem,
    custoTotal,
    preco,
    lucro,
    margem,
    estoque,
    minimo,
    vendidos:0,
    ativo:true
  });

  salvarDados();
  limparProduto();
  atualizarSistema();
}

function limparProduto(){
  ["produtoNome","produtoCategoria","produtoCustoFruta","produtoCustoEmbalagem",
   "produtoPreco","produtoEstoque","produtoMinimo"].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = "";
  });

  const tam = document.getElementById("produtoTamanho");
  if(tam) tam.selectedIndex = 0;
}

function listarProdutos(){
  const tabela = document.getElementById("tabelaProdutos");
  if(!tabela) return;

  tabela.innerHTML = "";

  produtos.forEach(p => {
    const custo = Number(p.custoTotal ?? p.custo ?? 0);
    const lucro = Number(p.lucro ?? (Number(p.preco || 0)-custo));

    tabela.innerHTML += `
      <tr>
        <td>${p.nome}</td>
        <td>${p.tamanho || "-"}</td>
        <td>${moeda(custo)}</td>
        <td>${moeda(p.preco)}</td>
        <td>${moeda(lucro)}</td>
        <td>${Number(p.estoque || 0)}</td>
        <td>
          <button class="btn-excluir" onclick="excluirProduto(${p.id})">Excluir</button>
        </td>
      </tr>
    `;
  });
}

function excluirProduto(id){
  if(!confirm("Excluir este produto?")) return;
  produtos = produtos.filter(p => p.id !== id);
  salvarDados();
  atualizarSistema();
}

function carregarProdutos(){
  const select = document.getElementById("produtoPedido");
  if(!select) return;

  select.innerHTML = `<option value="">Produto</option>`;

  produtos
    .filter(p => p.ativo !== false)
    .forEach(p => {
      select.innerHTML += `<option value="${p.id}">${p.nome} - ${moeda(p.preco)}</option>`;
    });
}

// ==================== CLIENTES ====================

function salvarCliente(){
  const nome = document.getElementById("clienteNome").value.trim();
  const telefone = document.getElementById("clienteTelefone").value.trim();
  const endereco = document.getElementById("clienteEndereco").value.trim();

  if(!nome){
    alert("Informe o nome do cliente.");
    return;
  }

  clientes.push({
    id:Date.now(),
    nome,
    telefone,
    endereco
  });

  salvarDados();

  document.getElementById("clienteNome").value = "";
  document.getElementById("clienteTelefone").value = "";
  document.getElementById("clienteEndereco").value = "";

  atualizarSistema();
}

function listarClientes(){
  const tabela = document.getElementById("tabelaClientes");
  if(!tabela) return;

  tabela.innerHTML = "";

  clientes.forEach(c => {
    tabela.innerHTML += `
      <tr>
        <td>${c.nome}</td>
        <td>${c.telefone || "-"}</td>
        <td>${c.endereco || "-"}</td>
        <td>
          <button class="btn-excluir" onclick="excluirCliente(${c.id})">Excluir</button>
        </td>
      </tr>
    `;
  });
}

function excluirCliente(id){
  if(!confirm("Excluir este cliente?")) return;
  clientes = clientes.filter(c => c.id !== id);
  salvarDados();
  atualizarSistema();
}

function carregarClientes(){
  const select = document.getElementById("clientePedido");
  if(!select) return;

  select.innerHTML = `<option value="">Cliente</option>`;

  clientes.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
  });
}

// ==================== CARRINHO ADMIN ====================

function adicionarCarrinho(){
  const produtoId = document.getElementById("produtoPedido").value;
  const quantidade = Number(document.getElementById("quantidadePedido").value || 0);

  const produto = produtos.find(p => p.id == produtoId);

  if(!produto){
    alert("Selecione um produto.");
    return;
  }

  if(quantidade <= 0){
    alert("Informe a quantidade.");
    return;
  }

  const jaNoCarrinho = carrinho
    .filter(i => i.produtoId == produto.id)
    .reduce((soma,i) => soma + Number(i.quantidade || 0), 0);

  if(Number(produto.estoque || 0) < jaNoCarrinho + quantidade){
    alert("Estoque insuficiente.");
    return;
  }

  const existente = carrinho.find(i => i.produtoId == produto.id);

  if(existente){
    existente.quantidade += quantidade;
    existente.total = existente.quantidade * existente.preco;
  }else{
    carrinho.push({
      produtoId:produto.id,
      nome:produto.nome,
      quantidade,
      preco:Number(produto.preco || 0),
      total:Number(produto.preco || 0) * quantidade
    });
  }

  document.getElementById("quantidadePedido").value = "";
  mostrarCarrinho();
}

function mostrarCarrinho(){
  const tabela=document.getElementById("tabelaCarrinho");
  const totalEl=document.getElementById("totalCarrinho");
  if(!tabela||!totalEl)return;
  tabela.innerHTML="";
  carrinho.forEach((item,idx)=>{
    tabela.innerHTML+=`<tr><td><strong>${item.nome}</strong>${item.detalhes?`<div class="detalhes-pedido-admin">${item.detalhes}</div>`:""}</td><td>${item.quantidade}</td><td>${item.total>0?moeda(item.total):"A definir"}</td><td><button onclick="removerCarrinhoManual(${idx})">Remover</button></td></tr>`;
  });
  const subtotal=carrinho.reduce((s,i)=>s+Number(i.total||0),0);
  const taxa=atendimentoManual==="Delivery" && carrinho.length ? TAXA_ENTREGA_MANGORA_ADMIN : 0;
  const total=subtotal+taxa;
  totalEl.innerHTML=`Subtotal: ${moeda(subtotal)}${taxa?`<br>Taxa de entrega: ${moeda(taxa)}`:""}<br><strong>Total: ${moeda(total)}</strong>`;
}
function removerCarrinhoManual(idx){carrinho.splice(idx,1);mostrarCarrinho();}

function removerCarrinho(index){
  carrinho.splice(index,1);
  mostrarCarrinho();
}

function finalizarPedido(){
  if(carrinho.length===0){alert("Adicione produtos ao pedido.");return;}
  if(carrinho.some(i=>Number(i.preco||0)<=0 || Number(i.total||0)<=0)){
    alert("Há item sem preço definido no carrinho. Configure os preços antes de registrar o pedido.");
    return;
  }

  let nome="",telefone="",endereco="",comanda="";
  if(atendimentoManual==="Delivery"){
    const clienteId=document.getElementById("clientePedido").value;
    const cliente=clientes.find(c=>c.id==clienteId);
    nome=document.getElementById("manualNome").value.trim() || cliente?.nome || "";
    telefone=document.getElementById("manualTelefone").value.trim() || cliente?.telefone || "";
    endereco=document.getElementById("manualEndereco").value.trim() || cliente?.endereco || "";
    if(!nome){alert("Informe o nome do cliente.");return;}
    if(!endereco){alert("Informe o endereço para entrega.");return;}
  }else{
    comanda=document.getElementById("manualComanda").value.trim();
    nome=document.getElementById("manualNomeMesa").value.trim() || "Cliente";
    if(!comanda){alert("Informe a mesa ou comanda.");return;}
  }

  const subtotal=carrinho.reduce((s,i)=>s+Number(i.total||0),0);
  const taxaEntrega=atendimentoManual==="Delivery"?TAXA_ENTREGA_MANGORA_ADMIN:0;
  const total=subtotal+taxaEntrega;
  const pagamento=document.getElementById("pagamentoPedido").value;
  const observacao=document.getElementById("observacaoManual").value.trim();

  const numeroPedido = proximoNumeroPedido();
  pedidos.push({
    id:Date.now(),numeroPedido,cliente:nome,telefone,endereco,
    comanda,tipoAtendimento:atendimentoManual,
    itens:JSON.parse(JSON.stringify(carrinho)),taxaEntrega,total,pagamento,
    observacao,status:"Recebido",origem:"Pedido Manual",
    data:new Date().toLocaleString("pt-BR")
  });

  carrinho=[];
  ["manualNome","manualTelefone","manualEndereco","manualComanda","manualNomeMesa","observacaoManual"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  salvarDados(); atualizarSistema();
  alert(`Pedido ${atendimentoManual} registrado com sucesso.`);

  const botaoPedidos=document.querySelector('.nav-btn[data-tela="pedidos"]');
  if(botaoPedidos) mostrarTela("pedidos", botaoPedidos);
  filtrarPedidos(atendimentoManual==="Mesa/Comanda" ? "mesa" : "delivery");
}


const receitasManual=[
 ["classico","🥭 Mangora Clássico","Manga + limão + sal rosa"],
 ["mexicano","🌶️ Mangora Mexicano","Manga + abacaxi + Chamoy + Tajín"],
 ["fresh","🍋 Mangora Fresh","Manga + abacaxi + sal rosa + limão + Lemon Pepper"],
 ["picante","🔥 Mangora Picante","Manga + abacaxi + limão + pimenta em pó + sal rosa + páprica picante"],
 ["tropical","🥝 Mangora Tropical","Kiwi + morango + abacaxi + limão + mel + sal"],
 ["tentacao","🍓 Mangora Tentação","Morango + creme Ninho + creme de chocolate"],
 ["deuses","👑 Mangora dos Deuses","Manga + morango + kiwi + creme Ninho + creme de chocolate"],
 ["fit","🌿 Mangora Fit","Morango + kiwi + manga + iogurte natural + mel"],
 ["paixao","💛 Mangora Paixão","Morango + kiwi + manga + creme de maracujá"]
];
const opcoesManual={
 frutas:["Manga","Abacaxi","Morango","Kiwi"],
 temperos:["Chamoy","Tajín","Limão","Pimenta em pó","Sal rosa","Lemon Pepper","Páprica doce","Páprica picante"],
 coberturas:["Leite condensado","Mel","Creme Ninho","Iogurte natural","Creme de chocolate","Creme de maracujá"]
};
const TAXA_ENTREGA_MANGORA_ADMIN=5;
let atendimentoManual="Delivery";

function selecionarAtendimentoManual(tipo){
 atendimentoManual=tipo;
 const mesa=tipo==="Mesa/Comanda";
 document.getElementById("dadosDeliveryManual").style.display=mesa?"none":"grid";
 document.getElementById("dadosMesaManual").style.display=mesa?"grid":"none";
 document.getElementById("btnManualDelivery").classList.toggle("ativo",!mesa);
 document.getElementById("btnManualMesa").classList.toggle("ativo",mesa);
 mostrarCarrinho();
}
function abrirProdutoManual(tipo){
 const monte=tipo==="monte";
 document.getElementById("manualCarte").style.display=monte?"none":"block";
 document.getElementById("manualMonte").style.display=monte?"block":"none";
 document.getElementById("btnManualCarte").classList.toggle("ativo",!monte);
 document.getElementById("btnManualMonte").classList.toggle("ativo",monte);
}
function renderizarPedidoManual(){
 const area=document.getElementById("manualReceitas"); if(!area)return;
 let precos={}; try{precos=JSON.parse(localStorage.getItem("mangora_precos_carte"))||{};}catch(e){}
 area.innerHTML=receitasManual.map(([id,nome,desc])=>`
 <article class="receita-manual"><div><strong>${nome}</strong><span>${desc}</span></div>
 <div class="botoes-tamanho-manual">
 <button onclick="adicionarCarteManual('${id}','400')">400 ml<br><small>${Number(precos[id]?.p400||0)>0?moeda(precos[id].p400):"Preço a definir"}</small></button>
 <button onclick="adicionarCarteManual('${id}','500')">500 ml<br><small>${Number(precos[id]?.p500||0)>0?moeda(precos[id].p500):"Preço a definir"}</small></button>
 </div></article>`).join("");
 [["manualFrutas",opcoesManual.frutas],["manualTemperos",opcoesManual.temperos],["manualCoberturas",opcoesManual.coberturas]].forEach(([id,arr])=>{
  const el=document.getElementById(id); if(el) el.innerHTML=arr.map(v=>`<label><input type="checkbox" value="${v}" onchange="calcularMonteManual()"> ${v}</label>`).join("");
 });
 calcularMonteManual();
}
function adicionarCarteManual(id,tamanho){
 const r=receitasManual.find(x=>x[0]===id); if(!r)return;
 let p={}; try{p=JSON.parse(localStorage.getItem("mangora_precos_carte"))||{};}catch(e){}
 const preco=Number(tamanho==="500"?p[id]?.p500||0:p[id]?.p400||0);
 if(preco<=0){alert("Este tamanho ainda não possui preço configurado. Cadastre o preço em Produtos antes de vender.");return;}
 const chave=`carte-${id}-${tamanho}`, ex=carrinho.find(i=>i.chave===chave);
 if(ex){ex.quantidade++;ex.total=ex.preco*ex.quantidade;}
 else carrinho.push({chave,produtoId:null,nome:`${r[1].replace(/^[^ ]+ /,"")} - ${tamanho} ml`,detalhes:r[2],quantidade:1,preco,total:preco,personalizado:true,alacarte:true});
 mostrarCarrinho();
}
function valoresMonteManual(){
 const cfg=lerJSON("mangora_config_monte",{base500:5,manga:7,abacaxi:7,kiwi:8,morango:8,tempero:2,leiteCondensado:3,cremeNinho:5,cremeChocolate:5,cremeMaracuja:5,mel:5,iogurte:5});
 const vals=id=>[...document.querySelectorAll(`#${id} input:checked`)].map(x=>x.value);
 const frutas=vals("manualFrutas"),temperos=vals("manualTemperos"),coberturas=vals("manualCoberturas");
 const pf={"Manga":cfg.manga,"Abacaxi":cfg.abacaxi,"Kiwi":cfg.kiwi,"Morango":cfg.morango};
 const pc={"Leite condensado":cfg.leiteCondensado,"Creme Ninho":cfg.cremeNinho,"Creme de chocolate":cfg.cremeChocolate,"Creme de maracujá":cfg.cremeMaracuja,"Mel":cfg.mel,"Iogurte natural":cfg.iogurte};
 const total=Number(cfg.base500||0)+frutas.reduce((t,n)=>t+Number(pf[n]||0),0)+temperos.length*Number(cfg.tempero||0)+coberturas.reduce((t,n)=>t+Number(pc[n]||0),0);
 return {tamanho:"500",frutas,temperos,coberturas,base:Number(cfg.base500||0),total};
}
function calcularMonteManual(){
 const r=valoresMonteManual(),el=document.getElementById("manualMontePreco");
 if(el)el.textContent=`Total: ${moeda(r.total)}`;
}
function adicionarMonteManual(){
 const r=valoresMonteManual();
 if(!r.frutas.length){alert("Escolha pelo menos uma fruta.");return;}
 const detalhes=`Base 500 ml: ${moeda(r.base)} | Frutas: ${r.frutas.join(", ")} | Temperos: ${r.temperos.join(", ")||"sem tempero"} | Caldas e cremes: ${r.coberturas.join(", ")||"sem cobertura"}`;
 carrinho.push({chave:`monte-${Date.now()}`,produtoId:null,nome:"Monte do Seu Jeito - 500 ml",detalhes,quantidade:1,preco:r.total,total:r.total,personalizado:true,montagem:r});
 document.querySelectorAll("#manualMonte input:checked").forEach(x=>x.checked=false);
 calcularMonteManual();mostrarCarrinho();
}


let filtroPedidosAtual = "todos";

function tipoPedidoPainel(pedido){
  if(pedido?.tipoAtendimento==="Mesa/Comanda") return "mesa";
  if(pedido?.tipoAtendimento==="Retirada na loja") return "retirada";
  return "delivery";
}

function filtrarPedidos(filtro){
  filtroPedidosAtual = filtro || "todos";

  const ids = {
    todos:"filtroTodos",
    delivery:"filtroDelivery",
    mesa:"filtroMesa",
    retirada:"filtroRetirada"
  };

  Object.entries(ids).forEach(([chave,id])=>{
    const btn=document.getElementById(id);
    if(btn) btn.classList.toggle("ativo", chave===filtroPedidosAtual);
  });

  const titulo=document.getElementById("tituloListaPedidos");
  if(titulo){
    titulo.textContent =
      filtroPedidosAtual==="delivery" ? "Pedidos Delivery" :
      filtroPedidosAtual==="mesa" ? "Pedidos de Mesas / Comandas" :
      filtroPedidosAtual==="retirada" ? "Pedidos para Retirada" :
      "Todos os pedidos";
  }

  listarPedidos();
}

function atualizarContadoresPedidos(){
  const total=pedidos.length;
  const delivery=pedidos.filter(p=>tipoPedidoPainel(p)==="delivery").length;
  const mesa=pedidos.filter(p=>tipoPedidoPainel(p)==="mesa").length;
  const retirada=pedidos.filter(p=>tipoPedidoPainel(p)==="retirada").length;

  const mapa={
    qtdTodosPedidos:total,
    qtdDeliveryPedidos:delivery,
    qtdMesaPedidos:mesa,
    qtdRetiradaPedidos:retirada
  };

  Object.entries(mapa).forEach(([id,valor])=>{
    const el=document.getElementById(id);
    if(el) el.textContent=valor;
  });
}

// ==================== PEDIDOS ====================

function cancelarPedido(id){
  const pedido=pedidos.find(p=>p.id==id);
  if(!pedido || pedidoCancelado(pedido)) return;

  const motivo=prompt(`Cancelar o pedido ${referenciaPedido(pedido)}?\n\nInforme o motivo do cancelamento:`);
  if(motivo===null) return;
  if(!motivo.trim()){
    alert("Informe o motivo do cancelamento.");
    return;
  }

  pedido.status="Cancelado";
  pedido.motivoCancelamento=motivo.trim();
  pedido.canceladoEm=new Date().toLocaleString("pt-BR");
  salvarDados();
  atualizarSistema();
}

function excluirPedido(id){
  const pedido=pedidos.find(p=>p.id==id);
  if(!pedido) return;

  if(!pedidoCancelado(pedido)){
    alert("Por segurança, primeiro cancele o pedido. A exclusão definitiva fica disponível somente para pedidos cancelados.");
    return;
  }

  if(!confirm(`Excluir definitivamente o pedido ${referenciaPedido(pedido)}?\n\nEsta ação não poderá ser desfeita.`)) return;
  pedidos=pedidos.filter(p=>p.id!=id);
  localStorage.setItem("mangora_pedidos",JSON.stringify(pedidos));
  atualizarSistema();
}


function pagamentoEhPix(p){
  return String(p?.pagamento||"").trim().toLowerCase()==="pix";
}

function statusPagamentoPedido(p){
  const atual=String(p?.statusPagamento||"").trim();
  if(atual && atual!=="Não informado") return atual;
  return pagamentoEhPix(p) ? "Aguardando pagamento" : "Pagamento na entrega/loja";
}

function confirmarPagamentoPix(id){
  const pedido=pedidos.find(p=>p.id==id);
  if(!pedido || pedidoCancelado(pedido) || !pagamentoEhPix(pedido)) return;
  if(!confirm(`Confirmar recebimento do PIX do pedido ${referenciaPedido(pedido)}?`)) return;
  pedido.statusPagamento="Pago";
  salvarDados();
  atualizarSistema();
}

function listarPedidos(){
  const tabela = document.getElementById("tabelaPedidos");
  if(!tabela) return;

  atualizarContadoresPedidos();
  tabela.innerHTML = "";

  const filtrados = pedidos.filter(p => {
    if(filtroPedidosAtual === "todos") return true;
    return tipoPedidoPainel(p) === filtroPedidosAtual;
  });

  const vazio=document.getElementById("semPedidosFiltro");
  if(vazio) vazio.style.display = filtrados.length ? "none" : "block";

  [...filtrados].reverse().forEach(p => {
    const itens = (p.itens || [])
      .map(i => `
        <div class="item-pedido-admin">
          <strong>${Number(i.quantidade || 1)}x ${i.nome}</strong>
          ${detalhesItemPedidoHTML(i)}
        </div>
      `)
      .join("");

    const tipoPainel = tipoPedidoPainel(p);
    const mesa = tipoPainel==="mesa";
    const retirada = tipoPainel==="retirada";
    const atendimento = mesa ? "🍽️ Mesa / Comanda" : retirada ? "🏪 Retirada na loja" : "🛵 Delivery";
    const identificacao = mesa && p.comanda
      ? `<div class="pedido-comanda">${p.comanda}</div>`
      : "";

    tabela.innerHTML += `
      <tr>
        <td><strong>${referenciaPedido(p)}</strong><div class="id-tecnico">ID ${p.id}</div></td>
        <td>
          <span class="badge-atendimento ${mesa ? "mesa" : "delivery"}">${atendimento}</span>
          ${identificacao}
          <div class="pedido-cliente">${p.cliente || "Cliente"}</div>
        </td>
        <td>${itens || "-"}</td>
        <td>${moeda(p.total)}</td>
        <td>
          <div><strong>${p.pagamento||"-"}</strong></div>
          <div style="margin:5px 0;font-size:12px;font-weight:800;${statusPagamentoPedido(p)==="Pago"?"color:#157a2d":"color:#9a6200"}">${statusPagamentoPedido(p)}</div>
          ${pagamentoEhPix(p) && statusPagamentoPedido(p)!=="Pago" && !pedidoCancelado(p)
            ? `<button class="btn-status" onclick="confirmarPagamentoPix(${p.id})">Confirmar PIX</button>`
            : ""}
        </td>
        <td>
          ${pedidoCancelado(p)
            ? `<span class="status-cancelado">Cancelado</span>${p.motivoCancelamento?`<div class="motivo-cancelamento">${p.motivoCancelamento}</div>`:""}`
            : `<button class="btn-status" onclick="alterarStatus(${p.id})">${p.status}</button>`}
        </td>
        <td>
          ${!mesa && !pedidoCancelado(p) ? `<button class="btn-whatsapp" onclick="whatsappPedido(${p.id})">WhatsApp</button>` : ""}
          <button class="btn-imprimir" onclick="imprimirPedido(${p.id})">Imprimir</button>
          ${pedidoCancelado(p)
            ? `<button class="btn-excluir-pedido" onclick="excluirPedido(${p.id})">Excluir definitivamente</button>`
            : `<button class="btn-cancelar-pedido" onclick="cancelarPedido(${p.id})">Cancelar</button>`}
        </td>
      </tr>
    `;
  });
}

function listarRecentes(){
  const tabela = document.getElementById("tabelaRecentes");
  if(!tabela) return;

  tabela.innerHTML = "";

  [...pedidos].reverse().slice(0,5).forEach(p => {
    tabela.innerHTML += `
      <tr>
        <td><strong>${referenciaPedido(p)}</strong><div class="id-tecnico">ID ${p.id}</div></td>
        <td><strong>${p.tipoAtendimento || "Delivery"}</strong>${p.comanda ? `<div>${p.comanda}</div>` : ""}<div>${p.cliente}</div></td>
        <td>${p.status}</td>
        <td>${moeda(p.total)}</td>
      </tr>
    `;
  });
}

function alterarStatus(id){
  const pedido = pedidos.find(p => p.id == id);
  if(!pedido || pedidoCancelado(pedido)) return;

  const mesa = tipoPedidoPainel(pedido)==="mesa";
  const fluxo = mesa
    ? ["Recebido","Em preparo","Pronto","Finalizado"]
    : ["Recebido","Em preparo","Saiu para entrega","Finalizado"];

  const indice = fluxo.indexOf(pedido.status);
  pedido.status = indice >= 0 && indice < fluxo.length-1
    ? fluxo[indice+1]
    : "Finalizado";

  salvarDados();
  atualizarSistema();
}

// ==================== COZINHA ====================

function carregarCozinha(){
  const painel = document.getElementById("painelCozinha");
  if(!painel) return;

  painel.innerHTML = "";

  const ativos = pedidos.filter(p => p.status !== "Finalizado" && !pedidoCancelado(p));

  if(ativos.length === 0){
    painel.innerHTML = `<div class="bloco"><p class="texto-suave">Nenhum pedido em andamento.</p></div>`;
    return;
  }

  ativos.forEach(p => {
    const itens = (p.itens || [])
      .map(i => `
        <div class="item-cozinha-detalhado">
          <p><strong>${Number(i.quantidade || 1)}x ${i.nome}</strong></p>
          ${detalhesItemPedidoHTML(i)}
        </div>
      `)
      .join("");

    painel.innerHTML += `
      <article class="pedido-cozinha">
        <h3>Pedido ${referenciaPedido(p)}</h3>
        <p><strong>${p.tipoAtendimento || "Delivery"}:</strong> ${p.comanda ? p.comanda+" — " : ""}${p.cliente}</p>
        ${itens}
        ${p.observacao ? `<p><strong>Observação:</strong> ${p.observacao}</p>` : ""}
        <p><strong>Status:</strong> ${p.status}</p>
        <button onclick="alterarStatus(${p.id})">Avançar status</button>
      </article>
    `;
  });
}

// ==================== MATÉRIA-PRIMA / CUSTOS ====================
function mpBase(u){return (u==="kg"||u==="g")?"g":(u==="L"||u==="ml")?"ml":"un";}
function mpQtdBase(q,u){q=Number(q||0);return (u==="kg"||u==="L")?q*1000:q;}
function salvarMateriaPrima(){
  const nome=document.getElementById("mpNome").value.trim(),tipo=document.getElementById("mpTipo").value,q=Number(document.getElementById("mpQuantidadeCompra").value||0),u=document.getElementById("mpUnidadeCompra").value,v=Number(document.getElementById("mpValorCompra").value||0);
  if(!nome||q<=0||v<=0){alert("Informe nome, quantidade e valor pago.");return;}
  materiasPrimas.push({id:Date.now(),nome,tipo,quantidadeCompra:q,unidadeCompra:u,valorCompra:v,unidadeBase:mpBase(u),custoBase:v/mpQtdBase(q,u)});
  document.getElementById("mpNome").value="";document.getElementById("mpQuantidadeCompra").value="";document.getElementById("mpValorCompra").value="";
  salvarDados();atualizarSistema();
}
function listarMateriaPrima(){
  const t=document.getElementById("tabelaMateriaPrima");if(!t)return;t.innerHTML="";
  materiasPrimas.forEach(m=>t.innerHTML+=`<tr><td>${m.nome}</td><td>${m.tipo}</td><td>${m.quantidadeCompra} ${m.unidadeCompra}</td><td>${moeda(m.valorCompra)}</td><td>${moeda(m.custoBase)} / ${m.unidadeBase}</td><td><button class="btn-excluir" onclick="excluirMateriaPrima(${m.id})">Excluir</button></td></tr>`);
}
function excluirMateriaPrima(id){if(!confirm("Excluir esta matéria-prima?"))return;materiasPrimas=materiasPrimas.filter(m=>m.id!==id);salvarDados();atualizarSistema();}
function salvarConfiguracaoMonte(){
 configuracaoMonte={
  base500:Number(document.getElementById("monteBase500").value||0),
  manga:Number(document.getElementById("monteManga").value||0),
  abacaxi:Number(document.getElementById("monteAbacaxi").value||0),
  kiwi:Number(document.getElementById("monteKiwi").value||0),
  morango:Number(document.getElementById("monteMorango").value||0),
  tempero:Number(document.getElementById("monteTempero").value||0),
  leiteCondensado:Number(document.getElementById("monteLeiteCondensado").value||0),
  cremeNinho:Number(document.getElementById("monteCremeNinho").value||0),
  cremeChocolate:Number(document.getElementById("monteCremeChocolate").value||0),
  cremeMaracuja:Number(document.getElementById("monteCremeMaracuja").value||0),
  mel:Number(document.getElementById("monteMel").value||0),
  iogurte:Number(document.getElementById("monteIogurte").value||0)
 };
 localStorage.setItem("mangora_config_monte",JSON.stringify(configuracaoMonte));alert("Configuração salva.");
}
function carregarConfiguracaoMonte(){
 const mapa={monteBase500:"base500",monteManga:"manga",monteAbacaxi:"abacaxi",monteKiwi:"kiwi",monteMorango:"morango",monteTempero:"tempero",monteLeiteCondensado:"leiteCondensado",monteCremeNinho:"cremeNinho",monteCremeChocolate:"cremeChocolate",monteCremeMaracuja:"cremeMaracuja",monteMel:"mel",monteIogurte:"iogurte"};
 Object.entries(mapa).forEach(([id,chave])=>{const e=document.getElementById(id);if(e)e.value=Number(configuracaoMonte[chave]||0)||"";});
}


const receitasCarteAdmin=[
 ["classico","Mangora Clássico"],["mexicano","Mangora Mexicano"],["fresh","Mangora Fresh"],
 ["picante","Mangora Picante"],["tropical","Mangora Tropical"],["tentacao","Mangora Tentação"],
 ["deuses","Mangora dos Deuses"],["fit","Mangora Fit"],["paixao","Mangora Paixão"]
];
function renderizarPrecosCarte(){
 const a=document.getElementById("precosCarteAdmin"); if(!a)return;
 let p={}; try{p=JSON.parse(localStorage.getItem("mangora_precos_carte"))||{};}catch(e){}
 a.innerHTML=receitasCarteAdmin.map(([id,n])=>`<div class="linha-preco-carte"><strong>${n}</strong><input id="carte_${id}_400" type="number" step="0.01" placeholder="400 ml" value="${Number(p[id]?.p400||0)||""}"><input id="carte_${id}_500" type="number" step="0.01" placeholder="500 ml" value="${Number(p[id]?.p500||0)||""}"></div>`).join("");
}
function salvarPrecosCarte(){
 const p={};
 receitasCarteAdmin.forEach(([id])=>p[id]={p400:Number(document.getElementById(`carte_${id}_400`).value||0),p500:Number(document.getElementById(`carte_${id}_500`).value||0)});
 localStorage.setItem("mangora_precos_carte",JSON.stringify(p)); alert("Preços do À la Carte salvos.");
}

// ==================== FINANCEIRO ====================

function salvarDespesa(){
  const nome = document.getElementById("despesaNome").value.trim();
  const valor = Number(document.getElementById("despesaValor").value || 0);

  if(!nome || valor <= 0){
    alert("Informe descrição e valor.");
    return;
  }

  despesas.push({
    id:Date.now(),
    nome,
    valor,
    data:new Date().toLocaleString("pt-BR")
  });

  salvarDados();

  document.getElementById("despesaNome").value = "";
  document.getElementById("despesaValor").value = "";

  atualizarSistema();
}

function listarDespesas(){
  const tabela = document.getElementById("tabelaDespesas");
  if(!tabela) return;

  tabela.innerHTML = "";

  despesas.forEach(d => {
    tabela.innerHTML += `
      <tr>
        <td>${d.nome}</td>
        <td>${moeda(d.valor)}</td>
        <td>
          <button class="btn-excluir" onclick="excluirDespesa(${d.id})">Excluir</button>
        </td>
      </tr>
    `;
  });
}

function excluirDespesa(id){
  if(!confirm("Excluir esta despesa?")) return;

  despesas = despesas.filter(d => d.id !== id);
  salvarDados();
  atualizarSistema();
}

let periodoFinanceiroAtual="hoje";

function dentroPeriodo(dataValor, periodo){
  if(periodo==="tudo") return true;
  const data=dataSistema(dataValor);
  if(!data) return false;

  const agora=new Date();
  const inicioHoje=inicioDoDia(agora);

  if(periodo==="hoje") return data>=inicioHoje;

  if(periodo==="semana"){
    const inicio=new Date(inicioHoje);
    inicio.setDate(inicio.getDate()-6);
    return data>=inicio;
  }

  if(periodo==="mes"){
    const inicio=new Date(agora.getFullYear(),agora.getMonth(),1);
    return data>=inicio;
  }

  return true;
}

function filtrarFinanceiro(periodo){
  periodoFinanceiroAtual=periodo||"hoje";
  const mapa={hoje:"finFiltroHoje",semana:"finFiltroSemana",mes:"finFiltroMes",tudo:"finFiltroTudo"};
  Object.entries(mapa).forEach(([chave,id])=>{
    const el=document.getElementById(id);
    if(el) el.classList.toggle("ativo",chave===periodoFinanceiroAtual);
  });
  atualizarFinanceiro();
}

function atualizarFinanceiro(){
  const pedidosValidos=pedidos.filter(p=>!pedidoCancelado(p) && dentroPeriodo(p.data,periodoFinanceiroAtual));
  const despesasPeriodo=despesas.filter(d=>dentroPeriodo(d.data,periodoFinanceiroAtual));

  const vendas=pedidosValidos.reduce((soma,p)=>soma+Number(p.total||0),0);
  const gastos=despesasPeriodo.reduce((soma,d)=>soma+Number(d.valor||0),0);

  const campoVendas=document.getElementById("finVendas");
  const campoDespesas=document.getElementById("finDespesas");
  const campoLucro=document.getElementById("finLucro");

  if(campoVendas) campoVendas.textContent=moeda(vendas);
  if(campoDespesas) campoDespesas.textContent=moeda(gastos);
  if(campoLucro) campoLucro.textContent=moeda(vendas-gastos);

  const nomes={hoje:"hoje",semana:"nos últimos 7 dias",mes:"no mês",tudo:"no período total"};
  const sufixo=nomes[periodoFinanceiroAtual]||"no período";
  const lv=document.getElementById("finLabelVendas");
  const ld=document.getElementById("finLabelDespesas");
  const lr=document.getElementById("finLabelResultado");
  if(lv) lv.textContent=`Vendido ${sufixo}`;
  if(ld) ld.textContent=`Despesas ${sufixo}`;
  if(lr) lr.textContent=`Resultado ${sufixo}`;
}

// ==================== DASHBOARD ====================

function atualizarDashboard(){
  const pedidosHoje = pedidos.filter(p=>!pedidoCancelado(p) && dentroPeriodo(p.data,"hoje"));
  const vendas = pedidosHoje.reduce((soma,p) => soma + Number(p.total || 0),0);

  const dPedidos = document.getElementById("dashPedidos");
  const dVendas = document.getElementById("dashVendas");
  const dClientes = document.getElementById("dashClientes");
  const dProduto = document.getElementById("dashProduto");

  if(dPedidos) dPedidos.textContent = pedidosHoje.length;
  if(dVendas) dVendas.textContent = moeda(vendas);
  if(dClientes) dClientes.textContent = clientes.length;

  const ranking = {};

  pedidosHoje.forEach(p => {
    (p.itens || []).forEach(item => {
      ranking[item.nome] = (ranking[item.nome] || 0) + Number(item.quantidade || 0);
    });
  });

  let maisVendido = "Nenhum";
  let maior = 0;

  Object.entries(ranking).forEach(([nome,qtd]) => {
    if(qtd > maior){
      maior = qtd;
      maisVendido = nome;
    }
  });

  if(dProduto) dProduto.textContent = maisVendido;
}

// ==================== WHATSAPP / IMPRESSÃO ====================

function whatsappPedido(id){
  const p = pedidos.find(x => x.id == id);
  if(!p) return;

  const telefone = normalizarTelefoneBrasil(p.telefone);

  if(!telefone){
    alert("Este pedido não possui telefone cadastrado.");
    return;
  }

  let texto = `🥭 Mangora Frutas Temperadas\n\nPedido ${referenciaPedido(p)}\nCliente: ${p.cliente}\n\n`;

  (p.itens || []).forEach(item => {
    texto += `${Number(item.quantidade || 1)}x ${item.nome} - ${moeda(item.total)}\n`;
    const detalhes = detalhesItemPedido(item);
    if(detalhes) texto += `   ${detalhes}\n`;
  });

  texto += `\nTotal: ${moeda(p.total)}\nPagamento: ${p.pagamento}\nStatus do pagamento: ${statusPagamentoPedido(p)}\nStatus do pedido: ${p.status}`;

  window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`,"_blank");
}

function imprimirPedido(id){
 const p=pedidos.find(x=>x.id==id);if(!p)return;
 const mesa=p.tipoAtendimento==="Mesa/Comanda", retirada=p.tipoAtendimento==="Retirada na loja", atendimento=mesa?"MESA / COMANDA":retirada?"RETIRADA NA LOJA":"DELIVERY";
 const itens=(p.itens||[]).map(i=>{const d=detalhesItemPedido(i),v=Number(i.total||0)>0?moeda(i.total):"A DEFINIR";return `<div class="item"><div class="top"><b>${Number(i.quantidade||1)}x ${i.nome}</b><b>${v}</b></div>${d?`<div class="det">${d}</div>`:""}</div>`}).join("");
 const dados=mesa
   ?`<div class="mesa">${p.comanda||"MESA / COMANDA"}</div><div><b>Cliente:</b> ${p.cliente||"Cliente"}</div>`
   :retirada
     ?`<div><b>Cliente:</b> ${p.cliente||"-"}</div><div><b>Telefone:</b> ${p.telefone||"-"}</div><div><b>Retirada:</b> NA LOJA</div>`
     :`<div><b>Cliente:</b> ${p.cliente||"-"}</div><div><b>Telefone:</b> ${p.telefone||"-"}</div><div><b>Endereco:</b> ${p.endereco||"-"}</div>`;
 const w=window.open("","_blank","width=420,height=700");if(!w){alert("Permita pop-ups para imprimir.");return;}
 w.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>Pedido ${referenciaPedido(p)}</title><style>
 @page{size:58mm auto;margin:2mm}*{box-sizing:border-box}html,body{margin:0;padding:0;width:54mm;color:#000;background:#fff}
 body{font-family:Arial,sans-serif;font-size:12px;line-height:1.3;overflow-wrap:anywhere;font-weight:700}.c{text-align:center}.marca{font-size:20px;font-weight:900}.sub{font-size:11px;font-weight:900}
 .linha{border-top:2px solid #000;margin:6px 0}.pedido{font-size:15px;font-weight:900}.tipo{font-size:14px;font-weight:900;border:2px solid #000;padding:5px 2px;margin:6px 0;text-align:center}
 .mesa{font-size:17px;font-weight:900;text-align:center;margin:5px 0}.item{padding:5px 0;border-bottom:2px solid #000}.top{display:flex;justify-content:space-between;gap:4px;align-items:flex-start}.top b:first-child{max-width:36mm}
 .det{margin-top:3px;padding-left:4px;font-size:11px;font-weight:900;line-height:1.3}.total{font-size:17px;font-weight:900;display:flex;justify-content:space-between;margin:6px 0}.obs{border:1px solid #000;padding:4px;margin:5px 0;font-weight:700}.rod{text-align:center;margin-top:7px;font-size:10px;font-weight:900}
 @media screen{body{margin:10px auto}}@media print{html,body{width:54mm}}</style></head><body>
 <div class="c"><div class="marca">MANGORA</div><div class="sub">FRUTAS TEMPERADAS</div></div><div class="linha"></div>
 <div class="c pedido">PEDIDO ${referenciaPedido(p)}</div><div class="c">${p.data||""}</div><div class="tipo">${atendimento}</div>${dados}<div class="linha"></div>${itens}<div class="linha"></div>
 ${(()=>{const subtotal=(p.itens||[]).reduce((s,i)=>s+Number(i.total||0),0),taxa=Number(p.taxaEntrega||0);return `<div><b>Subtotal:</b> ${moeda(subtotal)}</div>${taxa>0?`<div><b>Taxa de entrega:</b> ${moeda(taxa)}</div>`:""}`})()}
 <div class="total"><span>TOTAL</span><span>${moeda(p.total)}</span></div><div><b>Pagamento:</b> ${p.pagamento||"-"}</div><div><b>Status do pagamento:</b> ${statusPagamentoPedido(p)}</div><div><b>Status do pedido:</b> ${p.status||"-"}</div>
 ${p.observacao?`<div class="obs"><b>OBS:</b><br>${p.observacao}</div>`:""}<div class="linha"></div><div class="rod">MANGORA - FRUTAS TEMPERADAS</div><div style="height:8mm"></div>
 <script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script></body></html>`);w.document.close();
}

// ==================== BACKUP ====================

function exportarBackup(){
  const dados = {
    versao:3,
    exportadoEm:new Date().toISOString(),
    produtos,
    clientes,
    pedidos,
    despesas,
    materiasPrimas,
    configuracaoMonte,
    precosCarte:lerJSON("mangora_precos_carte", {}),
    sequenciaPedido:lerJSON("mangora_sequencia_pedido", null)
  };

  const blob = new Blob([JSON.stringify(dados,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `Mangora_Backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url),1000);
}

function importarBackup(event){
  const arquivo = event.target.files && event.target.files[0];
  if(!arquivo) return;

  const leitor = new FileReader();

  leitor.onload = function(e){
    try{
      const dados = JSON.parse(e.target.result);

      if(!Array.isArray(dados.produtos) ||
         !Array.isArray(dados.clientes) ||
         !Array.isArray(dados.pedidos)){
        throw new Error("Estrutura inválida");
      }

      if(!confirm("Restaurar este backup? Os dados atuais serão substituídos.")){
        event.target.value = "";
        return;
      }

      produtos = dados.produtos;
      clientes = dados.clientes;
      pedidos = dados.pedidos.map(normalizarPedido);
      despesas = Array.isArray(dados.despesas) ? dados.despesas : [];
      materiasPrimas = Array.isArray(dados.materiasPrimas) ? dados.materiasPrimas : [];
      configuracaoMonte = dados.configuracaoMonte || {preco400:0,preco500:0,adicionalFruta:0,adicionalTempero:0,adicionalCobertura:0};

      if(dados.precosCarte && typeof dados.precosCarte==="object"){
        localStorage.setItem("mangora_precos_carte",JSON.stringify(dados.precosCarte));
      }
      if(dados.sequenciaPedido && typeof dados.sequenciaPedido==="object"){
        localStorage.setItem("mangora_sequencia_pedido",JSON.stringify(dados.sequenciaPedido));
      }

      salvarDados();
      atualizarSistema();

      alert("Backup restaurado com sucesso.");
    }catch(err){
      console.error(err);
      alert("Não foi possível importar este arquivo.");
    }finally{
      event.target.value = "";
    }
  };

  leitor.readAsText(arquivo);
}

// ==================== SALVAMENTO / ATUALIZAÇÃO ====================

function salvarDados(){
  localStorage.setItem("mangora_produtos",JSON.stringify(produtos));
  localStorage.setItem("mangora_clientes",JSON.stringify(clientes));
  localStorage.setItem("mangora_pedidos",JSON.stringify(pedidos));
  localStorage.setItem("mangora_despesas",JSON.stringify(despesas));
  localStorage.setItem("mangora_materias_primas",JSON.stringify(materiasPrimas));
  localStorage.setItem("mangora_config_monte",JSON.stringify(configuracaoMonte));
}

function atualizarSistema(){
  // Recarrega os arrays para captar pedidos feitos no cliente.html.
  produtos = lerJSON("mangora_produtos", produtos);
  clientes = lerJSON("mangora_clientes", clientes);
  pedidos = lerJSON("mangora_pedidos", pedidos).map(normalizarPedido);
  despesas = lerJSON("mangora_despesas", despesas);
  materiasPrimas = lerJSON("mangora_materias_primas", materiasPrimas);
  configuracaoMonte = lerJSON("mangora_config_monte", configuracaoMonte);

  listarProdutos();
  listarClientes();
  carregarProdutos();
  carregarClientes();
  renderizarPedidoManual();
  mostrarCarrinho();
  listarPedidos();
  listarRecentes();
  carregarCozinha();
  listarDespesas();
  listarMateriaPrima();
  carregarConfiguracaoMonte();
  renderizarPrecosCarte();
  atualizarDashboard();
  atualizarFinanceiro();
}

window.addEventListener("focus", atualizarSistema);
window.addEventListener("storage", atualizarSistema);

window.onload = function(){
  atualizarSistema();
};

limparProdutosLegadosMangora();
atualizarSistema();

document.addEventListener("DOMContentLoaded",()=>{
 renderizarPedidoManual();
 const tam=document.getElementById("manualMonteTamanho"); if(tam)tam.addEventListener("change",calcularMonteManual);
 const sel=document.getElementById("clientePedido");
 if(sel)sel.addEventListener("change",()=>{
  const c=clientes.find(x=>x.id==sel.value); if(!c)return;
  document.getElementById("manualNome").value=c.nome||"";
  document.getElementById("manualTelefone").value=c.telefone||"";
  document.getElementById("manualEndereco").value=c.endereco||"";
 });
});
