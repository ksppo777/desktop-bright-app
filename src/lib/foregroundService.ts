import { Capacitor } from "@capacitor/core";
import { SystemHelper, NotificationStrings } from "./systemHelper";

/**
 * 알림바 다국어 문자열을 가져오는 헬퍼
 * react-i18next의 t 함수를 받아서 네이티브 서비스에 전달할 문자열 객체를 생성
 */
export function getNotificationStrings(t: any): NotificationStrings {
  return {
    strFocusMode: t("notification.focusMode", "집중 모드"),
    strBreakMode: t("notification.breakMode", "휴식 모드"),
    strRunning: t("notification.running", "실행 중"),
    strRemaining: t("notification.remaining", "남은 시간"),
    strElapsed: t("notification.elapsed", "경과 시간"),
    strPaused: t("notification.paused", "일시정지"),
    strPlay: t("notification.play", "재생"),
    strPause: t("notification.pause", "일시정지"),
    strStop: t("notification.stop", "정지"),
    strTimerComplete: t("notification.timerComplete", "타이머 완료!"),
    strFocusEnded: t("notification.focusEnded", "고생했어요! 휴식 시간을 가지세요."),
    strBreakEnded: t("notification.breakEnded", "휴식 완료! 다시 집중을 시작해볼까요?"),
    strAppRunning: t("notification.appRunning", "Bright Study가 실행 중입니다"),
    strTapToOpen: t("notification.tapToOpen", "탭하여 앱 열기"),
  };
}

/**
 * 포그라운드 타이머 알림 시작
 */
export async function startForegroundTimer(
  timerMode: string,
  timerType: string,
  timeLeftSec: number,
  title: string,
  alertMode: string,
  t: any
) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SystemHelper.startForegroundTimer({
      timerMode,
      timerType,
      timeLeftSec,
      title,
      alertMode,
      ...getNotificationStrings(t),
    });
  } catch (e) {
    console.error("Failed to start foreground timer:", e);
  }
}

/**
 * 알림바 타이머 일시정지
 */
export async function pauseForegroundTimer() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SystemHelper.pauseForegroundTimer();
  } catch (e) {
    console.error("Failed to pause foreground timer:", e);
  }
}

/**
 * 알림바 타이머 재개
 */
export async function resumeForegroundTimer() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SystemHelper.resumeForegroundTimer();
  } catch (e) {
    console.error("Failed to resume foreground timer:", e);
  }
}

/**
 * 알림바 타이머 정지 → idle 알림으로 전환
 */
export async function stopForegroundTimer() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SystemHelper.stopForegroundTimer();
  } catch (e) {
    console.error("Failed to stop foreground timer:", e);
  }
}

/**
 * 유휴 상태 알림 시작 (앱 실행 중)
 */
export async function startIdleNotification(t: any) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SystemHelper.startIdleNotification(getNotificationStrings(t));
  } catch (e) {
    console.error("Failed to start idle notification:", e);
  }
}

/**
 * 알림 서비스 완전 종료
 */
export async function stopNotificationService() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SystemHelper.stopNotificationService();
  } catch (e) {
    console.error("Failed to stop notification service:", e);
  }
}

/**
 * 알림 버튼 액션 이벤트 리스너 등록
 */
export async function addTimerActionListener(
  callback: (action: string, remainingSeconds: number) => void
): Promise<{ remove: () => void } | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const handle = await SystemHelper.addListener("timerAction", (data) => {
      callback(data.action, data.remainingSeconds);
    });
    return handle;
  } catch (e) {
    console.error("Failed to add timer action listener:", e);
    return null;
  }
}
