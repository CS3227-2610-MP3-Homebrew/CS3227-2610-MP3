-- Additive public catalogue fields. Existing foundation fixtures retain valid defaults.
alter table public.cafes
  add column description text not null default '',
  add column area text not null default 'Central' check (area in ('Central','North','South','East','West')),
  add column pickup_address text not null default '';
alter table public.menu_items
  add column drink_type text not null default 'other' check (drink_type in ('coffee','matcha','tea','chocolate','juice','other')),
  add column price_cents integer not null default 100 check (price_cents between 1 and 1000000),
  add column sold_out boolean not null default false;
alter table public.opening_hours
  add column weekday integer not null default 1 check (weekday between 1 and 7),
  add column closes_at time without time zone not null default '17:00',
  add column closes_next_day boolean not null default false;

-- Reviews inherit their cafe from private orders. This narrow predicate avoids
-- granting Customers access to another customer's order or reviewer identity.
create function private.customer_review_at_cafe(review_ref uuid, cafe_ref uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.cafe_permission(cafe_ref,array['customer']::public.app_role[])
    and exists (select 1 from public.reviews r join public.orders o on o.id=r.order_id
      where r.id=review_ref and o.cafe_id=cafe_ref and r.moderation_state in ('pending','kept'));
$$;
revoke all on function private.customer_review_at_cafe(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function private.customer_review_at_cafe(uuid,uuid) to authenticated;

-- A single statement supplies a consistent current snapshot and database clock.
-- SECURITY INVOKER is intentional: every domain table retains session RLS.
create function public.customer_catalogue_source()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('now',statement_timestamp(),'cafes',coalesce(jsonb_agg(
    jsonb_build_object('cafeId',c.id,'name',c.name,'description',c.description,
      'area',c.area,'pickupAddress',c.pickup_address,
      'openingHours',coalesce((select jsonb_agg(jsonb_build_object(
        'weekday',h.weekday,'opensAt',to_char(h.opens_at,'HH24:MI'),
        'closesAt',to_char(h.closes_at,'HH24:MI'),'closesNextDay',h.closes_next_day))
        from public.opening_hours h where h.cafe_id=c.id),'[]'::jsonb),
      'menu',coalesce((select jsonb_agg(jsonb_build_object('itemId',m.id,'name',m.name,
        'drinkType',m.drink_type,'priceCents',m.price_cents,'soldOut',m.sold_out))
        from public.menu_items m where m.cafe_id=c.id),'[]'::jsonb),
      'reviews',coalesce((select jsonb_agg(jsonb_build_object('reviewId',r.id,
        'rating',r.rating,'text',r.text,'submittedAt',r.submitted_at,'authorLabel','Verified customer'))
        from public.reviews r where r.moderation_state in ('pending','kept')
          and private.customer_review_at_cafe(r.id,c.id)),'[]'::jsonb)
    )), '[]'::jsonb))
  from public.cafes c
  where private.cafe_permission(c.id,array['customer']::public.app_role[])
    and c.application_state='approved' and not c.suspended;
$$;
revoke all on function public.customer_catalogue_source() from public,anon,authenticated,service_role;
grant execute on function public.customer_catalogue_source() to authenticated;
