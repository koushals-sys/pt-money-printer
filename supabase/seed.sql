-- ============================================================
-- Seed data – mirrors data/dummyData.ts
-- Safe to run multiple times (ON CONFLICT DO NOTHING).
-- ============================================================

-- Fixed UUIDs so the seed is idempotent and cross-referencing is stable.
-- clinic-001 = Sunrise PT & Rehab (Austin TX)

INSERT INTO public.clinic_profiles (
  id,
  name, address, city, state, zip,
  npi_number, nps_score,
  injury_types, insurances_accepted,
  avg_recovery_days
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Sunrise PT & Rehab',
  '4201 S Congress Ave', 'Austin', 'TX', '78745',
  '1304857291', 72,
  ARRAY['ACL Tear', 'Rotator Cuff', 'Lower Back Pain', 'Hip Replacement', 'Sports Injuries'],
  ARRAY['Aetna', 'Blue Cross Blue Shield', 'UnitedHealthcare', 'Medicare', 'Cigna'],
  28
) ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- Organizations (12 US-based referring practices)
-- All belong to clinic-001.
-- ============================================================

INSERT INTO public.organizations (
  id, clinic_id,
  name, type, address, city, state, zip,
  phone, fax, email, npi_number,
  distance_miles, is_on_spry, referral_status, last_contacted_at
) VALUES

-- org-001 Austin Orthopedic Group (established)
(
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Austin Orthopedic Group', 'ortho',
  '3801 N Lamar Blvd', 'Austin', 'TX', '78756',
  '(512) 476-2830', '(512) 476-2831', 'referrals@austinortho.com', '1234567890',
  2.4, true, 'established', '2026-04-10 00:00:00+00'
),

-- org-002 Denver Primary Care Associates (follow_up)
(
  '00000000-0000-0000-0001-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Denver Primary Care Associates', 'primary_care',
  '1600 Glenarm Pl', 'Denver', 'CO', '80202',
  '(303) 595-1200', '(303) 595-1201', 'info@denverpca.com', '1987654321',
  847, false, 'follow_up', '2026-04-18 00:00:00+00'
),

-- org-003 Rush University Medical Center (established)
(
  '00000000-0000-0000-0001-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Rush University Medical Center', 'hospital',
  '1620 W Harrison St', 'Chicago', 'IL', '60612',
  '(312) 942-5000', '(312) 942-5001', 'pt-referrals@rush.edu', '1357924680',
  1200, true, 'established', '2026-03-28 00:00:00+00'
),

-- org-004 Boston Sports Medicine (contacted)
(
  '00000000-0000-0000-0001-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'Boston Sports Medicine', 'sports',
  '100 Cambridge St', 'Boston', 'MA', '02114',
  '(617) 726-8500', '(617) 726-8501', 'intake@bostonsportsmed.com', '1472583690',
  1750, false, 'contacted', '2026-04-20 00:00:00+00'
),

-- org-005 Seattle Orthopedic Specialists (not_contacted)
(
  '00000000-0000-0000-0001-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'Seattle Orthopedic Specialists', 'ortho',
  '325 9th Ave', 'Seattle', 'WA', '98104',
  '(206) 744-3000', '(206) 744-3001', 'referrals@seattleortho.com', '1593726481',
  2100, false, 'not_contacted', NULL
),

-- org-006 Emory Orthopedics & Spine (established)
(
  '00000000-0000-0000-0001-000000000006',
  '00000000-0000-0000-0000-000000000001',
  'Emory Orthopedics & Spine', 'ortho',
  '59 Executive Park S NE', 'Atlanta', 'GA', '30329',
  '(404) 778-3350', '(404) 778-3351', 'ortho.referrals@emory.edu', '1684837592',
  920, true, 'established', '2026-04-05 00:00:00+00'
),

-- org-007 Phoenix Family Medicine Center (not_contacted)
(
  '00000000-0000-0000-0001-000000000007',
  '00000000-0000-0000-0000-000000000001',
  'Phoenix Family Medicine Center', 'primary_care',
  '2502 E Thomas Rd', 'Phoenix', 'AZ', '85016',
  '(602) 274-8300', '(602) 274-8301', 'intake@phoenixfmc.com', '1775948603',
  868, false, 'not_contacted', NULL
),

-- org-008 Vanderbilt Orthopedics Nashville (follow_up)
(
  '00000000-0000-0000-0001-000000000008',
  '00000000-0000-0000-0000-000000000001',
  'Vanderbilt Orthopedics Nashville', 'ortho',
  '1215 21st Ave S', 'Nashville', 'TN', '37232',
  '(615) 322-4683', '(615) 322-4684', 'ortho@vumc.org', '1866059714',
  1050, true, 'follow_up', '2026-04-22 00:00:00+00'
),

-- org-009 Portland Sports & Spine Clinic (contacted)
(
  '00000000-0000-0000-0001-000000000009',
  '00000000-0000-0000-0000-000000000001',
  'Portland Sports & Spine Clinic', 'sports',
  '3181 SW Sam Jackson Park Rd', 'Portland', 'OR', '97239',
  '(503) 494-8311', '(503) 494-8312', 'referrals@pdxsportspt.com', '1957160825',
  1900, false, 'contacted', '2026-04-14 00:00:00+00'
),

-- org-010 Miami Sports Medicine & Rehab (not_contacted)
(
  '00000000-0000-0000-0001-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Miami Sports Medicine & Rehab', 'sports',
  '1611 NW 12th Ave', 'Miami', 'FL', '33136',
  '(305) 575-7000', '(305) 575-7001', 'sports@miamirehab.com', '1048271936',
  1300, false, 'not_contacted', NULL
),

-- org-011 UT Southwestern Medical Center (established)
(
  '00000000-0000-0000-0001-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'UT Southwestern Medical Center', 'hospital',
  '5323 Harry Hines Blvd', 'Dallas', 'TX', '75390',
  '(214) 648-3111', '(214) 648-3112', 'pt.referrals@utsouthwestern.edu', '1139382047',
  195, true, 'established', '2026-04-01 00:00:00+00'
),

-- org-012 University of Minnesota Medical School (contacted)
(
  '00000000-0000-0000-0001-000000000012',
  '00000000-0000-0000-0000-000000000001',
  'University of Minnesota Medical School', 'school',
  '420 Delaware St SE', 'Minneapolis', 'MN', '55455',
  '(612) 624-5500', '(612) 624-5501', 'clinicalpartners@umn.edu', '1220493158',
  1400, false, 'contacted', '2026-04-17 00:00:00+00'
)

ON CONFLICT (id) DO NOTHING;
