import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { initAuth, googleSignIn, logout, User } from "../lib/auth";
import {
  syncToDrive,
  syncFromDrive,
  getDriveSyncMetadata,
  getDriveSnapshots,
  BackupSnapshot,
  createDriveSnapshot,
} from "../lib/driveSync";
import {
  getIsLogMode,
  setIsLogModeConfig,
  clearLogs,
  exportLogsStr,
} from "../lib/logger";
import {
  Cloud,
  Check,
  Download,
  Upload,
  LogOut,
  Moon,
  Sun,
  Target,
  MessageCircle,
  Type,
  AlignLeft,
  Bell,
  ChevronRight,
  History,
  Info,
} from "lucide-react";
import { clearStorage, setStorage } from "../lib/storage";
import { cn, useLockBodyScroll } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import NoticeModal from "./NoticeModal";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Share } from "@capacitor/share";
import { Clipboard } from "@capacitor/clipboard";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { SystemHelper } from "../lib/systemHelper";
import { NOTICES } from "../data/notices";
import packageJson from "../../package.json";
import { registerBackHandler } from "../lib/backHandler";

const getLatestVersion = () => {
  const sorted = [...NOTICES].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted.filter((n) => !n.pinned)[0];
  return latest ? latest.version : packageJson.version;
};

import BaseModal from "./BaseModal";

interface SettingsProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  onDataSync: (data: any, newTimestamp: number) => void;
  getAllData: () => any;
  autoGoalDisplayMode: "multiple" | "single";
  setAutoGoalDisplayMode: (val: "multiple" | "single") => void;
  globalFontSize: number;
  setGlobalFontSize: (val: number | ((prev: number) => number)) => void;
  preventWordWrap: boolean;
  setPreventWordWrap: (val: boolean) => void;
  showNavLabelsMobile: boolean;
  setShowNavLabelsMobile: (val: boolean) => void;
  hideHeroText: boolean;
  setHideHeroText: (val: boolean | ((prev: boolean) => boolean)) => void;
  autoBackupStatus: string;
  lastAutoBackupAt: string | null;
  localDataTimestamp: number;
  syncNetworkPreference: "all" | "wifi_only";
  setSyncNetworkPreference: (val: "all" | "wifi_only") => void;
  language: string | null;
  setLanguage: (val: string) => void;
}

