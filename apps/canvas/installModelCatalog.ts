import { installModelCatalog } from '../../modules/generation-core/api/models/catalog';
import { modelContributions } from './modelContributions';

// Populate shared arrays before any browser plugin module is evaluated.
installModelCatalog(modelContributions);
