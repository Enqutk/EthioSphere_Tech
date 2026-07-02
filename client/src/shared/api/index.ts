/**
 * Public API surface for the backend. Import from `@/shared/api` in app code.
 */
export { api, ApiError, getApiBaseUrl } from './http';
export { healthApi, apiDeploymentHint } from './health';
export type { User, FollowForViewer, DiscoverUser } from './types';
export { authApi } from './auth';
export { usersApi } from './users';
export { projectsApi } from './projects';
export { messagesApi } from './messages';
export { followApi } from './follow';
export { challengesApi } from './challenges';
export { adminApi } from './admin';
export { postsApi } from './posts';
export { companiesApi } from './companies';
export { reportsApi } from './reports';
export type { CompanyProfile } from './companies';
