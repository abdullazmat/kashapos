import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContextState {
  method?: string;
  path?: string;
  ipAddress?: string;
  apiVersion?: string;
  auth?: {
    userId?: string;
    tenantId?: string;
    role?: string;
    email?: string;
    name?: string;
    branchId?: string;
  };
  auditLogged?: boolean;
}

const requestContextStorage = new AsyncLocalStorage<RequestContextState>();

export function getRequestContext() {
  return requestContextStorage.getStore();
}

export function setRequestContext(input: RequestContextState) {
  const current = requestContextStorage.getStore() || {};
  requestContextStorage.enterWith({
    ...current,
    ...input,
    auth: {
      ...(current.auth || {}),
      ...(input.auth || {}),
    },
  });
}

export function markRequestAuditLogged() {
  const current = requestContextStorage.getStore() || {};
  requestContextStorage.enterWith({ ...current, auditLogged: true });
}
