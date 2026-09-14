# 📂 Памятка по путям (Aliases) в TypeScript + Vite

### 🔴 В чем была проблема?
При использовании путей типа `@src/*` проект выдавал ошибку `Cannot find module '@src'...`, потому что в проекте включен режим **Project References** (`"references": [...]` в корне). В этом режиме настройки из корневого `tsconfig.json` по умолчанию **не долетают** до файлов конфигурации конкретных приложений (например, `tsconfig.app.json`).

---

### 🧠 Главный инсайт: Кто за что отвечает?
1. **TypeScript (Проверяльщик):** Нуждается в `tsconfig`, чтобы подсвечивать ошибки в VS Code и проверять типы. **Он НЕ переписывает пути при компиляции.** Если ты написал `@src`, он так и оставит `@src` в JS-файле.
2. **Vite (Сборщик):** Нуждается в алиасах, чтобы физически найти файлы на диске и **переписать** `@src` в понятные браузеру относительные пути (типа `./src/...`). Без этого браузер выдаст ошибку.

---

### 🛠️ Идеальная настройка в 1 месте (Без дублирования)

Чтобы не прописывать пути руками и в TS, и в Vite, мы делаем `tsconfig.json` главным источником правды, а Vite заставляем читать из него.

#### 1. Установка плагина-мостика
В терминале:
```bash
npm i -D vite-tsconfig-paths
```

#### 2. Кабина директора (`tsconfig.json`) — Пути пишем ТОЛЬКО ТУТ
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "baseUrl": ".",
    "paths": {
      "@src/*": ["src/*"]
    }
  }
}
```

#### 3. Отдел разработки (`tsconfig.app.json`) — Просто наследует
```json
{
  "extends": "./tsconfig.json", // Подтягивает и strict-настройки, и paths
  "compilerOptions": {
    "composite": true
  },
  "include": ["src"]
}
```

#### 4. Конфиг сборщика (`vite.config.ts`) — Никакой копипасты
Убираем блок `resolve.alias` и подключаем плагин. Теперь Vite сам ворует пути из `tsconfig.json`.
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths'; // Импортируем мостик

export default defineConfig({
  plugins: [
    react(), 
    tsconfigPaths() // Заставляем Vite читать пути из TS автоматически
  ]
});
```
