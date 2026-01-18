import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // DB 내부에 저장된 finalize_all_matches SQL 함수를 호출합니다.
    const { data, error } = await supabaseAdmin.rpc('finalize_all_matches', {
      p_session_id: sessionId
    });

    if (error) {
      // 여기서 "user_id" 에러가 발생한다면 100% 위 SQL 함수 내부 문구가 원인입니다.
      console.error('RPC 실행 중 DB 에러:', error.message);
      return NextResponse.json(
        { success: false, error: `DB 함수 오류: ${error.message}` },
        { status: 500 }
      );
    }

    // 결과 반환 (함수 내부에서 반환한 json_build_object가 data에 담깁니다)
    return NextResponse.json(data);

  } catch (err: any) {
    console.error('API 서버 에러:', err);
    return NextResponse.json(
      { success: false, error: err.message || '알 수 없는 서버 오류' },
      { status: 500 }
    );
  }
}