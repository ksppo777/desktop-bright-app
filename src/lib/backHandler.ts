export type BackHandler = () => boolean | void | Promise<boolean | void>;

const handlers: BackHandler[] = [];

// Register a back handler. Handlers registered later are evaluated first.
export const registerBackHandler = (handler: BackHandler) => {
  handlers.push(handler);
  return () => {
    const idx = handlers.indexOf(handler);
    if (idx > -1) {
      handlers.splice(idx, 1);
    }
  };
};

export const handleBackPress = async () => {
  for (let i = handlers.length - 1; i >= 0; i--) {
    const handler = handlers[i];
    const handled = await handler();
    if (handled !== false) {
      return true; // We consider it handled if it doesn't explicitly return false
    }
  }
  return false; // Not handled by any specific overlay/modal
};
