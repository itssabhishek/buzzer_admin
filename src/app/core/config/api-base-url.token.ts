import { InjectionToken } from '@angular/core';

/** The backend origin, configured through the active Angular environment. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