export default function Settings({
  isDarkMode,
  setIsDarkMode,
  onDataSync,
  getAllData,
  autoGoalDisplayMode,
  setAutoGoalDisplayMode,
  globalFontSize,
  setGlobalFontSize,
  preventWordWrap,
  setPreventWordWrap,
  showNavLabelsMobile,
  setShowNavLabelsMobile,
  hideHeroText,
  setHideHeroText,
  autoBackupStatus,
  lastAutoBackupAt,
  localDataTimestamp,
  syncNetworkPreference,
  setSyncNetworkPreference,
  language,
  setLanguage,
}: SettingsProps) {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isLogMode, setIsLogMode] = useState(getIsLogMode());
  const [remoteDataTimestamp, setRemoteDataTimestamp] = useState<number | null>(
    null
  );
  const [isFetchingRemoteDate, setIsFetchingRemoteDate] = useState(false);
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [isFetchingSnapshots, setIsFetchingSnapshots] = useState(false);
  const [appVersion, setAppVersion] = useState<string>(getLatestVersion());

  const showTemporaryStatus = (message: string, duration = 4000) => {
    setSyncStatus(message);
    window.setTimeout(() => setSyncStatus(null), duration);
  };

  const refreshRemoteTimestamp = async () => {
    if (!user) return;
    try {
      setIsFetchingRemoteDate(true);
      const ts = await getDriveSyncMetadata();
      setRemoteDataTimestamp(ts);
    } catch {
      // Ignore
    } finally {
      setIsFetchingRemoteDate(false);
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (u) => setUser(u),
      () => setUser(null)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    refreshRemoteTimestamp();
  }, [user]);

  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) setUser(res.user);
    } catch (e: any) {
      console.error(e);
      try {
        window.alert(t("settings.sync.loginFailed"));
      } catch (err) {}
    }
  };

  const handleUpload = async () => {
    setIsSyncing(true);
    setSyncStatus(t("settings.sync.uploading"));
    try {
      const data = getAllData();
      await syncToDrive(data, Date.now());
      await createDriveSnapshot(data, "수동");
      showTemporaryStatus(t("settings.sync.uploadComplete"));
    } catch (e: any) {
      showTemporaryStatus(
        t("settings.sync.uploadFailed", { message: e.message }),
        6000
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownload = async () => {
    setIsSyncing(true);
    setSyncStatus(t("settings.sync.downloading"));
    try {
      const res = await syncFromDrive();
      if (res && res.data) {
        onDataSync(res.data, res.timestamp);
        showTemporaryStatus(t("settings.sync.downloadComplete"));
      } else {
        showTemporaryStatus(t("settings.sync.noData"));
      }
    } catch (e: any) {
      showTemporaryStatus(
        t("settings.sync.downloadFailed", { message: e.message }),
        6000
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFetchSnapshots = async () => {
    setShowSnapshots(!showSnapshots);
    if (!showSnapshots) {
      setIsFetchingSnapshots(true);
      try {
        const res = await getDriveSnapshots();
        setSnapshots(res || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsFetchingSnapshots(false);
      }
    }
  };

  const handleRestoreSnapshot = (snapshot: BackupSnapshot) => {
    let proceed = false;
    try {
      proceed = window.confirm(
        t("settings.sync.snapshotRestoreConfirm")
      );
    } catch (e) {
      proceed = true;
    }
    if (proceed) {
      onDataSync(snapshot.data, Date.now());
      showTemporaryStatus(t("settings.sync.snapshotRestoreComplete"), 3000);
    }
  };

  const [showResetModal, setShowResetModal] = useState(false);
  const [showClearLogsModal, setShowClearLogsModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  useLockBodyScroll(showClearLogsModal || showResetModal || showSupportModal || showNoticeModal);

  useEffect(() => {
    if (showResetModal) {
      return registerBackHandler(() => {
        setShowResetModal(false);
        return true;
      });
    }
    if (showSupportModal) {
       return registerBackHandler(() => {
         setShowSupportModal(false);
         return true;
       });
    }
  }, [showResetModal, showSupportModal]);

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
      try {
        window.alert(t("settings.localSave.saved"));
      } catch (e) {}
    } catch (error) {
      console.error(t("settings.localSave.manualSaveError"), error);
      try {
        window.alert(t("settings.localSave.manualSaveError"));
      } catch (e) {}
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* 0. Notices */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          onClick={() => setShowNoticeModal(true)}
          className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500 shrink-0 group-hover:scale-105 transition-transform">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                {t("settings.notice.title")}
              </h3>
              <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                {t("settings.notice.desc")}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 transition-colors shrink-0" />
        </button>
      </div>

      {/* 1. Display */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-[0.8125rem] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {t("settings.display.title")}
          </h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {/* Language */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                {t("settings.language.title")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("settings.language.desc")}
              </p>
            </div>
            <select
              value={language || "ko"}
              onChange={(e) => setLanguage(e.target.value)}
              className="shrink-0 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl font-bold cursor-pointer outline-none"
            >
              <option value="ko">{t("settings.language.ko")}</option>
              <option value="en">{t("settings.language.en")}</option>
              <option value="ja">{t("settings.language.ja")}</option>
            </select>
          </div>

          {/* Dark Mode */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                {isDarkMode ? (
                  <Moon className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Sun className="w-4 h-4 text-orange-400" />
                )}
                {t("settings.theme.title")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("settings.theme.desc")}
              </p>
            </div>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="shrink-0 px-4 py-2 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              {isDarkMode
                ? t("settings.theme.light")
                : t("settings.theme.dark")}
            </button>
          </div>

          {/* Font Size */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                <Type className="w-4 h-4 text-slate-400" />
                {t("settings.fontSize.title")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("settings.fontSize.desc")}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setGlobalFontSize((s) => Math.max(10, s - 1))}
                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold shadow-sm flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                -
              </button>
              <span className="font-bold text-slate-800 dark:text-white w-10 text-center text-xs">
                {globalFontSize}px
              </span>
              <button
                onClick={() => setGlobalFontSize((s) => Math.min(24, s + 1))}
                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold shadow-sm flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Prevent Word Wrap */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                <AlignLeft className="w-4 h-4 text-indigo-400" />
                {t("settings.preventWrap.title")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("settings.preventWrap.desc")}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={preventWordWrap}
                onChange={(e) => setPreventWordWrap(e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
            </label>
          </div>

          {/* Mobile Nav Settings */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-indigo-400" />
                {t("settings.mobileNav.title")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("settings.mobileNav.desc")}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={showNavLabelsMobile}
                onChange={(e) => setShowNavLabelsMobile(e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
            </label>
          </div>

          {/* Auto Goal Display Mode */}
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-red-500" />
                {t("settings.autoGoal.title")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("settings.autoGoal.desc")}
              </p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl shrink-0 w-full sm:w-auto">
              <button
                onClick={() => setAutoGoalDisplayMode("multiple")}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-2 font-bold text-xs rounded-lg transition-colors",
                  autoGoalDisplayMode === "multiple"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                {t("settings.autoGoal.multiple")}
              </button>
              <button
                onClick={() => setAutoGoalDisplayMode("single")}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-2 font-bold text-xs rounded-lg transition-colors",
                  autoGoalDisplayMode === "single"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                {t("settings.autoGoal.single")}
              </button>
            </div>
          </div>
          {/* Hide Hero Text */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                <AlignLeft className="w-4 h-4 text-indigo-400" />
                {t("settings.hideHeroText.title", "상단 인사말 숨기기")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(
                  "settings.hideHeroText.desc",
                  "각 탭 최상단의 인사말 문구를 화면에서 감춥니다."
                )}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={hideHeroText}
                onChange={(e) => setHideHeroText(e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 2. Data & Sync */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-[0.8125rem] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {t("settings.sync.title")}
          </h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {/* Cloud Sync */}
          <div className="px-5 py-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full max-w-full overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500 shrink-0">
                  <Cloud className="w-5 h-5" />
                </div>
                <div className="overflow-hidden w-full min-w-0 pr-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 truncate">
                    {t("settings.sync.google.title")}
                  </h3>
                  <p
                    className="text-xs text-slate-500 dark:text-slate-400 truncate w-full"
                    style={{ minWidth: 0 }}
                  >
                    {t("settings.sync.google.desc")}
                  </p>
                </div>
              </div>
              {user && (
                <button
                  onClick={logout}
                  className="shrink-0 p-2.5 text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
                  title={t("settings.sync.logout")}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>

            {!user ? (
              <div className="flex flex-col items-center justify-center py-6 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4 text-center">
                  {t("settings.sync.loginPrompt")}
                </p>
                <button
                  className="gsi-material-button scale-95 origin-center -my-1"
                  onClick={handleLogin}
                >
                  <div className="gsi-material-button-state"></div>
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        ></path>
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        ></path>
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        ></path>
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        ></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">
                      {t("settings.sync.signIn")}
                    </span>
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 mt-2">
                <div className="flex items-center gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                  <img
                    src={user.photoURL || ""}
                    alt="Profile"
                    className="w-8 h-8 rounded-full shadow-sm"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                      {user.displayName || t("settings.sync.googleFallback")}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleUpload}
                    disabled={isSyncing}
                    className="flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
                  >
                    <Upload className="w-4 h-4" /> {t("settings.sync.upload")}
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={isSyncing}
                    className="flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />{" "}
                    {t("settings.sync.download")}
                  </button>
                </div>

                <div className="flex flex-col gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {t("settings.sync.autoStatusTitle")}
                      </span>
                      <span className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                        {t("settings.sync.autoStatusDesc")}
                      </span>
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg text-center">
                      {autoBackupStatus}
                    </span>
                  </div>

                  <div className="w-full h-px bg-slate-200 dark:bg-slate-700/50" />

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[0.6875rem]">
                      <span className="text-slate-500 font-medium whitespace-nowrap">
                        {t("settings.sync.localData")}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 truncate pl-2">
                        {new Date(localDataTimestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[0.6875rem]">
                      <span className="text-slate-500 font-medium whitespace-nowrap">
                        {t("settings.sync.remoteData")}
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 truncate pl-2">
                        {isFetchingRemoteDate
                          ? t("settings.sync.checking")
                          : remoteDataTimestamp
                          ? new Date(remoteDataTimestamp).toLocaleString()
                          : t("common.none")}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-px bg-slate-200 dark:bg-slate-700/50" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {t("settings.sync.networkTitle")}
                    </span>
                    <select
                      value={syncNetworkPreference}
                      onChange={(e) =>
                        setSyncNetworkPreference(
                          e.target.value as "all" | "wifi_only"
                        )
                      }
                      className="px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg outline-none cursor-pointer"
                    >
                      <option value="all">
                        {t("settings.sync.network.all")}
                      </option>
                      <option value="wifi_only">
                        {t("settings.sync.network.wifi_only")}
                      </option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                  <button
                    onClick={handleFetchSnapshots}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                      <History className="w-4 h-4 text-orange-500" />
                      {t("settings.sync.snapshotsTitle")}
                    </div>
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 text-slate-400 transition-transform",
                        showSnapshots && "rotate-90"
                      )}
                    />
                  </button>
                  {showSnapshots && (
                    <div className="px-4 pb-4 flex flex-col gap-2">
                      {isFetchingSnapshots ? (
                        <div className="text-center py-4 text-xs font-medium text-slate-500">
                          {t("settings.sync.snapshotsLoading")}
                        </div>
                      ) : snapshots.length === 0 ? (
                        <div className="text-center py-4 text-xs font-medium text-slate-500">
                          {t("settings.sync.snapshotsEmpty")}
                        </div>
                      ) : (
                        snapshots.map((snap) => (
                          <div
                            key={snap.id}
                            className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {new Date(snap.timestamp).toLocaleString()}
                              </span>
                              <span className="text-[0.625rem] py-0.5 px-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded self-start font-medium">
                                {snap.tag}
                              </span>
                            </div>
                            <button
                              onClick={() => handleRestoreSnapshot(snap)}
                              className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                            >
                              {t("settings.sync.snapshotRestore")}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {syncStatus && (
                  <p className="text-center font-bold text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 py-2 rounded-xl">
                    {syncStatus}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Local Data Save */}
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                <Check className="w-4 h-4 text-emerald-500" />
                {t("settings.localSave.title")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("settings.localSave.desc")}
              </p>
            </div>
            <button
              onClick={handleManualSave}
              className="shrink-0 w-full sm:w-auto px-5 py-2.5 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors shadow-sm"
            >
              {t("settings.localSave.saveButton")}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Advanced Settings & Support */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-[0.8125rem] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {t("settings.advanced.title")}
          </h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {/* App Version */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                <Info className="w-4 h-4 text-teal-500" />
                {t("settings.version.title")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("settings.version.desc")}
              </p>
            </div>
            <div className="shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
              <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                {appVersion.startsWith("v") ? appVersion : `v${appVersion}`}
              </span>
            </div>
          </div>

          {/* Support */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                <MessageCircle className="w-4 h-4 text-purple-500" />
                {t("settings.support.title")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("settings.support.desc")}
              </p>
            </div>
            <button
              onClick={() => setShowSupportModal(true)}
              className="shrink-0 px-4 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-bold transition-colors"
            >
              {t("settings.support.contact")}
            </button>
          </div>

          {/* Dev Logs */}
          <div className="px-5 py-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                  <Check className="w-4 h-4 text-indigo-500" />
                  {t("settings.devLogs.title")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("settings.devLogs.desc")}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isLogMode}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setIsLogModeConfig(val);
                    setIsLogMode(val);
                    showTemporaryStatus(
                      val
                        ? t("settings.devLogs.enabled")
                        : t("settings.devLogs.disabled"),
                      2000
                    );
                  }}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>
            {isLogMode && (
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={() => setShowClearLogsModal(true)}
                  className="px-4 py-2 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl transition-colors"
                >
                  {t("settings.devLogs.clear")}
                </button>
                <button
                  onClick={async () => {
                    const frontendLogs = exportLogsStr();
                    let finalLogData = frontendLogs;
                    
                    if (Capacitor.isNativePlatform()) {
                      try {
                        let nativeLogcat = "";
                        try {
                          const { logcat } = await SystemHelper.getLogcat();
                          nativeLogcat = logcat;
                        } catch(err) {}
                        
                        const fullLogObj = {
                          appLogs: JSON.parse(frontendLogs || "[]"),
                          logcat: nativeLogcat
                        };
                        finalLogData = JSON.stringify(fullLogObj, null, 2);
                        
                        const fileName = `BrightStudy_Logs_${new Date().toISOString().replace(/:/g, '-')}.json`;
                        
                        try {
                           await SystemHelper.saveLogToDownloads({ data: finalLogData, fileName });
                        } catch(e) {}
                        
                        const writeResult = await Filesystem.writeFile({
                          path: fileName,
                          data: finalLogData,
                          directory: Directory.Cache,
                          encoding: Encoding.UTF8,
                        });
                        
                        await Share.share({
                          title: "BrightStudy Logs",
                          url: writeResult.uri,
                          dialogTitle: "Share Logs"
                        });
                      } catch (e) {
                         // fallback if share or write fails
                         try {
                           await Clipboard.write({ string: finalLogData.substring(0, 50000) }); // clipboard has limits
                           showTemporaryStatus(t("settings.devLogs.copiedToClipboard"), 2000);
                         } catch (err) {}
                      }
                    } else if (typeof window !== 'undefined' && '__TAURI__' in window) {
                      try {
                        const { downloadDir, join } = await import('@tauri-apps/api/path');
                        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
                        const downloads = await downloadDir();
                        const fileName = `BrightStudy_Logs_${new Date().toISOString().replace(/:/g, '-')}.json`;
                        const filePath = await join(downloads, fileName);
                        await writeTextFile(filePath, finalLogData);
                        showTemporaryStatus(t("settings.devLogs.export") + " (Downloads)", 2000);
                      } catch (e) {
                        console.error('Failed to save log via tauri:', e);
                        try {
                          await navigator.clipboard.writeText(finalLogData.substring(0, 50000));
                          showTemporaryStatus(t("settings.devLogs.copiedToClipboard"), 2000);
                        } catch (err) {}
                      }
                    } else {
                      const blob = new Blob([finalLogData], {
                        type: "application/json",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `BrightStudy_Logs_${new Date()
                        .toISOString()
                        .slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
                >
                  {t("settings.devLogs.export")}
                </button>
              </div>
            )}
          </div>

          {/* Factory Reset */}
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-red-50/50 dark:bg-red-900/10">
            <div>
              <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">
                {t("settings.factory.title")}
              </h3>
              <p className="text-xs text-red-500/80 dark:text-red-400/80">
                {t("settings.factory.desc")}
              </p>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="shrink-0 w-full sm:w-auto px-4 py-2 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl font-bold transition-colors"
            >
              {t("settings.factory.resetButton")}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showNoticeModal && (
        <NoticeModal onClose={() => setShowNoticeModal(false)} />
      )}

      <BaseModal isOpen={showClearLogsModal} onClose={() => setShowClearLogsModal(false)} className="max-w-sm p-8 flex flex-col gap-6" hideCloseButton={true}>
            <div>
              <h3 className="text-xl font-black text-red-600 dark:text-red-400 mb-2">
                {t("settings.devLogs.clear")}
              </h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t("settings.devLogs.confirmDelete")}
              </p>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => {
                  clearLogs();
                  setShowClearLogsModal(false);
                  showTemporaryStatus(t("settings.devLogs.deleted"), 2000);
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                {t("common.delete")}
              </button>
              <button
                onClick={() => setShowClearLogsModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-xl transition-colors text-sm"
              >
                {t("common.cancel")}
              </button>
            </div>
      </BaseModal>

      <BaseModal isOpen={showResetModal} onClose={() => setShowResetModal(false)} className="max-w-sm p-8 flex flex-col gap-6" hideCloseButton={true}>
            <div>
              <h3 className="text-xl font-black text-red-600 dark:text-red-400 mb-2">
                {t("settings.factory.confirmTitle")}
              </h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t("settings.factory.confirmDesc")}
              </p>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={handleFactoryReset}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                {t("common.delete")}
              </button>
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-xl transition-colors text-sm"
              >
                {t("common.cancel")}
              </button>
            </div>
      </BaseModal>

      <BaseModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} className="max-w-sm p-8 flex flex-col gap-6" hideCloseButton={true}>
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-purple-500" />
                {t("settings.support.modalTitle")}
              </h3>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed text-center break-keep">
                {t("settings.support.modalDesc")}
                <br />
                <br />
                <a
                  href="https://discord.gg/4GHSDBDAnE"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl inline-block w-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  {t("settings.support.discord")}
                </a>
              </p>
            </div>

            <button
              onClick={() => setShowSupportModal(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-xl transition-colors text-sm mt-2"
            >
              {t("common.close")}
            </button>
      </BaseModal>
    </div>
  );
}
