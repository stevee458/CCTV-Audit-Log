export * from "./generated/api";
export * from "./generated/api.schemas";
export {
  setBaseUrl,
  setAuthTokenGetter,
  setRequestPreprocessor,
  setOfflineMutationHandler,
  ApiError,
  customFetch,
} from "./custom-fetch";
export type {
  AuthTokenGetter,
  PreparedRequest,
  RequestPreprocessor,
  OfflineMutationHandler,
} from "./custom-fetch";
