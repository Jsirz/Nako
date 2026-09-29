import { it, expect, vi } from 'vitest';
import { createBackendSupervisor } from '../apps/desktop/src/backendSupervisor.mjs';
import { startupFailureMessage } from '../apps/desktop/src/startupFailure.mjs';
it.each(['CREDENTIAL_FORMAT_INVALID','CREDENTIAL_DECRYPT_FAILED'])('preserves safe startup cause %s without exposing secrets', async(code)=>{
  const fork=vi.fn();
  const supervisor=createBackendSupervisor({fork,entry:'unused',cwd:process.cwd(),logsDirectory:'unused',
    createEnvironment:async()=>{throw Object.assign(new Error('sensitive payload must stay private'),{code});}});
  await expect(supervisor.start('fixture')).rejects.toMatchObject({code,message:code});
  expect(fork).not.toHaveBeenCalled();
  expect(startupFailureMessage({code})).toMatch(/API Key/);
  expect(startupFailureMessage({code})).not.toMatch(/sensitive payload/);
  await supervisor.stop();
});
it('redacts unknown environment errors and allows retry',async()=>{
  const supervisor=createBackendSupervisor({fork:vi.fn(),entry:'unused',cwd:process.cwd(),logsDirectory:'unused',
    createEnvironment:async()=>{throw new Error('sensitive payload');}});
  await expect(supervisor.start('fixture')).rejects.toMatchObject({code:'BACKEND_FAILED',message:'BACKEND_FAILED'});
  await expect(supervisor.start('fixture')).rejects.toMatchObject({code:'BACKEND_FAILED'});
  await supervisor.stop();
});
