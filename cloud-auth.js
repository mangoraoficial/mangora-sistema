const SESSION_KEY="mangora_supabase_session";

function salvarSessao(sessao){
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessao));
}

function lerSessao(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY))||null;}catch(e){return null;}
}

function limparSessao(){
  localStorage.removeItem(SESSION_KEY);
}

async function requisicaoAuth(caminho, opcoes={}){
  const resposta=await fetch(`${MANGORA_CLOUD.url}/auth/v1/${caminho}`,{
    ...opcoes,
    headers:{
      "apikey":MANGORA_CLOUD.publishableKey,
      "Content-Type":"application/json",
      ...(opcoes.headers||{})
    }
  });
  const dados=await resposta.json().catch(()=>({}));
  if(!resposta.ok){
    throw new Error(dados.msg || dados.error_description || dados.message || "Falha de autenticação.");
  }
  return dados;
}

async function loginMangora(email,senha){
  const sessao=await requisicaoAuth("token?grant_type=password",{
    method:"POST",
    body:JSON.stringify({email, password:senha})
  });
  salvarSessao(sessao);
  return sessao;
}

async function renovarSessao(){
  const atual=lerSessao();
  if(!atual?.refresh_token) return null;

  try{
    const nova=await requisicaoAuth("token?grant_type=refresh_token",{
      method:"POST",
      body:JSON.stringify({refresh_token:atual.refresh_token})
    });
    salvarSessao(nova);
    return nova;
  }catch(e){
    limparSessao();
    return null;
  }
}

async function obterSessaoValida(){
  const sessao=lerSessao();
  if(!sessao?.access_token) return null;

  const expira=Number(sessao.expires_at||0)*1000;
  if(expira && Date.now() > expira-60000){
    return await renovarSessao();
  }
  return sessao;
}

async function exigirLoginMangora(){
  const sessao=await obterSessaoValida();
  if(!sessao){
    location.replace("login.html");
    return null;
  }
  return sessao;
}

async function sairMangora(){
  const sessao=lerSessao();
  try{
    if(sessao?.access_token){
      await fetch(`${MANGORA_CLOUD.url}/auth/v1/logout`,{
        method:"POST",
        headers:{
          "apikey":MANGORA_CLOUD.publishableKey,
          "Authorization":`Bearer ${sessao.access_token}`
        }
      });
    }
  }catch(e){}
  limparSessao();
  location.replace("login.html");
}
