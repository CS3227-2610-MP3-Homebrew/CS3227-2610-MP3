-- Filter authorized history before pagination; preserve the existing unfiltered RPC.
create function public.customer_order_history_filtered(p_page bigint, p_view text) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare actor public.profiles; result jsonb;
begin
  actor := private.order_customer();
  if p_page is null or p_page < 1 or p_page > 9007199254740991
    or p_view is null or p_view not in ('active','past') then
    return jsonb_build_object('error','INVALID_REQUEST');
  end if;
  select coalesce(jsonb_agg(private.order_json(t.o) order by t.placed_at desc,t.id),'[]'::jsonb)
    into result from (
      select target as o,target.placed_at,target.id from public.orders target
      where target.customer_id=actor.id
        and ((p_view='active' and target.state in ('pending','accepted','ready'))
          or (p_view='past' and target.state in ('collected','rejected','cancelled')))
      order by target.placed_at desc,target.id limit 21
      offset least((p_page::numeric-1)*20,9223372036854775807)::bigint
    ) t;
  return jsonb_build_object('items',result);
end;
$$;
revoke all on function public.customer_order_history_filtered(bigint,text) from public,anon,authenticated,service_role;
grant execute on function public.customer_order_history_filtered(bigint,text) to authenticated;
