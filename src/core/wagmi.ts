import { http, createConfig } from 'wagmi';
import { mainnet, localhost } from 'wagmi/chains';
import { metaMask } from 'wagmi/connectors';

export const config = createConfig({
  // Задаем поддерживаемые сети
  chains: [mainnet, localhost],
  // Подключаем коннекторы (в данном случае MetaMask)
  connectors: [
    metaMask(),
  ],
  // Настраиваем транспорт для каждой сети через Viem под капотом
  transports: {
    [mainnet.id]: http(import.meta.env.VITE_RPC_URL || 'https://llamarpc.com'),
    [localhost.id]: http('http://127.0.0.1:8545'),
  },
});

// Глобальная регистрация типов (Declaration Merging)
// Позволяет TypeScript автоматически выводить типы во всем приложении без useConfig
declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
