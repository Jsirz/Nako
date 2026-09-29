using System;
using System.Runtime.InteropServices;
class WindowProbe {
  delegate bool EnumCallback(IntPtr window, IntPtr data);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumCallback callback, IntPtr data);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr window);
  [DllImport("user32.dll")] static extern bool PostMessage(IntPtr window, uint message, IntPtr w, IntPtr l);
  static int Main(string[] args) {
    uint target = uint.Parse(args[0]);
    EnumWindows(delegate(IntPtr window, IntPtr data) {
      uint owner; GetWindowThreadProcessId(window, out owner);
      if (owner == target) {
        Console.WriteLine("visible=" + IsWindowVisible(window) + ";minimized=" + IsIconic(window));
        if (args.Length > 1 && IsWindowVisible(window)) PostMessage(window, 0x0010, IntPtr.Zero, IntPtr.Zero);
      }
      return true;
    }, IntPtr.Zero);
    return 0;
  }
}
