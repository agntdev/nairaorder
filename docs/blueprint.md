# NairaOrder Admin Fee Bot — Bot specification

**Archetype:** commerce

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

Telegram bot for individual customers to submit orders, declare budgets, pay 500 NGN admin fee, and provide feedback. Orders and feedback are forwarded to owner with payment status tracking.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- individual customers
- Telegram users in Nigeria

## Success criteria

- Users can submit orders with budget and pay 500 NGN admin fee
- Owner receives real-time notifications of orders, payments, and feedback
- Payment status updates are visible to users via /status command

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Display welcome message and brief instructions
- **/order** (command, actor: user, command: /order) — Initiate order creation flow with order description and budget collection
- **/status** (command, actor: user, command: /status) — Check payment/order status by ID (shows latest order if no ID provided)
- **/feedback** (command, actor: user, command: /feedback) — Submit feedback about ordering experience
- **/help** (command, actor: user, command: /help) — Display short usage help

## Flows

### Order Creation
_Trigger:_ /order

1. Request order description
2. Collect budget amount
3. Confirm order details
4. Initiate 500 NGN payment flow
5. Update order status based on payment result
6. Request optional feedback

_Data touched:_ order, payment

### Payment Processing
_Trigger:_ Payment confirmation

1. Display payment button
2. Process 500 NGN transaction
3. Update payment status
4. Notify user and owner of result

_Data touched:_ payment

### Feedback Submission
_Trigger:_ /feedback or post-payment prompt

1. Request feedback message
2. Attach order context
3. Forward to owner

_Data touched:_ feedback

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User Profile** _(retention: persistent)_ — Telegram user metadata and conversation state
  - fields: telegram_id, display_name, phone, conversation_state
- **Order** _(retention: persistent)_ — User-submitted order with budget
  - fields: order_id, user_id, description, declared_budget, timestamp, status
- **Payment** _(retention: persistent)_ — Admin fee transaction details
  - fields: payment_id, order_id, user_id, amount, status, timestamp, transaction_ref
- **Feedback** _(retention: persistent)_ — User feedback with order context
  - fields: user_id, order_id, message, timestamp

## Integrations

- **Telegram** (required) — Bot API messaging and payment buttons
- **Nigerian Payment Gateway** (required) — Process 500 NGN admin fees
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Specify owner Telegram account/group for notifications
- Configure Nigerian-friendly payment provider integration
- View order/feedback summaries with payment status links

## Notifications

- New order summary with user info and payment status
- Payment success/failure updates
- Feedback messages with order context

## Permissions & privacy

- Store user profiles and order data securely
- Only collect phone numbers if explicitly provided
- No third-party data sharing

## Edge cases

- Failed payment retries from status screen
- Orders without phone numbers
- Invalid /status command arguments
- Multiple concurrent order flows

## Required tests

- End-to-end order creation with payment success flow
- Payment failure handling and retry
- Feedback submission with order context
- /status command with and without order ID

## Assumptions

- Nigerian payment provider handles 500 NGN transactions
- Owner notification target is a single account/group
- Users understand NGN currency and Telegram commands
