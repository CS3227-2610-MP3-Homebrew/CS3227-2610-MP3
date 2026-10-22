-- OWN-06 sales and OWN-07 Prep source. Both are SECURITY INVOKER reads under
-- session-bound RLS; a sale is an own-cafe collected order dated by the
-- Singapore date of collected_at, measured from retained snapshots only.
create function private.sales_owner() returns public.profiles language plpgsql stable security definer set search_path='' as $$
declare actor public.profiles;
begin
  select * into actor from public.profiles where id=(select auth.uid()) and role='owner';
  if actor.id is null then raise insufficient_privilege using message='Owner access required'; end if;
  return actor;
end;
$$;
revoke all on function private.sales_owner() from public,anon,authenticated,service_role;
grant execute on function private.sales_owner() to authenticated;

-- Retained collected lines of one cafe within an inclusive business-date range.
create function private.sale_lines(cafe uuid,from_date date,through_date date)
returns table(order_id uuid,business_date date,collected_at timestamptz,total_cents bigint,item uuid,name text,quantity integer,line_total_cents bigint)
language sql stable security invoker set search_path='' as $$
  select o.id,(o.collected_at at time zone 'Asia/Singapore')::date,o.collected_at,o.total_cents,
    coalesce(i.item_ref,i.menu_item_id),i.name,i.quantity,i.line_total_cents
  from public.orders o left join public.order_items i on i.order_id=o.id
  where o.cafe_id=cafe and o.state='collected' and o.collected_at is not null
    and (o.collected_at at time zone 'Asia/Singapore')::date between from_date and through_date;
$$;
revoke all on function private.sale_lines(uuid,date,date) from public,anon,authenticated,service_role;
grant execute on function private.sale_lines(uuid,date,date) to authenticated;

create function public.owner_sales() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare actor public.profiles; cafe uuid; today date; daily jsonb; top jsonb; weekdays jsonb;
begin
  actor:=private.sales_owner();
  select c.id into cafe from public.cafes c where c.owner_id=actor.id and c.workspace_id=actor.workspace_id order by c.id limit 1;
  if cafe is null then return jsonb_build_object('sales',null); end if;
  today:=(statement_timestamp() at time zone 'Asia/Singapore')::date;
  with lines as (select * from private.sale_lines(cafe,today-27,today)),
  orders as (select distinct order_id,business_date,total_cents from lines)
  select jsonb_agg(jsonb_build_object('date',to_char(today-n,'YYYY-MM-DD'),
      'orderCount',(select count(*) from orders where business_date=today-n),
      'revenueCents',(select coalesce(sum(total_cents),0) from orders where business_date=today-n)) order by n),
    (select jsonb_agg(jsonb_build_object('weekday',w,
      'orderCount',(select count(*) from orders where extract(isodow from business_date)=w),
      'quantity',(select coalesce(sum(quantity),0) from lines where item is not null and extract(isodow from business_date)=w),
      'revenueCents',(select coalesce(sum(total_cents),0) from orders where extract(isodow from business_date)=w)) order by w) from generate_series(1,7) w)
    into daily,weekdays from generate_series(0,27) n;
  with grouped as (
    select item,sum(quantity) as quantity,sum(line_total_cents) as revenue,
      (array_agg(name order by collected_at desc,order_id desc))[1] as name
    from private.sale_lines(cafe,today-27,today) where item is not null group by item
  ), ranked as (
    select row_number() over(order by quantity desc,revenue desc,item::text collate "C") as rank,* from grouped
  ) select coalesce(jsonb_agg(jsonb_build_object('rank',rank,'itemId',item,'itemName',name,'quantity',quantity,'revenueCents',revenue) order by rank),'[]'::jsonb)
    into top from ranked where rank<=10;
  return jsonb_build_object('sales',jsonb_build_object('cafeId',cafe,'businessDate',to_char(today,'YYYY-MM-DD'),
    'period',jsonb_build_object('from',to_char(today-27,'YYYY-MM-DD'),'through',to_char(today,'YYYY-MM-DD')),'currency','SGD',
    'daily',daily,'topItems',top,'weekdays',weekdays));
end;
$$;

create function public.owner_prep_source(p_cafe_ref text) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare actor public.profiles; cafe uuid; today date; aggregates jsonb;
begin
  actor:=private.sales_owner();
  if p_cafe_ref is null or char_length(p_cafe_ref) not between 1 and 128 then return jsonb_build_object('error','NOT_FOUND'); end if;
  select c.id into cafe from public.cafes c where c.id::text=p_cafe_ref and c.owner_id=actor.id and c.workspace_id=actor.workspace_id;
  if cafe is null then return jsonb_build_object('error','NOT_FOUND'); end if;
  today:=(statement_timestamp() at time zone 'Asia/Singapore')::date;
  -- The 28 completed business dates before today; today's partial sales are excluded.
  if (select count(distinct business_date) from private.sale_lines(cafe,today-28,today-1)) < 7 then
    return jsonb_build_object('input',null);
  end if;
  with lines as (select * from private.sale_lines(cafe,today-28,today-1) where item is not null),
  candidates as (
    -- Only items still on the current menu; removed rows never become candidates.
    select l.item,m.name,sum(l.quantity) as quantity,sum(l.line_total_cents) as revenue
    from lines l join public.menu_items m on m.id=l.item and m.cafe_id=cafe
    group by l.item,m.name
  ), ranked as (
    select row_number() over(order by quantity desc,revenue desc,item::text collate "C") as rank,item,name from candidates
  )
  select jsonb_agg(jsonb_build_object('aggregateId',r.item::text||':'||w,'itemId',r.item,'itemName',r.name,'weekday',w,
      'quantity',(select coalesce(sum(l.quantity),0) from lines l where l.item=r.item and extract(isodow from l.business_date)=w)) order by r.rank,w)
    into aggregates from ranked r cross join generate_series(1,7) w where r.rank<=10;
  if aggregates is null then return jsonb_build_object('input',null); end if;
  return jsonb_build_object('input',jsonb_build_object('businessDate',to_char(today,'YYYY-MM-DD'),
    'period',jsonb_build_object('from',to_char(today-28,'YYYY-MM-DD'),'through',to_char(today-1,'YYYY-MM-DD')),'aggregates',aggregates));
end;
$$;
revoke all on function public.owner_sales(),public.owner_prep_source(text) from public,anon,authenticated,service_role;
grant execute on function public.owner_sales(),public.owner_prep_source(text) to authenticated;
