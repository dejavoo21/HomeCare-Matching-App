INSERT INTO client_authorizations
  (
    client_id,
    service_type,
    authorized_from,
    authorized_to,
    remaining_visits,
    status,
    payer_name,
    created_at,
    updated_at
  )
VALUES
  (
    '00000000-0000-0000-0000-000000000004',
    'MEDICATION_ADMIN',
    now() - interval '10 days',
    now() + interval '10 days',
    4,
    'active',
    'BlueCross',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'WOUND_CARE',
    now() - interval '20 days',
    now() + interval '1 day',
    1,
    'active',
    'Discovery Health',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'PHYSICIAN_VISIT',
    now() - interval '30 days',
    now() - interval '1 day',
    0,
    'expired',
    'Momentum',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'VITALS_MONITORING',
    now() - interval '5 days',
    now() + interval '20 days',
    8,
    'active',
    'Private Pay',
    now(),
    now()
  )
ON CONFLICT DO NOTHING;
