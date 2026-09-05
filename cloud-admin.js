// ==========================================================
// MANGORA V18 CLOUD - PAINEL DA LOJA
// Supabase como fonte dos pedidos, preços e configuração.
// ==========================================================

let sincronizacaoCloudEmAndamento=false;
let intervaloCloud=null;
let idsPedidosConhecidosCloud=new Set();
let primeiraSincronizacaoPedidosCloud=true;
let alertasPedidosAtivos=false;
let contextoAudioPedidos=null;
let timerAlertaPedido=null;

function atualizarIndicadorCloud(ok,texto){
  const el=document.getElementById("statusCloud");
  if(!el)return;
  el.textContent=texto || (ok?"Cloud conectado":"Cloud indisponível");
  el.classList.toggle("offline",!ok);
}

async function sincronizarCatalogoCloudAdmin(){
  const [precos,cfg]=await Promise.all([
    cloudLerPrecos(true),
    cloudLerConfigMonte(true)
  ]);

  if(precos && Object.keys(precos).length){
    localStorage.setItem("mangora_precos_carte",JSON.stringify(precos));
  }

  if(cfg){
    configuracaoMonte=cfg;
    localStorage.setItem("mangora_config_monte",JSON.stringify(cfg));
  }

  renderizarPrecosCarte();
  carregarConfiguracaoMonte();
  renderizarPedidoManual();
}

async function ativarAlertasPedidos(){
  alertasPedidosAtivos=true;
  const btn=document.getElementById("btnAtivarAlertas");
  if(btn){btn.classList.add("ativo");btn.textContent="🔔 Alertas ativos";}
  try{
    contextoAudioPedidos=contextoAudioPedidos||new (window.AudioContext||window.webkitAudioContext)();
    if(contextoAudioPedidos.state==="suspended")await contextoAudioPedidos.resume();
    tocarSomNovoPedido();
  }catch(e){}
  if("Notification" in window && Notification.permission==="default"){
    try{await Notification.requestPermission();}catch(e){}
  }
}

function tocarSomNovoPedido(){
  if(!alertasPedidosAtivos||!contextoAudioPedidos)return;
  const agora=contextoAudioPedidos.currentTime;
  [0,.18,.36].forEach((atraso,i)=>{
    const osc=contextoAudioPedidos.createOscillator(),ganho=contextoAudioPedidos.createGain();
    osc.type="sine";osc.frequency.value=i===1?880:740;
    ganho.gain.setValueAtTime(.0001,agora+atraso);
    ganho.gain.exponentialRampToValueAtTime(.22,agora+atraso+.015);
    ganho.gain.exponentialRampToValueAtTime(.0001,agora+atraso+.14);
    osc.connect(ganho);ganho.connect(contextoAudioPedidos.destination);
    osc.start(agora+atraso);osc.stop(agora+atraso+.16);
  });
}

function fecharAlertaNovoPedido(){
  document.getElementById("alertaNovoPedido")?.classList.remove("mostrar");
  if(timerAlertaPedido)clearTimeout(timerAlertaPedido);
}

function dispararAlertaNovoPedido(novos){
  if(!novos?.length)return;
  const ultimo=novos[novos.length-1],box=document.getElementById("alertaNovoPedido"),texto=document.getElementById("alertaNovoPedidoTexto");
  if(texto){
    const tipo=ultimo.tipoAtendimento==="Retirada na loja"?"Retirada":ultimo.tipoAtendimento||"Delivery";
    texto.textContent=novos.length>1?`${novos.length} novos pedidos`:`${referenciaPedido(ultimo)} • ${ultimo.cliente||"Cliente"} • ${tipo}`;
  }
  box?.classList.add("mostrar");
  if(timerAlertaPedido)clearTimeout(timerAlertaPedido);
  timerAlertaPedido=setTimeout(fecharAlertaNovoPedido,12000);
  tocarSomNovoPedido();
  const tituloOriginal="Mangora - Painel da Loja";
  document.title=`🔔 NOVO PEDIDO • ${tituloOriginal}`;
  setTimeout(()=>document.title=tituloOriginal,12000);
  if(alertasPedidosAtivos && "Notification" in window && Notification.permission==="granted"){
    try{new Notification("Mangora • Novo pedido",{body:`${ultimo.cliente||"Cliente"} • ${ultimo.tipoAtendimento||"Delivery"} • ${moeda(ultimo.total)}`,icon:"img/logo.png"});}catch(e){}
  }
}

