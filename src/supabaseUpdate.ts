import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { createClient } from '@supabase/supabase-js';

// 1. Supabase 서버 연결 (본인 정보로 수정)
const supabaseUrl = 'https://tbrdurryhpgjtrsihacu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicmR1cnJ5aHBnanRyc2loYWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NzgzOTUsImV4cCI6MjA5NjU1NDM5NX0.G5Ft6TsTeybAR94eR5rHyVBCgQ3lNkM-AWuhf_9ozys';
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. 업데이트 확인 및 실행 마법 로직
export const checkAndApplyUpdate = async () => {
  // 웹(AI Studio 미리보기)에서는 에러가 나지 않도록 무시하고, 안드로이드 폰에서만 작동하게 방어
  if (!Capacitor.isNativePlatform()) return;

  try {
    // 앱이 무사히 켜졌다고 Capgo 껍데기에 알림 (매우 중요: 이거 없으면 롤백됨)
    await CapacitorUpdater.notifyAppReady();

    // Supabase 데이터베이스에서 최신 버전 정보(1개) 가져오기
    const { data, error } = await supabase
      .from('app_versions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.error('⚠️ Supabase 에러 상세 원인:', JSON.stringify(error)); // <--- 이 줄을 추가!
      console.log('업데이트 정보를 찾을 수 없습니다.');
      return;
    }

    // 내 폰에 현재 깔려있는 앱 버전 확인
    const { value: currentVersion } = await Preferences.get({ key: 'app_version' });

    // 이미 최신 버전이면 여기서 스톱
    if (currentVersion === data.version) {
      console.log('✅ 이미 최신 버전입니다:', currentVersion);
      return;
    }

    console.log('🚀 새 업데이트 발견! 백그라운드 다운로드 시작...', data.version);

    // 새 업데이트 zip 파일 다운로드
    const bundle = await CapacitorUpdater.download({
      url: data.url,
      version: data.version,
    });

    // 다운로드 성공하면 버전을 내 폰에 저장하고 즉시 앱 새로고침(업데이트 적용)
    await Preferences.set({ key: 'app_version', value: data.version });
    await CapacitorUpdater.set({ id: bundle.id });

  } catch (err) {
    console.error('업데이트 중 에러 발생:', err);
  }
};