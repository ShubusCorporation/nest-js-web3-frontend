import { runInAction } from 'mobx';
import { type Client } from '@connectrpc/connect';
import { create } from '@bufbuild/protobuf';
import {
  WalletService,
  WatchedAddressSchema,
  type Transaction,
  type WatchedAddress,
} from '@src/generated/proto/src/proto/wallet-service_pb';

import {
  makeObservable,
  observable,
  action,
} from 'mobx';

import { logger } from '@src/core/logger';

type ToggleWatchAddressParams = {
  address: string;
  enabled: boolean;
  userWallet: string;
};

export class WalletStore {
  public transactions: Transaction[] = [];
  public isLoading = false;
  public error: string | null = null;

  // Адреса, отслеживаемые текущим пользователем.
  public watchedAddresses: WatchedAddress[] = [];

  public isWatchlistLoading = false;

  // Связь идентификатора транзакции с адресом, для которого она загружена.
  private transactionAddresses = new Map<string, string>();

  private readonly client: Client<typeof WalletService>;

  constructor(client: Client<typeof WalletService>) {
    this.client = client;

    makeObservable(this, {
      transactions: observable,
      isLoading: observable,
      error: observable,
      watchedAddresses: observable,
      isWatchlistLoading: observable,
      fetchTransactions: action,
      toggleWatchAddress: action,
      getWatchedAddresses: action,
      removeTransactionsForAddress: action,
      addLiveTransaction: action,
    });
  }

  /**
   * Загрузка истории транзакций кошелька.
   */
  async fetchTransactions(
    walletAddress: string,
    page = 1,
    limit = 20,
  ): Promise<void> {
    const normalizedAddress = walletAddress.toLowerCase();

    this.isLoading = true;
    this.error = null;

    logger.info(
      { walletAddress: normalizedAddress, page, limit },
      'Запрос транзакций кошелька через gRPC',
    );

    try {
      const response = await this.client.getTransactions({
        walletAddress: normalizedAddress,
        page,
        limit,
      });

      runInAction(() => {
        const incomingTransactions = response.transactions;

        // Обновляем транзакции только для запрошенного адреса.
        const otherTransactions = this.transactions.filter(
          (tx) =>
            this.transactionAddresses.get(tx.id) !== normalizedAddress,
        );

        for (const tx of incomingTransactions) {
          this.transactionAddresses.set(tx.id, normalizedAddress);
        }

        this.transactions = [
          ...otherTransactions,
          ...incomingTransactions,
        ];

        this.isLoading = false;
      });
    } catch (err: unknown) {
      logger.error(
        { err, walletAddress: normalizedAddress },
        'Ошибка при получении транзакций через ConnectRPC',
      );

      runInAction(() => {
        this.error = 'Не удалось загрузить историю транзакций';
        this.isLoading = false;
      });
    }
  }

  /**
   * Включение или отключение мониторинга адреса.
   */
  async toggleWatchAddress({
    address,
    enabled,
    userWallet,
  }: ToggleWatchAddressParams): Promise<void> {
    const walletAddress = address.toLowerCase();
    const normalizedUserWallet = userWallet.toLowerCase();

    logger.info(
      {
        walletAddress,
        userWallet: normalizedUserWallet,
        enabled,
      },
      'Изменение подписки на мониторинг кошелька',
    );

    /*const response = await this.client.toggleWatchAddress({
      userWallet: normalizedUserWallet,
      walletAddress,
      enabled,
    });

    if (!response.success) {
      throw new Error(
        response.message || 'Не удалось изменить подписку на кошелёк',
      );
    }*/

    // Обновляем локальный watchlist только после подтверждения сервера.
    runInAction(() => {
      const existing = this.watchedAddresses.find(
        (item) =>
          item.walletAddress.toLowerCase() === walletAddress,
      );

      if (existing) {
        existing.enabled = enabled;
      } else if (enabled) {
        this.watchedAddresses.push(
          create(WatchedAddressSchema, {
            walletAddress,
            name: '',
            type: '',
            enabled: true,
          }),
        );
      }
    });

    logger.info(
      { walletAddress, enabled },
      'Подписка на мониторинг кошелька обновлена',
    );
  }

  /**
   * Загрузка списка подписок пользователя из БД.
   * Вызывать после авторизации.
   */
  async getWatchedAddresses(userWallet: string): Promise<void> {
    this.isWatchlistLoading = true;

    try {
      const response = await this.client.getWatchedAddresses({
        userWallet: userWallet.toLowerCase(),
      });

      runInAction(() => {
        this.watchedAddresses = response.addresses;
        this.isWatchlistLoading = false;
      });

      logger.info(
        {
          userWallet,
          count: response.addresses.length,
        },
        'Список отслеживаемых кошельков загружен',
      );
    } catch (err: unknown) {
      logger.error(
        { err, userWallet },
        'Ошибка загрузки списка отслеживаемых кошельков',
      );

      runInAction(() => {
        this.isWatchlistLoading = false;
        this.error = 'Не удалось загрузить список отслеживаемых кошельков';
      });

      throw err;
    }
  }

  /**
   * Удаление транзакций конкретного адреса из локального состояния.
   */
  removeTransactionsForAddress(walletAddress: string): void {
    const normalizedAddress = walletAddress.toLowerCase();

    runInAction(() => {
      this.transactions = this.transactions.filter((tx) => {
        const txAddress = this.transactionAddresses.get(tx.id);

        if (txAddress === normalizedAddress) {
          this.transactionAddresses.delete(tx.id);
          return false;
        }

        return true;
      });
    });

    logger.debug(
      { walletAddress: normalizedAddress },
      'Транзакции кошелька удалены из локального состояния',
    );
  }

  /**
   * Добавление новой транзакции из WebSocket или gRPC-потока.
   *
   * walletAddress можно передавать из обработчика потока,
   * чтобы впоследствии корректно удалять транзакции этого адреса.
   */
  addLiveTransaction(
    tx: Transaction,
    walletAddress?: string,
  ): void {
    const exists = this.transactions.some(
      (item) =>
        item.id === tx.id ||
        item.txHash.toLowerCase() === tx.txHash.toLowerCase(),
    );

    if (exists) {
      return;
    }

    if (walletAddress) {
      this.transactionAddresses.set(
        tx.id,
        walletAddress.toLowerCase(),
      );
    }

    this.transactions.unshift(tx);

    logger.debug(
      { txHash: tx.txHash, walletAddress },
      'Новая транзакция добавлена в MobX',
    );
  }
}
