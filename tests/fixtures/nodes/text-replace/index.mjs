export const executors = {
  replace({ inputs, parameters }) {
    const source = String(inputs.text ?? '');
    const from = String(parameters?.from ?? '');
    const to = String(parameters?.to ?? '');
    return { result: from ? source.split(from).join(to) : source };
  },
};
