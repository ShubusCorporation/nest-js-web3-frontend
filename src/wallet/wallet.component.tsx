import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  useConnection,
  useConnect,
  useConnectors,
  useDisconnect,
} from 'wagmi';

import { useStores } from '@src/core/root-store';
import { logger } from '@src/core/logger';

const WATCHLIST = [
  { id: '1', name: 'Vitalik', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', type: 'public wallet' },
  { id: '2', name: 'Uniswap Governance Treasury', address: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC', type: 'DAO treasury' },
  { id: '3', name: 'ENS DAO Wallet', address: '0xFe89cc7aBB2C4183683ab71653C4cdc9B02D44b7', type: 'DAO wallet' },
  { id: '4', name: 'ENS Gnosis Safe', address: '0xCF60916b6CB4753f58533808fA610FcbD4098Ec0', type: 'multisig' },
  { id: '5', name: 'ENS Multisig', address: '0x911143d946bA5d467BfC476491fdb235fEf4D667', type: 'multisig' },
  { id: '6', name: 'Lido Treasury Management Committee', address: '0xa02FC823cCE0D016bD7e17ac684c9abAb2d6D647', type: 'treasury multisig' },
  { id: '7', name: 'Lido Labs BORG', address: '0x95B521B4F55a447DB89f6a27f951713fC2035f3F', type: 'operational multisig' },
  { id: '8', name: 'Lido Depositor Bot', address: '0xF82aC5937A20dC862F9bc0668779031E06000f17', type: 'protocol bot' },
  { id: '9', name: 'Lido stETH', address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', type: 'protocol contract' },
  { id: '10', name: 'Uniswap UNI Token', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', type: 'protocol contract' },
] as const;

export const WalletComponent = observer(() => {
  const { walletStore, notificationService } = useStores();

  const { address: userAddress, isConnected } = useConnection();
  const connectors = useConnectors();

  const {
    mutate: connect,
    error: connectError,
    isPending: isConnecting,
  } = useConnect();

  const { mutate: disconnect } = useDisconnect();

  const [activeSubscriptions, setActiveSubscriptions] =
    useState<Record<string, boolean>>({});

  // Подключение транспорта уведомлений после авторизации.
  useEffect(() => {
    if (!isConnected || !userAddress) {
      return;
    }
    logger.info(
      { userAddress: userAddress },
      'Пользователь авторизован кошельком. Запуск транспорта уведомлений...',
    );
    notificationService.connect();
    void walletStore.getWatchedAddresses(userAddress);
  }, [isConnected, userAddress, notificationService, walletStore]);

  // Изменение подписки на отслеживание кошелька.
  const handleCheckboxChange = async (
    walletItem: (typeof WATCHLIST)[number],
  ) => {
    if (!userAddress) {
      return;
    }

    const targetAddress = walletItem.address.toLowerCase();
    const isCurrentlyTracked = !!activeSubscriptions[walletItem.id];
    const nextState = !isCurrentlyTracked;

    setActiveSubscriptions((prev) => ({
      ...prev,
      [walletItem.id]: nextState,
    }));

    try {
      logger.info(
        { address: targetAddress, enabled: nextState },
        `Изменение статуса подписки для кошелька ${walletItem.name} на ${nextState}`,
      );

      // Сохранение состояния подписки на бэкенде.
      if (walletStore.toggleWatchAddress) {
        await walletStore.toggleWatchAddress({
          address: targetAddress,
          enabled: nextState,
          userWallet: userAddress,
        });
      }

      // Управление подписками и историей транзакций.
      if (nextState) {
        notificationService.subscribeToWallet(targetAddress, userAddress);
        await walletStore.fetchTransactions(userAddress);
      } else {
        if (notificationService.unsubscribeFromWallet) {
          notificationService.unsubscribeFromWallet(targetAddress, userAddress);
        }

        if (walletStore.removeTransactionsForAddress) {
          walletStore.removeTransactionsForAddress(targetAddress);
        }
      }
    } catch (error) {
      logger.error(
        { error },
        `Не удалось изменить статус отслеживания для ${targetAddress}`,
      );

      // Откат состояния чекбокса при ошибке.
      setActiveSubscriptions((prev) => ({
        ...prev,
        [walletItem.id]: isCurrentlyTracked,
      }));
    }
  };

  // Экран подключения кошелька.
  if (!isConnected) {
    return (
      <div
        style={{
          padding: '16px',
          border: '1px solid #ccc',
          borderRadius: '8px',
        }}
      >
        <h3>Подключите ваш Web3-кошелёк для авторизации</h3>

        {connectors.map((connector) => (
          <button
            key={connector.uid}
            disabled={isConnecting}
            onClick={() => {
              connect(
                { connector },
                {
                  onError: (error) => {
                    logger.error(
                      { error },
                      `Ошибка подключения через ${connector.name}`,
                    );
                  },
                },
              );
            }}
            style={{
              padding: '10px 20px',
              cursor: isConnecting ? 'default' : 'pointer',
              marginRight: '8px',
            }}
          >
            {isConnecting
              ? 'Подключение...'
              : `Войти через ${connector.name}`}
          </button>
        ))}

        {connectError && (
          <p style={{ color: 'red', marginTop: '12px' }}>
            Ошибка подключения: {connectError.message}
          </p>
        )}
      </div>
    );
  }

  // Основной интерфейс.
  return (
    <div style={{ marginTop: '20px', fontFamily: 'sans-serif' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f5f5f5',
          padding: '12px',
          borderRadius: '8px',
        }}
      >
        <div>
          <strong>Сессия:</strong> Авторизован как{' '}
          <code style={{ color: 'green' }}>{userAddress}</code>
        </div>

        <button
          onClick={() => disconnect()}
          style={{
            padding: '6px 12px',
            background: '#ff4d4f',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Выйти
        </button>
      </div>

      {/* Список адресов для мониторинга. */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          background: '#fafafa',
          borderRadius: '8px',
          border: '1px solid #eee',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>
          Выберите кошельки для мониторинга:
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '12px',
          }}
        >
          {WATCHLIST.map((item) => (
            <label
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                padding: '10px',
                background: '#fff',
                border: '1px solid #e8e8e8',
                borderRadius: '6px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={!!activeSubscriptions[item.id]}
                onChange={() => handleCheckboxChange(item)}
                style={{ marginRight: '10px', marginTop: '4px' }}
              />

              <div>
                <strong style={{ fontSize: '14px' }}>{item.name}</strong>

                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  {item.type}
                </div>

                <code style={{ fontSize: '11px', color: '#1890ff' }}>
                  {item.address.slice(0, 6)}...
                  {item.address.slice(-4)}
                </code>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* История транзакций. */}
      <h3 style={{ marginTop: '24px' }}>
        История транзакций отслеживаемых адресов
      </h3>

      {walletStore.isLoading && (
        <p>🔄 Загрузка транзакций с бэкенда...</p>
      )}

      {walletStore.error && (
        <p style={{ color: 'red' }}>⚠️ {walletStore.error}</p>
      )}

      {!walletStore.isLoading && !walletStore.error && (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '12px',
          }}
        >
          <thead>
            <tr style={{ background: '#e8e8e8', textAlign: 'left' }}>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>
                Хэш
              </th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>
                Откуда
              </th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>
                Куда
              </th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>
                Сумма
              </th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>
                Токен
              </th>
            </tr>
          </thead>

          <tbody>
            {/* ИСПРАВЛЕНО: добавлена открывающая фигурная скобка перед map. */}
            {walletStore.transactions.map((tx) => (
              <tr
                key={tx.id}
                style={{ borderBottom: '1px solid #ddd' }}
              >
                <td
                  style={{
                    padding: '8px',
                    fontFamily: 'monospace',
                  }}
                >
                  {tx.txHash.slice(0, 6)}...
                  {tx.txHash.slice(-4)}
                </td>

                <td
                  style={{
                    padding: '8px',
                    fontFamily: 'monospace',
                  }}
                >
                  {tx.fromAddress.slice(0, 6)}...
                  {tx.fromAddress.slice(-4)}
                </td>

                <td
                  style={{
                    padding: '8px',
                    fontFamily: 'monospace',
                  }}
                >
                  {tx.toAddress.slice(0, 6)}...
                  {tx.toAddress.slice(-4)}
                </td>

                <td style={{ padding: '8px', fontWeight: 'bold' }}>
                  {tx.amount}
                </td>

                <td style={{ padding: '8px' }}>
                  <span
                    style={{
                      background: '#1890ff',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    {tx.tokenSymbol}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
});
