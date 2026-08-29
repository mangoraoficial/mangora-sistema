-- =====================================================
-- MANGORA V18 CLOUD - ETAPA 2
-- Pedidos online + rastreio seguro + numeração central
-- Execute uma única vez no SQL Editor do Supabase.
-- =====================================================

create sequence if not exists public.mangora_numero_pedido_seq start 1;

alter table public.pedidos
  add column if not exists tracking_token uuid not null default gen_random_uuid();

create unique index if not exists idx_pedidos_tracking_token
on public.pedidos(tracking_token);

create or replace function public.criar_pedido_publico(
  p_pedido jsonb,
  p_itens jsonb
)
returns table (
  pedido_id bigint,
  numero_pedido bigint,
  tracking_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_numero bigint;
  v_token uuid;
  v_item jsonb;
  v_cliente text;
  v_total numeric(10,2);
  v_tipo text;
  v_origem text;
begin
  v_cliente := nullif(trim(coalesce(p_pedido->>'cliente_nome','')), '');
  v_total := coalesce((p_pedido->>'total')::numeric, 0);
  v_tipo := coalesce(nullif(p_pedido->>'tipo_atendimento',''),'Delivery');
  v_origem := coalesce(nullif(p_pedido->>'origem',''),'Cliente');

  if v_cliente is null then
    raise exception 'Nome do cliente é obrigatório';
  end if;

  if v_total <= 0 then
    raise exception 'Total do pedido deve ser maior que zero';
  end if;

  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Pedido sem itens';
  end if;

  if v_tipo not in ('Delivery','Mesa/Comanda') then
    v_tipo := 'Delivery';
  end if;

  if v_origem not in ('Cliente','Pedido Manual') then
    v_origem := 'Cliente';
  end if;

  v_numero := nextval('public.mangora_numero_pedido_seq');
  v_token := gen_random_uuid();

  insert into public.pedidos (
    numero_pedido, cliente_nome, telefone, endereco,
    tipo_atendimento, comanda, pagamento, observacao,
    status, origem, total, tracking_token
  )
  values (
    v_numero,
    v_cliente,
    nullif(trim(coalesce(p_pedido->>'telefone','')), ''),
    nullif(trim(coalesce(p_pedido->>'endereco','')), ''),
    v_tipo,
    nullif(trim(coalesce(p_pedido->>'comanda','')), ''),
    nullif(trim(coalesce(p_pedido->>'pagamento','')), ''),
    nullif(trim(coalesce(p_pedido->>'observacao','')), ''),
    'Recebido',
    v_origem,
    v_total,
    v_token
  )
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    if coalesce((v_item->>'total')::numeric,0) <= 0 then
      raise exception 'Item sem preço válido';
    end if;

    insert into public.itens_pedido (
      pedido_id, nome, receita_id, tamanho, detalhes,
      preco, quantidade, total, personalizado, alacarte
    )
    values (
      v_id,
      coalesce(nullif(v_item->>'nome',''),'Item'),
      nullif(v_item->>'receita_id',''),
      nullif(v_item->>'tamanho',''),
      nullif(v_item->>'detalhes',''),
      coalesce((v_item->>'preco')::numeric,0),
      greatest(coalesce((v_item->>'quantidade')::integer,1),1),
      coalesce((v_item->>'total')::numeric,0),
      coalesce((v_item->>'personalizado')::boolean,false),
      coalesce((v_item->>'alacarte')::boolean,false)
    );
  end loop;

  return query select v_id, v_numero, v_token;
end;
$$;

revoke all on function public.criar_pedido_publico(jsonb,jsonb) from public;
grant execute on function public.criar_pedido_publico(jsonb,jsonb) to anon, authenticated;

create or replace function public.acompanhar_pedido_publico(
  p_token uuid
)
returns table (
  numero_pedido bigint,
  cliente_nome text,
  status text,
  criado_em timestamptz,
  itens jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    p.numero_pedido,
    p.cliente_nome,
    p.status,
    p.criado_em,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'nome', i.nome,
          'quantidade', i.quantidade,
          'total', i.total
        )
        order by i.id
      ) filter (where i.id is not null),
      '[]'::jsonb
    ) as itens
  from public.pedidos p
  left join public.itens_pedido i on i.pedido_id = p.id
  where p.tracking_token = p_token
  group by p.id;
$$;

revoke all on function public.acompanhar_pedido_publico(uuid) from public;
grant execute on function public.acompanhar_pedido_publico(uuid) to anon, authenticated;
