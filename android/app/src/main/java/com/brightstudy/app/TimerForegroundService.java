package com.brightstudy.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.content.pm.ServiceInfo;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.content.Context;

import androidx.core.app.NotificationCompat;

public class TimerForegroundService extends Service {

    public static final String CHANNEL_ID = "brightstudy_timer";
    public static final int NOTIFICATION_ID = 99;

    // Actions from SystemHelperPlugin
    public static final String ACTION_START_TIMER = "com.brightstudy.START_TIMER";
    public static final String ACTION_PAUSE_TIMER = "com.brightstudy.PAUSE_TIMER";
    public static final String ACTION_RESUME_TIMER = "com.brightstudy.RESUME_TIMER";
    public static final String ACTION_STOP_TIMER = "com.brightstudy.STOP_TIMER";
    public static final String ACTION_START_IDLE = "com.brightstudy.START_IDLE";
    public static final String ACTION_STOP_SERVICE = "com.brightstudy.STOP_SERVICE";
    public static final String ACTION_UPDATE_STRINGS = "com.brightstudy.UPDATE_STRINGS";

    // Actions from notification buttons
    public static final String ACTION_NOTIF_PLAY_PAUSE = "com.brightstudy.NOTIF_PLAY_PAUSE";
    public static final String ACTION_NOTIF_STOP = "com.brightstudy.NOTIF_STOP";

    // Timer state
    private String timerMode = "idle"; // "focus", "break", "idle"
    private String timerType = "beginner"; // "beginner", "expert", "stopwatch"
    private boolean isTimerActive = false;
    private int initialTimeLeftSec = 0;
    private int currentTimeLeftSec = 0; // for countdown (paused state snapshot)
    private long chronometerBase = 0; // SystemClock.elapsedRealtime() base
    private String title = "Bright Study";
    private String alertMode = "sound";

    // i18n strings (passed from JS)
    private String strFocusMode = "집중 모드";
    private String strBreakMode = "휴식 모드";
    private String strRunning = "실행 중";
    private String strRemaining = "남은 시간";
    private String strElapsed = "경과 시간";
    private String strPaused = "일시정지";
    private String strPlay = "재생";
    private String strPause = "일시정지";
    private String strStop = "정지";
    private String strTimerComplete = "타이머 완료!";
    private String strFocusEnded = "고생했어요! 휴식 시간을 가지세요.";
    private String strBreakEnded = "휴식 완료! 다시 집중을 시작해볼까요?";
    private String strAppRunning = "Bright Study가 실행 중입니다";
    private String strTapToOpen = "탭하여 앱 열기";

    // Completion handler
    private Handler handler = new Handler(Looper.getMainLooper());
    private Runnable timerCompleteRunnable;

    // Callback to SystemHelperPlugin
    public static volatile TimerActionCallback actionCallback;

    public interface TimerActionCallback {
        void onTimerAction(String action, int remainingSeconds);
    }

    // Singleton Instance
    private static volatile TimerForegroundService instance = null;
    public static TimerForegroundService getInstance() { return instance; }

    // WakeLock for Doze Mode accuracy
    private android.os.PowerManager.WakeLock serviceWakeLock = null;

