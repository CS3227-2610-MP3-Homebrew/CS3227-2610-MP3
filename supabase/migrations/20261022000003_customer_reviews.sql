-- Own-review projection retains hidden content without exposing author identity.
create function private.own_review_json(r public.reviews) returns jsonb
language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('reviewId',r.id,'orderId',r.order_id,'rating',r.rating,
    'text',r.text,'submittedAt',r.submitted_at,'moderationState',r.moderation_state);
$$;
revoke all on function private.own_review_json(public.reviews) from public,anon,authenticated,service_role;
grant execute on function private.own_review_json(public.reviews) to authenticated;

-- Ordinary reads use caller RLS, including retained orders at suspended cafes.
create function public.customer_own_review(p_order_ref text) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare actor public.profiles; target public.reviews;
begin
  actor:=private.order_customer();
  if p_order_ref is null or char_length(p_order_ref) not between 1 and 128 then return jsonb_build_object('error','INVALID_REQUEST'); end if;
  select r.* into target from public.reviews r join public.orders o on o.id=r.order_id
    where o.id::text=p_order_ref and o.customer_id=actor.id and r.customer_id=actor.id;
  if target.id is null then return jsonb_build_object('error','NOT_FOUND'); end if;
  return jsonb_build_object('review',private.own_review_json(target));
end;
$$;

-- No raw review write privileges. Direct RPC callers get the same strict fields,
-- current protected role, workspace, collected state and one-review boundary.
create function public.create_customer_review(p_order_ref text,p_review jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; purchase public.orders; cafe uuid; created public.reviews;
begin
  actor:=private.order_customer();
  if p_order_ref is null or char_length(p_order_ref) not between 1 and 128
    or jsonb_typeof(p_review) is distinct from 'object' then return jsonb_build_object('error','INVALID_REQUEST'); end if;
  if not(p_review ?& array['rating','text']) or (p_review-array['rating','text'])<>'{}'::jsonb
    or jsonb_typeof(p_review->'rating') is distinct from 'number'
    or jsonb_typeof(p_review->'text') is distinct from 'string' then return jsonb_build_object('error','INVALID_REQUEST'); end if;
  if (p_review->>'rating')::numeric not between 1 and 5 or mod((p_review->>'rating')::numeric,1)<>0
    or char_length(p_review->>'text') not between 1 and 1000 or not private.moderation_nonblank(p_review->>'text') then
    return jsonb_build_object('error','INVALID_REQUEST');
  end if;
  select o.cafe_id into cafe from public.orders o join public.cafes c on c.id=o.cafe_id
    where o.id::text=p_order_ref and o.customer_id=actor.id and c.workspace_id=actor.workspace_id;
  if cafe is null then return jsonb_build_object('error','NOT_FOUND'); end if;
  -- Follow the existing cafe-before-order lock order. Suspension may serialize
  -- here but never removes a collected purchase's review eligibility.
  perform id from public.cafes where id=cafe and workspace_id=actor.workspace_id for share;
  if not found then return jsonb_build_object('error','NOT_FOUND'); end if;
  select * into purchase from public.orders where id::text=p_order_ref and cafe_id=cafe and customer_id=actor.id for update;
  if purchase.id is null then return jsonb_build_object('error','NOT_FOUND'); end if;
  perform id from public.profiles where id=actor.id and role='customer' and workspace_id=actor.workspace_id for share;
  if not found then raise insufficient_privilege using message='Customer access required'; end if;
  if purchase.state<>'collected' or exists(select 1 from public.reviews where order_id=purchase.id) then
    return jsonb_build_object('error','STATE_CONFLICT');
  end if;
  -- The existing unique order FK and immutable-content trigger remain intact.
  -- No conflict-upsert or customer-supplied author/moderation data is accepted.
  insert into public.reviews(order_id,customer_id,rating,text,moderation_state,submitted_at)
    values(purchase.id,actor.id,(p_review->>'rating')::numeric::integer,p_review->>'text','pending',clock_timestamp()) returning * into created;
  return jsonb_build_object('review',private.own_review_json(created));
end;
$$;
revoke all on function public.customer_own_review(text),public.create_customer_review(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.customer_own_review(text),public.create_customer_review(text,jsonb) to authenticated;
