from __future__ import annotations

import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from pathlib import Path
import webbrowser

from human_typing import TypingConfig
from native_worker import NativeTypingWorker
from document_import import extract_docx


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("717 拟人打字机")
        self.geometry("820x650")
        self.minsize(680, 520)
        self.status = tk.StringVar(value="就绪：使用你当前的 Chrome 登录状态")
        self.url = tk.StringVar(value="https://example.com")
        self.wpm=tk.StringVar(value="45"); self.variation=tk.StringVar(value="25")
        self.pause_chance=tk.StringVar(value="3.5"); self.pause_min=tk.StringVar(value="0.25")
        self.pause_max=tk.StringVar(value="1.1"); self.typo=tk.StringVar(value="1.0")
        self.word_chunk=tk.StringVar(value="70")
        self._build()
        self.worker = NativeTypingWorker(self._notify)
        self.protocol("WM_DELETE_WINDOW", self._close)

    def _build(self):
        root=ttk.Frame(self,padding=12); root.pack(fill="both",expand=True)
        nav=ttk.Frame(root); nav.pack(fill="x")
        ttk.Label(nav,text="网址").pack(side="left")
        ttk.Entry(nav,textvariable=self.url).pack(side="left",fill="x",expand=True,padx=8)
        ttk.Button(nav,text="打开网页",command=self._open).pack(side="left")
        pick=ttk.Frame(root); pick.pack(fill="x",pady=(10,4))
        ttk.Label(pick,text="开始后请在 5 秒内切到 Chrome 并点击目标输入框").pack(side="left")
        ttk.Button(pick,text="导入文本",command=self._import).pack(side="right")
        self.text=tk.Text(root,height=16,wrap="word",undo=True); self.text.pack(fill="both",expand=True,pady=6)
        cfg=ttk.LabelFrame(root,text="节奏设置",padding=8); cfg.pack(fill="x")
        fields=[("WPM",self.wpm),("波动 %",self.variation),("停顿概率 %",self.pause_chance),("停顿最短秒",self.pause_min),("停顿最长秒",self.pause_max),("误触概率 %",self.typo),("英文整词输入概率 %",self.word_chunk)]
        for i,(label,var) in enumerate(fields):
            ttk.Label(cfg,text=label).grid(row=i//3*2,column=i%3,sticky="w",padx=5)
            ttk.Entry(cfg,textvariable=var,width=14).grid(row=i//3*2+1,column=i%3,sticky="ew",padx=5,pady=(0,5))
            cfg.columnconfigure(i%3,weight=1)
        actions=ttk.Frame(root); actions.pack(fill="x",pady=10)
        ttk.Button(actions,text="开始",command=self._start).pack(side="left")
        ttk.Button(actions,text="暂停/继续 (F9)",command=self.worker_pause).pack(side="left",padx=6)
        ttk.Button(actions,text="紧急停止",command=self.worker_stop).pack(side="left",padx=6)
        ttk.Label(actions,textvariable=self.status).pack(side="right")

    def _notify(self,msg): self.after(0,self.status.set,msg)
    def _open(self):
        url=self.url.get().strip()
        if not url.startswith(("http://","https://")): url="https://"+url
        webbrowser.open(url)
    def _import(self):
        name=filedialog.askopenfilename(filetypes=[("支持的文档","*.docx *.txt *.md"),("Word 文档","*.docx"),("文本文件","*.txt *.md"),("所有文件","*.*")])
        if name:
            try:
                if Path(name).suffix.lower() == ".docx": data=extract_docx(name)
                else:
                    try: data=Path(name).read_text(encoding="utf-8-sig")
                    except UnicodeDecodeError: data=Path(name).read_text(encoding="gb18030")
            except (OSError, ValueError) as exc:
                messagebox.showerror("导入失败",str(exc)); return
            self.text.delete("1.0","end"); self.text.insert("1.0",data)
            self.status.set(f"已导入：{Path(name).name}（保留段落、换行和表格文本结构）")
    def _config(self):
        return TypingConfig(float(self.wpm.get()),float(self.variation.get())/100,float(self.pause_chance.get())/100,float(self.pause_min.get()),float(self.pause_max.get()),float(self.typo.get())/100,float(self.word_chunk.get())/100)
    def _start(self):
        try: cfg=self._config(); cfg.validate()
        except ValueError as exc: messagebox.showerror("设置错误",str(exc)); return
        text=self.text.get("1.0","end-1c")
        if not text: messagebox.showinfo("提示","请粘贴或导入文本"); return
        self.worker.start(text,cfg,countdown=5)
    def worker_pause(self): self.worker.toggle_pause()
    def worker_stop(self): self.worker.emergency_stop()
    def _close(self): self.worker.emergency_stop(); self.destroy()


if __name__ == "__main__": App().mainloop()
