import { createContext, useContext } from 'react';
import { apiClient } from './api-client';
import { WalletStore } from '@src/wallet/wallet.store';
import { NotificationService } from './notification.service';

export class RootStore {
  public walletStore: WalletStore;
  public notificationService: NotificationService;

  constructor() {
    this.walletStore = new WalletStore(apiClient);
    this.notificationService = new NotificationService(this.walletStore);
  }
}

// Передаем null в качестве дефолтного значения контекста
const RootStoreContext = createContext<RootStore | null>(null);

// Экспортируем провайдер для App.tsx
export const RootStoreProvider = RootStoreContext.Provider;

export const useStores = (): RootStore => {
  const store = useContext(RootStoreContext);
  if (!store) {
    throw new Error('useStores должен использоваться внутри RootStoreProvider');
  }
  return store;
};
