import { makeAutoObservable, runInAction } from 'mobx';
import { type Client } from '@connectrpc/connect';
import { WalletService } from '@src/generated/proto/src/proto/wallet-service_pb';
import { type Transaction } from '@src/generated/proto/src/proto/wallet-service_pb';
import { logger } from '@src/core/logger';

export class WalletStore {
  // Строго типизированные состояния
  public transactions: Transaction[] = [];
  public isLoading = false;
  public error: string | null = null;
  private readonly client: Client<typeof WalletService>;

  // Внедряем gRPC клиент через конструктор (чистый DI)
  constructor(client: Client<typeof WalletService>) {
    this.client = client;
    makeAutoObservable(this);
  }

  /**
   * Экшн загрузки истории транзакций с бэкенда
   */
  async fetchTransactions(walletAddress: string, page = 1, limit = 20): Promise<void> {
    this.isLoading = true;
    this.error = null;
    logger.info({ walletAddress, page }, 'Запрос транзакций кошелька через gRPC');

    try {
      const response = await this.client.getTransactions({
        walletAddress,
        page,
        limit,
      });

      // В MobX 6 все изменения observable-полей после await должны быть внутри runInAction
      runInAction(() => {
        this.transactions = response.transactions;
        this.isLoading = false;
      });
    } catch (err: unknown) {
      logger.error(err, 'Ошибка при получении транзакций через ConnectRPC');
      runInAction(() => {
        this.error = 'Не удалось загрузить историю транзакций';
        this.isLoading = false;
      });
    }
  }

  /**
   * Экшн для добавления транзакции в реальном времени (вызовется из WebSocket-клиента)
   */
  addLiveTransaction(tx: Transaction): void {
    logger.debug({ txHash: tx.txHash }, 'Новая транзакция добавлена в MobX из WebSocket');
    this.transactions.unshift(tx);
  }
}
