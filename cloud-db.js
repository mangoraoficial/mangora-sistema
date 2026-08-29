// ==========================================================
// MANGORA V18 CLOUD - REST / SUPABASE
// ==========================================================

async function mangoraSessaoToken(){
  if(typeof obterSessaoValida !== "function") return null;
  const sessao=await obterSessaoValida();
  return sessao?.access_token || null;
}

async function mangoraRequest(caminho,{method="GET",body=null,auth=false,prefer=""}={}){
  const headers={
    "apikey":MANGORA_CLOUD.publishableKey,
    "Content-Type":"application/json"
  };

  if(auth){
    const token=await mangoraSessaoToken();
    if(!token) throw new Error("Sessão administrativa expirada.");
    headers.Authorization=`Bearer ${token}`;
  }

  if(prefer) headers.Prefer=prefer;

  const resposta=await fetch(`${MANGORA_CLOUD.url}${caminho}`,{
    method,
    headers,
    body:body===null ? undefined : JSON.stringify(body)
  });

  const texto=await resposta.text();
  let dados=null;
  if(texto){
    try{dados=JSON.parse(texto);}catch(e){dados=texto;}
  }

  if(!resposta.ok){
    const msg=dados?.message || dados?.msg || dados?.hint || `Erro ${resposta.status}`;
    throw new Error(msg);
  }

  return dados;
}

async function mangoraRpc(nome,parametros,auth=false){
  return mangoraRequest(`/rest/v1/rpc/${nome}`,{
    method:"POST",
    body:parametros,
    auth
  });
}

async function cloudLerPrecos(auth=false){
  const rows=await mangoraRequest("/rest/v1/precos_carte?select=receita_id,preco_400,preco_500",{auth});
  const mapa={};
  (rows||[]).forEach(r=>{
    mapa[r.receita_id]={p400:Number(r.preco_400||0),p500:Number(r.preco_500||0)};
  });
  return mapa;
}

async function cloudSalvarPrecos(mapa){
  const rows=Object.entries(mapa).map(([receita_id,v])=>({
    receita_id,
    preco_400:Number(v.p400||0),
    preco_500:Number(v.p500||0),
    atualizado_em:new Date().toISOString()
  }));

  return mangoraRequest("/rest/v1/precos_carte?on_conflict=receita_id",{
    method:"POST",
    body:rows,
    auth:true,
    prefer:"resolution=merge-duplicates,return=minimal"
  });
}

async function cloudLerConfigMonte(auth=false){
  const rows=await mangoraRequest("/rest/v1/config_monte?select=*&order=id.asc&limit=1",{auth});
  const r=rows?.[0];
  if(!r) return null;
  return {
    preco400:Number(r.preco_400||0),
    preco500:Number(r.preco_500||0),
    adicionalFruta:Number(r.adicional_fruta||0),
    adicionalTempero:Number(r.adicional_tempero||0),
    adicionalCobertura:Number(r.adicional_cobertura||0)
  };
}

async function cloudSalvarConfigMonte(c){
  return mangoraRequest("/rest/v1/config_monte?on_conflict=id",{
    method:"POST",
    auth:true,
    prefer:"resolution=merge-duplicates,return=minimal",
    body:[{
      id:1,
      preco_400:Number(c.preco400||0),
      preco_500:Number(c.preco500||0),
      adicional_fruta:Number(c.adicionalFruta||0),
      adicional_tempero:Number(c.adicionalTempero||0),
      adicional_cobertura:Number(c.adicionalCobertura||0),
      atualizado_em:new Date().toISOString()
    }]
  });
}

function pedidoCloudParaLocal(p){
  return {
    id:Number(p.id),
    numeroPedido:Number(p.numero_pedido||0)||null,
    cliente:p.cliente_nome||"Cliente",
    telefone:p.telefone||"",
    endereco:p.endereco||"",
    comanda:p.comanda||"",
    tipoAtendimento:p.tipo_atendimento||"Delivery",
    pagamento:p.pagamento||"Não informado",
    observacao:p.observacao||"",
    status:p.status||"Recebido",
    origem:p.origem||"Cliente",
    total:Number(p.total||0),
    motivoCancelamento:p.motivo_cancelamento||"",
    canceladoEm:p.cancelado_em ? new Date(p.cancelado_em).toLocaleString("pt-BR") : "",
    data:p.criado_em ? new Date(p.criado_em).toLocaleString("pt-BR") : "",
    trackingToken:p.tracking_token||"",
    itens:(p.itens_pedido||[]).map(i=>({
      id:Number(i.id),
      nome:i.nome,
      receitaId:i.receita_id||null,
      tamanho:i.tamanho||null,
      detalhes:i.detalhes||"",
      preco:Number(i.preco||0),
      quantidade:Number(i.quantidade||1),
      total:Number(i.total||0),
      personalizado:Boolean(i.personalizado),
      alacarte:Boolean(i.alacarte)
    }))
  };
}

async function cloudLerPedidos(){
  const rows=await mangoraRequest(
    "/rest/v1/pedidos?select=*,itens_pedido(*)&order=criado_em.asc",
    {auth:true}
  );
  return (rows||[]).map(pedidoCloudParaLocal);
}

async function cloudCriarPedido(pedido,itens,auth=false){
  const resposta=await mangoraRpc("criar_pedido_publico",{
    p_pedido:pedido,
    p_itens:itens
  },auth);

  return Array.isArray(resposta) ? resposta[0] : resposta;
}
