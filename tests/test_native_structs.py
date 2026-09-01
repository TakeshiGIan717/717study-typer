import ctypes
import unittest

from native_worker import INPUT, KEYBDINPUT, MOUSEINPUT


class NativeStructureTests(unittest.TestCase):
    def test_win32_input_sizes(self):
        # Sizes documented by Win32 ABI: INPUT is 28 bytes on x86, 40 on x64.
        expected_input = 40 if ctypes.sizeof(ctypes.c_void_p) == 8 else 28
        expected_keyboard = 24 if ctypes.sizeof(ctypes.c_void_p) == 8 else 16
        expected_mouse = 32 if ctypes.sizeof(ctypes.c_void_p) == 8 else 24
        self.assertEqual(ctypes.sizeof(INPUT), expected_input)
        self.assertEqual(ctypes.sizeof(KEYBDINPUT), expected_keyboard)
        self.assertEqual(ctypes.sizeof(MOUSEINPUT), expected_mouse)


if __name__ == "__main__":
    unittest.main()
