# Корпоративный сайт разработчика ПО для платежной и финансовой инфраструктуры

Сайт сделан по документу `TZ_corporate_software_website.docx.docx`. Это статический многостраничный сайт на английском. Генератор сайта и сервер для приема заявок написаны на чистом Node.js и не требуют установки зависимостей.

## Запуск

```bash
npm run build   # собрать сайт в dist/
npm start       # сервер на http://localhost:3000 (порт задается через PORT)
npm run dev     # сборка + запуск
```

Нужен Node.js 18 или новее.

## Структура

| Путь | Назначение |
|---|---|
| `content/site.json` | Название компании, реквизиты, контакты, языки, включение разделов (Insights, Careers, checkbox согласия) |
| `content/en/copy.json` | Все тексты страниц, меню, формы, cookie-баннера |
| `content/en/cases.json` | Кейсы (единая структура из п. 10 ТЗ) |
| `content/en/insights.json` | Статьи блога |
| `assets/` | CSS (дизайн-токены в `:root`), JS, изображения |
| `build.js` | Генератор: шаблоны страниц → `dist/`, `sitemap.xml`, `robots.txt` |
| `server.js` | Раздача `dist/` и `POST /api/contact` |

### Страницы
Home, Expertise, Use cases (Industries), How we work, Case studies (+ страница каждого кейса), About, Insights (+ статьи), Contact, Thank you, Privacy Policy, Cookie Policy, Terms, 404.

## Как обновлять контент
Отредактируйте JSON в `content/` и выполните `npm run build`. Кейс или статья добавляются новым объектом в массив, страница и запись в sitemap создаются автоматически. Позже эти JSON-файлы можно подключить к Git-based CMS (например, Decap CMS) или заменить данными из headless CMS.

### Добавление языка
1. Добавьте язык в `languages` в `content/site.json`, например `{ "code": "de", "label": "Deutsch", "short": "DE", "locale": "de_DE" }`.
2. Скопируйте `content/en/` в `content/de/` и переведите тексты.
3. Пересоберите сайт. Страницы появятся по адресам `/de/...`, а hreflang, переключатель языка и sitemap обновятся сами.

## Что реализовано по ТЗ
- **Адаптивность:** desktop (1440), tablet и mobile (390), мобильное меню, переключатель языка, cookie-баннер, footer.
- **Форма:** поля Name, Work email, Company, Brief description, необязательный Phone, тип запроса, обязательный checkbox согласия. Есть состояния: ошибки на каждом поле, общий алерт, загрузка, успех. Без JavaScript форма тоже работает: сервер перенаправляет на `/contact/thank-you/`.
- **Сервер:** проверка всех полей, honeypot и проверка слишком быстрой отправки как антиспам, лимит 5 заявок за 10 минут с одного IP, ограничение размера запроса, заголовки безопасности (CSP, X-Frame-Options и др.). Заявки сохраняются в `data/submissions.jsonl`; для подключения CRM или почты замените `saveSubmission()` в `server.js`.
- **SEO:** title, description, canonical, Open Graph, hreflang, JSON-LD (Organization, Article), `sitemap.xml`, `robots.txt`, понятные URL.
- **Аналитика:** события в `window.dataLayer`: `cta_click`, `contact_nav`, `form_start`, `form_submit`, `form_error`, `case_open`, `case_view`, `file_download`, `consent_update`. Персональные данные в события не передаются. Счетчик подключается в `loadAnalytics()` в `assets/js/main.js` и запускается только после согласия на cookie.
- **Доступность:** skip-link, видимый фокус, клавиатурная навигация (Esc закрывает меню), label и aria-атрибуты у полей, учет `prefers-reduced-motion`.
- **Графика:** анимированная схема потоков данных между интерфейсами и системами, абстрактные фрагменты UI. Нет карт, монет, графиков роста и брендов.

## Что нужно от заказчика (п. 21 ТЗ)
Все места для заполнения отмечены квадратными скобками `[...]` или значком «Placeholder content»:
- юридическое название, регистрация, адрес, e-mail, каналы связи (`content/site.json`) и `baseUrl`;
- логотип (сейчас временный знак в `build.js` → `logoMark` и `assets/img/favicon.svg`);
- согласованные кейсы (сейчас 4 обезличенных шаблона, `placeholder: true`), история компании, география;
- тексты Privacy Policy, Cookie Policy и Terms;
- выбранная система аналитики и CRM;
- `assets/img/og-image.png` — временная картинка 1200×630.
