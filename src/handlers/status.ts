import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  inlineButton,
  inlineKeyboard,
} from "../toolkit/index.js";
import { getOrder, getLatestOrderByUser, getPaymentByOrder } from "../storage.js";

registerMainMenuItem({ label: "📋 Order status", data: "status:show", order: 20 });

const composer = new Composer<Ctx>();

composer.command("status", async (ctx) => {
  const userId = ctx.from?.id ?? 0;
  const order = await getLatestOrderByUser(userId);

  if (!order) {
    await ctx.reply("No orders yet. Tap 🛒 New order to create one.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const payment = await getPaymentByOrder(order.orderId);
  const paymentStatus = payment?.status === "success" ? "Paid" : payment?.status === "pending" ? "Pending" : "Not paid";
  const orderStatus = order.status === "paid" ? "Processing" : order.status === "failed" ? "Failed" : "Awaiting payment";

  await ctx.reply(
    `Order ${order.orderId}\n\n` +
      `Description: ${order.description}\n` +
      `Budget: ₦${order.budget.toLocaleString()}\n` +
      `Payment: ${paymentStatus}\n` +
      `Status: ${orderStatus}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery("status:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id ?? 0;
  const order = await getLatestOrderByUser(userId);

  if (!order) {
    await ctx.editMessageText("No orders yet. Tap 🛒 New order to create one.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const payment = await getPaymentByOrder(order.orderId);
  const paymentStatus = payment?.status === "success" ? "Paid" : payment?.status === "pending" ? "Pending" : "Not paid";
  const orderStatus = order.status === "paid" ? "Processing" : order.status === "failed" ? "Failed" : "Awaiting payment";

  await ctx.editMessageText(
    `Order ${order.orderId}\n\n` +
      `Description: ${order.description}\n` +
      `Budget: ₦${order.budget.toLocaleString()}\n` +
      `Payment: ${paymentStatus}\n` +
      `Status: ${orderStatus}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery(/^status:check:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const orderId = ctx.match[1];
  const order = await getOrder(orderId);

  if (!order) {
    await ctx.editMessageText("Order not found. Check the order ID and try again.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const payment = await getPaymentByOrder(order.orderId);
  const paymentStatus = payment?.status === "success" ? "Paid" : payment?.status === "pending" ? "Pending" : "Not paid";
  const orderStatus = order.status === "paid" ? "Processing" : order.status === "failed" ? "Failed" : "Awaiting payment";

  await ctx.editMessageText(
    `Order ${order.orderId}\n\n` +
      `Description: ${order.description}\n` +
      `Budget: ₦${order.budget.toLocaleString()}\n` +
      `Payment: ${paymentStatus}\n` +
      `Status: ${orderStatus}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

export default composer;
