import type { NodePackageManifest } from '../../../contracts/nodeSdk.js';
import type { NodePackage } from '../../../contracts/nodeSdk.js';

interface NodeFrameworkRegistrar {
  registerPackage(nodePackage: NodePackage, owner?: string): () => boolean;
}

interface DirectoryResponse {
  packages?: Array<{ packageId: string; manifest: NodePackageManifest }>;
  errors?: Array<{ message: string }>;
}

export async function loadNodeDirectoryPackages(
  framework: NodeFrameworkRegistrar,
  fetcher: typeof fetch = fetch,
): Promise<{ loaded: string[]; skipped: string[]; errors: string[] }> {
  const response = await fetcher('/api/node-packages', { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Node package directory request failed: ${response.status}`);
  const payload = (await response.json()) as DirectoryResponse;
  const previous = disposers.get(framework);
  previous?.forEach((dispose) => dispose());
  const current = new Map<string, () => boolean>();
  disposers.set(framework, current);
  const loaded: string[] = [], skipped: string[] = [];
  for (const item of payload.packages ?? []) {
    try {
      current.set(item.packageId, framework.registerPackage({ manifest: item.manifest }, 'user.node-directory'));
      loaded.push(item.packageId);
    } catch {
      skipped.push(item.packageId);
    }
  }
  window.dispatchEvent(new Event('nako:nodes-changed'));
  return { loaded, skipped, errors: (payload.errors || []).map(item => item.message) };
}

const disposers = new WeakMap<object, Map<string, () => boolean>>();
