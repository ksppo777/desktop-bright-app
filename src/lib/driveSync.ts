import { getAccessToken, logout } from './auth';
import { appLog } from './logger';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

const FILE_NAME = 'BrightStudyData.json';

const isTauri = () => ('__TAURI_INTERNALS__' in window);

const safeFetch = async (url: string, options?: any) => {
  if (isTauri()) {
    try {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      console.log('Using Tauri native fetch for:', url);
      return await tauriFetch(url, options);
    } catch (e) {
      console.log('Tauri HTTP plugin not available, falling back to standard fetch');
    }
  }
  return await fetch(url, options);
};

const getDriveFileId = async (token: string, fileName: string): Promise<string | null> => {
  console.log(`getDriveFileId: 드라이브에서 파일 검색 시도... (${fileName})`);
  try {
    const q = encodeURIComponent(`name='${fileName}'`);
    const res = await safeFetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      if (res.status === 401) {
        await logout();
      }
      const errText = await res.text();
      console.error('getDriveFileId: 네크워크 요청 실패', res.status, errText);
      appLog('ERROR', 'getDriveFileId failed', errText);
      throw new Error(`파일 ID 검색 실패: ${res.status} ${errText}`);
    }
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      console.log('getDriveFileId: 파일 발견 ID:', data.files[0].id);
      return data.files[0].id;
    }
    console.log('getDriveFileId: 파일이 존재하지 않습니다.');
    return null;
  } catch (err: any) {
    console.error('getDriveFileId: 내부 에러 발생', err);
    appLog('ERROR', 'getDriveFileId error', err.message);
    throw err; // throw to handle it properly in syncToDrive / syncFromDrive
  }
};

export const syncToDrive = async (appData: any, localTimestamp: number) => {
  console.log('syncToDrive: 시작', { localTimestamp });
  appLog('INFO', 'syncToDrive started', { localTimestamp });
  
  try {
    const token = await getAccessToken();
    if (!token) {
      console.error('syncToDrive: 로그인 토큰 없음');
      appLog('ERROR', 'syncToDrive: Not logged in');
      throw new Error('Google 드라이브에 접근하려면 먼저 로그인해 주세요.');
    }

    console.log('syncToDrive: 백업 대상 파일 ID 검색 시도...');
    const fileId = await getDriveFileId(token, FILE_NAME);
    let targetFileId = fileId;

    if (!targetFileId) {
      console.log('syncToDrive: 파일이 존재하지 않아 새로 생성합니다 (FILE_NAME).');
      // 1. Create file metadata
      const metaRes = await safeFetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] })
      });
      
      if (!metaRes.ok) {
        if (metaRes.status === 401) {
          await logout();
        }
        const errText = await metaRes.text();
        console.error('syncToDrive: 파일 메타데이터 생성 실패', errText);
        appLog('ERROR', 'Drive create metadata failed', errText);
        throw new Error(`파일 생성 실패: ${metaRes.status} ${errText}`);
      }
      
      const meta = await metaRes.json();
      targetFileId = meta.id;
      console.log('syncToDrive: 새 파일 생성 성공, ID:', targetFileId);
    } else {
      console.log('syncToDrive: 기존 파일 찾음, ID:', targetFileId);
    }

    const payload = {
      timestamp: localTimestamp,
      data: appData
    };
    
    console.log('syncToDrive: 기기 데이터 업로드 시도...', { targetFileId });
    // 2. Upload file content
    const res = await safeFetch(`https://www.googleapis.com/upload/drive/v3/files/${targetFileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      if (res.status === 401) {
        await logout();
      }
      const errText = await res.text();
      console.error('syncToDrive: 기기 데이터 업로드 실패', errText);
      appLog('ERROR', 'Drive upload content failed', errText);
      throw new Error(`데이터 업로드 실패: ${res.status} ${errText}`);
    }
    
    console.log('syncToDrive: 수동 백업 성공적으로 완료.');
    appLog('SUCCESS', 'syncToDrive completed');
  } catch (err: any) {
    console.error('syncToDrive: 내부 에러 발생', err);
    appLog('ERROR', 'syncToDrive fetch error', err.message);
    throw err; // Re-throw to be handled by the UI
  }
};

export const getDriveSyncMetadata = async (): Promise<number | null> => {
  try {
    const token = await getAccessToken();
    if (!token) return null;
    const fileId = await getDriveFileId(token, FILE_NAME);
    if (!fileId) return null;
    
    // We can just query `fields=modifiedTime` instead of downloading the whole file!
    const res = await safeFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=modifiedTime`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return new Date(data.modifiedTime).getTime();
  } catch (e) {
    return null;
  }
};

export const syncFromDrive = async (): Promise<{ data: any, timestamp: number } | null> => {
  console.log('syncFromDrive: 복원 시작');
  appLog('INFO', 'syncFromDrive started');
  
  try {
    const token = await getAccessToken();
    if (!token) {
      console.error('syncFromDrive: 로그인 토큰 없음');
      appLog('ERROR', 'syncFromDrive: Not logged in');
      throw new Error('Google 드라이브에 접근하려면 먼저 로그인해 주세요.');
    }

    console.log('syncFromDrive: 대상 파일 검색 중...');
    const fileId = await getDriveFileId(token, FILE_NAME);
    if (!fileId) {
      console.log('syncFromDrive: 대상 파일이 존재하지 않습니다.');
      appLog('INFO', 'syncFromDrive: No file found');
      return null;
    }

    console.log(`syncFromDrive: 대상 파일 발견 (ID: ${fileId}), 다운로드 시도...`);
    const res = await safeFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) {
      if (res.status === 401) {
        await logout();
      }
      const errText = await res.text();
      console.error('syncFromDrive: 다운로드 실패', errText);
      appLog('ERROR', 'Drive download failed', errText);
      throw new Error(`다운로드 실패: ${res.status} ${errText}`);
    }
    
    const data = await res.json();
    console.log('syncFromDrive: 성공적으로 데이터를 가져왔습니다.', { remoteTimestamp: data.timestamp });
    appLog('SUCCESS', 'syncFromDrive completed', { remoteTimestamp: data.timestamp });
    return data;
  } catch (err: any) {
    console.error('syncFromDrive: 내부 에러 발생', err);
    appLog('ERROR', 'syncFromDrive fetch error', err.message);
    throw err;
  }
};

