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

function waitForTab(tabId, timeoutMs=15000) {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{chrome.tabs.onUpdated.removeListener(listener);reject(new Error('网站加载超时'))},timeoutMs);
    const listener=(id,info)=>{if(id===tabId&&info.status==='complete'){clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);resolve()}};
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then(tab=>{if(tab.status==='complete'){clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);resolve()}}).catch(reject);
  });
}

async function verify717Login() {
  let tabs=await chrome.tabs.query({url:'https://www.717study.com/*'}),created=false,tab=tabs[0];
  if(!tab){tab=await chrome.tabs.create({url:'https://www.717study.com/#/Home',active:false});created=true;await waitForTab(tab.id);}
  try{
    const results=await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',func:async()=>{
      const token=localStorage.getItem('client_auth_token');
      if(!token)return {loggedIn:false};
      try{
        const response=await fetch('https://www.717study.com/api/user/account',{credentials:'include',headers:{'X-Authorization':`Bearer ${token}`,'X-Language':'zh'}});
        const body=await response.json();
        return {loggedIn:response.ok&&body?.code===0};
      }catch{return {loggedIn:false};}
    }});
    return results[0]?.result||{loggedIn:false};
  } finally {if(created)await chrome.tabs.remove(tab.id).catch(()=>{});}
}

chrome.runtime.onMessage.addListener(message=>{
  if(message.type==='AUTH_CHECK')return verify717Login().catch(()=>({loggedIn:false}));
});
