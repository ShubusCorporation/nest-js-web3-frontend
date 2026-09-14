import { io, Socket } from 'socket.io-client';
import { create } from '@bufbuild/protobuf';
import { TransactionSchema } from '@src/generated/proto/src/proto/wallet-service_pb';
import { WalletStore } from '@src/wallet/wallet.store';
import { logger } from '@src/core/logger';

export class NotificationService {
  private socket: Socket | null = null;
  private readonly baseUrl: string;
  private readonly walletStore: WalletStore;

  // Внедряем WalletStore через конструктор, чтобы пушить туда данные
  constructor(walletStore: WalletStore) {
    this.baseUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080';
    this.walletStore = walletStore;
  }

  /**
   * Инициализация WebSocket-соединения
   */
  public connect(): void {
    if (this.socket?.connected) return;

    logger.info({ url: this.baseUrl }, 'Установка WebSocket соединения с бэкендом...');
    
    this.socket = io(this.baseUrl, {
      transports: ['websocket'], // Используем только чистые вебсокеты для скорости
      autoConnect: true,
    });

    this.setupListeners();
  }

  /**
   * Подписка на обновления конкретного криптокошелька
   */
  public subscribeToWallet(walletAddress: string): void {
    if (!this.socket) {
      logger.warn('Попытка подписки до инициализации сокета');
      return;
    }

    const address = walletAddress.toLowerCase();
    logger.info({ address }, 'Отправка запроса на подписку на WebSocket комнату');
    
    // Отправляем бэкенду событие, которое мы запрограммировали в NestJS Gateway
    this.socket.emit('subscribe_wallet', { walletAddress: address });
  }

  /**
   * Отключение от сервера
   */
  public disconnect(): void {
    if (this.socket) {
      logger.info('Закрытие WebSocket соединения');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Внутренний метод настройки слушателей событий сокета
   */
  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      logger.info('⚡ [WebSockets] Успешно подключено к серверу уведомлений');
    });

    this.socket.on('disconnect', (reason: string) => {
      logger.warn({ reason }, '❌ [WebSockets] Соединение разорвано');
    });

    // Подтверждение успешного входа в комнату от нашего NestJS гейтвея
    this.socket.on('subscribed', (data: { status: string; wallet: string }) => {
      logger.debug({ data }, 'Успешно зарегистрирована комната на сервере');
    });

    // Слушаем новые транзакции, прилетающие из Redis Pub/Sub через бэкенд
    this.socket.on('notification_tx', (rawTx: unknown) => {
      try {
        logger.info('Прилетел пуш новой транзакции, валидируем...');

        // Проверяем структуру данных и безопасно приводим к типу на основе Protobuf схемы
        const txData = rawTx as Record<string, string>;
        
        const validProtoTx = create(TransactionSchema, {
          id: txData.id,
          txHash: txData.txHash,
          fromAddress: txData.fromAddress,
          toAddress: txData.toAddress,
          amount: txData.amount,
          timestamp: txData.timestamp,
          tokenSymbol: txData.tokenSymbol,
        });

        // Пушим валдиную транзакцию напрямую в экшн MobX стора
        this.walletStore.addLiveTransaction(validProtoTx);
        
      } catch (err) {
        logger.error({ err, rawTx }, 'Ошибка валидации данных транзакции из WebSocket');
      }
    });
  }
}
