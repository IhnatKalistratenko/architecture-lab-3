# Architecture review

> Заповнює студент. Не описуйте лише назву принципу: покажіть причинно-наслідковий зв'язок між кодом, ризиком і виправленням.

| Principle | Evidence (file:line) | Practical risk | Fix |
|---|---|---|---|
| Information hiding | `CheckoutController` формує Stripe payload (`src/checkout/CheckoutController.ts:22-28`). | Перехід на інший провайдер або зміна його payload змусить змінювати Checkout і збільшить ризик помилок у транспортному шарі. | Передавати до Payments нейтральний запит; формувати payload в адаптері провайдера. |
| High cohesion | `OrderService` створює та зберігає `StripeClient` (`src/orders/OrderService.ts:4, 8-13`), змішуючи правила замовлень з інтеграцією оплати. | Зміна чи додавання провайдера розростатиме OrderService і ускладнить його окрему перевірку. | Залежати від порту Payments, який повертає внутрішній статус. |
| Ownership | `OrderService` напряму читає й змінює `database.stock` (`src/orders/OrderService.ts:27-37`), хоча є `StockRepository`. | Зміна правил резервування, конкурентного контролю або формату запасів вимагатиме правок Orders і може обійти інваріанти Inventory. | Передати резервування Inventory/репозиторію з операцією, що володіє правилами запасів. |
| Low coupling / local reasoning | Мапери Reports і Notifications імпортують внутрішній `StripeResponse` (`src/reports/mapPaymentStatus.ts:1-3`, `src/notifications/mapPaymentStatus.ts:1-3`). | Зміна контракту провайдера поширюється в кожен споживач; поведінка звітування та сповіщень залежить від деталей Stripe. | Споживачі мають працювати з нормалізованим статусом Payments, а не provider response. |
| Explicit contracts | `calculateTotal` читає глобальну конфігурацію, мутує аргументи та пише в глобальний audit log (`src/shared/calculateTotal.ts:10-22`). | Виклик не можна передбачити лише з аргументів; зміни конфігурації або стану логу впливають на тести й усіх споживачів. | Явно передавати залежності та повертати результат без прихованих змін стану. |
| Design for change / fitness functions | Три окремі мапери Payments, Reports і Notifications прив'язані до `StripeResponse` і повторюють одне зіставлення (`src/payments/internal/StripeClient.ts:16-20`, `src/reports/mapPaymentStatus.ts:1-7`, `src/notifications/mapPaymentStatus.ts:1-7`). | Новий provider status або новий системний статус вимагатиме синхронних змін у кількох модулях; пропуск одного дасть різні звіти та сповіщення. | Залишити один нормалізатор у Payments і тестувати всі відомі та невідомі provider status. |


## Change impact prediction (заповнити до реалізації change request)

**Requirement:** Централізувати provider-specific payment status mapping у Payments, додати `processing`, зберігши Checkout API для `paid` і `failed`.

**Expected files:** `src/payments/` (контракт і нормалізатор/адаптер), `src/orders/OrderService.ts`, `src/checkout/CheckoutController.ts`, видалення дубльованих маперів у `src/reports/` і `src/notifications/`, нові unit tests, `DECISIONS.md`.

**Modules that should not change:** Inventory, Reports і Notifications не повинні містити provider-specific логіку; їхні споживачі нормалізованих статусів мають лишитися незалежними від Stripe.

## Actual impact

**Actual files changed:** `src/payments/PaymentStatus.ts`, `src/payments/Payments.ts`, `src/payments/internal/StripeClient.ts`, `src/orders/OrderService.ts`, `src/checkout/CheckoutController.ts`, видалені дубльовані status mapper файли Reports/Notifications і застарілий `orders/internal/orderMutations.ts`; додані unit та functional тести; оновлені `REVIEW.md` і `DECISIONS.md`.

**Difference from prediction and explanation:** Checkout теж змінився, бо Stripe payload раніше формувався в контролері. Unknown provider status визначено як `processing`, щоб невідомий фінансовий результат не трактувався як остаточний успіх або відмова.
