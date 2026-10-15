export function nearestAspectRatio(width: number, height: number): string | undefined {
  if (!(width > 0) || !(height > 0)) return undefined;
  const choices = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '5:4', '4:5', '21:9'];
  return choices.reduce((best, choice) => {
    const value = (label: string) => {
      const [w, h] = label.split(':').map(Number);
      return Math.abs(width / height - w / h);
    };
    return value(choice) < value(best) ? choice : best;
  });
}
