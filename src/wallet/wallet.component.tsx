import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useStores } from '@src/core/root-store';
import { logger } from '@src/core/logger';

export const WalletComponent = observer(() => {
  // 1. Достаем наш строго типизированный WalletStore из MobX контекста
  const { walletStore, notificationService } = useStores();

  // 2. Достаем Web3-состояния и методы из Wagmi
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // 3. Реагируем на изменение адреса кошелька в MetaMask
  useEffect(() => {
    if (isConnected && address) {
      logger.info({ address }, 'Кошелек подключен, запускаем gRPC и WebSockets...');
      // Загружаем историю через gRPC-Web
      notificationService.connect();
      walletStore.fetchTransactions(address);
      // Подписываем сокет на живые обновления для этого адреса
      notificationService.subscribeToWallet(address);
    }
  }, [isConnected, address, walletStore, notificationService]);

  // Сценарий 1: Пользователь еще не подключил кошелек
  if (!isConnected) {
    return (
      <div style={{ padding: '16px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>Подключите ваш Web3 кошелек</h3>
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => connect({ connector })}
            style={{ padding: '10px 20px', cursor: 'pointer', marginRight: '8px' }}
          >
            Войти через {connector.name}
          </button>
        ))}
      </div>
    );
  }

  // Сценарий 2: Кошелек подключен, отображаем панель управления
  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
        <div>
          <strong>Статус:</strong> Подключено к адресу: <code style={{ color: 'green' }}>{address}</code>
        </div>
        <button 
          onClick={() => disconnect()} 
          style={{ padding: '6px 12px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Выйти
        </button>
      </div>

      <h3 style={{ marginTop: '24px' }}>История транзакций (gRPC-Web)</h3>

      {/* Индикатор загрузки */}
      {walletStore.isLoading && <p>🔄 Загрузка транзакций с бэкенда...</p>}

      {/* Вывод ошибки */}
      {walletStore.error && <p style={{ color: 'red' }}>⚠️ {walletStore.error}</p>}

      {/* Таблица транзакций */}
      {!walletStore.isLoading && !walletStore.error && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
          <thead>
            <tr style={{ background: '#e8e8e8', textAlign: 'left' }}>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Хэш</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Откуда</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Куда</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Сумма</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Токен</th>
            </tr>
          </thead>
          <tbody>
            {walletStore.transactions.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: '#999' }}>
                  Транзакций не найдено. Попробуйте совершить перевод в тестовой сети.
                </td>
              </tr>
            ) : (
              walletStore.transactions.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                    {tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)}
                  </td>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                    {tx.fromAddress.slice(0, 6)}...{tx.fromAddress.slice(-4)}
                  </td>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                    {tx.toAddress.slice(0, 6)}...{tx.toAddress.slice(-4)}
                  </td>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{tx.amount}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ background: '#1890ff', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                      {tx.tokenSymbol}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
});
