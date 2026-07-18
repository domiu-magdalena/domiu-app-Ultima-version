import '@/types/auth';

declare module '@/types/auth' {
  interface AuthSession {
    /** Alias temporal para componentes migrados; usar isLoading en código nuevo. */
    loading?: boolean;
  }
}
