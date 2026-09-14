import { describe, it, expect, vi } from 'vitest';
import { WalletStore } from '@src/wallet/wallet.store';
import { create } from '@bufbuild/protobuf';
import { type Client } from '@connectrpc/connect';
import { 
  WalletService, 
  GetTransactionsResponseSchema, 
  TransactionSchema 
} from '@src/generated/proto/src/proto/wallet-service_pb';

describe('WalletStore', () => {
  it('должен успешно загружать транзакции и обновлять состояние', async () => {
    // 1. Создаем строго типизированную фейковую транзакцию через фабрику Protobuf
    const mockTx = create(TransactionSchema, {
      id: 'tx-1',
      txHash: '0xhash123',
      fromAddress: '0xfrom',
      toAddress: '0xto',
      amount: '1000',
      timestamp: new Date().toISOString(),
      tokenSymbol: 'USDT',
    });

    // 2. Создаем мок gRPC-клиента без any. 
    // Используем фейк-функцию vi.fn() (или jest.fn()), которая имитирует ответ сервера
    const mockGrpcClient = {
      getTransactions: vi.fn().mockResolvedValue(
        create(GetTransactionsResponseSchema, {
          transactions: [mockTx],
          totalCount: 1,
          hasMore: false,
        })
      ),
    } as unknown as Client<typeof WalletService>; // Безопасное приведение к типу контракта

    // 3. Передаем мок напрямую в конструктор (Чистый Dependency Injection)
    const store = new WalletStore(mockGrpcClient);

    // Проверяем начальное состояние стора
    expect(store.transactions).toHaveLength(0);
    expect(store.isLoading).toBe(false);

    // 4. Запускаем экшн загрузки
    const testAddress = '0x1234567890abcdef1234567890abcdef12345678';
    const fetchPromise = store.fetchTransactions(testAddress);

    // Проверяем, что во время запроса включился индикатор загрузки
    expect(store.isLoading).toBe(true);

    await fetchPromise;

    // 5. Проверяем финальное состояние после завершения асинхронного экшна
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeNull();
    expect(store.transactions).toHaveLength(1);
    expect(store.transactions[0].id).toBe('tx-1');
    
    // Проверяем, что gRPC-клиент был вызван с правильными параметрами
    expect(mockGrpcClient.getTransactions).toHaveBeenCalledWith({
      walletAddress: testAddress,
      page: 1,
      limit: 20,
    });
  });

  it('должен обрабатывать ошибки сети и записывать их в состояние', async () => {
    // Имитируем падение gRPC сервера
    const mockGrpcClient = {
      getTransactions: vi.fn().mockRejectedValue(new Error('gRPC Connection Refused')),
    } as unknown as Client<typeof WalletService>;

    const store = new WalletStore(mockGrpcClient);

    await store.fetchTransactions('0xaddress');

    // Проверяем, что стор корректно отработал ошибку
    expect(store.isLoading).toBe(false);
    expect(store.transactions).toHaveLength(0);
    expect(store.error).toBe('Не удалось загрузить историю транзакций');
  });

  it('должен реактивно добавлять живые транзакции из вебсокетов в начало списка', () => {
    // Для этого теста gRPC клиент вообще не будет вызываться, передаем пустой объект
    const dummyClient = {} as Client<typeof WalletService>;
    const store = new WalletStore(dummyClient);

    const liveTx = create(TransactionSchema, {
      id: 'tx-live',
      txHash: '0xlivehash',
      fromAddress: '0xfrom',
      toAddress: '0xto',
      amount: '500',
      timestamp: new Date().toISOString(),
      tokenSymbol: 'USDT',
    });

    // Вызываем экшн добавления транзакции в реальном времени
    store.addLiveTransaction(liveTx);

    expect(store.transactions).toHaveLength(1);
    expect(store.transactions[0].id).toBe('tx-live');
  });
});
