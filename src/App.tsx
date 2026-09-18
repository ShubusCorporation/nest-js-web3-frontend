import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { config } from '@src/core/wagmi';
import { WalletComponent } from '@src/wallet/wallet.component';
import { logger } from '@src/core/logger';
import { ErrorBoundary } from '@src/core/error-boundary';
import { RootStore, RootStoreProvider } from '@src/core/root-store';

// Инициализируем TanStack Query клиент для кэширования блокчейн-данных
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const rootStore = new RootStore();

export function App() {
  logger.info('Инициализация главного компонента App и Web3 провайдеров');

  return (
    <ErrorBoundary
      fallback={(error) => {
        return (
          <div style={{ padding: '24px', color: 'darkred' }}>
            <h1>Ошибка: {error.message || 'No error message'}</h1>
            <pre>{error.stack || 'No error stack'}</pre>
          </div>
        );
      }}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RootStoreProvider value={rootStore}>
            <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
              <h1>Web3 Analytics Dashboard</h1>
              <WalletComponent />
            </div>
          </RootStoreProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}
