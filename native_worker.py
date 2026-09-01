"""Windows native Unicode typing into the currently focused application."""

from __future__ import annotations

import ctypes
from ctypes import wintypes
import threading
import time
import re
from typing import Callable

from human_typing import Rhythm, TypingConfig


user32 = ctypes.WinDLL("user32", use_last_error=True)
INPUT_KEYBOARD = 1
KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_UNICODE = 0x0004
VK_BACK = 0x08
VK_F9 = 0x78
VK_F12 = 0x7B
WM_HOTKEY = 0x0312


ULONG_PTR = ctypes.c_size_t


class MOUSEINPUT(ctypes.Structure):
    _fields_ = [("dx", wintypes.LONG), ("dy", wintypes.LONG),
                ("mouseData", wintypes.DWORD), ("dwFlags", wintypes.DWORD),
                ("time", wintypes.DWORD), ("dwExtraInfo", ULONG_PTR)]


class KEYBDINPUT(ctypes.Structure):
    _fields_ = [("wVk", wintypes.WORD), ("wScan", wintypes.WORD),
                ("dwFlags", wintypes.DWORD), ("time", wintypes.DWORD),
                ("dwExtraInfo", ULONG_PTR)]


class HARDWAREINPUT(ctypes.Structure):
    _fields_ = [("uMsg", wintypes.DWORD), ("wParamL", wintypes.WORD),
                ("wParamH", wintypes.WORD)]


class INPUT_UNION(ctypes.Union):
    _fields_ = [("mi", MOUSEINPUT), ("ki", KEYBDINPUT), ("hi", HARDWAREINPUT)]


class INPUT(ctypes.Structure):
    _fields_ = [("type", wintypes.DWORD), ("union", INPUT_UNION)]


user32.SendInput.argtypes = (wintypes.UINT, ctypes.POINTER(INPUT), ctypes.c_int)
user32.SendInput.restype = wintypes.UINT


def _key(scan: int = 0, vk: int = 0, flags: int = 0) -> None:
    events = (INPUT * 2)(
        INPUT(INPUT_KEYBOARD, INPUT_UNION(ki=KEYBDINPUT(vk, scan, flags, 0, 0))),
        INPUT(INPUT_KEYBOARD, INPUT_UNION(ki=KEYBDINPUT(vk, scan, flags | KEYEVENTF_KEYUP, 0, 0))),
    )
    if user32.SendInput(2, events, ctypes.sizeof(INPUT)) != 2:
        raise ctypes.WinError(ctypes.get_last_error())


def type_unicode(text: str) -> None:
    # SendInput consumes UTF-16 code units; this also covers non-BMP emoji.
    raw = text.encode("utf-16-le")
    for index in range(0, len(raw), 2):
        _key(scan=int.from_bytes(raw[index:index + 2], "little"), flags=KEYEVENTF_UNICODE)


class NativeTypingWorker:
    def __init__(self, notify: Callable[[str], None]):
        self.notify = notify
        self.stop_event = threading.Event()
        self.pause_event = threading.Event()
        self.running = threading.Lock()
        threading.Thread(target=self._hotkeys, daemon=True).start()

    def start(self, text: str, config: TypingConfig, countdown: int = 5) -> None:
        if self.running.locked():
            self.notify("已有输入任务正在运行")
            return
        threading.Thread(target=self._run, args=(text, config, countdown), daemon=True).start()

    def toggle_pause(self) -> None:
        if self.pause_event.is_set():
            self.pause_event.clear(); self.notify("继续输入（F9 可再次暂停）")
        else:
            self.pause_event.set(); self.notify("已暂停（按 F9 继续）")

    def emergency_stop(self) -> None:
        self.stop_event.set(); self.pause_event.clear(); self.notify("已紧急停止")

    def _sleep(self, seconds: float) -> bool:
        remaining = seconds
        while remaining > 0:
            if self.stop_event.is_set(): return False
            if self.pause_event.is_set(): time.sleep(0.03); continue
            step=min(0.02,remaining); time.sleep(step); remaining-=step
        return not self.stop_event.is_set()

    def _run(self, text: str, config: TypingConfig, countdown: int) -> None:
        if not self.running.acquire(blocking=False): return
        try:
            self.stop_event.clear(); self.pause_event.clear()
            for seconds in range(countdown, 0, -1):
                self.notify(f"请切到 Chrome 并点击输入框：{seconds} 秒")
                if self.stop_event.wait(1): return
            self.notify("输入中（F9 暂停/继续，F12 急停）")
            rhythm=Rhythm(config)
            tokens = re.findall(r"[A-Za-z]+(?:['’-][A-Za-z]+)*|.", text, flags=re.DOTALL)
            completed = 0
            for token in tokens:
                if self.stop_event.is_set(): break
                if len(token) > 1 and token[0].isascii() and token[0].isalpha() and rhythm.should_chunk_word():
                    type_unicode(token)
                    # The word appears together, while WPM still accounts for every letter.
                    if not self._sleep(sum(rhythm.delay(char) for char in token)): break
                else:
                    for char in token:
                        typo=rhythm.typo_for(char)
                        if typo:
                            type_unicode(typo)
                            if not self._sleep(rhythm.delay(typo)*0.7): break
                            _key(vk=VK_BACK)
                            if not self._sleep(rhythm.delay(char)*0.5): break
                        type_unicode(char)
                        if not self._sleep(rhythm.delay(char)): break
                completed += len(token)
                if completed % 20 < len(token): self.notify(f"输入中：{completed}/{len(text)}（F12 急停）")
            self.notify("输入已停止" if self.stop_event.is_set() else "输入完成")
        except Exception as exc:
            self.notify(f"输入错误：{exc}")
        finally:
            self.running.release()

    def _hotkeys(self) -> None:
        if not user32.RegisterHotKey(None, 1, 0, VK_F9):
            self.notify("警告：F9 全局快捷键注册失败")
        if not user32.RegisterHotKey(None, 2, 0, VK_F12):
            self.notify("警告：F12 全局快捷键注册失败")
        message = wintypes.MSG()
        while user32.GetMessageW(ctypes.byref(message), None, 0, 0) > 0:
            if message.message == WM_HOTKEY:
                self.toggle_pause() if message.wParam == 1 else self.emergency_stop()
