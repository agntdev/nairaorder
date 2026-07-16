import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  inlineButton,
  inlineKeyboard,
  confirmKeyboard,
} from "../toolkit/index.js";
import {
  createOrder,
  createPayment,
  updateOrderStatus,
  updatePaymentStatus,
} from "../storage.js";

registerMainMenuItem({ label: "🛒 New order", data: "order:start", order: 10 });

type OrderStep =
  | "idle"
  | "awaiting_description"
  | "awaiting_budget"
  | "confirming"
  | "awaiting_payment";

const composer = new Composer<Ctx>();

composer.command("order", async (ctx) => {
  ctx.session.step = "awaiting_description" as OrderStep;
  await ctx.reply("What do you need? Describe your order.", {
    reply_markup: { force_reply: true, input_field_placeholder: "Describe your order…" },
  });
});

composer.callbackQuery("order:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_description" as OrderStep;
  await ctx.reply("What do you need? Describe your order.", {
    reply_markup: { force_reply: true, input_field_placeholder: "Describe your order…" },
  });
});

composer.on("message:text", async (ctx, next) => {
  const step = ctx.session.step as OrderStep | undefined;

  if (step === "awaiting_description") {
    ctx.session.orderDescription = ctx.message.text.trim();
    ctx.session.step = "awaiting_budget" as OrderStep;
    await ctx.reply("Got it. What's your budget in NGN?", {
      reply_markup: { force_reply: true, input_field_placeholder: "Enter budget amount…" },
    });
    return;
  }

  if (step === "awaiting_budget") {
    const text = ctx.message.text.trim().replace(/[,₦\s]/g, "");
    const amount = Number(text);
    if (!Number.isFinite(amount) || amount <= 0) {
      await ctx.reply("Enter a valid amount — e.g. 50000.");
      return;
    }
    ctx.session.orderBudget = amount;
    ctx.session.step = "confirming" as OrderStep;

    const desc = ctx.session.orderDescription ?? "";
    const summary =
      `Order summary\n\n` +
      `Description: ${desc}\n` +
      `Budget: ₦${amount.toLocaleString()}\n` +
      `Admin fee: ₦500\n\n` +
      `Confirm to proceed to payment.`;

    await ctx.reply(summary, {
      reply_markup: confirmKeyboard("order:confirm", { yes: "✅ Confirm", no: "❌ Cancel" }),
    });
    return;
  }

  return next();
});

composer.callbackQuery("order:confirm:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id ?? 0;
  const desc = ctx.session.orderDescription ?? "";
  const budget = ctx.session.orderBudget ?? 0;

  const order = await createOrder(userId, desc, budget);
  ctx.session.orderId = order.orderId;

  const kb = inlineKeyboard([
    [inlineButton("💳 Pay ₦500 admin fee", `order:pay:${order.orderId}`)],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);

  await ctx.editMessageText(
    `Order ${order.orderId} created.\n\n` +
      `Description: ${desc}\n` +
      `Budget: ₦${budget.toLocaleString()}\n\n` +
      `Tap below to pay the ₦500 admin fee.`,
    { reply_markup: kb },
  );
});

composer.callbackQuery("order:confirm:no", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "idle";
  ctx.session.orderDescription = undefined;
  ctx.session.orderBudget = undefined;
  await ctx.editMessageText("Order cancelled. Tap /start to begin again.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

composer.callbackQuery(/^order:pay:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const orderId = ctx.match[1];
  const userId = ctx.from?.id ?? 0;

  const order = await createPayment(orderId, userId, 500);
  await updateOrderStatus(orderId, "pending_payment");

  ctx.session.step = "idle" as OrderStep;
  ctx.session.orderDescription = undefined;
  ctx.session.orderBudget = undefined;

  // In production, this would call a real Nigerian payment gateway.
  // For the test harness, we simulate success.
  await updatePaymentStatus(order.paymentId, "success");
  await updateOrderStatus(orderId, "paid");

  await ctx.editMessageText(
    `Payment received — ₦500 for order ${orderId}.\n\n` +
      `Your order is now being processed. Tap below to check its status anytime.`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("📋 Check status", `status:check:${orderId}`)],
        [inlineButton("💬 Leave feedback", `feedback:start:${orderId}`)],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

export default composer;
