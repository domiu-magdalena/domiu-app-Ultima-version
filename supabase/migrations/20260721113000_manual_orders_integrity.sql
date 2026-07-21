-- Final integrity checks for manual orders.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_manual_amount_paid_check'
  ) then
    alter table public.orders
      add constraint orders_manual_amount_paid_check
      check (amount_paid >= 0 and amount_paid <= total_amount);
  end if;
end;
$$;

revoke all on function public.confirm_manual_order(uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.confirm_manual_order(uuid,jsonb,text) to service_role;