async function sincronizarPedidosCloud(){
  if(sincronizacaoCloudEmAndamento)return;
  sincronizacaoCloudEmAndamento=true;

  try{
    const lista=await cloudLerPedidos();
    pedidos=lista.map(normalizarPedido);
    const idsAtuais=new Set(pedidos.map(p=>String(p.id)));
    if(primeiraSincronizacaoPedidosCloud){
      idsPedidosConhecidosCloud=idsAtuais;
      primeiraSincronizacaoPedidosCloud=false;
    }else{
      const novos=pedidos.filter(p=>!idsPedidosConhecidosCloud.has(String(p.id)) && p.origem==="Cliente");
      idsPedidosConhecidosCloud=idsAtuais;
      if(novos.length)dispararAlertaNovoPedido(novos);
    }
    localStorage.setItem("mangora_pedidos",JSON.stringify(pedidos));

    listarPedidos();
    listarRecentes();
    carregarCozinha();
    atualizarDashboard();
    atualizarFinanceiro();

    atualizarIndicadorCloud(true,`Cloud conectado • ${pedidos.length} pedido(s)`);
  }catch(erro){
    console.error("Falha na sincronização cloud:",erro);
    atualizarIndicadorCloud(false,"Cloud indisponível");
  }finally{
    sincronizacaoCloudEmAndamento=false;
  }
}

window.salvarPrecosCarte=async function(){
  const p={};
  receitasCarteAdmin.forEach(([id])=>{
    p[id]={
      p400:Number(document.getElementById(`carte_${id}_400`).value||0),
      p500:Number(document.getElementById(`carte_${id}_500`).value||0)
    };
  });

  try{
    await cloudSalvarPrecos(p);
    localStorage.setItem("mangora_precos_carte",JSON.stringify(p));
    renderizarPedidoManual();
    alert("Preços salvos na nuvem.");
  }catch(erro){
    alert(`Não foi possível salvar os preços.\n\n${erro.message}`);
  }
};

window.salvarConfiguracaoMonte=async function(){
  const cfg={
    preco400:Number(document.getElementById("preco400").value||0),
    preco500:Number(document.getElementById("preco500").value||0),
    adicionalFruta:Number(document.getElementById("adicionalFruta").value||0),
    adicionalTempero:Number(document.getElementById("adicionalTempero").value||0),
    adicionalCobertura:Number(document.getElementById("adicionalCobertura").value||0)
  };

  try{
    await cloudSalvarConfigMonte(cfg);
    configuracaoMonte=cfg;
    localStorage.setItem("mangora_config_monte",JSON.stringify(cfg));
    renderizarPedidoManual();
    alert("Configuração salva na nuvem.");
  }catch(erro){
    alert(`Não foi possível salvar a configuração.\n\n${erro.message}`);
  }
};

window.finalizarPedido=async function(){
  if(carrinho.length===0){alert("Adicione produtos ao pedido.");return;}
  if(carrinho.some(i=>Number(i.preco||0)<=0 || Number(i.total||0)<=0)){
    alert("Há item sem preço definido no carrinho.");
    return;
  }

  let nome="",telefone="",endereco="",comanda="";
  if(atendimentoManual==="Delivery"){
    const clienteId=document.getElementById("clientePedido").value;
    const cliente=clientes.find(c=>c.id==clienteId);
    nome=document.getElementById("manualNome").value.trim()||cliente?.nome||"";
    telefone=document.getElementById("manualTelefone").value.trim()||cliente?.telefone||"";
    endereco=document.getElementById("manualEndereco").value.trim()||cliente?.endereco||"";
    if(!nome){alert("Informe o nome do cliente.");return;}
    if(!endereco){alert("Informe o endereço para entrega.");return;}
  }else{
    comanda=document.getElementById("manualComanda").value.trim();
    nome=document.getElementById("manualNomeMesa").value.trim()||"Cliente";
    if(!comanda){alert("Informe a mesa ou comanda.");return;}
  }

  const subtotal=carrinho.reduce((s,i)=>s+Number(i.total||0),0);
  const taxaEntrega=atendimentoManual==="Delivery"?TAXA_ENTREGA_MANGORA_ADMIN:0;
  const total=subtotal+taxaEntrega;
  const pagamento=document.getElementById("pagamentoPedido").value;
  const observacao=document.getElementById("observacaoManual").value.trim();

  const dadosPedido={
    cliente_nome:nome,telefone,endereco,
    tipo_atendimento:atendimentoManual,
    comanda,pagamento,observacao,
    origem:"Pedido Manual",taxa_entrega:taxaEntrega,total
  };

  const itens=carrinho.map(i=>({
    nome:i.nome,
    receita_id:i.receitaId||null,
    tamanho:i.tamanho||i.montagem?.tamanho||null,
    detalhes:i.detalhes||"",
    preco:Number(i.preco||0),
    quantidade:Number(i.quantidade||1),
    total:Number(i.total||0),
    personalizado:Boolean(i.personalizado),
    alacarte:Boolean(i.alacarte)
  }));

  try{
    await cloudCriarPedido(dadosPedido,itens,true);
    carrinho=[];
    ["manualNome","manualTelefone","manualEndereco","manualComanda","manualNomeMesa","observacaoManual"].forEach(id=>{
      const e=document.getElementById(id);if(e)e.value="";
    });
    mostrarCarrinho();
    await sincronizarPedidosCloud();
    alert(`Pedido ${atendimentoManual} registrado na nuvem.`);

    const botaoPedidos=document.querySelector('.nav-btn[data-tela="pedidos"]');
    if(botaoPedidos) mostrarTela("pedidos",botaoPedidos);
    filtrarPedidos(atendimentoManual==="Mesa/Comanda"?"mesa":"delivery");
  }catch(erro){
    alert(`Não foi possível registrar o pedido.\n\n${erro.message}`);
  }
};


