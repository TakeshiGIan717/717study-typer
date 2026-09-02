const $=id=>document.getElementById(id);
const settings=['wpm','variation','pauseChance','pauseMax','typoChance','wordChance'];
const fields=['text',...settings];
chrome.storage.local.get(settings).then(saved=>{settings.forEach(k=>{if(saved[k]!==undefined)$(k).value=saved[k]});updateEstimate()});

let authenticated=false;
async function checkAuth(){
  authenticated=false;$('load').disabled=true;$('load').textContent='正在检查登录状态…';
  $('authStatus').textContent='正在检查 717study.com 登录状态…';$('login').hidden=true;$('authBox').classList.remove('ok');
  try{const result=await chrome.runtime.sendMessage({type:'AUTH_CHECK'});authenticated=!!result?.loggedIn;}catch{authenticated=false;}
  $('authStatus').textContent=authenticated?'已登录，可免费使用':'尚未登录 717study.com';
  $('authBox').classList.toggle('ok',authenticated);$('login').hidden=authenticated;
  $('load').disabled=!authenticated;$('load').textContent=authenticated?'加载到当前页面':'登录后加载到当前页面';
}
$('refreshAuth').addEventListener('click',checkAuth);
$('login').addEventListener('click',()=>{chrome.tabs.create({url:'https://www.717study.com/#/SignIn'});window.close()});
checkAuth();

function formatDuration(seconds){
  if(!Number.isFinite(seconds)||seconds<0)return '—';
  seconds=Math.round(seconds);
  if(seconds<60)return `${seconds} 秒`;
  const hours=Math.floor(seconds/3600),minutes=Math.floor((seconds%3600)/60),rest=seconds%60;
  return hours?`${hours} 小时 ${minutes} 分`:`${minutes} 分 ${rest} 秒`;
}

function updateEstimate(){
  const text=$('text').value,total=text.length,effective=(text.match(/\S/g)||[]).length;
  $('charCount').textContent=effective.toLocaleString();
  $('totalCount').textContent=total.toLocaleString();
  if(!total){$('estimateTime').textContent='—';$('estimateRange').textContent='输入文本后计算';return;}
  const wpm=Number($('wpm').value),variation=Number($('variation').value)/100,pauseChance=Number($('pauseChance').value)/100,pauseMax=Number($('pauseMax').value),typoChance=Number($('typoChance').value)/100,wordChance=Number($('wordChance').value)/100;
  if(!Number.isFinite(wpm)||wpm<=0)return;
  const base=60/(wpm*5),sentence=(text.match(/[.!?。！？\n]/g)||[]).length,comma=(text.match(/[,;:，；：]/g)||[]).length,letters=(text.match(/[A-Za-z]/g)||[]).length;
  const pauseMean=pauseMax>=.25?(.25+pauseMax)/2:.25;
  const core=total*base,punctuation=sentence*.285+comma*.14,pauses=total*pauseChance*pauseMean;
  const typoExtra=letters*(1-wordChance)*typoChance*base*1.2;
  const expected=core+punctuation+pauses+typoExtra;
  const randomSpread=Math.sqrt(Math.max(0,total*pauseChance*(1-pauseChance)))*pauseMean*1.65;
  const low=Math.max(core*(1-variation)+punctuation,expected-core*variation-randomSpread);
  const high=expected+core*variation+randomSpread;
  $('estimateTime').textContent=`约 ${formatDuration(expected)}`;
  $('estimateRange').textContent=`典型范围 ${formatDuration(low)} – ${formatDuration(high)}`;
}

['text',...settings].forEach(id=>$(id).addEventListener('input',updateEstimate));
updateEstimate();

$('file').addEventListener('change',async event=>{
  const file=event.target.files[0]; if(!file)return;
  $('importNote').textContent='正在读取…';
  try{
    if(file.name.toLowerCase().endsWith('.docx')){
      const result=await DocxReader.parse(file); $('text').value=result.text;
      const notes=[]; if(result.stats.tables)notes.push(`${result.stats.tables} 个表格已转为行列文本`);
      if(result.stats.formulas)notes.push(`${result.stats.formulas} 个公式已生成占位内容`);
      if(result.stats.media)notes.push(`${result.stats.media} 个图片/图表需手动处理`);
      $('importNote').textContent=notes.join('；')||'DOCX 已导入';
    }else{$('text').value=await file.text();$('importNote').textContent='文本已导入';}
    updateEstimate();
  }catch(error){$('importNote').textContent=`导入失败：${error.message}`;}
});

$('load').addEventListener('click',async()=>{
  if(!authenticated){$('status').textContent='请先登录 717study.com';return;}
  const data=Object.fromEntries(fields.map(k=>[k,$(k).value]));
  if(!data.text){$('status').textContent='请先粘贴或导入文本';return;}
  const checks=[['wpm',1,300,'WPM'],['variation',0,100,'波动'],['pauseChance',0,100,'停顿概率'],['pauseMax',0,20,'最长停顿'],['typoChance',0,100,'误触概率'],['wordChance',0,100,'英文整词概率']];
  for(const [key,min,max,label] of checks){const value=Number(data[key]);if(!Number.isFinite(value)||value<min||value>max){$('status').textContent=`${label} 必须在 ${min}–${max} 之间`;return;}}
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id){$('status').textContent='找不到当前标签页';return;}
  $('load').disabled=true;
  try{
    await chrome.storage.local.set(Object.fromEntries(settings.map(k=>[k,data[k]])));
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});
    await chrome.tabs.sendMessage(tab.id,{type:'LOAD_717_TYPER',payload:data});
    window.close();
  }catch(error){$('status').textContent=`无法加载：${error.message}`;$('load').disabled=false;}
});
