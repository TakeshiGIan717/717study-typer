(() => {
  if (window.__typer717Installed) return;
  window.__typer717Installed = true;
  let target=null, running=false, paused=false, stopped=false, payload=null, hover=null, protocolMode=false;
  const docsMode=location.hostname==='docs.google.com'&&location.pathname.includes('/document/');
  const host=document.createElement('div'); host.id='typer717-host'; document.documentElement.appendChild(host);
  const root=host.attachShadow({mode:'open'});
  root.innerHTML=`<style>
    .box{position:fixed;z-index:2147483647;right:18px;top:18px;width:290px;padding:12px;border-radius:12px;background:#fff;color:#172033;box-shadow:0 8px 30px #0004;font:13px/1.4 "Segoe UI","Microsoft YaHei",sans-serif}.title{font-weight:700;font-size:15px}.status{min-height:36px;margin:8px 0;color:#475569}.row{display:flex;gap:6px;flex-wrap:wrap}button{padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;cursor:pointer}.primary{background:#2563eb;color:#fff;border-color:#2563eb}.danger{color:#b91c1c}.close{float:right;border:0;padding:0 4px;background:none;font-size:18px}.picked{color:#15803d}.hover{outline:3px solid #2563eb!important;outline-offset:2px!important}
  </style><div class="box"><button class="close" title="关闭">×</button><div class="title">717study.com 打字机</div><div class="status">请选择一种目标模式</div><div class="row"><button class="pick primary">点选普通输入框</button><button class="focus">使用当前页面光标</button><button class="start">开始</button><button class="pause">暂停/继续</button><button class="stop danger">紧急停止</button></div></div>`;
  const status=root.querySelector('.status'), setStatus=s=>status.textContent=s;
  if(docsMode)root.querySelector('.focus').textContent='使用 Google Docs 光标';
  root.querySelectorAll('button').forEach(button=>button.addEventListener('mousedown',event=>event.preventDefault()));
  root.querySelector('.close').onclick=()=>{stopped=true;cleanupPicker();if(protocolMode)chrome.runtime.sendMessage({type:'DEBUG_DETACH'});host.remove()};
  function cleanupPicker(){document.removeEventListener('mouseover',over,true);document.removeEventListener('click',pick,true);hover?.style.removeProperty('outline');hover=null;}
  function over(e){hover?.style.removeProperty('outline');hover=e.target;hover.style.setProperty('outline','3px solid #2563eb','important')}
  function pick(e){e.preventDefault();e.stopPropagation();cleanupPicker();const el=e.target;if(!isEditable(el)){setStatus('这里不是普通输入框；画布请使用“当前页面光标”');return;}protocolMode=false;target=el;target.focus();setStatus('普通输入框已选择，可以开始');}
  function isEditable(el){return el instanceof HTMLTextAreaElement||(el instanceof HTMLInputElement&&/^(text|search|email|url|tel|password)?$/.test(el.type))||el.isContentEditable||el.getAttribute('role')==='textbox'}
  root.querySelector('.pick').onclick=()=>{
    cleanupPicker();
    protocolMode=false;
    setStatus('请点击页面中的目标输入框');document.addEventListener('mouseover',over,true);document.addEventListener('click',pick,true)
  };
  root.querySelector('.focus').onclick=()=>{cleanupPicker();protocolMode=true;target={isConnected:true};setStatus('当前光标模式已启用：请在目标画布/编辑器中点好光标，再按开始')};
  root.querySelector('.pause').onclick=()=>{paused=!paused;setStatus(paused?'已暂停':'继续输入')};
  root.querySelector('.stop').onclick=()=>{stopped=true;paused=false;if(protocolMode)chrome.runtime.sendMessage({type:'DEBUG_DETACH'});setStatus('已紧急停止')};
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function wait(ms){let left=ms;while(left>0&&!stopped){if(paused){await sleep(40);continue;}const step=Math.min(25,left);await sleep(step);left-=step;}return !stopped}
  async function insert(text){if(protocolMode){await chrome.runtime.sendMessage({type:'DEBUG_INSERT',text});return;}target.focus();if(target.isContentEditable){document.execCommand('insertText',false,text);}else{const start=target.selectionStart??target.value.length,end=target.selectionEnd??start,proto=target instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,setter=Object.getOwnPropertyDescriptor(proto,'value').set;setter.call(target,target.value.slice(0,start)+text+target.value.slice(end));target.setSelectionRange(start+text.length,start+text.length);target.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));}}
  async function backspace(){if(protocolMode){await chrome.runtime.sendMessage({type:'DEBUG_BACKSPACE'});return;}if(target.isContentEditable){document.execCommand('delete',false)}else{const p=target.selectionStart??0;if(p>0){target.setSelectionRange(p-1,p);await insert('')}}}
  function delay(ch,c){let d=60000/(c.wpm*5),v=c.variation;d*=1-v+Math.random()*2*v;if(/[.!?。！？\n]/.test(ch))d+=120+Math.random()*330;else if(/[,;:，；：]/.test(ch))d+=60+Math.random()*160;if(Math.random()<c.pauseChance)d+=250+Math.random()*Math.max(0,c.pauseMax*1000-250);return Math.max(5,d)}
  root.querySelector('.start').onclick=async()=>{
    if(running){setStatus('输入任务正在运行');return}if(!target||!target.isConnected){setStatus('请先选择输入框');return}if(!payload?.text)return;
    setStatus('正在验证 717study.com 登录状态…');
    const auth=await chrome.runtime.sendMessage({type:'AUTH_CHECK'}).catch(()=>({loggedIn:false}));
    if(!auth?.loggedIn){setStatus('请先登录 717study.com 后再使用');return;}
    running=true;stopped=false;paused=false;const c={wpm:+payload.wpm,variation:+payload.variation/100,pauseChance:+payload.pauseChance/100,pauseMax:+payload.pauseMax,typoChance:+payload.typoChance/100,wordChance:+payload.wordChance/100,backspaceChance:+payload.backspaceChance/100,backspaceMax:+payload.backspaceMax,backspacePause:+payload.backspacePause,retypeFactor:+payload.retypeFactor/100};
    try{if(protocolMode)await chrome.runtime.sendMessage({type:'DEBUG_ATTACH'});}catch(error){running=false;setStatus(`当前页面输入通道连接失败：${error.message}`);return;}
    const tokens=payload.text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*|[^]/g)||[];let done=0;setStatus('输入中…');
    try{for(const token of tokens){
      if(stopped)break;
      if(token.length>1&&Math.random()<c.wordChance){await insert(token);for(const ch of token)if(!await wait(delay(ch,c)))break;}
      else for(const ch of token){if(/[A-Za-z]/.test(ch)&&Math.random()<c.typoChance){const letters='abcdefghijklmnopqrstuvwxyz'.replace(ch.toLowerCase(),'');const wrong=letters[Math.floor(Math.random()*letters.length)];await insert(ch===ch.toUpperCase()?wrong.toUpperCase():wrong);if(!await wait(delay(ch,c)*.7))break;await backspace();if(!await wait(delay(ch,c)*.5))break;}await insert(ch);if(!await wait(delay(ch,c)))break;}
      const chars=Array.from(token);
      if(!stopped&&/\S/.test(token)&&Math.random()<c.backspaceChance){
        const count=1+Math.floor(Math.random()*Math.min(c.backspaceMax,chars.length)),redo=chars.slice(-count);
        setStatus(`模拟回删 ${count} 个字符…`);
        if(!await wait(c.backspacePause*1000*(.7+Math.random()*.6)))break;
        for(let i=0;i<count;i++){await backspace();if(!await wait(delay('x',c)*.35))break;}
        for(const ch of redo){await insert(ch);if(!await wait(delay(ch,c)*c.retypeFactor))break;}
      }
      done+=token.length;if(done%20<token.length)setStatus(`输入中：${done}/${payload.text.length}`)
    }}catch(error){stopped=true;setStatus(`输入失败：${error.message}`)}
    if(protocolMode)await chrome.runtime.sendMessage({type:'DEBUG_DETACH'}).catch(()=>{});
    running=false;if(!status.textContent.startsWith('输入失败'))setStatus(stopped?'输入已停止':'输入完成');
  };
  chrome.runtime.onMessage.addListener(message=>{if(message.type==='LOAD_717_TYPER'){payload=message.payload;if(!host.isConnected)document.documentElement.appendChild(host);setStatus(docsMode?`已加载 ${payload.text.length} 个字符；建议使用 Google Docs 光标模式`:`已加载 ${payload.text.length} 个字符；请选择普通输入框或当前页面光标`);return Promise.resolve({ok:true})}});
})();
