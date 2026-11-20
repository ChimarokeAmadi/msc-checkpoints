// PART 2: who reads from where, and how safely each kind of data is written.
// This is where the consistency / availability trade-off is decided, per
// type of data instead of once for the whole database.
import { ReadPreference } from 'mongodb';

// Client options for the whole app. retryWrites/retryReads: if the primary
// fails and a new one is elected, the driver retries the operation once on
// the new primary, so a failover usually isn't even visible to the customer.
export const CLIENT_OPTIONS = {
  retryWrites: true,
  retryReads: true,
  w: 'majority',
  readConcernLevel: 'majority',
  serverSelectionTimeoutMS: 15000,
};

// ORDERS: consistency first. Writes are acknowledged by a majority of the
// replica set (so they survive a failover), and reads go to the primary so
// a customer always sees the order they just placed. During an election
// (a few seconds) order writes wait and are retried.
export const ORDER_READ = { readPreference: ReadPreference.PRIMARY, readConcern: { level: 'majority' } };
export const ORDER_WRITE = { writeConcern: { w: 'majority', wtimeoutMS: 5000 } };

// CATALOG: availability first. Product pages and search can be served by any
// node, preferring secondaries, so browsing keeps working even while there's
// no primary. A product may be a few seconds out of date (a price, the stock
// shown); that's acceptable because the price and stock are checked again on
// the primary when the order is placed. maxStalenessSeconds stops a node that
// has fallen far behind from answering.
export const CATALOG_READ = {
  readPreference: new ReadPreference(ReadPreference.SECONDARY_PREFERRED, undefined, { maxStalenessSeconds: 90 }),
  readConcern: { level: 'local' },
};

// ANALYTICS: heavy queries go to the node tagged nodeType: ANALYTICS (a
// priority-0 member that can never become primary). The empty tag set {} is
// the fallback: if the analytics node is down, any secondary will do. So big
// reports never slow down the nodes serving customers.
export const ANALYTICS_READ = {
  readPreference: new ReadPreference(ReadPreference.SECONDARY_PREFERRED, [{ nodeType: 'ANALYTICS' }, {}]),
  readConcern: { level: 'local' },
};
