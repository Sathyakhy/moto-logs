alter table public.maintenance_records 
drop column total_cost;

alter table public.maintenance_records 
add column total_cost numeric default 0;

grant select, insert, update, delete on public.maintenance_records to authenticated;
grant all on public.maintenance_records to service_role;
grant select on public.maintenance_records to anon;