import { createClient, type Client } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { WalletService } from '@src/generated/proto/src/proto/wallet-service_pb';

// Настраиваем транспорт. connect-web делает обычные HTTP/1.1 или HTTP/2 POST-запросы
const transport = createConnectTransport({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

export const apiClient: Client<typeof WalletService> = createClient(WalletService, transport);
