import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixBids() {
  const { data, error } = await supabase
    .from('auction_items')
    .update({ current_bid: 0 })
    .neq('status', 'finished')
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Updated ${data?.length} items to current_bid: 0`);
  }
}

fixBids();
