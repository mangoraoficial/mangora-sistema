
// ==================== EXPERIÊNCIA DO CLIENTE V8 ====================
let toastClienteTimer = null;

function mostrarToastCliente(mensagem){
  const toast = document.getElementById("toastCliente");
  if(!toast) return;
  toast.textContent = mensagem;
  toast.classList.add("mostrar");
  clearTimeout(toastClienteTimer);
  toastClienteTimer = setTimeout(()=>toast.classList.remove("mostrar"), 2200);
}

function quantidadeTotalCarrinho(){
  return carrinho.reduce((total,item)=> total + Number(item.quantidade || 1), 0);
}

function atualizarContadoresCarrinho(){
  const qtd = quantidadeTotalCarrinho();

  const titulo = document.getElementById("contadorCarrinhoTitulo");
  if(titulo) titulo.textContent = qtd;

  const flutuante = document.getElementById("contadorCarrinhoFlutuante");
  if(flutuante) flutuante.textContent = qtd;

  const botao = document.getElementById("carrinhoFlutuante");
  if(botao) botao.classList.toggle("tem-itens", qtd > 0);
}

function irParaCarrinho(){
  const alvo =
    document.getElementById("carrinho") ||
    document.getElementById("areaCarrinho") ||
    document.querySelector(".carrinho") ||
    document.querySelector("[class*='carrinho']");
  if(alvo) alvo.scrollIntoView({behavior:"smooth", block:"start"});
}

function feedbackBotaoAdicionar(botao){
  if(!botao) return;
  const textoOriginal = botao.dataset.textoOriginal || botao.textContent;
  botao.dataset.textoOriginal = textoOriginal;
  botao.textContent = "Adicionado ✓";
  botao.classList.add("adicionado");
  setTimeout(()=>{
    botao.textContent = textoOriginal;
    botao.classList.remove("adicionado");
  }, 1300);
}

// ==========================================================
// MANGORA - ÁREA DO CLIENTE
// ==========================================================

let produtos = lerProdutos();
let carrinho = [];
let ultimoPedido = null;
const TAXA_ENTREGA_MANGORA = 5;
let tipoRecebimentoCliente = "Delivery";
const CHAVE_PIX_MANGORA = "43999649635";
const opcoesMonte={frutas:["Manga","Abacaxi","Morango","Kiwi"],temperos:["Chamoy","Tajín","Limão","Pimenta em pó","Sal rosa","Lemon Pepper","Páprica doce","Páprica picante"],coberturas:["Leite condensado","Mel","Creme Ninho","Iogurte natural","Creme de chocolate","Creme de maracujá"]};
function lerConfigMonte(){try{return JSON.parse(localStorage.getItem("mangora_config_monte"))||{preco400:0,preco500:0,adicionalFruta:0,adicionalTempero:0,adicionalCobertura:0};}catch(e){return {preco400:0,preco500:0,adicionalFruta:0,adicionalTempero:0,adicionalCobertura:0};}}
const receitasCarte=[
 {id:"classico",nome:"Mangora Clássico",emoji:"🥭",descricao:"Manga + limão + sal rosa"},
 {id:"mexicano",nome:"Mangora Mexicano",emoji:"🌶️",descricao:"Manga + abacaxi + Chamoy + Tajín"},
 {id:"fresh",nome:"Mangora Fresh",emoji:"🍋",descricao:"Manga + abacaxi + sal rosa + limão + Lemon Pepper"},
 {id:"picante",nome:"Mangora Picante",emoji:"🔥",descricao:"Manga + abacaxi + limão + pimenta em pó + sal rosa + páprica picante"},
 {id:"tropical",nome:"Mangora Tropical",emoji:"🥝",descricao:"Kiwi + morango + abacaxi + limão + mel + sal"},
 {id:"tentacao",nome:"Mangora Tentação",emoji:"🍓",descricao:"Morango + creme Ninho + creme de chocolate"},
 {id:"deuses",nome:"Mangora dos Deuses",emoji:"👑",descricao:"Manga + morango + kiwi + creme Ninho + creme de chocolate"},
 {id:"fit",nome:"Mangora Fit",emoji:"🌿",descricao:"Morango + kiwi + manga + iogurte natural + mel"},
 {id:"paixao",nome:"Mangora Paixão",emoji:"💛",descricao:"Morango + kiwi + manga + creme de maracujá"}
];

