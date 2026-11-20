import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

// Angular 21 apps are "zoneless" by default: there is no zone.js. Angular
// runs change detection after template events (like a click) and signal
// changes instead.
export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()],
};
