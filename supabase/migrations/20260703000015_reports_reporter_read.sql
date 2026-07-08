-- M8 fix: let a reporter read their OWN reports. Without a SELECT policy, the
-- `insert ... returning id` the submission path uses (to return report_id) is denied
-- by RLS (a RETURNING clause is subject to SELECT policies), so POST /reports failed.
-- This also lets a user see the reports they filed. Admin-read stays via the M8 policy.
create policy "user reads own reports" on public.reports
  for select to authenticated
  using (reporter_user_id = (select auth.uid()));
