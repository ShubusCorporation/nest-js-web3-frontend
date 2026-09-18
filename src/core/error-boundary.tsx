import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  // Теперь fallback может принимать функцию, в которую мы передадим ошибку
  fallback?: ReactNode | ((error: Error) => ReactNode); 
}

interface State {
  hasError: boolean;
  error: Error | null; // 👈 Сохраняем саму ошибку
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // 👈 Передаем ошибку в state
    return { hasError: true, error }; 
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Ошибка:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError && this.state.error) {
      // Если передана функция-fallback, вызываем её с ошибкой
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error);
      }
      // Если передан готовый ReactNode, показываем его
      if (this.props.fallback) {
        return this.props.fallback;
      }
      // Дефолтный понятный вывод ошибки, если ничего не передали
      return (
        <div style={{ padding: '16px', border: '1px solid red', backgroundColor: '#fff5f5', borderRadius: '4px' }}>
          <h2>Что-то пошло не так в Web3 приложении</h2>
          <p style={{ color: 'red', fontWeight: 'bold' }}>
            Ошибка: {this.state.error.message}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
