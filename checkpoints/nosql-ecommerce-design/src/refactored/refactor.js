// PART 2: runs the whole refactor on a live database, in a safe order.
//
// Before this runs, the app is deployed with the version 2 code. Version 2
// orders also pass the version 1 validator (they only have extra fields), so
// old and new code can run side by side during the deploy.
import { runSalesRollup } from './analytics.js';
import { migrateOrdersToV2 } from './migrate.js';
import { createRefactoredCollections, createRefactoredIndexes } from './schema.js';

export async function refactorToV2(db, { asOf } = {}) {
  // 1. New validators with validationLevel "moderate": new and already valid
  //    documents must follow version 2, but the old version 1 orders aren't
  //    rejected while they wait to be migrated.
  await createRefactoredCollections(db, { validationLevel: 'moderate' });
  // 2. Add category and brand to every old order.
  const migrated = await migrateOrdersToV2(db);
  // 3. Everything is version 2 now, so the validator becomes strict.
  await createRefactoredCollections(db, { validationLevel: 'strict' });
  // 4. New indexes, and the unique orderNumber index is replaced.
  await createRefactoredIndexes(db);
  // 5. First full run of the analytics job.
  const rollup = await runSalesRollup(db, { asOf });
  return { migrated, ...rollup };
}
