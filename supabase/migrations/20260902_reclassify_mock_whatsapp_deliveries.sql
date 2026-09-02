-- Correct historical mock broadcasts that were previously counted as real sends.

update public.whatsapp_campaign_recipients
set status = 'skipped',
    last_error = 'Simulation only. No request was sent to Wasender.',
    sent_at = null
where status = 'sent'
  and provider_message_id like 'mock-%';

with campaign_totals as (
  select
    campaign_id,
    count(*) filter (where status = 'sent')::integer as sent_count,
    count(*) filter (
      where status = 'skipped' or (status = 'failed' and attempt_count >= 3)
    )::integer as failed_count,
    count(*) filter (
      where status in ('queued', 'sending') or (status = 'failed' and attempt_count < 3)
    )::integer as pending_count
  from public.whatsapp_campaign_recipients
  group by campaign_id
)
update public.whatsapp_campaigns as campaign
set sent_count = totals.sent_count,
    failed_count = totals.failed_count,
    status = case
      when totals.pending_count > 0 then campaign.status
      when totals.failed_count > 0 then 'completed_with_failures'
      else 'completed'
    end,
    completed_at = case
      when totals.pending_count = 0 then coalesce(campaign.completed_at, now())
      else campaign.completed_at
    end
from campaign_totals as totals
where campaign.id = totals.campaign_id
  and exists (
    select 1
    from public.whatsapp_campaign_recipients as recipient
    where recipient.campaign_id = campaign.id
      and recipient.provider_message_id like 'mock-%'
  );
