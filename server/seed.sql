-- ===== SPACE LINK CRM — SEED DATA =====

-- Users
INSERT INTO users (id, name, role, phone, email, password_hash, active) VALUES
  ('user_admin',     'Rajesh Kumar',   'admin',        '9876543210', 'rajesh@spacelink.in',  'admin123', TRUE),
  ('user_sales1',    'Priya Sharma',   'sales',        '9876543211', 'priya@spacelink.in',   'sales123', TRUE),
  ('user_sales2',    'Amit Patel',     'sales',        '9876543212', 'amit@spacelink.in',    'sales123', TRUE),
  ('user_sales3',    'Kavitha Reddy',  'sales',        '9876543215', 'kavitha@spacelink.in', 'sales123', TRUE),
  ('user_reception', 'Meena Desai',    'receptionist', '9876543213', 'meena@spacelink.in',   'front123', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Sources
INSERT INTO sources (id, source_name, is_custom) VALUES
  ('src_walkin',    'Walk-In',         FALSE),
  ('src_reference', 'Reference',       FALSE),
  ('src_online',    'Online Enquiry',  FALSE),
  ('src_social',    'Social Media',    FALSE),
  ('src_other',     'Other',           FALSE)
ON CONFLICT (id) DO NOTHING;

-- Leads
INSERT INTO leads (id, lead_name, phone, alternate_phone, email, source_id, custom_source, assigned_to, attended_by, budget, preferred_location, property_type, bhk, notes, referrer_name, referrer_phone, status, created_by, created_at, updated_at) VALUES
  ('lead_001', 'Suresh Menon',    '9988776655', '9988776644', 'suresh.menon@gmail.com', 'src_walkin',    '', 'user_sales1', 'user_sales1', '1.5 Cr', 'Level Up Tower',                    '3 BHK Apartment', '3 BHK', 'Looking for high floor with city view. Interested in south-facing units.', '', '',               'interested',  'user_reception', '2026-05-10T10:30:00.000Z', '2026-05-11T14:00:00.000Z'),
  ('lead_002', 'Anita Gupta',     '9876501234', '',           'anita.g@yahoo.com',      'src_reference', '', 'user_sales2', 'user_sales2', '2 Cr',   'Level Up Tower - Premium Floors',   'Penthouse',       '4 BHK', 'Referred by Mr. Kapoor. Wants penthouse with terrace garden.',            'Vikram Kapoor', '9876500001', 'negotiation', 'user_sales2',    '2026-05-08T11:00:00.000Z', '2026-05-12T09:30:00.000Z'),
  ('lead_003', 'Mohammed Rafi',   '9123456780', '9123456781', '',                       'src_walkin',    '', 'user_sales1', 'user_reception', '1.2 Cr', 'Level Up Tower',                  '3 BHK Apartment', '3 BHK', 'First time visitor. Interested but needs time to decide.',                '', '',               'visited',     'user_reception', '2026-05-12T09:00:00.000Z', '2026-05-12T09:45:00.000Z'),
  ('lead_004', 'Lakshmi Narayan', '9555443322', '',           'lakshmi.n@hotmail.com',  'src_social',    '', 'user_sales3', '',              '1.8 Cr', 'Level Up Tower',                    '3 BHK Apartment', '3 BHK', 'Enquired via Instagram. Schedule site visit.',                            '', '',               'contacted',   'user_sales3',    '2026-05-11T16:00:00.000Z', '2026-05-11T16:30:00.000Z'),
  ('lead_005', 'Deepak Joshi',    '9444332211', '',           'deepak.j@gmail.com',     'src_walkin',    '', 'user_sales2', 'user_sales2', '1.6 Cr', 'Level Up Tower',                    '3 BHK Apartment', '3 BHK', 'Walk-in today. Very interested, wants to revisit with family.',           '', '',               'followup',    'user_reception', '2026-05-12T11:00:00.000Z', '2026-05-12T11:45:00.000Z'),
  ('lead_006', 'Sunita Kapoor',   '9777888999', '',           'sunita.k@gmail.com',     'src_online',    '', 'user_sales1', '',              '2.5 Cr', 'Level Up Tower - High Floor',       'Duplex',          '4 BHK', 'Filled online form. Premium budget client.',                              '', '',               'new',         'user_admin',     '2026-05-12T14:00:00.000Z', '2026-05-12T14:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

-- Visits
INSERT INTO visits (id, lead_id, visit_date, visit_time, site_location, notes, created_by, created_at) VALUES
  ('visit_001', 'lead_001', '2026-05-10', '10:30', 'Level Up Tower - Main Site',      'Client visited sample flat on 15th floor. Liked the view and layout.',              'user_sales1',    '2026-05-10T10:30:00.000Z'),
  ('visit_002', 'lead_001', '2026-05-11', '14:00', 'Level Up Tower - Main Site',      'Second visit with spouse. Showed 22nd floor unit. Very positive response.',          'user_sales1',    '2026-05-11T14:00:00.000Z'),
  ('visit_003', 'lead_002', '2026-05-09', '11:00', 'Level Up Tower - Penthouse Floor', 'Showed penthouse options. Client interested in the terrace layout.',                'user_sales2',    '2026-05-09T11:00:00.000Z'),
  ('visit_004', 'lead_003', '2026-05-12', '09:00', 'Level Up Tower - Main Site',      'Walk-in visitor. Toured the amenities area and sample flat.',                        'user_reception', '2026-05-12T09:00:00.000Z'),
  ('visit_005', 'lead_005', '2026-05-12', '11:00', 'Level Up Tower - Main Site',      'First visit. Showed swimming pool area and 18th floor unit.',                        'user_sales2',    '2026-05-12T11:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

-- Activities
INSERT INTO activities (id, lead_id, activity_type, description, performed_by, created_at) VALUES
  ('act_001', 'lead_001', 'created',       'Lead created via walk-in',                         'user_reception', '2026-05-10T10:30:00.000Z'),
  ('act_002', 'lead_001', 'visit_logged',  'Site visit logged at Level Up Tower',               'user_sales1',    '2026-05-10T10:30:00.000Z'),
  ('act_003', 'lead_001', 'status_change', 'Status changed from New to Visited',               'user_sales1',    '2026-05-10T11:00:00.000Z'),
  ('act_004', 'lead_001', 'status_change', 'Status changed from Visited to Interested',        'user_sales1',    '2026-05-11T14:30:00.000Z'),
  ('act_005', 'lead_002', 'created',       'Lead created via reference from Vikram Kapoor',     'user_sales2',    '2026-05-08T11:00:00.000Z'),
  ('act_006', 'lead_002', 'status_change', 'Status changed from New to Negotiation',           'user_sales2',    '2026-05-12T09:30:00.000Z'),
  ('act_007', 'lead_003', 'created',       'Walk-in lead created',                             'user_reception', '2026-05-12T09:00:00.000Z'),
  ('act_008', 'lead_005', 'created',       'Walk-in lead created',                             'user_reception', '2026-05-12T11:00:00.000Z'),
  ('act_009', 'lead_006', 'created',       'Lead created from online enquiry',                 'user_admin',     '2026-05-12T14:00:00.000Z')
ON CONFLICT (id) DO NOTHING;
