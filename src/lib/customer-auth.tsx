import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const TOKEN_KEY = "dg_customer_token";

export type Customer = {
  id: number;
  email: string;
  name: string;
  phone: string;
  marketing_opt_in: boolean;
};

export class CustomerApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getCustomerToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setCustomerToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearCustomerToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function customerFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.auth !== false) {
    const token = getCustomerToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(path, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new CustomerApiError(
      res.status,
      typeof data.error === "string" ? data.error : `Request failed (HTTP ${res.status})`
    );
  }
  return data as T;
}

type AuthContextValue = {
  customer: Customer | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    marketing_opt_in?: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: {
    name?: string;
    phone?: string;
    marketing_opt_in?: boolean;
  }) => Promise<void>;
};

const CustomerAuthContext = createContext<AuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getCustomerToken()) {
      setCustomer(null);
      setLoading(false);
      return;
    }
    try {
      const data = await customerFetch<{ customer: Customer }>("/api/auth/me");
      setCustomer(data.customer);
    } catch {
      clearCustomerToken();
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await customerFetch<{ token: string; customer: Customer }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    setCustomerToken(data.token);
    setCustomer(data.customer);
  }, []);

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      name: string;
      phone?: string;
      marketing_opt_in?: boolean;
    }) => {
      const data = await customerFetch<{ token: string; customer: Customer }>("/api/auth/register", {
        method: "POST",
        body: input,
        auth: false,
      });
      setCustomerToken(data.token);
      setCustomer(data.customer);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await customerFetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    clearCustomerToken();
    setCustomer(null);
  }, []);

  const updateProfile = useCallback(
    async (input: { name?: string; phone?: string; marketing_opt_in?: boolean }) => {
      const data = await customerFetch<{ customer: Customer }>("/api/auth/me", {
        method: "PATCH",
        body: input,
      });
      setCustomer(data.customer);
    },
    []
  );

  const value = useMemo(
    () => ({ customer, loading, refresh, login, register, logout, updateProfile }),
    [customer, loading, refresh, login, register, logout, updateProfile]
  );

  return (
    <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
