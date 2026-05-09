-- Migration 005: event log + system health metrics

create table if not exists system_events (
  id           bigserial primary key,
  event_type   text not null,
  entity_type  text,
  entity_id    text,
  payload      jsonb not null,
  source       text,
  occurred_at  timestamptz default now()
);

create index if not exists system_events_type_time_idx on system_events (event_type, occurred_at desc);
create index if not exists system_events_entity_idx on system_events (entity_type, entity_id, occurred_at desc);
create index if not exists system_events_recent_idx on system_events (occurred_at desc);

create table if not exists system_health_metrics (
  id              bigserial primary key,
  metric_name     text not null,
  metric_value    numeric not null,
  dimensions      jsonb,
  recorded_at     timestamptz default now()
);

create index if not exists system_health_metrics_lookup
  on system_health_metrics (metric_name, recorded_at desc);
create index if not exists system_health_metrics_recent_idx
  on system_health_metrics (recorded_at desc);
