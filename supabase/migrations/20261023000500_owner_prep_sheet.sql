-- OWN-09 prep sheet: a SECURITY INVOKER read under session-bound RLS of the
-- owner's accepted orders whose Singapore pickup date is today. Read-only.
create function private.prep_lines(cafe uuid,today date)
returns table(order_id uuid,placed_at timestamptz,item uuid,name text,quantity integer)
language sql stable security invoker set search_path='' as $$
  select o.id,o.placed_at,coalesce(i.item_ref,i.menu_item_id),i.name,i.quantity
  from public.orders o join public.order_items i on i.order_id=o.id
  where o.cafe_id=cafe and o.state='accepted' and (o.pickup_at at time zone 'Asia/Singapore')::date=today;
$$;
revoke all on function private.prep_lines(uuid,date) from public,anon,authenticated,service_role;
grant execute on function private.prep_lines(uuid,date) to authenticated;

create function public.owner_prep_sheet() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare actor public.profiles; cafe uuid; today date; items jsonb; orders jsonb; pending bigint;
begin
  actor:=private.sales_owner();
  select c.id into cafe from public.cafes c where c.owner_id=actor.id and c.workspace_id=actor.workspace_id order by c.id limit 1;
  if cafe is null then return jsonb_build_object('prepSheet',null); end if;
  today:=(statement_timestamp() at time zone 'Asia/Singapore')::date;
  -- Name from the most recently placed included order; code-point (C) ordering throughout.
  with grouped as (
    select item,sum(quantity) as quantity,count(distinct order_id) as order_count,
      (array_agg(name order by placed_at desc,order_id::text collate "C" desc))[1] as name
    from private.prep_lines(cafe,today) where item is not null group by item
  ) select coalesce(jsonb_agg(jsonb_build_object('itemId',item,'itemName',name,'quantity',quantity,'orderCount',order_count)
      order by quantity desc,name collate "C",item::text collate "C"),'[]'::jsonb) into items from grouped;
  select coalesce(jsonb_agg(jsonb_build_object('orderId',o.id,
      'pickupAt',to_char(o.pickup_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'customerName',o.customer_name,
      'items',(select coalesce(jsonb_agg(jsonb_build_object('itemId',l.item,'name',l.name,'quantity',l.quantity)
        order by l.item::text collate "C"),'[]'::jsonb) from private.prep_lines(cafe,today) l where l.order_id=o.id and l.item is not null))
      order by o.pickup_at,o.placed_at,o.id::text collate "C"),'[]'::jsonb) into orders
    from public.orders o where o.cafe_id=cafe and o.state='accepted' and (o.pickup_at at time zone 'Asia/Singapore')::date=today;
  select count(*) into pending from public.orders o
    where o.cafe_id=cafe and o.state='pending' and (o.pickup_at at time zone 'Asia/Singapore')::date=today;
  return jsonb_build_object('prepSheet',jsonb_build_object('businessDate',to_char(today,'YYYY-MM-DD'),
    'generatedAt',to_char(statement_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'items',items,'orders',orders,'pendingTodayCount',pending));
end;
$$;
revoke all on function public.owner_prep_sheet() from public,anon,authenticated,service_role;
grant execute on function public.owner_prep_sheet() to authenticated;
