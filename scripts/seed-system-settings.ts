import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('환경변수 설정 필요: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedSystemSettings() {
  console.log('system_settings 테이블 시드 시작...');

  const settings = [
    { key: 'current_phase', value: 'auction' },
    { key: 'is_feed_open', value: 'false' },
    { key: 'is_report_open', value: 'false' },
    { key: 'current_session', value: '01' },
  ];

  for (const setting of settings) {
    const { error } = await supabase
      .from('system_settings')
      .upsert(setting, { onConflict: 'key' });

    if (error) {
      console.error(`  ✗ ${setting.key}: ${error.message}`);
    } else {
      console.log(`  ✓ ${setting.key}: ${setting.value}`);
    }
  }

  console.log('system_settings 시드 완료!');
}

seedSystemSettings();
