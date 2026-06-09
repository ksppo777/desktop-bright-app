export const getIsLogMode = () => {
  return localStorage.getItem('study-helper-log-mode') === 'true';
};

export const setIsLogModeConfig = (enabled: boolean) => {
  localStorage.setItem('study-helper-log-mode', enabled.toString());
};

export const appLog = (level: 'INFO' | 'ERROR' | 'SUCCESS', message: string, data?: any) => {
  console.log(`[${level}] ${message}`, data || '');
  if (!getIsLogMode()) return;
  
  try {
    const logsStr = localStorage.getItem('study-helper-logs');
    let logs = [];
    if (logsStr) {
      logs = JSON.parse(logsStr);
    }
    
    logs.push({
      time: new Date().toISOString(),
      level,
      message,
      data: data ? JSON.stringify(data) : undefined,
    });
    
    if (logs.length > 500) {
      logs = logs.slice(logs.length - 500);
    }
    
    localStorage.setItem('study-helper-logs', JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to write log', e);
  }
};

export const exportLogsStr = () => {
  try {
    const logsStr = localStorage.getItem('study-helper-logs') || '[]';
    return JSON.stringify(JSON.parse(logsStr), null, 2);
  } catch (e) {
    return '[]';
  }
};

export const clearLogs = () => {
  localStorage.removeItem('study-helper-logs');
};
