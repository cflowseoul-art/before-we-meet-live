import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { itemId, userId, bidAmount } = await request.json();

    if (!itemId || !userId || !bidAmount) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // 1. 현재 아이템 상태 확인
    const { data: currentItem, error: fetchError } = await supabaseAdmin
      .from('auction_items')
      .select('status, current_bid, highest_bidder_id')
      .eq('id', itemId)
      .single();

    if (fetchError || !currentItem) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    if (currentItem.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Auction is not active' }, { status: 400 });
    }

    const previousBidderId = currentItem.highest_bidder_id;
    const previousBidAmount = currentItem.current_bid || 0;
    const isSameBidder = previousBidderId === userId;

    // 2. 최소 입찰가 확인
    const minBid = previousBidAmount + 100;
    if (bidAmount < minBid) {
      return NextResponse.json({
        success: false,
        error: `Minimum bid is ${minBid}`,
        minBid
      }, { status: 400 });
    }

    // 3. 유저 잔액 + 세션 확인
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('balance, session_id')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const amountToDeduct = isSameBidder ? (bidAmount - previousBidAmount) : bidAmount;

    if (userData.balance < amountToDeduct) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient balance',
        required: amountToDeduct,
        current: userData.balance
      }, { status: 400 });
    }

    // 4. 낙관적 잠금: current_bid가 읽은 값과 동일할 때만 업데이트
    //    동시 입찰 시 먼저 도착한 요청만 성공
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('auction_items')
      .update({ current_bid: bidAmount, highest_bidder_id: userId })
      .eq('id', itemId)
      .eq('current_bid', previousBidAmount) // 낙관적 잠금 조건
      .select('id')
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    // 업데이트된 행이 없으면 = 다른 사람이 먼저 입찰함
    if (!updated) {
      // 누가 먼저 입찰했는지 조회
      const { data: freshItem } = await supabaseAdmin
        .from('auction_items')
        .select('current_bid, highest_bidder_id')
        .eq('id', itemId)
        .single();

      let winnerNickname = '';
      let timeDiffSec = 0;
      if (freshItem?.highest_bidder_id) {
        const { data: winner } = await supabaseAdmin
          .from('users')
          .select('nickname')
          .eq('id', freshItem.highest_bidder_id)
          .single();
        winnerNickname = winner?.nickname || '';

        // 선착 입찰의 시간 차이 계산
        const { data: winnerBid } = await supabaseAdmin
          .from('bids')
          .select('created_at')
          .eq('auction_item_id', itemId)
          .eq('amount', freshItem.current_bid)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (winnerBid) {
          timeDiffSec = Math.max(0.1, Math.round((Date.now() - new Date(winnerBid.created_at).getTime()) / 100) / 10);
        }
      }

      return NextResponse.json({
        success: false,
        error: 'outbid',
        winnerNickname,
        timeDiffSec,
        currentBid: freshItem?.current_bid || bidAmount
      }, { status: 409 });
    }

    // 5. 이전 입찰자에게 환불
    if (!isSameBidder && previousBidderId && previousBidAmount > 0) {
      const { data: prevUser } = await supabaseAdmin
        .from('users')
        .select('balance')
        .eq('id', previousBidderId)
        .single();

      if (prevUser) {
        await supabaseAdmin
          .from('users')
          .update({ balance: prevUser.balance + previousBidAmount })
          .eq('id', previousBidderId);
      }
    }

    // 6. 입찰 기록 추가
    await supabaseAdmin
      .from('bids')
      .insert({ auction_item_id: itemId, user_id: userId, amount: bidAmount, session_id: userData.session_id || null });

    // 7. 유저 잔액 차감
    const newBalance = userData.balance - amountToDeduct;
    await supabaseAdmin
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);

    return NextResponse.json({
      success: true,
      bidAmount,
      newBalance,
      previousBidAmount,
      amountDeducted: amountToDeduct
    });

  } catch (err: any) {
    console.error('Bid API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
