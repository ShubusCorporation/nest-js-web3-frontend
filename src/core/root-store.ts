import { createContext, useContext } from 'react';
import { apiClient } from './api-client';
import { WalletStore } from '@src/wallet/wallet.store';
import { NotificationService } from './notification.service';

export class RootStore {
  public walletStore: WalletStore;
  public notificationService: NotificationService;

  constructor() {
    this.walletStore = new WalletStore(apiClient);
    
    // Инициализируем WebSocket сервис и передаем ему созданный стор
    this.notificationService = new NotificationService(this.walletStore);
    
    // Запускаем постоянное соединение сокета
    this.notificationService.connect();
  }
}

const rootStore = new RootStore();
const RootStoreContext = createContext<RootStore>(rootStore);

export const useStores = (): RootStore => {
  const store = useContext(RootStoreContext);
  if (!store) throw new Error('RootStoreProvider error');
  return store;
};
