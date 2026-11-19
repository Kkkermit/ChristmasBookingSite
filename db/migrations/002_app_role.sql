-- Least-privilege login role for the app. Run once, replacing the password:
--
--   create role xmas_app with login password '<long random password>';
--
-- (Kept out of migration history on purpose so the password isn't stored there.)
-- Then grant it access to the xmas schema only:

grant usage on schema xmas to xmas_app;
grant select, insert, update, delete on xmas.orders, xmas.booking_details, xmas.rate_limits to xmas_app;

drop policy if exists app_all on xmas.orders;
drop policy if exists app_all on xmas.booking_details;
drop policy if exists app_all on xmas.rate_limits;
create policy app_all on xmas.orders for all to xmas_app using (true) with check (true);
create policy app_all on xmas.booking_details for all to xmas_app using (true) with check (true);
create policy app_all on xmas.rate_limits for all to xmas_app using (true) with check (true);

-- Connection string for Vercel (Supavisor transaction pooler, IPv4-friendly):
--   postgres://xmas_app.<project-ref>:<password>@aws-<n>-<region>.pooler.supabase.com:6543/postgres