window.confirmarPagamentoPix=async function(id){
  const pedido=pedidos.find(p=>p.id==id);
  if(!pedido || pedidoCancelado(pedido)) return;
  if(String(pedido.pagamento||"").trim().toLowerCase()!=="pix") return;
  if(!confirm(`Confirmar recebimento do PIX do pedido ${referenciaPedido(pedido)}?`)) return;

  try{
    await mangoraRequest(`/rest/v1/pedidos?id=eq.${encodeURIComponent(id)}`,{
      method:"PATCH",
      auth:true,
      body:{status_pagamento:"Pago"},
      prefer:"return=minimal"
    });
    await sincronizarPedidosCloud();
  }catch(erro){
    alert(`Não foi possível confirmar o PIX.\n\n${erro.message}`);
  }
};

window.alterarStatus=async function(id){
  const pedido=pedidos.find(p=>p.id==id);
  if(!pedido||pedidoCancelado(pedido))return;

  const tipo=tipoPedidoPainel(pedido);
  const fluxo=tipo==="mesa"
    ?["Recebido","Em preparo","Pronto","Finalizado"]
    :tipo==="retirada"
      ?["Recebido","Em preparo","Pronto para retirada","Finalizado"]
      :["Recebido","Em preparo","Saiu para entrega","Finalizado"];
  const indice=fluxo.indexOf(pedido.status);
  const novo=indice>=0&&indice<fluxo.length-1?fluxo[indice+1]:"Finalizado";

  try{
    await mangoraRequest(`/rest/v1/pedidos?id=eq.${encodeURIComponent(id)}`,{
      method:"PATCH",auth:true,body:{status:novo},prefer:"return=minimal"
    });
    await sincronizarPedidosCloud();
  }catch(erro){
    alert(`Não foi possível alterar o status.\n\n${erro.message}`);
  }
};

window.cancelarPedido=async function(id){
  const pedido=pedidos.find(p=>p.id==id);
  if(!pedido||pedidoCancelado(pedido))return;

  const motivo=prompt(`Cancelar o pedido ${referenciaPedido(pedido)}?\n\nInforme o motivo do cancelamento:`);
  if(motivo===null)return;
  if(!motivo.trim()){alert("Informe o motivo do cancelamento.");return;}

  try{
    await mangoraRequest(`/rest/v1/pedidos?id=eq.${encodeURIComponent(id)}`,{
      method:"PATCH",
      auth:true,
      body:{
        status:"Cancelado",
        motivo_cancelamento:motivo.trim(),
        cancelado_em:new Date().toISOString()
      },
      prefer:"return=minimal"
    });
    await sincronizarPedidosCloud();
  }catch(erro){
    alert(`Não foi possível cancelar o pedido.\n\n${erro.message}`);
  }
};

window.excluirPedido=async function(id){
  const pedido=pedidos.find(p=>p.id==id);
  if(!pedido)return;
  if(!pedidoCancelado(pedido)){
    alert("Por segurança, primeiro cancele o pedido.");
    return;
  }

  if(!confirm(`Excluir definitivamente o pedido ${referenciaPedido(pedido)}?\n\nEsta ação não poderá ser desfeita.`))return;

  try{
    await mangoraRequest(`/rest/v1/pedidos?id=eq.${encodeURIComponent(id)}`,{
      method:"DELETE",auth:true,prefer:"return=minimal"
    });
    await sincronizarPedidosCloud();
  }catch(erro){
    alert(`Não foi possível excluir o pedido.\n\n${erro.message}`);
  }
};

async function iniciarMangoraCloudAdmin(){
  try{
    await exigirLoginMangora();
    await sincronizarCatalogoCloudAdmin();
    await sincronizarPedidosCloud();
    if(intervaloCloud)clearInterval(intervaloCloud);
    intervaloCloud=setInterval(sincronizarPedidosCloud,5000);
  }catch(erro){
    console.error(erro);
    atualizarIndicadorCloud(false,"Falha na conexão Cloud");
  }
}

