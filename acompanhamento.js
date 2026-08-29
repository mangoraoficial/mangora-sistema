// ==========================================================
// MANGORA - ACOMPANHAMENTO
// ==========================================================

function lerPedidos(){
  try{
    return JSON.parse(localStorage.getItem("mangora_pedidos")) || [];
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

function statusTexto(status){
  switch(status){
    case "Recebido":
      return "🟢 Pedido recebido";
    case "Em preparo":
      return "🟡 Seu pedido está sendo preparado";
    case "Saiu para entrega":
      return "🚚 Seu pedido saiu para entrega";
    case "Finalizado":
      return "✅ Pedido finalizado";
    default:
      return status || "Status não informado";
  }
}

function consultarPedido(){
  const codigo = document.getElementById("codigoPedido").value.trim();

  if(!codigo){
    alert("Digite o número do pedido.");
    return;
  }

  const pedidos = lerPedidos();
  const pedido = pedidos.find(p => String(p.id) === String(codigo));

  if(!pedido){
    alert("Pedido não encontrado.");
    document.getElementById("resultado").style.display = "none";
    return;
  }

  document.getElementById("resultado").style.display = "block";
  document.getElementById("numeroResultado").textContent = `Pedido Nº ${pedido.id}`;
  document.getElementById("clienteResultado").textContent = `Cliente: ${pedido.cliente}`;
  document.getElementById("statusResultado").textContent = statusTexto(pedido.status);
  document.getElementById("dataResultado").textContent = `Realizado em: ${pedido.data}`;

  const itens = Array.isArray(pedido.itens) ? pedido.itens : [];

  document.getElementById("itensResultado").innerHTML = itens.length
    ? itens.map(item => `
        <div class="item-carrinho">
          <strong>${Number(item.quantidade || 1)}x ${item.nome}</strong>
          <div>${moeda(item.total)}</div>
        </div>
      `).join("")
    : "";
}

window.onload = function(){
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if(id){
    document.getElementById("codigoPedido").value = id;
    consultarPedido();
  }
};

window.addEventListener("focus", function(){
  const codigo = document.getElementById("codigoPedido").value.trim();
  if(codigo) consultarPedido();
});

window.addEventListener("storage", function(){
  const codigo = document.getElementById("codigoPedido").value.trim();
  if(codigo) consultarPedido();
});
