// ==========================================================
// MANGORA V18 CLOUD - ACOMPANHAMENTO SEGURO
// ==========================================================

function moeda(valor){
  return Number(valor||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

function statusTexto(status){
  switch(status){
    case "Recebido": return "🟢 Pedido recebido";
    case "Em preparo": return "🟡 Seu pedido está sendo preparado";
    case "Saiu para entrega": return "🚚 Seu pedido saiu para entrega";
    case "Pronto": return "🥭 Seu pedido está pronto";
    case "Pronto para retirada": return "🏪 Seu pedido está pronto para retirada";
    case "Finalizado": return "✅ Pedido finalizado";
    case "Cancelado": return "🔴 Pedido cancelado";
    default: return status||"Status não informado";
  }
}

async function consultarPedido(){
  const token=document.getElementById("codigoPedido").value.trim();
  if(!token){alert("Informe o código de acompanhamento.");return;}

  try{
    const resposta=await mangoraRpc("acompanhar_pedido_publico",{p_token:token},false);
    const pedido=Array.isArray(resposta)?resposta[0]:resposta;

    if(!pedido){
      alert("Pedido não encontrado.");
      document.getElementById("resultado").style.display="none";
      return;
    }

    document.getElementById("resultado").style.display="block";
    document.getElementById("numeroResultado").textContent=
      `Pedido Nº ${String(pedido.numero_pedido||"").padStart(3,"0")}`;
    document.getElementById("clienteResultado").textContent=`Cliente: ${pedido.cliente_nome||""}`;
    document.getElementById("statusResultado").textContent=statusTexto(pedido.status);
    document.getElementById("dataResultado").textContent=
      `Realizado em: ${pedido.criado_em?new Date(pedido.criado_em).toLocaleString("pt-BR"):""}`;

    const itens=Array.isArray(pedido.itens)?pedido.itens:[];
    document.getElementById("itensResultado").innerHTML=itens.map(item=>`
      <div class="item-carrinho">
        <strong>${Number(item.quantidade||1)}x ${item.nome}</strong>
        <div>${moeda(item.total)}</div>
      </div>
    `).join("");
  }catch(erro){
    console.error(erro);
    alert("Não foi possível consultar o pedido agora.");
  }
}

window.onload=function(){
  const token=new URLSearchParams(location.search).get("token");
  if(token){
    document.getElementById("codigoPedido").value=token;
    consultarPedido();
  }
};

setInterval(()=>{
  const codigo=document.getElementById("codigoPedido")?.value.trim();
  if(codigo)consultarPedido();
},10000);