window.addEventListener("focus",()=>{
  sincronizarCatalogoCloudAdmin().catch(()=>{});
  sincronizarPedidosCloud();
});

document.addEventListener("DOMContentLoaded",iniciarMangoraCloudAdmin);


// ==========================================================
// V18 CLOUD ETAPA 3 - MÓDULOS ADMINISTRATIVOS NA NUVEM
// ==========================================================
async function sincronizarAdministrativoCloud(){
  const [listaClientes,listaDespesas,listaMaterias]=await Promise.all([
    cloudLerClientes(),cloudLerDespesas(),cloudLerMateriasPrimas()
  ]);
  clientes=listaClientes;
  despesas=listaDespesas;
  materiasPrimas=listaMaterias;
  localStorage.setItem('mangora_clientes',JSON.stringify(clientes));
  localStorage.setItem('mangora_despesas',JSON.stringify(despesas));
  localStorage.setItem('mangora_materias_primas',JSON.stringify(materiasPrimas));
  listarClientes();carregarClientes();listarDespesas();listarMateriaPrima();
  atualizarDashboard();atualizarFinanceiro();renderizarPedidoManual();
}

window.salvarCliente=async function(){
  const nome=document.getElementById('clienteNome').value.trim();
  const telefone=document.getElementById('clienteTelefone').value.trim();
  const endereco=document.getElementById('clienteEndereco').value.trim();
  if(!nome){alert('Informe o nome do cliente.');return;}
  try{
    await cloudCriarCliente({nome,telefone,endereco});
    document.getElementById('clienteNome').value='';
    document.getElementById('clienteTelefone').value='';
    document.getElementById('clienteEndereco').value='';
    await sincronizarAdministrativoCloud();
  }catch(erro){alert(`Não foi possível salvar o cliente.\n\n${erro.message}`);}
};
window.excluirCliente=async function(id){
  if(!confirm('Excluir este cliente?'))return;
  try{await cloudExcluirCliente(id);await sincronizarAdministrativoCloud();}
  catch(erro){alert(`Não foi possível excluir o cliente.\n\n${erro.message}`);}
};

window.salvarDespesa=async function(){
  const nome=document.getElementById('despesaNome').value.trim();
  const valor=Number(document.getElementById('despesaValor').value||0);
  if(!nome||valor<=0){alert('Informe descrição e valor.');return;}
  try{
    await cloudCriarDespesa({nome,valor});
    document.getElementById('despesaNome').value='';
    document.getElementById('despesaValor').value='';
    await sincronizarAdministrativoCloud();
  }catch(erro){alert(`Não foi possível salvar a despesa.\n\n${erro.message}`);}
};
window.excluirDespesa=async function(id){
  if(!confirm('Excluir esta despesa?'))return;
  try{await cloudExcluirDespesa(id);await sincronizarAdministrativoCloud();}
  catch(erro){alert(`Não foi possível excluir a despesa.\n\n${erro.message}`);}
};

window.salvarMateriaPrima=async function(){
  const nome=document.getElementById('mpNome').value.trim();
  const tipo=document.getElementById('mpTipo').value;
  const q=Number(document.getElementById('mpQuantidadeCompra').value||0);
  const u=document.getElementById('mpUnidadeCompra').value;
  const v=Number(document.getElementById('mpValorCompra').value||0);
  if(!nome||q<=0||v<=0){alert('Informe nome, quantidade e valor pago.');return;}
  const m={nome,tipo,quantidadeCompra:q,unidadeCompra:u,valorCompra:v,custoBase:v/mpQtdBase(q,u)};
  try{
    await cloudCriarMateriaPrima(m);
    document.getElementById('mpNome').value='';
    document.getElementById('mpQuantidadeCompra').value='';
    document.getElementById('mpValorCompra').value='';
    await sincronizarAdministrativoCloud();
  }catch(erro){alert(`Não foi possível salvar a matéria-prima.\n\n${erro.message}`);}
};
window.excluirMateriaPrima=async function(id){
  if(!confirm('Excluir esta matéria-prima?'))return;
  try{await cloudExcluirMateriaPrima(id);await sincronizarAdministrativoCloud();}
  catch(erro){alert(`Não foi possível excluir a matéria-prima.\n\n${erro.message}`);}
};

// Complementa a inicialização da Etapa 2 sem alterar os módulos já validados.
document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>sincronizarAdministrativoCloud().catch(erro=>{
    console.error('Falha módulos administrativos cloud:',erro);
    atualizarIndicadorCloud(false,'Cloud parcial');
  }),250);
});

window.addEventListener('focus',()=>{
  sincronizarAdministrativoCloud().catch(()=>{});
});
