using System;
using Nako.Update;
class WorkerHarness {
  static int Main(string[] args) {
    try {
      var worker = new UpdateWorker(args[0]);
      worker.Report = (stage, message) => Console.WriteLine("stage:" + stage);
      worker.Run();
      return 0;
    } catch (Exception error) { Console.Error.WriteLine(error.Message); return 1; }
  }
}
