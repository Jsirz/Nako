/** Public display projection: no pi objects, tool arguments or raw receipts. */
export function agentActivity({ id, name, action, status, result }) {
  const cards = [];
  const add = (kind, id) => {
    if (typeof id === 'string' && id.length > 0 && id.length <= 128) cards.push({ kind, id });
  };
  if (result?.ok) {
    if (action === 'runNode') add('node', result.nodeRunId);
    if (action === 'prepareGeneration') add('generation', result.generationPlanId);
    if (action === 'project') add('project', result.projectRequestId);
    if (action === 'product') add('product', result.projectRequestId);
    if (action === 'prepareBudget' && Array.isArray(result.budgets))
      result.budgets.forEach((budget) => add('budget', budget.id));
  }
  return { id, name, action, status, cards };
}