const imagensCarte={
 classico:"img/produtos/classico.webp",
 mexicano:"img/produtos/mexicano.webp",
 fresh:"img/produtos/fresh.webp",
 picante:"img/produtos/picante.webp",
 tropical:"img/produtos/tropical.webp",
 tentacao:"img/produtos/tentacao.webp",
 deuses:"img/produtos/deuses.webp",
 fit:"img/produtos/fit.webp",
 paixao:"img/produtos/paixao.webp"
};

function lerPrecosCarte(){
 try{return JSON.parse(localStorage.getItem("mangora_precos_carte"))||{};}catch(e){return {};}
}


function lerProdutos(){
  try{
    return JSON.parse(localStorage.getItem("mangora_produtos")) || [];
  }catch(e){
    return [];
  }
}

function moeda(valor){
  return Number(valor || 0).toLocaleString("pt-BR", {
    style:"currency",
    currency:"BRL"
  });
}


function chaveDataLocal(data=new Date()){
  const d=data instanceof Date?data:new Date(data);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function proximoNumeroPedido(){
  const hoje=chaveDataLocal();
  let c;
  try{c=JSON.parse(localStorage.getItem("mangora_sequencia_pedido"))||{data:hoje,sequencia:0};}
  catch(e){c={data:hoje,sequencia:0};}
  if(c.data!==hoje)c={data:hoje,sequencia:0};
  c.sequencia=Number(c.sequencia||0)+1;
  localStorage.setItem("mangora_sequencia_pedido",JSON.stringify(c));
  return c.sequencia;
}

window.onload = function(){
  produtos = lerProdutos();
  carregarProdutos();
  renderizarCarte();
  renderizarOpcoesMonte();
  atualizarResumoMonte();
  atualizarCarrinho();
};

function carregarProdutos(){
  const lista = document.getElementById("listaProdutos");
  if(!lista) return;

  lista.innerHTML = "";

  const ativos = produtos.filter(p => p.ativo !== false);

  if(ativos.length === 0){
    lista.innerHTML = `
      <div class="produto-card">
        <h3>Cardápio indisponível</h3>
        <p>Nenhum produto foi cadastrado no momento.</p>
      </div>
    `;
    return;
  }

  ativos.forEach(p => {
    lista.innerHTML += `
      <article class="produto-card">
        <h3>${p.nome}</h3>
        <p>${p.categoria || ""}</p>
        <p>${p.tamanho || ""}</p>
        <div class="preco">${moeda(p.preco)}</div>
        <button onclick="adicionarProduto(${p.id})">Adicionar</button>
      </article>
    `;
  });
}

function adicionarProduto(id){
  const produto = produtos.find(p => p.id == id);

  if(!produto){
    alert("Produto não encontrado.");
    return;
  }

  const estoque = Number(produto.estoque || 0);
  const existente = carrinho.find(i => i.id == id);
  const qtdAtual = existente ? Number(existente.quantidade || 0) : 0;

  if(estoque > 0 && qtdAtual + 1 > estoque){
    alert("Quantidade indisponível em estoque.");
    return;
  }

  if(existente){
    existente.quantidade += 1;
    existente.total = existente.quantidade * existente.preco;
  }else{
    carrinho.push({
      id:produto.id,
      produtoId:produto.id,
      nome:produto.nome,
      preco:Number(produto.preco || 0),
      quantidade:1,
      total:Number(produto.preco || 0)
    });
  }

  atualizarCarrinho();
}

function removerItem(id){
  const indice = carrinho.findIndex(i => i.id == id);
  if(indice < 0) return;

  if(carrinho[indice].quantidade > 1){
    carrinho[indice].quantidade -= 1;
    carrinho[indice].total =
      carrinho[indice].quantidade * carrinho[indice].preco;
  }else{
    carrinho.splice(indice,1);
  }

  atualizarCarrinho();
}

function atualizarCarrinho(){
  const area = document.getElementById("itensCarrinho");
  const campoSubtotal = document.getElementById("valorSubtotal");
  const campoEntrega = document.getElementById("valorEntrega");
  const campoTotal = document.getElementById("valorTotal");
  if(!area || !campoTotal) return;

  area.innerHTML = "";

  let subtotal = 0;

  if(carrinho.length === 0){
    area.innerHTML = "<p>Carrinho vazio.</p>";
  }

  carrinho.forEach(item => {
    subtotal += Number(item.total || 0);

    area.innerHTML += `
      <div class="item-carrinho">
        <strong>${item.nome}</strong>
        ${item.detalhes ? `<div class="detalhes-item">${item.detalhes}</div>` : ""}
        <div>Quantidade: ${item.quantidade}</div>
        <div>${item.total > 0 ? moeda(item.total) : "Preço a definir"}</div>
        <button onclick="removerItem(${item.id})">Remover 1</button>
      </div>
    `;
  });

  const taxaEntrega = carrinho.length && tipoRecebimentoCliente==="Delivery" ? TAXA_ENTREGA_MANGORA : 0;
  const total = subtotal + taxaEntrega;
  if(campoSubtotal) campoSubtotal.textContent = `Subtotal: ${moeda(subtotal)}`;
  if(campoEntrega) campoEntrega.textContent = `Taxa de entrega: ${moeda(taxaEntrega)}`;
  campoTotal.textContent = `Total: ${moeda(total)}`;

  atualizarContadoresCarrinho();
}


function renderizarCarte(){
 const area=document.getElementById("listaProdutos"); if(!area)return;
 const precos=lerPrecosCarte();
 area.innerHTML=receitasCarte.map(r=>{
   const p400=Number(precos[r.id]?.p400||0), p500=Number(precos[r.id]?.p500||0);
   return `<article class="produto-carte produto-carte-com-imagem">
     <div class="produto-carte-imagem-wrap">
       <img class="produto-carte-imagem" src="${imagensCarte[r.id]||''}" alt="${r.nome}" loading="lazy">
     </div>
     <div class="produto-carte-info"><h3>${r.nome}</h3><p>${r.descricao}</p>
       <div class="tamanhos-carte">
         <button onclick="adicionarCarte('${r.id}','400')">400 ml <strong>${p400>0?moeda(p400):"Preço a definir"}</strong></button>
         <button onclick="adicionarCarte('${r.id}','500')">500 ml <strong>${p500>0?moeda(p500):"Preço a definir"}</strong></button>
       </div>
     </div>
   </article>`;
 }).join("");
}
function adicionarCarte(id,tamanho){
 const r=receitasCarte.find(x=>x.id===id); if(!r)return;
 const precos=lerPrecosCarte();
 const valor=Number(tamanho==="500"?precos[id]?.p500||0:precos[id]?.p400||0);
 if(valor<=0){alert("Este tamanho está temporariamente indisponível porque o preço ainda não foi configurado.");return;}

 const existente = carrinho.find(item=>item.alacarte && item.receitaId===id && String(item.tamanho)===String(tamanho));
 if(existente){
   existente.quantidade = Number(existente.quantidade||1) + 1;
   existente.total = Number(existente.preco||0) * existente.quantidade;
 }else{
   carrinho.push({
     id:Date.now(),
     produtoId:null,
     receitaId:id,
     tamanho:String(tamanho),
     nome:`${r.nome} - ${tamanho} ml`,
     detalhes:r.descricao,
     preco:valor,
     quantidade:1,
     total:valor,
     personalizado:true,
     alacarte:true
   });
 }
 atualizarCarrinho();
 mostrarToastCliente(`${r.nome} adicionado ao carrinho ✓`);
}

function abrirModo(modo){
  const areaMonte=document.getElementById("areaMonte");
  const areaCarte=document.getElementById("areaCarte");
  const btnMonte=document.getElementById("btnMonte");
  const btnCarte=document.getElementById("btnCarte");

  const mostrarMonte = modo === "monte";

  if(areaMonte) areaMonte.style.display = mostrarMonte ? "block" : "none";
  if(areaCarte) areaCarte.style.display = mostrarMonte ? "none" : "block";

  if(btnMonte) btnMonte.classList.toggle("ativo", mostrarMonte);
  if(btnCarte) btnCarte.classList.toggle("ativo", !mostrarMonte);
}
function renderizarGrupo(id,g,itens){document.getElementById(id).innerHTML=itens.map(n=>`<label class="opcao-check"><input type="checkbox" data-grupo="${g}" value="${n}" onchange="atualizarResumoMonte()"><span>${n}</span></label>`).join("");}
function renderizarOpcoesMonte(){renderizarGrupo("opcoesFrutas","frutas",opcoesMonte.frutas);renderizarGrupo("opcoesTemperos","temperos",opcoesMonte.temperos);renderizarGrupo("opcoesCoberturas","coberturas",opcoesMonte.coberturas);}
function selecionados(g){return [...document.querySelectorAll(`input[data-grupo="${g}"]:checked`)].map(e=>e.value);}
function calcularMonte(){const tamanho=document.querySelector('input[name="tamanhoMonte"]:checked')?.value||"400",frutas=selecionados("frutas"),temperos=selecionados("temperos"),coberturas=selecionados("coberturas"),c=lerConfigMonte(),ef=Math.max(0,frutas.length-2),et=Math.max(0,temperos.length-3),ec=Math.max(0,coberturas.length-2),base=tamanho==="500"?Number(c.preco500||0):Number(c.preco400||0);return {tamanho,frutas,temperos,coberturas,extrasFrutas:ef,extrasTemperos:et,extrasCoberturas:ec,total:base+ef*Number(c.adicionalFruta||0)+et*Number(c.adicionalTempero||0)+ec*Number(c.adicionalCobertura||0)};}
function atualizarResumoMonte(){const r=calcularMonte(),a=document.getElementById("resumoMonte"),p=document.getElementById("precoMonte");if(!a||!p)return;a.innerHTML=`<p><strong>${r.tamanho} ml</strong></p><p>Frutas: ${r.frutas.join(", ")||"Nenhuma"} ${r.extrasFrutas?`(+${r.extrasFrutas} extra)`:""}</p><p>Temperos: ${r.temperos.join(", ")||"Nenhum"} ${r.extrasTemperos?`(+${r.extrasTemperos} extra)`:""}</p><p>Coberturas: ${r.coberturas.join(", ")||"Nenhuma"} ${r.extrasCoberturas?`(+${r.extrasCoberturas} extra)`:""}</p>`;p.textContent=r.total>0?`Total: ${moeda(r.total)}`:"Preço a definir";}
function adicionarMonteCarrinho(){const r=calcularMonte();if(!r.frutas.length){alert("Escolha pelo menos uma fruta.");return;}if(Number(r.total||0)<=0){alert("Este tamanho está temporariamente indisponível porque o preço ainda não foi configurado.");return;}const detalhes=`Frutas: ${r.frutas.join(", ")} | Temperos: ${r.temperos.join(", ")||"sem tempero"} | Coberturas: ${r.coberturas.join(", ")||"sem cobertura"}`;carrinho.push({id:Date.now(),produtoId:null,nome:`Monte do Seu Jeito - ${r.tamanho} ml`,detalhes,preco:r.total,quantidade:1,total:r.total,personalizado:true,montagem:r});atualizarCarrinho();mostrarToastCliente("Adicionado ao carrinho ✓");}

function selecionarTipoRecebimento(tipo){
  tipoRecebimentoCliente = tipo==="Retirada na loja" ? "Retirada na loja" : "Delivery";
  const delivery=tipoRecebimentoCliente==="Delivery";
  document.getElementById("btnTipoDelivery")?.classList.toggle("ativo",delivery);
  document.getElementById("btnTipoRetirada")?.classList.toggle("ativo",!delivery);
  const campo=document.getElementById("campoEnderecoCliente");
  if(campo)campo.style.display=delivery?"block":"none";
  const endereco=document.getElementById("endereco");
  if(endereco&&!delivery)endereco.value="";
  const aviso=document.getElementById("avisoTipoRecebimento");
  if(aviso)aviso.textContent=delivery?"Delivery possui taxa fixa de R$ 5,00.":"Retire seu pedido na loja. Sem taxa de entrega.";
  atualizarCarrinho();
}

function abrirFormulario(){
  if(carrinho.length === 0){
    alert("Adicione produtos ao carrinho.");
    return;
  }

  const form = document.getElementById("formPedido");
  form.style.display = "block";
  atualizarPagamentoCliente();
  form.scrollIntoView({behavior:"smooth",block:"start"});
}

function atualizarPagamentoCliente(){
  const pagamento=document.getElementById("pagamento")?.value;
  const box=document.getElementById("boxPixCliente");
  if(box) box.style.display=pagamento==="Pix"?"grid":"none";
}

async function copiarChavePix(){
  try{
    await navigator.clipboard.writeText(CHAVE_PIX_MANGORA);
    mostrarToastCliente("Chave PIX copiada ✓");
  }catch(e){
    const el=document.createElement("textarea");
    el.value=CHAVE_PIX_MANGORA;
    document.body.appendChild(el);el.select();document.execCommand("copy");el.remove();
    mostrarToastCliente("Chave PIX copiada ✓");
  }
}

function enviarPedido(){
  const nome = document.getElementById("nome").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const endereco = document.getElementById("endereco").value.trim();
  const pagamento = document.getElementById("pagamento").value;
  const observacao = document.getElementById("observacao").value.trim();

  if(!nome){
    alert("Informe seu nome.");
    return;
  }

  if(!telefone){
    alert("Informe seu WhatsApp.");
    return;
  }

  if(tipoRecebimentoCliente==="Delivery" && !endereco){
    alert("Informe seu endereço para entrega.");
    return;
  }

  if(carrinho.length === 0){
    alert("Seu carrinho está vazio.");
    return;
  }

  if(carrinho.some(item=>Number(item.preco||0)<=0 || Number(item.total||0)<=0)){
    alert("Há item sem preço definido no carrinho. Atualize a página e escolha somente itens disponíveis.");
    return;
  }

  // Revalida produtos/estoque no momento da finalização.
  produtos = lerProdutos();

  for(const item of carrinho){
    if(item.personalizado) continue;

    const p = produtos.find(prod => prod.id == item.id);

    if(!p){
      alert(`O produto ${item.nome} não está mais disponível.`);
      return;
    }

    if(Number(p.estoque || 0) > 0 &&
       Number(p.estoque || 0) < Number(item.quantidade || 0)){
      alert(`Estoque insuficiente para ${item.nome}.`);
      return;
    }
  }

  let pedidos;

  try{
    pedidos = JSON.parse(localStorage.getItem("mangora_pedidos")) || [];
  }catch(e){
    pedidos = [];
  }

  const total = carrinho.reduce((soma,item) => soma + Number(item.total || 0),0);

  const pedido = {
    id:Date.now(),
    numeroPedido:proximoNumeroPedido(),
    cliente:nome,
    telefone,
    endereco,
    pagamento,
    observacao,
    itens:carrinho.map(item => ({
      produtoId:item.id,
      nome:item.nome,
      quantidade:item.quantidade,
      preco:item.preco,
      total:item.total,
      detalhes:item.detalhes || "",
      personalizado:Boolean(item.personalizado),
      montagem:item.montagem || null
    })),
    total,
    status:"Recebido",
    origem:"Cliente",
    data:new Date().toLocaleString("pt-BR")
  };

  pedidos.push(pedido);
  localStorage.setItem("mangora_pedidos",JSON.stringify(pedidos));

  // Baixa estoque no mesmo momento do pedido.
  produtos.forEach(p => {
    const vendido = carrinho.find(item => !item.personalizado && item.id == p.id);

    if(vendido){
      p.estoque = Math.max(
        0,
        Number(p.estoque || 0) - Number(vendido.quantidade || 0)
      );

      p.vendidos =
        Number(p.vendidos || 0) + Number(vendido.quantidade || 0);
    }
  });

  localStorage.setItem("mangora_produtos",JSON.stringify(produtos));

  // Inclui/atualiza cliente no cadastro administrativo.
  let clientes;
  try{
    clientes = JSON.parse(localStorage.getItem("mangora_clientes")) || [];
  }catch(e){
    clientes = [];
  }

  const telefoneLimpo = telefone.replace(/\D/g,"");
  const cadastrado = clientes.find(c =>
    String(c.telefone || "").replace(/\D/g,"") === telefoneLimpo
  );

  if(cadastrado){
    cadastrado.nome = nome;
    cadastrado.endereco = endereco;
  }else{
    clientes.push({
      id:Date.now()+1,
      nome,
      telefone,
      endereco
    });
  }

  localStorage.setItem("mangora_clientes",JSON.stringify(clientes));

  ultimoPedido = pedido.id;

  document.getElementById("formPedido").style.display = "none";
  document.getElementById("confirmacaoPedido").style.display = "block";
  document.getElementById("numeroPedido").textContent = `Pedido Nº ${String(pedido.numeroPedido).padStart(3,"0")}`;
  document.getElementById("statusPedido").textContent = "🟢 Recebido";

  carrinho = [];
  atualizarCarrinho();

  ["nome","telefone","endereco","observacao"].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = "";
  });

  document.getElementById("pagamento").selectedIndex = 0;

  document.getElementById("confirmacaoPedido")
    .scrollIntoView({behavior:"smooth",block:"center"});
}

function acompanharPedido(){
  if(!ultimoPedido){
    alert("Pedido não encontrado.");
    return;
  }

  window.location.href =
    `acompanhamento.html?id=${encodeURIComponent(ultimoPedido)}`;
}


document.addEventListener("DOMContentLoaded",()=>abrirModo("carte"));


document.addEventListener("DOMContentLoaded", atualizarContadoresCarrinho);
