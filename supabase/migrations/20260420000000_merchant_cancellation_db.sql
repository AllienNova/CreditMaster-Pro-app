-- Merchant cancellation database and detection patterns
-- Wave 1: Subscription Cancellation Service - Merchant Database

CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  category TEXT NOT NULL,
  logo_url TEXT,
  cancellation_methods TEXT[] NOT NULL DEFAULT '{}',
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  estimated_time_minutes INTEGER DEFAULT 10,
  phone_number TEXT,
  email TEXT,
  website_url TEXT,
  chat_url TEXT,
  in_app_cancellation BOOLEAN DEFAULT false,
  retention_offers_likely BOOLEAN DEFAULT false,
  retention_notes TEXT,
  script_template TEXT,
  tips TEXT[] DEFAULT '{}',
  community_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE merchant_detection_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('domain', 'name_exact', 'name_contains')),
  pattern_value TEXT NOT NULL,
  confidence_boost INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_merchants_name ON merchants(name);
CREATE INDEX idx_merchants_category ON merchants(category);
CREATE INDEX idx_merchants_domain ON merchants(domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_merchant_patterns_merchant ON merchant_detection_patterns(merchant_id);
CREATE INDEX idx_merchant_patterns_type_value ON merchant_detection_patterns(pattern_type, pattern_value);

-- ============================================================================
-- Seed: Streaming
-- ============================================================================

INSERT INTO merchants (name, domain, category, cancellation_methods, difficulty, estimated_time_minutes, website_url, in_app_cancellation, retention_offers_likely, retention_notes, tips, community_verified) VALUES
(
  'Netflix',
  'netflix.com',
  'streaming',
  ARRAY['website', 'in_app'],
  'easy',
  2,
  'https://www.netflix.com/cancelplan',
  true,
  false,
  NULL,
  ARRAY[
    'Cancel from Account > Membership > Cancel Membership',
    'Access continues until end of current billing period',
    'Your profile and watch history are saved for 10 months'
  ],
  true
),
(
  'Spotify',
  'spotify.com',
  'streaming',
  ARRAY['website'],
  'easy',
  2,
  'https://www.spotify.com/account/subscription/',
  false,
  false,
  NULL,
  ARRAY[
    'Go to Account > Subscription > Change or Cancel',
    'Premium access continues until billing period ends',
    'Playlists and saved music remain on free tier'
  ],
  true
),
(
  'Hulu',
  'hulu.com',
  'streaming',
  ARRAY['website', 'chat'],
  'easy',
  3,
  'https://secure.hulu.com/account',
  false,
  true,
  'May offer a discounted plan to retain you',
  ARRAY[
    'Go to Account > Manage Your Subscription',
    'Consider pausing instead of cancelling if temporary',
    'Live TV subscribers have a separate cancellation flow'
  ],
  true
),
(
  'Disney+',
  'disneyplus.com',
  'streaming',
  ARRAY['website', 'in_app'],
  'easy',
  3,
  'https://www.disneyplus.com/account',
  true,
  true,
  'Often offers a discounted monthly rate to stay',
  ARRAY[
    'Cancel via Account > Subscription',
    'Bundle subscribers must cancel the bundle, not individual services',
    'Access continues through the end of billing period'
  ],
  true
),
(
  'HBO Max',
  'max.com',
  'streaming',
  ARRAY['website', 'in_app'],
  'easy',
  3,
  'https://www.max.com/account',
  true,
  false,
  NULL,
  ARRAY[
    'Go to Account > Manage Subscription > Cancel',
    'If subscribed via Apple or Google, cancel through that platform',
    'Download content before cancelling if you want to keep it'
  ],
  true
),
(
  'Apple TV+',
  'tv.apple.com',
  'streaming',
  ARRAY['website', 'in_app'],
  'easy',
  3,
  'https://tv.apple.com/account',
  true,
  false,
  NULL,
  ARRAY[
    'Cancel via Apple ID settings or the TV app',
    'On iPhone: Settings > [Your Name] > Subscriptions',
    'Bundled in Apple One — cancel the full bundle or switch plans'
  ],
  true
),
(
  'YouTube Premium',
  'youtube.com',
  'streaming',
  ARRAY['website'],
  'easy',
  2,
  'https://www.youtube.com/paid_memberships',
  false,
  false,
  NULL,
  ARRAY[
    'Cancel via youtube.com/paid_memberships',
    'Also cancels YouTube Music Premium',
    'Family plan members are removed automatically on cancellation'
  ],
  true
),
(
  'Amazon Prime Video',
  'amazon.com',
  'streaming',
  ARRAY['website'],
  'medium',
  5,
  'https://www.amazon.com/prime',
  false,
  true,
  'Amazon will present multiple retention screens; navigate through them firmly',
  ARRAY[
    'Cancel via Account > Prime Membership > End Membership',
    'Cancelling Prime also ends Prime Video, Shipping, and Music',
    'You may receive a partial refund if unused for the current period'
  ],
  true
),
(
  'Peacock',
  'peacocktv.com',
  'streaming',
  ARRAY['website', 'in_app'],
  'easy',
  3,
  'https://www.peacocktv.com/account',
  true,
  false,
  NULL,
  ARRAY[
    'Cancel via Account > Manage Plan',
    'Free tier remains available after cancellation',
    'Access continues until end of billing period'
  ],
  true
),
(
  'Paramount+',
  'paramountplus.com',
  'streaming',
  ARRAY['website', 'in_app'],
  'easy',
  3,
  'https://www.paramountplus.com/account/subscription/',
  true,
  false,
  NULL,
  ARRAY[
    'Cancel via Account > Subscription Settings',
    'Showtime bundle has a separate cancellation step',
    'Access continues through the end of billing period'
  ],
  true
);

-- ============================================================================
-- Seed: Software / Productivity
-- ============================================================================

INSERT INTO merchants (name, domain, category, cancellation_methods, difficulty, estimated_time_minutes, website_url, chat_url, phone_number, in_app_cancellation, retention_offers_likely, retention_notes, tips, community_verified) VALUES
(
  'Adobe Creative Cloud',
  'adobe.com',
  'software',
  ARRAY['website', 'chat'],
  'hard',
  15,
  'https://account.adobe.com/plans',
  'https://helpx.adobe.com/contact.html',
  NULL,
  false,
  true,
  'Annual plans incur an early termination fee (50% of remaining balance); chat agents can sometimes waive it',
  ARRAY[
    'Annual subscribers: consider switching to monthly plan first to avoid ETF',
    'Chat support often offers 2-3 months at a 40-50% discount',
    'Ask the agent to escalate to retention before accepting any offer',
    'ETF waiver is not guaranteed but is frequently granted on first request'
  ],
  true
),
(
  'Microsoft 365',
  'microsoft.com',
  'software',
  ARRAY['website'],
  'easy',
  5,
  'https://account.microsoft.com/services',
  NULL,
  NULL,
  false,
  false,
  NULL,
  ARRAY[
    'Cancel via account.microsoft.com/services',
    'Turn off recurring billing rather than full cancellation to keep access through period end',
    'Family plan: the organiser must cancel; members are removed automatically'
  ],
  true
),
(
  'Dropbox',
  'dropbox.com',
  'software',
  ARRAY['website'],
  'easy',
  3,
  'https://www.dropbox.com/account/plan',
  NULL,
  NULL,
  false,
  false,
  NULL,
  ARRAY[
    'Downgrade to free (2 GB) via Account > Plan > Downgrade',
    'Download or move files above the free quota before downgrading',
    'Annual plans do not offer pro-rated refunds'
  ],
  true
),
(
  'iCloud+',
  'icloud.com',
  'software',
  ARRAY['in_app'],
  'easy',
  2,
  NULL,
  NULL,
  NULL,
  true,
  false,
  NULL,
  ARRAY[
    'Cancel on iPhone: Settings > [Your Name] > iCloud > Manage Storage > Change Plan',
    'Downgrade to 5 GB free tier instead of cancelling outright',
    'Data above the free quota becomes inaccessible after downgrade'
  ],
  true
),
(
  'Google One',
  'one.google.com',
  'software',
  ARRAY['website', 'in_app'],
  'easy',
  2,
  'https://one.google.com/storage',
  NULL,
  NULL,
  true,
  false,
  NULL,
  ARRAY[
    'Cancel via one.google.com/storage or the Google One app',
    'Shared storage is removed from family members on cancellation',
    'Files above the 15 GB free quota are not deleted immediately but become uneditable'
  ],
  true
),
(
  '1Password',
  '1password.com',
  'software',
  ARRAY['website'],
  'easy',
  3,
  'https://my.1password.com/profile',
  NULL,
  NULL,
  false,
  false,
  NULL,
  ARRAY[
    'Export your vault data before cancelling',
    'Cancel via my.1password.com > Profile > Cancel Subscription',
    'Data is retained for 30 days after cancellation'
  ],
  true
),
(
  'Notion',
  'notion.so',
  'software',
  ARRAY['website'],
  'easy',
  2,
  'https://www.notion.so/my-account',
  NULL,
  NULL,
  false,
  false,
  NULL,
  ARRAY[
    'Cancel via Settings > Plans > Downgrade to Free',
    'Blocks are not deleted; you revert to the free plan limits',
    'Team workspaces require the workspace owner to cancel'
  ],
  true
),
(
  'Canva Pro',
  'canva.com',
  'software',
  ARRAY['website'],
  'easy',
  3,
  'https://www.canva.com/settings/purchase-history',
  NULL,
  NULL,
  false,
  false,
  NULL,
  ARRAY[
    'Cancel via Account Settings > Billing > Cancel Subscription',
    'Pro designs remain accessible in view-only mode on the free plan',
    'Download all Pro-only assets before cancelling'
  ],
  true
);

-- ============================================================================
-- Seed: Fitness
-- ============================================================================

INSERT INTO merchants (name, domain, category, cancellation_methods, difficulty, estimated_time_minutes, phone_number, website_url, in_app_cancellation, retention_offers_likely, retention_notes, tips, community_verified) VALUES
(
  'Planet Fitness',
  'planetfitness.com',
  'fitness',
  ARRAY['in_app', 'phone'],
  'hard',
  20,
  '1-844-880-7180',
  'https://www.planetfitness.com/member-services',
  true,
  true,
  'Will often offer a free month or fee freeze to retain you; some locations require certified mail or in-person visit',
  ARRAY[
    'Check the app first — many locations now allow in-app cancellation',
    'If in-app is unavailable, call your home club directly',
    'Some state laws require an in-person or certified mail cancellation',
    'Request written confirmation of cancellation'
  ],
  true
),
(
  'LA Fitness',
  'lafitness.com',
  'fitness',
  ARRAY['phone', 'in_app'],
  'hard',
  20,
  '1-949-255-7200',
  NULL,
  true,
  true,
  'Will try to offer a fee freeze, reduced rate, or hold; stay firm',
  ARRAY[
    'Cancel in-person at your home club or call member services',
    'Request a cancellation confirmation number',
    'Give at least 5 business days before the next billing date'
  ],
  true
),
(
  'Peloton',
  'onepeloton.com',
  'fitness',
  ARRAY['website', 'phone', 'chat'],
  'medium',
  10,
  '1-866-679-9129',
  'https://www.onepeloton.com/profile/membership',
  false,
  true,
  'May offer a reduced all-access membership or pause option',
  ARRAY[
    'Cancel the All-Access Membership to keep the hardware but lose live classes',
    'App-only subscribers cancel via Account > Membership',
    'Pause for up to 3 months if you plan to return'
  ],
  true
),
(
  'ClassPass',
  'classpass.com',
  'fitness',
  ARRAY['website', 'in_app'],
  'medium',
  5,
  NULL,
  'https://classpass.com/account/membership',
  true,
  true,
  'Will offer to pause or reduce credits instead of cancelling',
  ARRAY[
    'Cancel via Account > Membership Settings > Cancel Membership',
    'Use any remaining credits before cancelling — they expire',
    'Pausing is free and available for up to 3 months'
  ],
  true
),
(
  'Calm',
  'calm.com',
  'fitness',
  ARRAY['website', 'in_app'],
  'easy',
  3,
  NULL,
  'https://www.calm.com/account',
  true,
  false,
  NULL,
  ARRAY[
    'Cancel via Account > Subscription > Cancel Subscription',
    'Lifetime subscription holders: no cancellation needed',
    'Access continues until end of paid period'
  ],
  true
),
(
  'Headspace',
  'headspace.com',
  'fitness',
  ARRAY['website', 'in_app'],
  'easy',
  3,
  NULL,
  'https://www.headspace.com/account',
  true,
  false,
  NULL,
  ARRAY[
    'Cancel via Account > Manage Subscription',
    'If subscribed via Apple or Google Play, cancel through that platform',
    'Family plan: only the plan owner can cancel'
  ],
  true
);

-- ============================================================================
-- Seed: Food & Delivery
-- ============================================================================

INSERT INTO merchants (name, domain, category, cancellation_methods, difficulty, estimated_time_minutes, website_url, in_app_cancellation, retention_offers_likely, retention_notes, tips, community_verified) VALUES
(
  'DoorDash DashPass',
  'doordash.com',
  'food',
  ARRAY['website', 'in_app'],
  'easy',
  2,
  'https://www.doordash.com/account/manage-plan/',
  true,
  false,
  NULL,
  ARRAY[
    'Cancel via Account > DashPass > Cancel Membership',
    'Annual plan holders are eligible for a refund if cancelled within 30 days of renewal',
    'Access continues until end of billing period'
  ],
  true
),
(
  'Uber Eats Pass',
  'ubereats.com',
  'food',
  ARRAY['in_app', 'website'],
  'easy',
  2,
  'https://www.ubereats.com/account',
  true,
  false,
  NULL,
  ARRAY[
    'Cancel in the Uber Eats app under Account > Membership',
    'The membership also covers Uber rides in some plans',
    'Access continues through end of billing period'
  ],
  true
),
(
  'HelloFresh',
  'hellofresh.com',
  'food',
  ARRAY['website', 'chat'],
  'medium',
  8,
  'https://www.hellofresh.com/account/subscription',
  false,
  true,
  'Will offer free boxes, pausing, or a discount to retain you',
  ARRAY[
    'Cancel at least 5 days before your next delivery to avoid being charged',
    'Pausing is available if you want to take a break without cancelling',
    'Request that the retention offer be applied before you decide'
  ],
  true
),
(
  'Blue Apron',
  'blueapron.com',
  'food',
  ARRAY['website'],
  'medium',
  5,
  'https://www.blueapron.com/account/subscription',
  false,
  true,
  'Will offer free meals or a discounted week to stay',
  ARRAY[
    'Cancel via Account > Plan Settings > Cancel Plan',
    'Cancel at least 6 days before the next billing date',
    'Unused meals or credits are forfeited on cancellation'
  ],
  true
);

-- ============================================================================
-- Seed: Shopping
-- ============================================================================

INSERT INTO merchants (name, domain, category, cancellation_methods, difficulty, estimated_time_minutes, website_url, chat_url, in_app_cancellation, retention_offers_likely, retention_notes, tips, community_verified) VALUES
(
  'Amazon Prime',
  'amazon.com',
  'shopping',
  ARRAY['website', 'chat'],
  'medium',
  7,
  'https://www.amazon.com/prime',
  'https://www.amazon.com/gp/help/customer/contact-us',
  false,
  true,
  'Amazon presents multiple retention screens and may offer a free month or reduced annual rate',
  ARRAY[
    'Navigate: Account > Prime Membership > End Membership',
    'You may qualify for a partial refund if you have not used Prime benefits this period',
    'Cancelling ends Prime Video, Prime Music, and free shipping'
  ],
  true
),
(
  'Costco',
  'costco.com',
  'shopping',
  ARRAY['in_app', 'phone'],
  'easy',
  5,
  NULL,
  NULL,
  true,
  false,
  NULL,
  ARRAY[
    'Cancel in-store at the membership counter for immediate refund',
    'Call 1-800-774-2678 for phone cancellation',
    'Costco offers a 100% satisfaction guarantee — full refund at any time'
  ],
  true
),
(
  'Walmart+',
  'walmart.com',
  'shopping',
  ARRAY['website', 'in_app'],
  'easy',
  3,
  'https://www.walmart.com/account/wplus',
  NULL,
  true,
  false,
  NULL,
  ARRAY[
    'Cancel via Account > Walmart+ > Manage Membership > Cancel',
    'Free trial cancellations take effect immediately',
    'Paid plan access continues through end of billing period'
  ],
  true
),
(
  'Instacart+',
  'instacart.com',
  'shopping',
  ARRAY['website', 'in_app'],
  'easy',
  3,
  'https://www.instacart.com/store/account/membership',
  NULL,
  true,
  false,
  NULL,
  ARRAY[
    'Cancel via Account > Instacart+ > Cancel Membership',
    'Annual plan: cancel within 15 days of renewal for a full refund',
    'Access continues through end of billing period'
  ],
  true
);

-- ============================================================================
-- Seed: News / Media
-- ============================================================================

INSERT INTO merchants (name, domain, category, cancellation_methods, difficulty, estimated_time_minutes, phone_number, website_url, chat_url, in_app_cancellation, retention_offers_likely, retention_notes, tips, community_verified) VALUES
(
  'New York Times',
  'nytimes.com',
  'news',
  ARRAY['phone', 'chat', 'website'],
  'hard',
  15,
  '1-800-698-4637',
  'https://www.nytimes.com/subscription/cancel',
  'https://help.nytimes.com/hc/en-us/articles/115014887628',
  false,
  true,
  'NYT is known for aggressive retention; agents frequently offer 50-75% discounts for up to a year',
  ARRAY[
    'Calling is often faster than chat for cancellation',
    'Be firm — expect at least 2-3 retention offers before they proceed',
    'Ask for written email confirmation of cancellation',
    'If offered a discount, decide in advance whether you would accept it'
  ],
  true
),
(
  'Wall Street Journal',
  'wsj.com',
  'news',
  ARRAY['phone', 'chat'],
  'hard',
  15,
  '1-800-568-7625',
  NULL,
  'https://customercenter.wsj.com',
  false,
  true,
  'WSJ retention agents are persistent; expect multiple discounted offers',
  ARRAY[
    'Call during business hours for fastest cancellation',
    'State clearly: "I want to cancel my subscription effective immediately"',
    'Request a confirmation number and cancellation email'
  ],
  true
),
(
  'Washington Post',
  'washingtonpost.com',
  'news',
  ARRAY['website', 'phone'],
  'medium',
  8,
  '1-800-477-4679',
  'https://www.washingtonpost.com/account/profile/subscriptions',
  NULL,
  false,
  true,
  'May offer a free month or significant discount',
  ARRAY[
    'Cancel online via Account > Subscriptions > Cancel',
    'Annual plan holders may receive a prorated refund',
    'Amazon Prime subscribers get WaPo free — check if your access is through Prime'
  ],
  true
),
(
  'Audible',
  'audible.com',
  'news',
  ARRAY['website', 'chat'],
  'medium',
  7,
  NULL,
  'https://www.audible.com/account/memberships',
  'https://www.audible.com/contact-us',
  false,
  true,
  'Will commonly offer 2-3 free months or credit to retain you',
  ARRAY[
    'Use remaining credits before cancelling — they expire shortly after',
    'Purchased audiobooks remain in your library permanently',
    'Audible Escape or Channels may have separate cancellation flows'
  ],
  true
);

-- ============================================================================
-- Seed: Gaming
-- ============================================================================

INSERT INTO merchants (name, domain, category, cancellation_methods, difficulty, estimated_time_minutes, website_url, in_app_cancellation, retention_offers_likely, retention_notes, tips, community_verified) VALUES
(
  'Xbox Game Pass',
  'xbox.com',
  'gaming',
  ARRAY['website', 'in_app'],
  'easy',
  3,
  'https://account.microsoft.com/services',
  true,
  false,
  NULL,
  ARRAY[
    'Cancel via account.microsoft.com/services > Xbox Game Pass > Cancel',
    'Games downloaded through Game Pass stop working after cancellation',
    'Turn off recurring billing to keep access until period ends'
  ],
  true
),
(
  'PlayStation Plus',
  'playstation.com',
  'gaming',
  ARRAY['website', 'in_app'],
  'easy',
  3,
  'https://www.playstation.com/en-us/playstation-plus/',
  true,
  false,
  NULL,
  ARRAY[
    'Cancel via PlayStation Network Account Management > Subscription',
    'Free monthly games remain accessible while subscribed; lost on cancellation',
    'Disable auto-renewal rather than fully cancelling to use remaining time'
  ],
  true
),
(
  'Nintendo Switch Online',
  'nintendo.com',
  'gaming',
  ARRAY['website', 'in_app'],
  'easy',
  3,
  'https://www.nintendo.com/switch/online/',
  true,
  false,
  NULL,
  ARRAY[
    'Cancel via Nintendo Account > Nintendo Switch Online > Auto-Renew Settings',
    'NES/SNES game library access ends on cancellation',
    'Family plan: only the family group administrator can cancel'
  ],
  true
),
(
  'EA Play',
  'ea.com',
  'gaming',
  ARRAY['website', 'in_app'],
  'easy',
  3,
  'https://www.ea.com/ea-play',
  true,
  false,
  NULL,
  ARRAY[
    'Cancel via EA Account > Subscriptions',
    'Pro tier includes newer titles; basic tier is separate',
    'Included with Xbox Game Pass Ultimate at no additional cost'
  ],
  true
);

-- ============================================================================
-- Seed: Cloud / Developer
-- ============================================================================

INSERT INTO merchants (name, domain, category, cancellation_methods, difficulty, estimated_time_minutes, website_url, phone_number, in_app_cancellation, retention_offers_likely, retention_notes, tips, community_verified) VALUES
(
  'AWS',
  'aws.amazon.com',
  'cloud',
  ARRAY['website', 'phone'],
  'hard',
  30,
  'https://aws.amazon.com/contact-us/',
  '1-206-922-0884',
  false,
  false,
  NULL,
  ARRAY[
    'Close the account via AWS Console > Account > Close Account',
    'Terminate all running resources first — closing does not stop billing immediately',
    'Verify $0 balance before closing to avoid unexpected charges',
    'Download all data and snapshots before closure'
  ],
  true
),
(
  'Google Cloud',
  'cloud.google.com',
  'cloud',
  ARRAY['website'],
  'medium',
  15,
  'https://console.cloud.google.com/billing',
  NULL,
  false,
  false,
  NULL,
  ARRAY[
    'Disable billing via Console > Billing > Disable Billing on Project',
    'Delete all projects to stop all charges',
    'Export data from BigQuery and Storage before closure'
  ],
  true
),
(
  'DigitalOcean',
  'digitalocean.com',
  'cloud',
  ARRAY['website'],
  'medium',
  10,
  'https://cloud.digitalocean.com/account/billing',
  NULL,
  false,
  false,
  NULL,
  ARRAY[
    'Destroy all Droplets, volumes, and resources first',
    'Close account via Account > Settings > Deactivate Account',
    'Export any data backups or snapshots before deactivation'
  ],
  true
);

-- ============================================================================
-- Seed: Dating
-- ============================================================================

INSERT INTO merchants (name, domain, category, cancellation_methods, difficulty, estimated_time_minutes, website_url, in_app_cancellation, retention_offers_likely, retention_notes, tips, community_verified) VALUES
(
  'Tinder Gold',
  'tinder.com',
  'dating',
  ARRAY['in_app', 'website'],
  'easy',
  3,
  'https://account.gotinder.com/',
  true,
  false,
  NULL,
  ARRAY[
    'Cancel via Settings > Manage Payment Account on iOS/Android',
    'If subscribed via Apple: Settings > Apple ID > Subscriptions',
    'If subscribed via Google: Google Play > Subscriptions',
    'Boosts and Super Likes are non-refundable'
  ],
  true
),
(
  'Bumble Premium',
  'bumble.com',
  'dating',
  ARRAY['in_app'],
  'easy',
  3,
  NULL,
  true,
  false,
  NULL,
  ARRAY[
    'Cancel via the platform you subscribed through (Apple or Google)',
    'Coins and Boosts purchased separately are non-refundable',
    'Access continues through end of current paid period'
  ],
  true
),
(
  'Hinge+',
  'hinge.co',
  'dating',
  ARRAY['in_app'],
  'easy',
  3,
  NULL,
  true,
  false,
  NULL,
  ARRAY[
    'Cancel via your app store subscription settings',
    'On iOS: Settings > [Your Name] > Subscriptions > Hinge',
    'Roses are non-refundable regardless of subscription status'
  ],
  true
);

-- ============================================================================
-- Seed: Education
-- ============================================================================

INSERT INTO merchants (name, domain, category, cancellation_methods, difficulty, estimated_time_minutes, website_url, in_app_cancellation, retention_offers_likely, retention_notes, tips, community_verified) VALUES
(
  'Coursera Plus',
  'coursera.org',
  'education',
  ARRAY['website'],
  'easy',
  5,
  'https://www.coursera.org/account-profile',
  false,
  false,
  NULL,
  ARRAY[
    'Cancel via Profile > Subscriptions > Cancel Subscription',
    'Certificates you have earned remain accessible after cancellation',
    'Annual plan: request a refund within 14 days of purchase'
  ],
  true
),
(
  'Duolingo Super',
  'duolingo.com',
  'education',
  ARRAY['in_app', 'website'],
  'easy',
  2,
  'https://www.duolingo.com/settings',
  true,
  false,
  NULL,
  ARRAY[
    'Cancel via app store or duolingo.com/settings',
    'Streak freezes and gems earned are kept on the free plan',
    'Family plan members revert to free tier when organizer cancels'
  ],
  true
),
(
  'MasterClass',
  'masterclass.com',
  'education',
  ARRAY['website'],
  'medium',
  5,
  'https://www.masterclass.com/settings/subscription',
  false,
  false,
  NULL,
  ARRAY[
    'Cancel via Account Settings > Subscription > Cancel Subscription',
    'Annual membership: no pro-rated refunds after 30-day window',
    'Request a refund within 30 days of annual renewal for a full refund'
  ],
  true
);

-- ============================================================================
-- Detection Patterns
-- ============================================================================

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'netflix.com', 25 FROM merchants WHERE name = 'Netflix';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'netflix', 20 FROM merchants WHERE name = 'Netflix';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'spotify.com', 25 FROM merchants WHERE name = 'Spotify';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'spotify', 20 FROM merchants WHERE name = 'Spotify';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'hulu.com', 25 FROM merchants WHERE name = 'Hulu';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'hulu', 20 FROM merchants WHERE name = 'Hulu';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'disneyplus.com', 25 FROM merchants WHERE name = 'Disney+';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'disney', 20 FROM merchants WHERE name = 'Disney+';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'max.com', 25 FROM merchants WHERE name = 'HBO Max';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'hbo', 20 FROM merchants WHERE name = 'HBO Max';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'max.com', 15 FROM merchants WHERE name = 'HBO Max';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'youtube.com', 20 FROM merchants WHERE name = 'YouTube Premium';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'youtube premium', 25 FROM merchants WHERE name = 'YouTube Premium';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'amazon.com', 15 FROM merchants WHERE name = 'Amazon Prime Video';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'amazon prime video', 25 FROM merchants WHERE name = 'Amazon Prime Video';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'peacocktv.com', 25 FROM merchants WHERE name = 'Peacock';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'peacock', 20 FROM merchants WHERE name = 'Peacock';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'paramountplus.com', 25 FROM merchants WHERE name = 'Paramount+';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'paramount', 20 FROM merchants WHERE name = 'Paramount+';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'adobe.com', 20 FROM merchants WHERE name = 'Adobe Creative Cloud';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'adobe', 20 FROM merchants WHERE name = 'Adobe Creative Cloud';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'microsoft.com', 15 FROM merchants WHERE name = 'Microsoft 365';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'microsoft 365', 25 FROM merchants WHERE name = 'Microsoft 365';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'office 365', 20 FROM merchants WHERE name = 'Microsoft 365';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'dropbox.com', 25 FROM merchants WHERE name = 'Dropbox';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'dropbox', 20 FROM merchants WHERE name = 'Dropbox';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'icloud', 25 FROM merchants WHERE name = 'iCloud+';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'one.google.com', 25 FROM merchants WHERE name = 'Google One';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'google one', 25 FROM merchants WHERE name = 'Google One';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'planetfitness.com', 25 FROM merchants WHERE name = 'Planet Fitness';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'planet fitness', 25 FROM merchants WHERE name = 'Planet Fitness';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'lafitness.com', 25 FROM merchants WHERE name = 'LA Fitness';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'la fitness', 25 FROM merchants WHERE name = 'LA Fitness';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'onepeloton.com', 25 FROM merchants WHERE name = 'Peloton';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'peloton', 20 FROM merchants WHERE name = 'Peloton';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'classpass.com', 25 FROM merchants WHERE name = 'ClassPass';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'classpass', 20 FROM merchants WHERE name = 'ClassPass';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'calm.com', 25 FROM merchants WHERE name = 'Calm';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'calm app', 20 FROM merchants WHERE name = 'Calm';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'headspace.com', 25 FROM merchants WHERE name = 'Headspace';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'headspace', 20 FROM merchants WHERE name = 'Headspace';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'doordash.com', 25 FROM merchants WHERE name = 'DoorDash DashPass';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'dashpass', 25 FROM merchants WHERE name = 'DoorDash DashPass';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'doordash', 15 FROM merchants WHERE name = 'DoorDash DashPass';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'ubereats.com', 25 FROM merchants WHERE name = 'Uber Eats Pass';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'uber eats', 20 FROM merchants WHERE name = 'Uber Eats Pass';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'hellofresh.com', 25 FROM merchants WHERE name = 'HelloFresh';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'hellofresh', 20 FROM merchants WHERE name = 'HelloFresh';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'blueapron.com', 25 FROM merchants WHERE name = 'Blue Apron';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'blue apron', 20 FROM merchants WHERE name = 'Blue Apron';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'amazon.com', 15 FROM merchants WHERE name = 'Amazon Prime';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'amazon prime', 25 FROM merchants WHERE name = 'Amazon Prime';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'costco.com', 25 FROM merchants WHERE name = 'Costco';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'costco', 20 FROM merchants WHERE name = 'Costco';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'walmart.com', 20 FROM merchants WHERE name = 'Walmart+';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'walmart+', 25 FROM merchants WHERE name = 'Walmart+';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'instacart.com', 25 FROM merchants WHERE name = 'Instacart+';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'instacart', 20 FROM merchants WHERE name = 'Instacart+';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'nytimes.com', 25 FROM merchants WHERE name = 'New York Times';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'new york times', 25 FROM merchants WHERE name = 'New York Times';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'nytimes', 20 FROM merchants WHERE name = 'New York Times';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'wsj.com', 25 FROM merchants WHERE name = 'Wall Street Journal';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'wall street journal', 25 FROM merchants WHERE name = 'Wall Street Journal';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'washingtonpost.com', 25 FROM merchants WHERE name = 'Washington Post';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'washington post', 25 FROM merchants WHERE name = 'Washington Post';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'audible.com', 25 FROM merchants WHERE name = 'Audible';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'audible', 20 FROM merchants WHERE name = 'Audible';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'xbox.com', 20 FROM merchants WHERE name = 'Xbox Game Pass';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'xbox game pass', 25 FROM merchants WHERE name = 'Xbox Game Pass';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'playstation.com', 20 FROM merchants WHERE name = 'PlayStation Plus';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'playstation plus', 25 FROM merchants WHERE name = 'PlayStation Plus';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'ps plus', 20 FROM merchants WHERE name = 'PlayStation Plus';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'nintendo.com', 20 FROM merchants WHERE name = 'Nintendo Switch Online';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'nintendo online', 25 FROM merchants WHERE name = 'Nintendo Switch Online';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'ea.com', 20 FROM merchants WHERE name = 'EA Play';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'ea play', 25 FROM merchants WHERE name = 'EA Play';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'aws.amazon.com', 25 FROM merchants WHERE name = 'AWS';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'amazon web services', 25 FROM merchants WHERE name = 'AWS';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'cloud.google.com', 25 FROM merchants WHERE name = 'Google Cloud';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'google cloud', 25 FROM merchants WHERE name = 'Google Cloud';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'digitalocean.com', 25 FROM merchants WHERE name = 'DigitalOcean';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'digitalocean', 20 FROM merchants WHERE name = 'DigitalOcean';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'tinder.com', 25 FROM merchants WHERE name = 'Tinder Gold';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'tinder', 20 FROM merchants WHERE name = 'Tinder Gold';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'bumble.com', 25 FROM merchants WHERE name = 'Bumble Premium';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'bumble', 20 FROM merchants WHERE name = 'Bumble Premium';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'hinge.co', 25 FROM merchants WHERE name = 'Hinge+';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'hinge', 20 FROM merchants WHERE name = 'Hinge+';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'coursera.org', 25 FROM merchants WHERE name = 'Coursera Plus';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'coursera', 20 FROM merchants WHERE name = 'Coursera Plus';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'duolingo.com', 25 FROM merchants WHERE name = 'Duolingo Super';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'duolingo', 20 FROM merchants WHERE name = 'Duolingo Super';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'domain', 'masterclass.com', 25 FROM merchants WHERE name = 'MasterClass';

INSERT INTO merchant_detection_patterns (merchant_id, pattern_type, pattern_value, confidence_boost)
SELECT id, 'name_contains', 'masterclass', 20 FROM merchants WHERE name = 'MasterClass';

COMMENT ON TABLE merchants IS 'Known subscription merchants with cancellation procedures';
COMMENT ON TABLE merchant_detection_patterns IS 'Pattern rules for detecting merchants from transaction data';
