import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { config } from '@src/core/wagmi';
import { WalletComponent } from '@src/wallet/wallet.component';
import { logger } from '@src/core/logger';

// Инициализируем TanStack Query клиент для кэширования блокчейн-данных
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Отключаем повторные запросы при ошибках в dev-режиме
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  logger.info('Инициализация главного компонента App и Web3 провайдеров');

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
          <h1>Web3 Analytics Dashboard</h1>
          
          {/* Наш основной UI компонент, который мы напишем следующим шагом */}
          <WalletComponent />
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
