const attachedTabs = new Set();
const debuggee = tabId => ({tabId});

async function attach(tabId) {
  if (attachedTabs.has(tabId)) return;
  await chrome.debugger.attach(debuggee(tabId), '1.3');
  attachedTabs.add(tabId);
}

async function detach(tabId) {
  if (!attachedTabs.has(tabId)) return;
  try { await chrome.debugger.detach(debuggee(tabId)); } finally { attachedTabs.delete(tabId); }
}

chrome.debugger.onDetach.addListener(source => {
  if (source.tabId !== undefined) attachedTabs.delete(source.tabId);
});
chrome.tabs.onRemoved.addListener(tabId => attachedTabs.delete(tabId));

chrome.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab?.id;
  if (!tabId || !message.type?.startsWith('DEBUG_')) return;
  return (async () => {
    if (message.type === 'DEBUG_ATTACH') await attach(tabId);
    else if (message.type === 'DEBUG_INSERT') {
      await attach(tabId);
      await chrome.debugger.sendCommand(debuggee(tabId), 'Input.insertText', {text: message.text});
    } else if (message.type === 'DEBUG_BACKSPACE') {
      await attach(tabId);
      await chrome.debugger.sendCommand(debuggee(tabId), 'Input.dispatchKeyEvent', {type:'rawKeyDown',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8,nativeVirtualKeyCode:8});
      await chrome.debugger.sendCommand(debuggee(tabId), 'Input.dispatchKeyEvent', {type:'keyUp',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8,nativeVirtualKeyCode:8});
    } else if (message.type === 'DEBUG_DETACH') await detach(tabId);
    return {ok:true};
  })();
});