export const autoSyncDrive = async (
  localData: any, 
  localTimestamp: number, 
  onUpdateLocal: (data: any, newTimestamp: number) => void,
  networkPreference: "all" | "wifi_only" = "all"
): Promise<string> => {
  console.log('autoSyncDrive: 자동 동기화 시도 시작', { localTimestamp });
  appLog('INFO', 'autoSyncDrive triggered', { localTimestamp });
  
  if (Capacitor.isNativePlatform()) {
    const status = await Network.getStatus();
    if (networkPreference === "wifi_only" && status.connectionType !== "wifi") {
      console.log('autoSyncDrive: 와이파이 환경이 아니므로 동기화 생략');
      return "skipped_wifi";
    }
  }

  const token = await getAccessToken();
  if (!token || !navigator.onLine) {
    console.log('autoSyncDrive: 중단됨 (오프라인이거나 토큰이 없음)', { hasToken: !!token, isOnline: navigator.onLine });
    appLog('INFO', 'autoSyncDrive aborted', { hasToken: !!token, isOnline: navigator.onLine });
    return "skipped_offline";
  }
  
  try {
     console.log('autoSyncDrive: 클라우드 데이터 가져오는 중...');
     const remote = await syncFromDrive();
     if (remote && remote.timestamp > localTimestamp) {
       console.log('autoSyncDrive: 클라우드 데이터가 더 최신입니다. 로컬 데이터 업데이트 중...', { remoteTimestamp: remote.timestamp, localTimestamp });
       appLog('INFO', 'autoSyncDrive: remote is newer, updating local data');
       onUpdateLocal(remote.data, remote.timestamp);
       return "updated_from_remote";
     } else if (!remote || localTimestamp > (remote?.timestamp || 0)) {
       console.log('autoSyncDrive: 로컬 데이터가 최신이거나 클라우드에 데이터가 없습니다. 클라우드에 데이터 백업 중...', { remoteTimestamp: remote?.timestamp, localTimestamp });
       appLog('INFO', 'autoSyncDrive: local is newer or no remote, updating remote data');
       await syncToDrive(localData, localTimestamp);
       return "uploaded_to_remote";
     } else {
       console.log('autoSyncDrive: 동기화 완료 상태 (로컬과 클라우드 데이터 타임스탬프 동일).');
       appLog('INFO', 'autoSyncDrive: sync is up to date');
       return "up_to_date";
     }
  } catch (e: any) {
     console.error('autoSyncDrive: 처리 중 에러 발생', e);
     appLog('ERROR', 'autoSyncDrive error', e.message);
     throw e;
  }
};

const BACKUPS_FILE_NAME = 'BrightStudyBackups.json';

export interface BackupSnapshot {
  id: string;
  timestamp: number;
  tag: string;
  data: any;
}

export const getDriveSnapshots = async (): Promise<BackupSnapshot[]> => {
  const token = await getAccessToken();
  if (!token) return [];
  const fileId = await getDriveFileId(token, BACKUPS_FILE_NAME);
  if (!fileId) return [];
  try {
    const res = await safeFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      if (res.status === 401) {
        await logout();
      }
      return [];
    }
    const data = await res.json();
    if (data && Array.isArray(data.snapshots)) {
      return data.snapshots;
    }
  } catch (e) {
    console.error("Failed to fetch snapshots", e);
  }
  return [];
};

export const createDriveSnapshot = async (appData: any, manualTag?: string) => {
  console.log("createDriveSnapshot 시작...");
  try {
    const token = await getAccessToken();
    if (!token) {
        console.log("createDriveSnapshot: 토큰 없음");
        return;
    }
    
    let tag = manualTag || '웹';
    if (!manualTag) {
      if (Capacitor.isNativePlatform()) {
        tag = '어플';
      } else if (isTauri()) {
        tag = 'PC';
      }
    }
    
    let fileId = await getDriveFileId(token, BACKUPS_FILE_NAME);
    let currentSnapshots: BackupSnapshot[] = [];
    
    if (fileId) {
      const res = await safeFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.snapshots)) {
          currentSnapshots = data.snapshots;
        }
      } else if (res.status === 401) {
          await logout();
      }
    } else {
      const metaRes = await safeFetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: BACKUPS_FILE_NAME, parents: ['appDataFolder'] })
      });
      if (metaRes.ok) {
        const meta = await metaRes.json();
        fileId = meta.id;
      }
    }
    
    if (!fileId) return;

    const newSnapshot: BackupSnapshot = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      tag,
      data: appData
    };
    
    currentSnapshots.unshift(newSnapshot);
    currentSnapshots = currentSnapshots.slice(0, 5); // Keep max 5
    
    await safeFetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ snapshots: currentSnapshots })
    });
    console.log("createDriveSnapshot: 완료", tag, currentSnapshots.length);
  } catch(e) {
     console.error("createDriveSnapshot 에러", e);
  }
};

