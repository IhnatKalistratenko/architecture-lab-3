# Decision log

Для кожної суттєвої зміни скопіюйте секцію нижче. Обсяг одного рішення: 80–120 слів.

## Decision 1: Єдина нормалізація статусу в Payments

**Problem:** Orders, Reports і Notifications мали дубльоване зіставлення provider status, а Payments напряму змінював внутрішній стан Orders.

**Evidence:** Раніше `StripeClient`, `src/reports/mapPaymentStatus.ts` і `src/notifications/mapPaymentStatus.ts` окремо трактували `succeeded`, `requires_action` і `declined`.

**Decision:** Винести тип системного статусу та `normalizePaymentStatus` у `src/payments/PaymentStatus.ts`; Orders викликає `PaymentsPort`, який інкапсулює Stripe payload і повертає нормалізований статус.

**Why:** Provider-specific знання лишається на межі Payments, а Checkout та Orders працюють зі стабільним контрактом. Це дозволяє додати провайдера без копіювання правил у модулі-споживачі.

**Alternative:** Залишити окремі мапери в кожному споживачі або повертати сирий `StripeResponse`.

**Why rejected:** Обидва варіанти дублюють знання про провайдера і можуть давати суперечливі результати після зміни статусів.

**Trade-off:** Payments стає власником повного переліку зіставлень; новий статус потрібно додати до його контракту й перевірок.

**Verification:** Unit tests перевіряють `paid`, `processing`, `failed` і невідомий provider status; функціональні тести перевіряють незмінність Checkout для `paid` та `failed`.

## Decision 2: Невідомий provider status вважаємо processing

**Problem:** Провайдер може повернути ще не відомий системі стан.

**Evidence:** Статуси провайдера є зовнішнім контрактом і можуть розширюватися незалежно від Checkout.

**Decision:** `normalizePaymentStatus` повертає `processing` для невідомого рядка.

**Why:** Це fail-safe для фінансової операції: система не підтверджує оплату й не оголошує остаточну відмову, поки результат не з'ясований.

**Alternative:** Вважати невідомий стан `failed` або кидати помилку.

**Why rejected:** `failed` може спричинити повторну спробу після фактичного списання; виняток залишає операцію без коректного публічного стану.

**Trade-off:** Невідомий статус потребує подальшої звірки/оновлення; без неї замовлення може залишатися в очікуванні.

**Verification:** Unit test підтверджує unknown → `processing`; Checkout зберігає для нього `payment_pending`.
