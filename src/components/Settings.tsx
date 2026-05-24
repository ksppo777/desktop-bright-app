import { useState, useEffect } from 'react';
import { initAuth, googleSignIn, logout } from '../lib/auth';
import { CloudBackupSnapshot, deleteCloudBackupSnapshot, getCloudBackupSnapshots, getCloudSyncErrorMessage, restoreCloudBackupSnapshot, syncDataToCloud, syncDataFromCloud } from '../lib/cloudSync';
import { User } from 'firebase/auth';
import { Cloud, Check, Download, Upload, LogOut, Moon, Sun, Target, MessageCircle, Type, AlignLeft, RotateCcw, Trash2 } from 'lucide-react';
import { clearStorage, setStorage } from '../lib/storage';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface SettingsProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  onDataSync: (data: any) => void;
  getAllData: () => any;
  autoGoalDisplayMode: 'multiple' | 'single';
  setAutoGoalDisplayMode: (val: 'multiple' | 'single') => void;
  globalFontSize: number;
  setGlobalFontSize: (val: number | ((prev: number) => number)) => void;
  preventWordWrap: boolean;
  setPreventWordWrap: (val: boolean) => void;
  showNavLabelsMobile: boolean;
  setShowNavLabelsMobile: (val: boolean) => void;
  autoBackupStatus: string;
  lastAutoBackupAt: string | null;
}

