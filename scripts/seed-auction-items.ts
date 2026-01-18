import { createClient } from '@supabase/supabase-js';
import { AUCTION_ITEMS } from '../app/constants';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('환경변수 설정 필요: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedAuctionItems() {
  console.log('auction_items 테이블 시드 시작...');
  console.log(`삽입할 항목 수: ${AUCTION_ITEMS.length}`);

  const items = AUCTION_ITEMS.map((title) => ({
    title,
    status: 'pending',
    current_bid: 0,
    highest_bidder_id: null,
  }));

  const { data, error } = await supabase
    .from('auction_items')
    .insert(items)
    .select();

  if (error) {
    console.error('삽입 실패:', error.message);
    process.exit(1);
  }

  console.log(`성공적으로 ${data.length}개 항목 삽입 완료!`);
  data.forEach((item, idx) => {
    console.log(`  ${idx + 1}. ${item.title}`);
  });
}

seedAuctionItems();
