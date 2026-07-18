revoke all on function public.calculate_delivery_quote(uuid, uuid) from public, anon;
grant execute on function public.calculate_delivery_quote(uuid, uuid) to authenticated, service_role;

revoke all on function public.set_order_delivery_pricing() from public, anon, authenticated;
revoke all on function public.sync_delivery_order_chat() from public, anon, authenticated;
revoke all on function public.enforce_order_assignment_integrity() from public, anon, authenticated;

grant execute on function public.set_order_delivery_pricing() to service_role;
grant execute on function public.sync_delivery_order_chat() to service_role;
grant execute on function public.enforce_order_assignment_integrity() to service_role;
