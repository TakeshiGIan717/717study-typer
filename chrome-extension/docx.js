/* Minimal, dependency-free DOCX reader for modern Chrome. */
const DocxReader = (() => {
  const u16=(v,o)=>v.getUint16(o,true), u32=(v,o)=>v.getUint32(o,true);
  async function inflateRaw(bytes){
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function unzipEntry(buffer,name){
    const view=new DataView(buffer); let eocd=-1;
    for(let i=buffer.byteLength-22;i>=Math.max(0,buffer.byteLength-65557);i--){if(u32(view,i)===0x06054b50){eocd=i;break;}}
    if(eocd<0) throw new Error('不是有效的 DOCX/ZIP 文件');
    const count=u16(view,eocd+10), cdOffset=u32(view,eocd+16); let p=cdOffset;
    const decoder=new TextDecoder('utf-8');
    for(let i=0;i<count;i++){
      if(u32(view,p)!==0x02014b50) throw new Error('DOCX 目录损坏');
      const method=u16(view,p+10), compressed=u32(view,p+20), nameLen=u16(view,p+28), extraLen=u16(view,p+30), commentLen=u16(view,p+32), local=u32(view,p+42);
      const entryName=decoder.decode(new Uint8Array(buffer,p+46,nameLen));
      if(entryName===name){
        const localName=u16(view,local+26), localExtra=u16(view,local+28), start=local+30+localName+localExtra;
        const bytes=new Uint8Array(buffer,start,compressed);
        if(method===0) return bytes;
        if(method===8) return inflateRaw(bytes);
        throw new Error('DOCX 使用了不支持的压缩方式');
      }
      p+=46+nameLen+extraLen+commentLen;
    }
    throw new Error('DOCX 缺少正文 document.xml');
  }
  const local=n=>n.localName;
  function inlineText(root,stats){
    let out='';
    const walk=node=>{
      if(node.nodeType!==1)return;
      const n=local(node);
      if(n==='t'||n==='delText'){out+=node.textContent;return;}
      if(n==='tab'){out+='\t';return;}
      if(n==='br'||n==='cr'){out+='\n';return;}
      if(n==='drawing'||n==='pict'||n==='object'){out+='[图片或图表]';stats.media++;return;}
      if(n==='oMath'||n==='oMathPara'){
        const formula=[...node.getElementsByTagNameNS('*','t')].map(x=>x.textContent).join('');
        out+=`[公式: ${formula||'需手动插入'}]`;stats.formulas++;return;
      }
      [...node.children].forEach(walk);
    }; walk(root); return out;
  }
  async function parse(file){
    const bytes=await unzipEntry(await file.arrayBuffer(),'word/document.xml');
    const xml=new DOMParser().parseFromString(new TextDecoder('utf-8').decode(bytes),'application/xml');
    if(xml.querySelector('parsererror'))throw new Error('DOCX 正文 XML 无法解析');
    const body=[...xml.getElementsByTagNameNS('*','body')][0], blocks=[], stats={formulas:0,media:0,tables:0};
    for(const child of body.children){
      if(local(child)==='p') blocks.push(inlineText(child,stats));
      else if(local(child)==='tbl'){
        const rows=[]; stats.tables++;
        for(const row of [...child.children].filter(x=>local(x)==='tr')){
          const cells=[...row.children].filter(x=>local(x)==='tc').map(cell=>[...cell.children].filter(x=>local(x)==='p').map(p=>inlineText(p,stats)).join('\n'));
          rows.push(cells.join('\t'));
        } blocks.push(rows.join('\n'));
      }
    }
    return {text:blocks.join('\n'),stats};
  }
  return {parse};
})();
