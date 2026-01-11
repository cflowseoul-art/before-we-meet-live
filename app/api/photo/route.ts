import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET() {
  const FOLDER_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID;
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;

  console.log("--- 🚀 동기화 프로세스 시작 ---");

  if (!API_KEY || !FOLDER_ID) {
    return NextResponse.json({ error: "환경변수 로드 실패" }, { status: 500 });
  }

  try {
    const q = encodeURIComponent(`'${FOLDER_ID}' in parents and trashed = false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&key=${API_KEY}`,
      { cache: 'no-store' }
    );
    
    const driveData = await res.json();
    const files = driveData.files || [];
    const processed = [];

    console.log(`📂 드라이브에서 찾은 파일 수: ${files.length}개`);

    for (const file of files) {
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      const parts = fileNameWithoutExt.split('_');
      
      // 파일명이 규칙에 맞지 않으면 건너뜀
      if (parts.length < 3) {
        console.log(`⚠️ 형식 불일치 건너뜀: ${file.name}`);
        continue;
      }

      const [prefix, name, suffix, gender, photoNumStr] = parts;
      const photoNum = parseInt(photoNumStr) || 1;

      console.log(`🔍 유저 조회 시도: 이름[${name.trim()}], 뒷자리[${suffix.trim()}]`);

      // Supabase에서 유저 조회
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, real_name, phone_suffix")
        .eq("real_name", name.trim())
        .eq("phone_suffix", suffix.trim())
        .maybeSingle();

      if (user) {
        console.log(`✅ 유저 매칭 성공: ${user.real_name}(${user.id})`);
        
        const { error: upsertError } = await supabase.from("feed_likes").upsert({
          user_id: user.id,
          target_user_id: user.id,
          photo_number: photoNum,
          order_prefix: prefix,
          gender_code: (gender === "여성" || gender === "F") ? "F" : "M",
          drive_file_id: file.id,
        }, { onConflict: 'user_id, photo_number' });

        if (!upsertError) {
          processed.push(file.name);
        } else {
          console.error(`❌ DB 저장 실패: ${upsertError.message}`);
        }
      } else {
        console.log(`❌ 유저 매칭 실패: DB에 '${name.trim()}'님과 뒷자리 '${suffix.trim()}' 정보가 없습니다.`);
      }
    }

    console.log(`--- ✅ 동기화 완료: ${processed.length}건 성공 ---`);

    return NextResponse.json({ 
      success: true, 
      drive_total: files.length, 
      db_synced_count: processed.length,
      synced_files: processed 
    });

  } catch (error: any) {
    console.error("Critical Sync Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}