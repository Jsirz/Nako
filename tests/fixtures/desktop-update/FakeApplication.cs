using System;
using System.IO;
class FakeApplication {
  static int Main(string[] args) {
    string command = Environment.CommandLine;
    if (command.Contains("--updated")) {
      if (!command.Contains(" /S ")) return 41;
      if (command.Contains("--force-run")) return 42;
      if (command.Contains("installer-fail")) return 12;
      string destination = command.Substring(command.IndexOf("/D=") + 3);
      string manifest = Path.Combine(destination, "resources", "app", "package.json");
      Directory.CreateDirectory(Path.GetDirectoryName(manifest));
      File.WriteAllText(manifest, "{\"version\":\"9.8.7\"}");
      File.WriteAllText(Path.Combine(destination, "installer-args.txt"), command);
      return 0;
    }
    string session = Environment.GetEnvironmentVariable("NAKO_UPDATE_SESSION");
    if (session != null) File.WriteAllText(Path.Combine(session, "started"), "9.8.7");
    return 0;
  }
}
