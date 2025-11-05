export type {
  QuotaUsage,
  QuotaLimit,
  QuotaUsageCreateData,
  QuotaUsageUpdateData,
} from './model'
export { QUOTA_LIMITS } from './model'

// Export quota API client and utilities (Task T086)
export {
  QuotaApiClient,
  quotaApi,
  ClientQuotaValidator,
  QuotaApiClientError,
  getQuotaApiClient
} from './lib/api'
export type {
  QuotaStatusResponse,
  QuotaUsageRequest,
  QuotaUsageResponse,
  QuotaHistoryResponse,
  QuotaResetResponse,
  QuotaApiError,
  QuotaApiConfig
} from './lib/api'