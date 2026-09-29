using System;
using System.ComponentModel;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace Nako.Update {
  internal sealed class UpdateWindow : Form {
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
    readonly UpdateWorker worker;
    readonly Label heading, detail;
    readonly ProgressBar[] bars = new ProgressBar[3];
    readonly Label[] captions = new Label[3];
    readonly Button retry;
    bool running, completed;
    UpdateWindow(UpdateWorker worker) {
      this.worker = worker;
      Text = "Nako 画布 更新";
      ClientSize = new Size(540, 350);
      FormBorderStyle = FormBorderStyle.FixedSingle;
      MaximizeBox = false;
      StartPosition = FormStartPosition.CenterScreen;
      BackColor = Color.FromArgb(244, 240, 230);
      Font = new Font("Microsoft YaHei UI", 10);
      AutoScaleMode = AutoScaleMode.Dpi;
      Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
      Controls.Add(new PictureBox { Image = Icon.ToBitmap(), Location = new Point(32, 28), Size = new Size(36, 36), SizeMode = PictureBoxSizeMode.Zoom });
      AddLabel("Nako 画布", 80, 28, 260, 32, 17, true);
      AddLabel("版本 " + worker.Version, 350, 36, 165, 24, 10, true);
      var line = new Panel { Location = new Point(32, 90), Size = new Size(476, 3), BackColor = Color.FromArgb(28, 28, 28) };
      Controls.Add(line);
      heading = AddLabel("正在安装新版本", 32, 117, 476, 36, 21, true);
      detail = AddLabel("完成后会自动打开，请保持电脑运行。", 32, 164, 476, 54, 11, false);
      string[] names = { "准备更新", "安装与检查", "重新打开" };
      for (int i = 0; i < 3; i++) {
        bars[i] = new ProgressBar { Location = new Point(32 + i * 163, 230), Size = new Size(150, 8), Maximum = 100 };
        Controls.Add(bars[i]);
        captions[i] = AddLabel(names[i], 32 + i * 163, 250, 150, 25, 10, true);
      }
      AddLabel("关闭将最小化到任务栏，更新仍会继续。", 32, 309, 370, 24, 9, false).ForeColor = Color.DimGray;
      retry = new Button { Text = "重试", Location = new Point(418, 299), Size = new Size(90, 32), Visible = false };
      retry.Click += delegate { StartWork(); };
      Controls.Add(retry);
      FormClosing += delegate(object sender, FormClosingEventArgs e) {
        if (running) { e.Cancel = true; WindowState = FormWindowState.Minimized; }
      };
      Shown += delegate { BeginInvoke(new Action(AnnounceReady)); };
    }
    void AnnounceReady() {
      // Shown also fires for a process started with SW_HIDE. Never hand off to an invisible UI.
      if (!IsWindowVisible(Handle) || WindowState == FormWindowState.Minimized) { Close(); return; }
      Refresh();
      try {
        File.WriteAllText(Path.Combine(worker.DirectoryPath, "ready"), "ready");
      } catch (Exception error) {
        heading.Text = "更新未开始";
        detail.Text = "无法通知主程序开始更新：" + error.Message;
        return;
      }
      StartWork();
    }
    Label AddLabel(string text, int x, int y, int width, int height, float size, bool bold) {
      var label = new Label { Text = text, Location = new Point(x, y), Size = new Size(width, height),
        Font = new Font("Microsoft YaHei UI", size, bold ? FontStyle.Bold : FontStyle.Regular) };
      Controls.Add(label);
      return label;
    }
    void StartWork() {
      if (running || completed) return;
      running = true;
      retry.Visible = false;
      heading.Text = "正在安装新版本";
      var task = new BackgroundWorker();
      worker.Report = (stage, message) => BeginInvoke(new Action(() => SetStage(stage, message)));
      task.DoWork += delegate { worker.Run(); };
      task.RunWorkerCompleted += delegate(object sender, RunWorkerCompletedEventArgs e) {
        running = false;
        if (e.Error == null) { completed = true; Close(); return; }
        heading.Text = "更新未完成";
        detail.Text = "请检查安装权限和磁盘空间后重试。\n" + e.Error.Message;
        foreach (var bar in bars) bar.Style = ProgressBarStyle.Continuous;
        retry.Visible = true;
        File.WriteAllText(Path.Combine(worker.DirectoryPath, "error.txt"), e.Error.ToString());
        Show(); WindowState = FormWindowState.Normal; Activate();
      };
      task.RunWorkerAsync();
    }
    void SetStage(int stage, string message) {
      detail.Text = message;
      for (int i = 0; i < 3; i++) {
        bars[i].Style = i == stage ? ProgressBarStyle.Marquee : ProgressBarStyle.Continuous;
        bars[i].Value = i < stage ? 100 : 0;
        captions[i].ForeColor = i <= stage ? Color.Black : Color.Gray;
      }
    }
    [STAThread]
    static int Main(string[] args) {
      Application.EnableVisualStyles();
      Application.SetCompatibleTextRenderingDefault(false);
      try {
        if (args.Length != 1) return 2;
        var worker = new UpdateWorker(args[0]);
        // One helper per installation, even if a previous minimized update is still running.
        string identity;
        using (var hash = System.Security.Cryptography.SHA256.Create()) {
          identity = BitConverter.ToString(hash.ComputeHash(System.Text.Encoding.UTF8.GetBytes(worker.InstallDirectory.ToLowerInvariant()))).Replace("-", "");
        }
        bool created;
        using (var mutex = new Mutex(true, "Local\\NakoUpdate-" + identity, out created)) {
          if (!created) return 3;
          Application.Run(new UpdateWindow(worker));
        }
        return 0;
      } catch (Exception error) {
        MessageBox.Show("更新程序无法启动：" + error.Message, "Nako 画布 更新", MessageBoxButtons.OK, MessageBoxIcon.Error);
        return 1;
      }
    }
  }
}
