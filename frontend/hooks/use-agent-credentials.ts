"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LLMCredential = {
  provider: string;
  model?: string;
  apiKey: string;
};

export type ToolCredential = {
  providerLabel: string;
  apiKey: string;
  toolIds?: string[];
};

export type AgentCredentials = {
  llm?: LLMCredential;
  tools: Record<string, ToolCredential>;
  updatedAt?: string;
};

type AgentCredentialsUpdater =
  | AgentCredentials
  | ((previous: AgentCredentials) => AgentCredentials);

type UpdateOptions = {
  persist?: boolean;
  updateTimestamp?: boolean;
};

const SESSION_STORAGE_KEY = "aegis:session-renter-credentials:v1";
const LOCAL_STORAGE_KEY = "aegis:persistent-renter-credentials:v1";

function createEmptyCredentials(): AgentCredentials {
  return { tools: {} };
}

export function normalizeCredentialKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

function readStore(storage: Storage | undefined, key: string) {
  if (typeof window === "undefined" || !storage) {
    return {} as Record<string, AgentCredentials>;
  }

  try {
    const raw = storage.getItem(key);
    if (!raw) return {} as Record<string, AgentCredentials>;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return {} as Record<string, AgentCredentials>;
    }
    return parsed as Record<string, AgentCredentials>;
  } catch (error) {
    console.warn("Failed to parse credential storage", error);
    return {} as Record<string, AgentCredentials>;
  }
}

function writeStore(
  storage: Storage | undefined,
  key: string,
  data: Record<string, AgentCredentials>
) {
  if (typeof window === "undefined" || !storage) {
    return;
  }

  try {
    if (Object.keys(data).length === 0) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, JSON.stringify(data));
    }
  } catch (error) {
    console.warn("Failed to persist credential storage", error);
  }
}

function normalizeCredentials(
  input: AgentCredentials | null | undefined,
  { updateTimestamp = true }: Pick<UpdateOptions, "updateTimestamp"> = {}
): AgentCredentials {
  if (!input) {
    return createEmptyCredentials();
  }

  const result: AgentCredentials = {
    tools: {},
  };

  const llmKey = input.llm?.apiKey?.trim();
  const llmProvider = input.llm?.provider?.trim();
  if (llmKey && llmProvider) {
    result.llm = {
      provider: llmProvider,
      model: input.llm?.model,
      apiKey: llmKey,
    };
  }

  const tools = input.tools ?? {};
  for (const [rawKey, credential] of Object.entries(tools)) {
    if (!credential) continue;
    const apiKey = credential.apiKey?.trim();
    const providerLabel = credential.providerLabel?.trim();
    if (!apiKey || !providerLabel) continue;

    const storageKey = rawKey || normalizeCredentialKey(providerLabel);
    result.tools[storageKey] = {
      providerLabel,
      apiKey,
      toolIds: credential.toolIds ?? [],
    };
  }

  if (!result.llm && Object.keys(result.tools).length === 0) {
    return createEmptyCredentials();
  }

  if (updateTimestamp) {
    result.updatedAt = new Date().toISOString();
  } else if (input.updatedAt) {
    result.updatedAt = input.updatedAt;
  }

  return result;
}

function isCredentialsEmpty(credentials: AgentCredentials) {
  return !credentials.llm && Object.keys(credentials.tools).length === 0;
}

export function useAgentCredentials(agentId: number | string) {
  const [credentials, setCredentialsState] = useState<AgentCredentials>(
    createEmptyCredentials
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPersisted, setIsPersisted] = useState(false);

  const persistedRef = useRef(false);
  const agentKey = String(agentId);

  const persistToStorage = useCallback(
    (next: AgentCredentials, override?: boolean) => {
      if (typeof window === "undefined") {
        return;
      }

      const shouldPersist = override ?? persistedRef.current;
      persistedRef.current = shouldPersist;
      setIsPersisted(shouldPersist);

      const sessionStore = {
        ...readStore(window.sessionStorage, SESSION_STORAGE_KEY),
      };

      if (isCredentialsEmpty(next)) {
        delete sessionStore[agentKey];
      } else {
        sessionStore[agentKey] = next;
      }
      writeStore(window.sessionStorage, SESSION_STORAGE_KEY, sessionStore);

      const persistentStore = {
        ...readStore(window.localStorage, LOCAL_STORAGE_KEY),
      };

      if (shouldPersist && !isCredentialsEmpty(next)) {
        persistentStore[agentKey] = next;
      } else if (persistentStore[agentKey]) {
        delete persistentStore[agentKey];
      }
      writeStore(window.localStorage, LOCAL_STORAGE_KEY, persistentStore);
    },
    [agentKey]
  );

  const applyUpdate = useCallback(
    (updater: AgentCredentialsUpdater, options?: UpdateOptions) => {
      setCredentialsState((previous) => {
        const base =
          typeof updater === "function" ? updater(previous) : updater;
        const normalized = normalizeCredentials(base, {
          updateTimestamp: options?.updateTimestamp ?? true,
        });
        persistToStorage(normalized, options?.persist);
        return normalized;
      });
    },
    [persistToStorage]
  );

  const clearCredentials = useCallback(() => {
    const empty = createEmptyCredentials();
    if (typeof window !== "undefined") {
      const sessionStore = {
        ...readStore(window.sessionStorage, SESSION_STORAGE_KEY),
      };
      if (sessionStore[agentKey]) {
        delete sessionStore[agentKey];
        writeStore(window.sessionStorage, SESSION_STORAGE_KEY, sessionStore);
      }

      const persistentStore = {
        ...readStore(window.localStorage, LOCAL_STORAGE_KEY),
      };
      if (persistentStore[agentKey]) {
        delete persistentStore[agentKey];
        writeStore(window.localStorage, LOCAL_STORAGE_KEY, persistentStore);
      }
    }
    persistedRef.current = false;
    setIsPersisted(false);
    setCredentialsState(empty);
  }, [agentKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const sessionStore = readStore(window.sessionStorage, SESSION_STORAGE_KEY);
    const persistentStore = readStore(window.localStorage, LOCAL_STORAGE_KEY);

    const stored = sessionStore[agentKey] ?? persistentStore[agentKey];
    const normalized = normalizeCredentials(stored, { updateTimestamp: false });

    if (
      stored &&
      sessionStore[agentKey] == null &&
      !isCredentialsEmpty(normalized)
    ) {
      const nextSession = {
        ...sessionStore,
        [agentKey]: normalized,
      };
      writeStore(window.sessionStorage, SESSION_STORAGE_KEY, nextSession);
    }

    const hasPersistent = Boolean(
      persistentStore[agentKey] && !isCredentialsEmpty(normalized)
    );
    persistedRef.current = hasPersistent;
    setIsPersisted(hasPersistent);
    setCredentialsState(normalized);
    setIsLoaded(true);
  }, [agentKey]);

  return {
    credentials,
    isLoaded,
    isPersisted,
    setCredentials: applyUpdate,
    clearCredentials,
  } as const;
}