export default function Settings({ isDarkMode, setIsDarkMode, onDataSync, getAllData, autoGoalDisplayMode, setAutoGoalDisplayMode, globalFontSize, setGlobalFontSize, preventWordWrap, setPreventWordWrap, showNavLabelsMobile, setShowNavLabelsMobile, autoBackupStatus, lastAutoBackupAt }: SettingsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [backupSnapshots, setBackupSnapshots] = useState<CloudBackupSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);

  const showTemporaryStatus = (message: string, duration = 4000) => {
    setSyncStatus(message);
    window.setTimeout(() => setSyncStatus(null), duration);
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (u) => setUser(u),
      () => setUser(null)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadSnapshots = async () => {
      if (!user) {
        setBackupSnapshots([]);
        return;
      }

      setIsLoadingSnapshots(true);
      try {
        const snapshots = await getCloudBackupSnapshots();
        setBackupSnapshots(snapshots);
      } catch (error) {
        showTemporaryStatus(`백업 목록 불러오기 실패: ${getCloudSyncErrorMessage(error)}`, 6000);
      } finally {
        setIsLoadingSnapshots(false);
      }
    };

    loadSnapshots();
  }, [user]);

  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) setUser(res.user);
    } catch (e: any) {
      if (e.code !== 'auth/cancelled-popup-request' && e.code !== 'auth/popup-closed-by-user') {
        console.error(e);
        alert('로그인에 실패했습니다.');
      }
    }
  };

  const handleUpload = async () => {
    if (!confirm('현재 기기의 데이터를 클라우드에 백업합니다. 진행하시겠습니까?')) return;
    setIsSyncing(true);
    setSyncStatus('Firebase에 백업 중...');
    try {
      const data = getAllData();
      await syncDataToCloud(data, 'manual');
      const snapshots = await getCloudBackupSnapshots();
      setBackupSnapshots(snapshots);
      showTemporaryStatus('Firebase 백업 완료!');
    } catch (e) {
      showTemporaryStatus(`백업 실패: ${getCloudSyncErrorMessage(e)}`, 6000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownload = async () => {
    if (!confirm('클라우드에 저장된 데이터로 기기 데이터를 덮어씁니다. 진행하시겠습니까?')) return;
    setIsSyncing(true);
    setSyncStatus('Firebase에서 불러오는 중...');
    try {
      const data = await syncDataFromCloud();
      if (data) {
        onDataSync(data);
        showTemporaryStatus('Firebase 복원 완료!');
      } else {
        showTemporaryStatus('저장된 Firebase 백업이 없습니다.');
      }
    } catch (e) {
      showTemporaryStatus(`복원 실패: ${getCloudSyncErrorMessage(e)}`, 6000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    if (!confirm('선택한 백업으로 현재 기기 데이터를 덮어씁니다. 진행하시겠습니까?')) return;

    setIsSyncing(true);
    setSyncStatus('선택한 백업을 복원하는 중...');
    try {
      const data = await restoreCloudBackupSnapshot(snapshotId);
      if (data) {
        onDataSync(data);
        showTemporaryStatus('선택한 백업으로 복원 완료!');
      } else {
        showTemporaryStatus('선택한 백업에 데이터가 없습니다.');
      }
    } catch (error) {
      showTemporaryStatus(`선택 백업 복원 실패: ${getCloudSyncErrorMessage(error)}`, 6000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!confirm('선택한 백업 스냅샷을 삭제합니다. 진행하시겠습니까?')) return;

    setIsSyncing(true);
    setSyncStatus('백업 스냅샷을 삭제하는 중...');
    try {
      await deleteCloudBackupSnapshot(snapshotId);
      setBackupSnapshots((prev: CloudBackupSnapshot[]) => prev.filter((snapshot: CloudBackupSnapshot) => snapshot.id !== snapshotId));
      showTemporaryStatus('백업 스냅샷 삭제 완료!');
    } catch (error) {
      showTemporaryStatus(`백업 스냅샷 삭제 실패: ${getCloudSyncErrorMessage(error)}`, 6000);
    } finally {
      setIsSyncing(false);
    }
  };

  const [showResetModal, setShowResetModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const handleFactoryReset = async () => {
    await clearStorage();
    window.location.reload();
  };

  const handleManualSave = async () => {
    const data = getAllData();
    try {
      await Promise.all(
        Object.entries(data).map(([key, value]) => setStorage(key, value))
      );
      alert('모든 데이터가 현재 기기에 안전하게 저장되었습니다!');
    } catch (error) {
      console.error('수동 저장 실패', error);
      alert('수동 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-12">
      {/* Dark Mode & Theme Settings */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none border border-blue-50 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-blue-900 dark:text-white flex items-center gap-2 mb-2">
            {isDarkMode ? <Moon className="w-6 h-6 text-indigo-400" /> : <Sun className="w-6 h-6 text-orange-400" />}
            화면 테마
          </h3>
          <p className="text-sm font-medium text-blue-400 dark:text-slate-400">눈이 편안한 테마를 설정해보세요.</p>
        </div>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-white rounded-xl font-bold transition-colors hover:bg-blue-100 dark:hover:bg-slate-600"
        >
          {isDarkMode ? '밝은 테마로 변경' : '어두운 테마로 변경'}
        </button>
      </div>

      {/* Font Size Settings */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none border border-blue-50 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-blue-900 dark:text-white flex items-center gap-2 mb-2">
            <Type className="w-6 h-6 text-slate-500" />
            글자 크기 조절
          </h3>
          <p className="text-sm font-medium text-blue-400 dark:text-slate-400">
            화면의 전체적인 글자 크기를 키우거나 줄입니다.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-600">
           <button 
             onClick={() => setGlobalFontSize(s => Math.max(10, s - 1))}
             className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold shadow-sm flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition"
           >
             -
           </button>
           <span className="font-bold text-slate-800 dark:text-white w-12 text-center text-lg">{globalFontSize}px</span>
           <button 
             onClick={() => setGlobalFontSize(s => Math.min(24, s + 1))}
             className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold shadow-sm flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition"
           >
             +
           </button>
        </div>
      </div>

      {/* Prevent Word Wrap Settings */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none border border-blue-50 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-blue-900 dark:text-white flex items-center gap-2 mb-2">
            <AlignLeft className="w-6 h-6 text-indigo-500" />
            글자 짤림 방지
          </h3>
          <p className="text-sm font-medium text-blue-400 dark:text-slate-400">
            화면이 좁을 때 단어 중간에 줄바꿈이 일어나는 것을 방지합니다.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={preventWordWrap} 
            onChange={(e) => setPreventWordWrap(e.target.checked)} 
          />
          <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-500"></div>
          <span className="ml-3 text-sm font-bold text-slate-600 dark:text-slate-300">
            {preventWordWrap ? 'ON' : 'OFF'}
          </span>
        </label>
      </div>

      {/* Mobile Nav Settings */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none border border-blue-50 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-blue-900 dark:text-white flex items-center gap-2 mb-2">
            <Target className="w-6 h-6 text-indigo-500" />
            작은 화면 상단 메뉴 표시
          </h3>
          <p className="text-sm font-medium text-blue-400 dark:text-slate-400">
            화면이 좁을 때 아이콘만 보이지 않고 메뉴명도 표시합니다. (좌우로 스와이프하여 탐색할 수 있습니다.)
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={showNavLabelsMobile} 
            onChange={(e) => setShowNavLabelsMobile(e.target.checked)} 
          />
          <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-500"></div>
          <span className="ml-3 text-sm font-bold text-slate-600 dark:text-slate-300">
            {showNavLabelsMobile ? 'ON' : 'OFF'}
          </span>
        </label>
      </div>

      {/* Auto Goal Display Mode */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none border border-blue-50 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-blue-900 dark:text-white flex items-center gap-2 mb-2">
            <Target className="w-6 h-6 text-red-500" />
            자동 도전 표시 설정
          </h3>
          <p className="text-sm font-medium text-blue-400 dark:text-slate-400">
            진행중인 자동 도전이 여러개일 때 어떤 방식으로 표시할지 설정합니다.
          </p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
          <button
            onClick={() => setAutoGoalDisplayMode('multiple')}
            className={cn("px-4 py-2 font-bold text-sm rounded-lg transition-colors", autoGoalDisplayMode === 'multiple' ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
          >
            개별 블록 표시
          </button>
          <button
            onClick={() => setAutoGoalDisplayMode('single')}
            className={cn("px-4 py-2 font-bold text-sm rounded-lg transition-colors", autoGoalDisplayMode === 'single' ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
          >
            하나의 블록에 분할 표시
          </button>
        </div>
      </div>

      {/* Local Data Manual Save */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none border border-blue-50 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-blue-900 dark:text-white flex items-center gap-2 mb-2">
            <Check className="w-6 h-6 text-emerald-500" />
            수동 데이터 저장
          </h3>
          <p className="text-sm font-medium text-blue-400 dark:text-slate-400">
            모든 데이터는 기기 및 클라우드에 자동 저장되지만, 원할 때 기기에 수동으로 저장할 수 있습니다.
          </p>
        </div>
        <button
          onClick={handleManualSave}
          className="shrink-0 flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-xl font-bold transition-colors hover:bg-indigo-600 shadow-sm"
        >
          지금 수동으로 저장하기
        </button>
      </div>

      {/* Cloud Sync Settings */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none border border-blue-50 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-blue-900 dark:text-white">구글 클라우드 동기화</h3>
            <p className="text-sm font-medium text-blue-400 dark:text-slate-400">Google Firestore에 학습 기록을 저장하고 여러 기기에서 이어가세요.</p>
          </div>
        </div>

        {!user ? (
          <div className="flex flex-col items-center justify-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 text-center">Google 계정으로 로그인한 뒤 Firebase 클라우드에 데이터를 안전하게 보관하세요.</p>
            <button className="gsi-material-button" onClick={handleLogin}>
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">Sign in with Google</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
              <div className="flex items-center gap-3">
                <img src={user.photoURL || ''} alt="Profile" className="w-10 h-10 rounded-full" />
                <div>
                  <p className="font-bold text-emerald-900 dark:text-emerald-100">{user.displayName}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">{user.email}</p>
                </div>
              </div>
              <button onClick={logout} className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={handleUpload} 
                disabled={isSyncing}
                className="flex items-center justify-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-bold transition-colors"
               >
                <Upload className="w-5 h-5" /> 클라우드 백업하기
              </button>
              <button 
                onClick={handleDownload} 
                disabled={isSyncing}
                className="flex items-center justify-center gap-2 p-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl font-bold transition-colors"
              >
                <Download className="w-5 h-5" /> 클라우드 가져오기
              </button>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4 space-y-2">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">자동 백업 상태</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{autoBackupStatus}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                최근 자동 백업: {lastAutoBackupAt ? new Date(lastAutoBackupAt).toLocaleString('ko-KR') : '아직 없음'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                자동 백업은 최신본을 유지하면서 스냅샷 여러 개를 남겨 실수 삭제 후에도 이전 상태로 복원할 수 있습니다.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                자동 백업 스냅샷은 최근 10개만 유지되며, 수동 백업 스냅샷은 별도로 남아 복원 선택 가능합니다.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">복원 가능한 백업 기록</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">수동 백업과 자동 백업 스냅샷을 모두 확인할 수 있습니다.</p>
                </div>
                {isLoadingSnapshots && <p className="text-xs text-slate-500 dark:text-slate-400">불러오는 중...</p>}
              </div>
              {backupSnapshots.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">아직 저장된 백업 기록이 없습니다.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {backupSnapshots.map((snapshot) => (
                    <div key={snapshot.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          {snapshot.source === 'manual' ? '수동 백업' : '자동 백업'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {snapshot.createdAt ? new Date(snapshot.createdAt).toLocaleString('ko-KR') : '시간 정보 없음'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRestoreSnapshot(snapshot.id)}
                          disabled={isSyncing}
                          className="flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-emerald-300"
                        >
                          <RotateCcw className="w-4 h-4" /> 복원
                        </button>
                        <button
                          onClick={() => handleDeleteSnapshot(snapshot.id)}
                          disabled={isSyncing}
                          className="flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300"
                        >
                          <Trash2 className="w-4 h-4" /> 삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {syncStatus && <p className="text-center font-bold text-sm text-blue-600 dark:text-blue-400">{syncStatus}</p>}
          </div>
        )}
      </div>

      {/* Customer Support */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none border border-blue-50 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-blue-900 dark:text-white flex items-center gap-2 mb-2">
            <MessageCircle className="w-6 h-6 text-purple-500" />
            고객센터
          </h3>
          <p className="text-sm font-medium text-blue-400 dark:text-slate-400">
            앱 사용 중 궁금한 점이나 개선 사항이 있다면 문의해주세요.
          </p>
        </div>
        <button
          onClick={() => setShowSupportModal(true)}
          className="shrink-0 flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-xl font-bold transition-colors hover:bg-purple-600 shadow-sm"
        >
          1:1 문의하기
        </button>
      </div>

      {/* Danger Zone: Reset All Data */}
      <div className="bg-red-50 dark:bg-red-900/10 p-8 rounded-3xl border border-red-100 dark:border-red-900/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
            전체 초기화 (Reset All Data)
          </h3>
          <p className="text-sm font-medium text-red-500/80 dark:text-red-400/80">
            D-Day, 오늘계획, 진도관리, 타이머, 달력, 통계, 알림설정 등 기기에 저장된 모든 데이터를 영구적으로 삭제합니다.
          </p>
        </div>
        <button
          onClick={() => setShowResetModal(true)}
          className="shrink-0 flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold transition-colors hover:bg-red-700 shadow-sm"
        >
          모든 데이터 삭제
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-6"
          >
            <div>
              <h3 className="text-xl font-black text-red-600 dark:text-red-400 mb-2">정말 모든 데이터를 삭제하겠습니까?</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                삭제된 데이터는 복구할 수 없습니다. (단, 클라우드에 백업을 해둔 경우 추후 다운로드로 복구 가능합니다.)
              </p>
            </div>
            
            <div className="flex gap-3 mt-2">
              <button 
                onClick={handleFactoryReset}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                전체 초기화
              </button>
              <button 
                onClick={() => setShowResetModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-xl transition-colors text-sm"
              >
                취소
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Support Confirmation Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-6"
          >
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-purple-500" />
                고객센터 1:1 문의
              </h3>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed text-center break-keep">
                어플 사용시 오류 발견사항이나 개선 사항 및 기타 문의사항은 "디스코드 채널 <a href="https://discord.gg/4GHSDBDAnE" target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600 hover:underline">https://discord.gg/4GHSDBDAnE</a>" 으로 문의 바랍니다.
              </p>
            </div>
            
            <button 
              onClick={() => setShowSupportModal(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-xl transition-colors text-sm"
            >
              닫기
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
