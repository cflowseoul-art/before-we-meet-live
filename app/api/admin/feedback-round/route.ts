import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { round, targetUserIds } = await request.json();

    if (round === undefined || !['0', '1', '2', '3', '4', '5'].includes(String(round))) {
      return NextResponse.json(
        { success: false, error: 'Invalid round. Must be 0-5.' },
        { status: 400 }
      );
    }

    // targets가 빈 배열이면 전체 발송, 아니면 특정 유저만
    const targets = Array.isArray(targetUserIds) ? targetUserIds : [];
    const value = JSON.stringify({ round: String(round), targets, ts: Date.now() });

    const { error } = await supabaseAdmin
      .from('system_settings')
      .upsert({ key: 'active_feedback_round', value });

    if (error) {
      console.error('Feedback round update error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, round: String(round), targetCount: targets.length || 'all' });
  } catch (err: any) {
    console.error('Feedback round API error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
