import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  inlineButton,
  inlineKeyboard,
} from "../toolkit/index.js";
import { saveFeedback } from "../storage.js";

registerMainMenuItem({ label: "💬 Feedback", data: "feedback:show", order: 30 });

type FeedbackStep = "awaiting_feedback";

const composer = new Composer<Ctx>();

composer.command("feedback", async (ctx) => {
  ctx.session.step = "awaiting_feedback" as FeedbackStep;
  await ctx.reply("What's on your mind? Share your feedback.", {
    reply_markup: { force_reply: true, input_field_placeholder: "Type your feedback…" },
  });
});

composer.callbackQuery("feedback:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_feedback" as FeedbackStep;
  await ctx.reply("What's on your mind? Share your feedback.", {
    reply_markup: { force_reply: true, input_field_placeholder: "Type your feedback…" },
  });
});

composer.callbackQuery(/^feedback:start:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const orderId = ctx.match[1];
  ctx.session.step = "awaiting_feedback" as FeedbackStep;
  ctx.session.feedbackOrderId = orderId;
  await ctx.reply("How was your experience? Share your feedback.", {
    reply_markup: { force_reply: true, input_field_placeholder: "Type your feedback…" },
  });
});

composer.on("message:text", async (ctx, next) => {
  const step = ctx.session.step as FeedbackStep | undefined;
  if (step !== "awaiting_feedback") return next();

  const userId = ctx.from?.id ?? 0;
  const message = ctx.message.text.trim();
  const orderId = (ctx.session as Record<string, unknown>).feedbackOrderId as string | null ?? null;

  await saveFeedback(userId, orderId, message);

  ctx.session.step = "idle";
  ctx.session.feedbackOrderId = undefined;

  await ctx.reply("Thanks — your feedback has been recorded.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
