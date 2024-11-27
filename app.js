import { startSyncScheduler as startTransactionsSyncScheduler } from './transactions.js';
import { startSyncScheduler as startGoogleSheetSyncScheduler } from './google-sheet.js';

startTransactionsSyncScheduler();
startGoogleSheetSyncScheduler();
