// ==========================================================
// MANGORA V18 CLOUD - ÁREA DO CLIENTE
// Preços + configuração + envio real para Supabase
// ==========================================================

let ultimoTrackingTokenCloud=null;

async function carregarCatalogoCloudCliente(){
  try{
    const [precos,cfg]=await Promise.all([
      cloudLerPrecos(false),
      cloudLerConfigMonte(false)
    ]);

    localStorage.setItem("mangora_precos_carte",JSON.stringify(precos||{}));

    if(cfg){
      localStorage.setItem("mangora_config_monte",JSON.stringify(cfg));
    }

    renderizarCarte();
    renderizarOpcoesMonte();
    atualizarResumoMonte();
  }catch(erro){
    console.error("Falha ao carregar catálogo cloud:",erro);
    alert("Não foi possível carregar o cardápio online. Verifique sua internet e tente novamente.");
  }
}

window.onload=async function(){
  produtos=lerProdutos();
  carregarProdutos();
  renderizarOpcoesMonte();
  atualizarCarrinho();
  await carregarCatalogoCloudCliente();
};

window.enviarPedido=async function(){
  const nome=document.getElementById("nome").value.trim();
  const telefone=document.getElementById("telefone").value.trim();
  const endereco=document.getElementById("endereco").value.trim();
  const pagamento=document.getElementById("pagamento").value;
  const observacao=document.getElementById("observacao").value.trim();

  if(!nome){alert("Informe seu nome.");return;}
  if(!telefone){alert("Informe seu WhatsApp.");return;}
  if(tipoRecebimentoCliente==="Delivery" && !endereco){alert("Informe seu endereço para entrega.");return;}
  if(carrinho.length===0){alert("Seu carrinho está vazio.");return;}
  if(carrinho.some(i=>Number(i.preco||0)<=0 || Number(i.total||0)<=0)){
    alert("Há item sem preço válido no carrinho.");
    return;
  }

  const botao=document.querySelector('#formPedido button[onclick="enviarPedido()"]');
  if(botao){botao.disabled=true;botao.textContent="Enviando pedido...";}

  const subtotal=carrinho.reduce((s,i)=>s+Number(i.total||0),0);
  const taxaEntrega=tipoRecebimentoCliente==="Delivery" ? TAXA_ENTREGA_MANGORA : 0;
  const total=subtotal+taxaEntrega;

  const dadosPedido={
    cliente_nome:nome,
    telefone,
    endereco,
    tipo_atendimento:tipoRecebimentoCliente,
    pagamento,
    observacao,
    origem:"Cliente",
    taxa_entrega:taxaEntrega,
    total
  };

  const itens=carrinho.map(i=>({
    nome:i.nome,
    receita_id:i.receitaId || i.receita_id || null,
    tamanho:i.tamanho || i.montagem?.tamanho || null,
    detalhes:i.detalhes||"",
    preco:Number(i.preco||0),
    quantidade:Number(i.quantidade||1),
    total:Number(i.total||0),
    personalizado:Boolean(i.personalizado),
    alacarte:Boolean(i.alacarte)
  }));

  try{
    const criado=await cloudCriarPedido(dadosPedido,itens,false);
    if(!criado?.pedido_id) throw new Error("Pedido não confirmado pelo servidor.");

    ultimoPedido=Number(criado.pedido_id);
    ultimoTrackingTokenCloud=criado.tracking_token;

    document.getElementById("formPedido").style.display="none";
    exibirConfirmacaoPedidoV23({
      numero:criado.numero_pedido||criado.pedido_id,
      total,
      pagamento,
      tipo:tipoRecebimentoCliente
    });

    const resumoPagamento=document.getElementById("resumoPagamentoConfirmacao");
    if(resumoPagamento){
      if(pagamento==="Pix"){
        resumoPagamento.style.display="grid";
        resumoPagamento.innerHTML=`<strong>Pagamento por PIX</strong><span>${tipoRecebimentoCliente==="Delivery"?"🛵 Delivery":"🏪 Retirada na loja"}</span><span>Total do pedido: <b>${moeda(total)}</b></span><span>Chave PIX (celular): <b>${CHAVE_PIX_MANGORA}</b></span><button type="button" class="btn-copiar-pix" onclick="copiarChavePix()">Copiar chave PIX</button><small>O pagamento será confirmado pela loja.</small>`;
      }else{
        resumoPagamento.style.display="grid";
        resumoPagamento.innerHTML=`<strong>Forma de pagamento: ${pagamento}</strong><span>${tipoRecebimentoCliente==="Delivery"?"🛵 Delivery":"🏪 Retirada na loja"}</span><span>Total do pedido: <b>${moeda(total)}</b></span>`;
      }
    }

    carrinho=[];
    atualizarCarrinho();

    ["nome","telefone","endereco","observacao"].forEach(id=>{
      const el=document.getElementById(id); if(el)el.value="";
    });
    document.getElementById("pagamento").selectedIndex=0;

  }catch(erro){
    console.error(erro);
    alert(`Não foi possível enviar o pedido.\n\n${erro.message}`);
  }finally{
    if(botao){botao.disabled=false;botao.textContent="Enviar pedido";}
  }
};

window.acompanharPedido=function(){
  if(!ultimoTrackingTokenCloud){
    alert("Código de acompanhamento não encontrado.");
    return;
  }
  location.href=`acompanhamento.html?token=${encodeURIComponent(ultimoTrackingTokenCloud)}`;
};
