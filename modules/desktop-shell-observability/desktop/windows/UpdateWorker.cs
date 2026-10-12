using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Security.Cryptography;
using System.Threading;
using System.Web.Script.Serialization;

namespace Nako.Update {
  internal sealed class UpdateWorker {
    internal readonly string DirectoryPath;
    internal readonly string Version;
    readonly string installer, executable, digest;
    internal readonly string InstallDirectory;
    readonly int parentPid;
    bool installed;
    Process launchedApplication;
    internal Action<int, string> Report;
    internal UpdateWorker(string jobFile) {
      DirectoryPath = Path.GetDirectoryName(Path.GetFullPath(jobFile));
      var job = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(File.ReadAllText(jobFile));
      Version = (string)job["version"];
      installer = (string)job["installer"];
      executable = (string)job["executable"];
      InstallDirectory = (string)job["installDirectory"];
      digest = (string)job["sha512"];
      parentPid = Convert.ToInt32(job["parentPid"]);
      if (!Path.IsPathRooted(installer) || !Path.IsPathRooted(executable) ||
          !installer.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ||
          !String.Equals(Path.GetDirectoryName(executable), InstallDirectory, StringComparison.OrdinalIgnoreCase))
        throw new InvalidDataException("DESKTOP_UPDATE_INVALID_JOB");
    }
    internal void Run() {
      Report(0, "正在等待应用安全退出…");
      WaitForCommit();
      WaitForParent();
      if (!installed) {
        Report(1, "正在校验并安装新版本，请保持电脑运行。");
        VerifyPackage();
        RunInstaller();
        VerifyVersion();
        installed = true;
      }
      Report(2, "安装完成，正在打开并检查新版本…");
      Restart();
      Report(3, "更新完成，新版本已打开。");
    }
    void WaitForCommit() {
      var deadline = DateTime.UtcNow.AddSeconds(30);
      while (!File.Exists(Path.Combine(DirectoryPath, "commit"))) {
        if (File.Exists(Path.Combine(DirectoryPath, "cancel"))) throw new OperationCanceledException("更新交接已取消，请返回应用重试。");
        if (DateTime.UtcNow > deadline) throw new TimeoutException("未收到应用安装确认，请返回应用重试。");
        Thread.Sleep(150);
      }
    }
    void WaitForParent() {
      Process parent;
      try { parent = Process.GetProcessById(parentPid); }
      catch (ArgumentException) { return; }
      using (parent) {
        if (!parent.WaitForExit(60000)) throw new TimeoutException("应用尚未退出，请先退出 NAKO Agent 纳科画布智能体，然后重试。");
      }
    }
    void VerifyPackage() {
      using (var stream = File.OpenRead(installer))
      using (var hash = SHA512.Create()) {
        if (Convert.ToBase64String(hash.ComputeHash(stream)) != digest)
          throw new InvalidDataException("安装包校验失败，请重新下载更新。");
      }
    }
    void RunInstaller() {
      // NSIS /D must be the last argument and MUST NOT be quoted, even with spaces.
      var info = new ProcessStartInfo(installer, "--updated /S" + InstallationScope() + " /D=" + InstallDirectory);
      info.WorkingDirectory = DirectoryPath;
      info.UseShellExecute = true;
      Process process;
      try { process = Process.Start(info); }
      catch (Win32Exception error) {
        if (error.NativeErrorCode != 740 && error.NativeErrorCode != 5) throw;
        info.Verb = "runas";
        process = Process.Start(info);
      }
      using (process) {
        if (process == null) throw new IOException("无法启动安装程序。");
        // Never launch a second installer while the first is still running.
        process.WaitForExit();
        if (process.ExitCode != 0) throw new IOException("安装未完成（退出码 " + process.ExitCode + "），请重试。");
      }
    }
    void VerifyVersion() {
      string manifest = Path.Combine(InstallDirectory, "resources", "app", "package.json");
      var metadata = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(File.ReadAllText(manifest));
      if (!File.Exists(executable) || (string)metadata["version"] != Version)
        throw new IOException("安装后版本检查未通过，请重试安装。");
    }
    void Restart() {
      string receipt = Path.Combine(DirectoryPath, "started");
      if (File.Exists(receipt) && File.ReadAllText(receipt) == Version) return;
      var start = new ProcessStartInfo(executable);
      start.WorkingDirectory = InstallDirectory;
      start.UseShellExecute = false;
      start.EnvironmentVariables["NAKO_UPDATE_SESSION"] = DirectoryPath;
      // Retrying startup must not create duplicates while an earlier launch is still alive.
      if (launchedApplication == null || launchedApplication.HasExited) {
        if (launchedApplication != null) launchedApplication.Dispose();
        launchedApplication = Process.Start(start);
      }
      var deadline = DateTime.UtcNow.AddSeconds(90);
      while (DateTime.UtcNow < deadline) {
        if (File.Exists(receipt) && File.ReadAllText(receipt) == Version) return;
        Thread.Sleep(250);
      }
      throw new TimeoutException("新版本已安装，但未收到启动确认。请退出未响应的应用后点击重试。");
    }
    string InstallationScope() {
      foreach (var hive in new[] { Microsoft.Win32.RegistryHive.CurrentUser, Microsoft.Win32.RegistryHive.LocalMachine })
      foreach (var view in new[] { Microsoft.Win32.RegistryView.Registry64, Microsoft.Win32.RegistryView.Registry32 }) {
        using (var root = Microsoft.Win32.RegistryKey.OpenBaseKey(hive, view))
        using (var uninstall = root.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall")) {
          if (uninstall == null) continue;
          foreach (string key in uninstall.GetSubKeyNames()) using (var item = uninstall.OpenSubKey(key)) {
            string location = item == null ? null : item.GetValue("InstallLocation") as string;
            if (location != null && String.Equals(location.TrimEnd('\\'), InstallDirectory.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase))
              return hive == Microsoft.Win32.RegistryHive.CurrentUser ? " /currentuser" : " /allusers";
          }
        }
      }
      return "";
    }
  }
}