    private void acquireWakeLock() {
        if (serviceWakeLock == null) {
            android.os.PowerManager pm = (android.os.PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                serviceWakeLock = pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "BrightStudy:TimerServiceWakelock");
            }
        }
        if (serviceWakeLock != null && !serviceWakeLock.isHeld()) {
            serviceWakeLock.acquire();
        }
    }

    private void releaseWakeLock() {
        if (serviceWakeLock != null && serviceWakeLock.isHeld()) {
            serviceWakeLock.release();
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            android.util.Log.d("TimerService", "onStartCommand: intent is null");
            showNotification(buildIdleNotification());
            return START_STICKY;
        }

        String action = intent.getAction();
        android.util.Log.d("TimerService", "onStartCommand action: " + action);
        if (action == null) {
            showNotification(buildIdleNotification());
            return START_STICKY;
        }

        switch (action) {
            case ACTION_START_TIMER:
                handleStartTimer(intent);
                break;
            case ACTION_PAUSE_TIMER:
                handlePauseTimer();
                break;
            case ACTION_RESUME_TIMER:
                handleResumeTimer();
                break;
            case ACTION_STOP_TIMER:
                handleStopTimer(false);
                break;
            case ACTION_START_IDLE:
                handleStartIdle(intent);
                break;
            case ACTION_STOP_SERVICE:
                android.util.Log.d("TimerService", "onStartCommand ACTION_STOP_SERVICE");
                cancelTimerComplete();
                stopForeground(true);
                stopSelf();
                break;
            case ACTION_UPDATE_STRINGS:
                extractStrings(intent);
                updateNotification();
                break;
            case ACTION_NOTIF_PLAY_PAUSE:
                handleNotifPlayPause();
                break;
            case ACTION_NOTIF_STOP:
                handleNotifStop();
                break;
        }

        return START_STICKY;
    }

    private void handleStartTimer(Intent intent) {
        timerMode = intent.getStringExtra("timerMode");
        if (timerMode == null) timerMode = "focus";
        timerType = intent.getStringExtra("timerType");
        if (timerType == null) timerType = "beginner";
        int timeLeftSec = intent.getIntExtra("timeLeftSec", 0);
        initialTimeLeftSec = timeLeftSec;
        currentTimeLeftSec = timeLeftSec;
        title = intent.getStringExtra("title");
        if (title == null) title = "Bright Study";
        alertMode = intent.getStringExtra("alertMode");
        if (alertMode == null) alertMode = "sound";

        android.util.Log.d("TimerService", "handleStartTimer: mode=" + timerMode + ", type=" + timerType + ", timeLeftSec=" + timeLeftSec + ", title=" + title);

        extractStrings(intent);

        isTimerActive = true;
        acquireWakeLock();

        if ("stopwatch".equals(timerType)) {
            // Count up: chronometerBase = now - elapsed
            chronometerBase = SystemClock.elapsedRealtime() - (long) timeLeftSec * 1000;
        } else {
            // Count down: chronometerBase = now + remaining
            chronometerBase = SystemClock.elapsedRealtime() + (long) timeLeftSec * 1000;
            scheduleTimerComplete(timeLeftSec);
        }

        showNotification(buildTimerNotification());
    }

    private void handlePauseTimer() {
        android.util.Log.d("TimerService", "handlePauseTimer: isTimerActive=" + isTimerActive);
        if (!isTimerActive) return;
        isTimerActive = false;
        cancelTimerComplete();
        releaseWakeLock();

        if ("stopwatch".equals(timerType)) {
            currentTimeLeftSec = (int) ((SystemClock.elapsedRealtime() - chronometerBase) / 1000);
        } else {
            currentTimeLeftSec = (int) ((chronometerBase - SystemClock.elapsedRealtime()) / 1000);
            if (currentTimeLeftSec < 0) currentTimeLeftSec = 0;
        }

        updateNotification();
    }

    private void handleResumeTimer() {
        android.util.Log.d("TimerService", "handleResumeTimer: isTimerActive=" + isTimerActive);
        if (isTimerActive) return;
        isTimerActive = true;
        acquireWakeLock();

        if ("stopwatch".equals(timerType)) {
            chronometerBase = SystemClock.elapsedRealtime() - (long) currentTimeLeftSec * 1000;
        } else {
            chronometerBase = SystemClock.elapsedRealtime() + (long) currentTimeLeftSec * 1000;
            scheduleTimerComplete(currentTimeLeftSec);
        }

        updateNotification();
    }

    private void handleStopTimer(boolean fromNotification) {
        android.util.Log.d("TimerService", "handleStopTimer: fromNotification=" + fromNotification);
        cancelTimerComplete();

        int elapsed;
        if ("stopwatch".equals(timerType)) {
            if (isTimerActive) {
                elapsed = (int) ((SystemClock.elapsedRealtime() - chronometerBase) / 1000);
            } else {
                elapsed = currentTimeLeftSec;
            }
        } else {
            if (isTimerActive) {
                int remaining = (int) ((chronometerBase - SystemClock.elapsedRealtime()) / 1000);
                if (remaining < 0) remaining = 0;
                elapsed = initialTimeLeftSec - remaining;
            } else {
                elapsed = initialTimeLeftSec - currentTimeLeftSec;
            }
        }

        isTimerActive = false;
        timerMode = "idle";
        currentTimeLeftSec = 0;
        initialTimeLeftSec = 0;
        releaseWakeLock();

        if (actionCallback != null) {
            actionCallback.onTimerAction("stop", elapsed);
        }

        updateNotification();
    }

    private void handleStartIdle(Intent intent) {
        android.util.Log.d("TimerService", "handleStartIdle");
        if (intent != null) {
            extractStrings(intent);
        }
        timerMode = "idle";
        isTimerActive = false;
        cancelTimerComplete();
        releaseWakeLock();
        
        // Reset state for idle
        chronometerBase = 0;
        currentTimeLeftSec = 0;
        initialTimeLeftSec = 0;
        
        showNotification(buildIdleNotification());
    }

    private void handleNotifPlayPause() {
        if (isTimerActive) {
            handlePauseTimer();
            if (actionCallback != null) {
                actionCallback.onTimerAction("pause", currentTimeLeftSec);
            }
        } else if (!"idle".equals(timerMode)) {
            handleResumeTimer();
            if (actionCallback != null) {
                actionCallback.onTimerAction("play", currentTimeLeftSec);
            }
        }
    }

    private void handleNotifStop() {
        handleStopTimer(true);
    }

    // --- Notification Building ---

    private Notification buildTimerNotification() {
        String notifTitle;
        if ("focus".equals(timerMode)) {
            notifTitle = "Bright Study - " + strFocusMode;
        } else if ("break".equals(timerMode)) {
            notifTitle = "Bright Study - " + strBreakMode;
        } else {
            notifTitle = "Bright Study";
        }

        // Intent to open app
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPi = PendingIntent.getActivity(this, 0, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_timer)
                .setContentTitle(notifTitle)
                .setContentIntent(openPi)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setPriority(NotificationCompat.PRIORITY_LOW);

        if (isTimerActive) {
            // Chronometer active
            builder.setUsesChronometer(true);
            long wallClockTime = System.currentTimeMillis() - SystemClock.elapsedRealtime() + chronometerBase;
            builder.setWhen(wallClockTime);
            if (!"stopwatch".equals(timerType) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                builder.setChronometerCountDown(true);
            }

            String subtitle = "stopwatch".equals(timerType) ? strElapsed : strRemaining;
            if (title != null && !title.isEmpty()) {
                subtitle = title + " • " + subtitle;
            }
            builder.setContentText(subtitle);

            // Pause + Stop buttons
            builder.addAction(createAction(strPause, ACTION_NOTIF_PLAY_PAUSE, 1));
            builder.addAction(createAction(strStop, ACTION_NOTIF_STOP, 2));
        } else {
            // Paused state - static time display
            builder.setUsesChronometer(false);
            builder.setShowWhen(false);

            String timeStr = formatSeconds(currentTimeLeftSec);
            String subtitle = strPaused + " - " + timeStr;
            if (title != null && !title.isEmpty()) {
                subtitle = title + " • " + subtitle;
            }
            builder.setContentText(subtitle);

            // Play + Stop buttons
            builder.addAction(createAction(strPlay, ACTION_NOTIF_PLAY_PAUSE, 1));
            builder.addAction(createAction(strStop, ACTION_NOTIF_STOP, 2));
        }

        return builder.build();
    }

    private Notification buildIdleNotification() {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPi = PendingIntent.getActivity(this, 0, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_timer)
                .setContentTitle("Bright Study")
                .setContentText(strAppRunning)
                .setSubText(strTapToOpen)
                .setContentIntent(openPi)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private NotificationCompat.Action createAction(String title, String intentAction, int requestCode) {
        Intent intent = new Intent(this, TimerForegroundService.class);
        intent.setAction(intentAction);
        PendingIntent pi = PendingIntent.getService(this, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Action.Builder(0, title, pi).build();
    }

    private void showNotification(Notification notification) {
        android.util.Log.d("TimerService", "showNotification: Calling startForegroundCompat");
        startForegroundCompat(NOTIFICATION_ID, notification);
    }

    private void updateNotification() {
        android.util.Log.d("TimerService", "updateNotification timerMode: " + timerMode + ", isTimerActive: " + isTimerActive);
        Notification notification;
        if ("idle".equals(timerMode)) {
            notification = buildIdleNotification();
        } else {
            notification = buildTimerNotification();
        }
        showNotification(notification);
    }

    // --- Timer Completion ---

    private void scheduleTimerComplete(int secondsFromNow) {
        cancelTimerComplete();
        timerCompleteRunnable = () -> {
            isTimerActive = false;
            currentTimeLeftSec = 0;
            releaseWakeLock();
            playAlert();
            bringAppToFront();

            if (actionCallback != null) {
                actionCallback.onTimerAction("complete", initialTimeLeftSec);
            }

            timerMode = "idle";
            updateNotification();
        };
        handler.postDelayed(timerCompleteRunnable, (long) secondsFromNow * 1000);
    }

    private void cancelTimerComplete() {
        if (timerCompleteRunnable != null) {
            handler.removeCallbacks(timerCompleteRunnable);
            timerCompleteRunnable = null;
        }
    }

    private void playAlert() {
        if ("off".equals(alertMode)) return;

        if ("sound".equals(alertMode) || "both".equals(alertMode)) {
            try {
                MediaPlayer mp = MediaPlayer.create(this, android.provider.Settings.System.DEFAULT_NOTIFICATION_URI);
                if (mp != null) {
                    mp.setOnCompletionListener(MediaPlayer::release);
                    mp.start();
                }
            } catch (Exception e) {
                // ignore
            }
        }

        if ("vibrate".equals(alertMode) || "both".equals(alertMode)) {
            try {
                long[] pattern = {0, 500, 200, 500, 200, 500};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                    Vibrator vibrator = vm.getDefaultVibrator();
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                } else {
                    Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                    if (vibrator != null) {
                        vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                    }
                }
            } catch (Exception e) {
                // ignore
            }
        }
    }

    private void bringAppToFront() {
        try {
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
        } catch (Exception e) {
            // ignore
        }
    }

    // --- Helpers ---

    private void extractStrings(Intent intent) {
        if (intent.hasExtra("strFocusMode")) strFocusMode = intent.getStringExtra("strFocusMode");
        if (intent.hasExtra("strBreakMode")) strBreakMode = intent.getStringExtra("strBreakMode");
        if (intent.hasExtra("strRunning")) strRunning = intent.getStringExtra("strRunning");
        if (intent.hasExtra("strRemaining")) strRemaining = intent.getStringExtra("strRemaining");
        if (intent.hasExtra("strElapsed")) strElapsed = intent.getStringExtra("strElapsed");
        if (intent.hasExtra("strPaused")) strPaused = intent.getStringExtra("strPaused");
        if (intent.hasExtra("strPlay")) strPlay = intent.getStringExtra("strPlay");
        if (intent.hasExtra("strPause")) strPause = intent.getStringExtra("strPause");
        if (intent.hasExtra("strStop")) strStop = intent.getStringExtra("strStop");
        if (intent.hasExtra("strTimerComplete")) strTimerComplete = intent.getStringExtra("strTimerComplete");
        if (intent.hasExtra("strFocusEnded")) strFocusEnded = intent.getStringExtra("strFocusEnded");
        if (intent.hasExtra("strBreakEnded")) strBreakEnded = intent.getStringExtra("strBreakEnded");
        if (intent.hasExtra("strAppRunning")) strAppRunning = intent.getStringExtra("strAppRunning");
        if (intent.hasExtra("strTapToOpen")) strTapToOpen = intent.getStringExtra("strTapToOpen");
    }

    private String formatSeconds(int totalSeconds) {
        int h = totalSeconds / 3600;
        int m = (totalSeconds % 3600) / 60;
        int s = totalSeconds % 60;
        if (h > 0) {
            return String.format("%d:%02d:%02d", h, m, s);
        }
        return String.format("%02d:%02d", m, s);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Bright Study Timer",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("타이머 및 앱 실행 상태 알림");
            channel.setShowBadge(false);
            channel.setSound(null, null);
            channel.enableVibration(false);

            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private void startForegroundCompat(int id, Notification notification) {
        if (Build.VERSION.SDK_INT >= 34) { // Android 14+
            startForeground(id, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(id, notification);
        }
    }

    // Public method for SystemHelperPlugin to query state
    public int getCurrentTimeLeftSec() {
        if (!isTimerActive) return currentTimeLeftSec;
        if ("stopwatch".equals(timerType)) {
            return (int) ((SystemClock.elapsedRealtime() - chronometerBase) / 1000);
        } else {
            int remaining = (int) ((chronometerBase - SystemClock.elapsedRealtime()) / 1000);
            return Math.max(0, remaining);
        }
    }

    public boolean getIsTimerActive() { return isTimerActive; }
    public String getTimerMode() { return timerMode; }
    public String getTimerType() { return timerType; }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        cancelTimerComplete();
        releaseWakeLock();
        instance = null;
        super.onDestroy();
    }
}
