import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { AUCTION_ITEMS } from '@/app/constants';

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();

    // 1. 현재 세션 bids 삭제
    if (sessionId) {
      await supabaseAdmin.from('bids').delete().eq('session_id', sessionId);
    }

    // 2. 기존 auction_items 전체 삭제
    await supabaseAdmin.from('auction_items').delete().filter('id', 'not.is', null);

    // 3. 새 아이템 생성
    const items = AUCTION_ITEMS.map((val) => ({ title: val, current_bid: 0, status: 'pending' }));
    const { error } = await supabaseAdmin.from('auction_items').insert(items);
    if (error) throw error;

    return NextResponse.json({ success: true, count: items.length });
  } catch (err: any) {
    console.error('Init auction error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
