import type {
  CanvasActionHandler,
  CanvasActionRequest,
} from '../../../contracts/canvasControlProtocol.js';
import type { CanvasCreationControl } from './canvasCreationControl';

/** User preference is supplied by the composer, never by tool arguments. */
export function withGenerationApproval(
  execute: CanvasActionHandler,
  creation: CanvasCreationControl | undefined,
  authorized: (request: CanvasActionRequest) => () => boolean,
): CanvasActionHandler {
  return async (request, signal) => {
    const stillAuthorized = authorized(request);
    const result = await execute(request, signal);
    if (
      !result.ok ||
      request.command.action !== 'prepareGeneration' ||
      result.generationState !== 'awaiting-approval' ||
      !creation ||
      signal?.aborted ||
      !stillAuthorized()
    )
      return result;
    const batch = creation
      .getSnapshot()
      .find(
        (item) =>
          item.id === result.generationPlanId &&
          item.projectId === request.projectId &&
          item.sessionId === request.sessionId &&
          item.state === 'pending' &&
          !item.recovered &&
          item.expiresAt > Date.now(),
      );
    if (!batch) return result;
    // approve claims synchronously and retains journal/configuration/expiry checks.
    void creation.approve(batch.id, undefined, 'direct');
    return { ...result, generationState: 'running' };
  };
}
