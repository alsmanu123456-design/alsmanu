let _deps = {};
export function setDeps(d) { _deps = d; }

export async function handleScheduleCallback(bot2, chatId, userId, data) {
  const { getUser, saveUser, setState, inMemoryDB, cancelKeyboard, scheduleMenuKeyboard } = _deps;
  const user = getUser(userId);
  const scheduled = user.scheduledMessages || [];
  if (data === "menu_schedule") {
    const active = scheduled.filter((m) => m.status === "pending").length;
    const sent = scheduled.filter((m) => m.status === "sent").length;
    await bot2.sendMessage(
      chatId,
      `\u{1F4C5} *\u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0645\u062C\u062F\u0648\u0644\u0629*\n\n\u23F3 \u0641\u064A \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631: ${active}\n\u2705 \u062A\u0645 \u0625\u0631\u0633\u0627\u0644\u0647\u0627: ${sent}\n\u{1F4CB} \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A: ${scheduled.length}`,
      { parse_mode: "Markdown", reply_markup: scheduleMenuKeyboard() }
    );
    return true;
  }
  if (data === "schedule_add") {
    const sock = inMemoryDB.sessions.get(userId);
    if (!sock) {
      await bot2.sendMessage(chatId, "\u274C \u064A\u062C\u0628 \u0631\u0628\u0637 \u0648\u0627\u062A\u0633\u0627\u0628 \u0623\u0648\u0644\u0627\u064B \u0644\u062C\u062F\u0648\u0644\u0629 \u0631\u0633\u0627\u0626\u0644");
      return true;
    }
    setState(userId, "awaiting_schedule_target");
    await bot2.sendMessage(
      chatId,
      `\uD83D\uDCC5 *\u062C\u062F\u0648\u0644\u0629 \u0631\u0633\u0627\u0644\u0629 \u062C\u062F\u064A\u062F\u0629*\n\n*\u0627\u0644\u062E\u0637\u0648\u0629 1\u20443:* \u0623\u062F\u062E\u0644 \u0631\u0642\u0645 \u0627\u0644\u0645\u0633\u062A\u0644\u0645 \u0645\u0639 \u0643\u0648\u062F \u0627\u0644\u062F\u0648\u0644\u0629:\n\u0645\u062B\u0627\u0644: \`966501234567\`\n\n\u0623\u0648 \u0623\u062F\u062E\u0644 \u0645\u0639\u0631\u0651\u0641 \u0645\u062C\u0645\u0648\u0639\u0629 (120365...):`,
      { parse_mode: "Markdown", reply_markup: cancelKeyboard() }
    );
    return true;
  }
  if (data === "schedule_list") {
    if (scheduled.length === 0) {
      await bot2.sendMessage(chatId, "\u{1F4CB} \u0644\u0627 \u062A\u0648\u062C\u062F \u0631\u0633\u0627\u0626\u0644 \u0645\u062C\u062F\u0648\u0644\u0629 \u0628\u0639\u062F.", { reply_markup: scheduleMenuKeyboard() });
      return true;
    }
    const lines = scheduled.slice(-10).reverse().map((m, i) => {
      const ts2 = typeof m.sendAt === 'number' ? m.sendAt : new Date(m.sendAt).getTime();
      const date = new Date(ts2).toLocaleString("ar-SA", {timeZone:"Asia/Riyadh", hour12:false, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit"});
      const status = m.status === "sent" ? "\u2705" : m.status === "failed" ? "\u274C" : "\u23F3";
      const remaining = ts2 > Date.now() ? ` (${Math.ceil((ts2-Date.now())/60000)}\u062F)` : "";
      return `${status} ${i + 1}. +${(m.jid || "").split("@")[0]}\n   \uD83D\uDCC5 ${date}${remaining}\n   \uD83D\uDCAC "${(m.message || "").slice(0, 40)}"`;
    }).join("\n\n");
    const pendingCount = scheduled.filter((m) => m.status === "pending").length;
    await bot2.sendMessage(
      chatId,
      `\uD83D\uDCCB *\u0631\u0633\u0627\u0626\u0644 \u0645\u062C\u062F\u0648\u0644\u0629*\n\u23F3 \u0641\u064A \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631: *${pendingCount}* | \uD83D\uDCCA \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A: *${scheduled.length}*\n\u23F0 \u0627\u0644\u062A\u0648\u0642\u064A\u062A: \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629 (UTC+3)\n\n${lines}`,
      { parse_mode: "Markdown", reply_markup: scheduleMenuKeyboard() }
    );
    return true;
  }
  if (data === "schedule_delete") {
    const pending = scheduled.filter((m) => m.status === "pending");
    if (pending.length === 0) {
      await bot2.sendMessage(chatId, "\u274C \u0644\u0627 \u062A\u0648\u062C\u062F \u0631\u0633\u0627\u0626\u0644 \u0641\u064A \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631");
      return true;
    }
    const rows = pending.slice(0, 8).map((m, i) => {
      const ts3 = typeof m.sendAt === 'number' ? m.sendAt : new Date(m.sendAt).getTime();
      const date = new Date(ts3).toLocaleString("ar-SA", {timeZone:"Asia/Riyadh", hour12:false, month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit"});
      return [{ text: `\uD83D\uDDD1\uFE0F +${(m.jid || "").split("@")[0]} \u2190 ${date}`, callback_data: `schedule_del_${m.id}` }];
    });
    rows.push([{ text: "\u{1F5D1}\uFE0F \u062D\u0630\u0641 \u0627\u0644\u0643\u0644", callback_data: "schedule_del_all" }]);
    rows.push([{ text: "\u{1F519} \u0631\u062C\u0648\u0639", callback_data: "menu_schedule" }]);
    await bot2.sendMessage(chatId, "\u{1F5D1}\uFE0F *\u0627\u062E\u062A\u0631 \u0631\u0633\u0627\u0644\u0629 \u0644\u062D\u0630\u0641\u0647\u0627:*", { parse_mode: "Markdown", reply_markup: { inline_keyboard: rows } });
    return true;
  }
  if (data.startsWith("schedule_del_")) {
    if (data === "schedule_del_all") {
      saveUser(userId, { scheduledMessages: scheduled.filter((m) => m.status !== "pending") });
      await bot2.sendMessage(chatId, "\u2705 \u062A\u0645 \u062D\u0630\u0641 \u062C\u0645\u064A\u0639 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0641\u064A \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631");
    } else {
      const id = data.replace("schedule_del_", "");
      saveUser(userId, { scheduledMessages: scheduled.filter((m) => m.id !== id) });
      await bot2.sendMessage(chatId, "\u2705 \u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0631\u0633\u0627\u0644\u0629");
    }
    return true;
  }
  if (data === "schedule_stats") {
    const sent = scheduled.filter((m) => m.status === "sent").length;
    const pending = scheduled.filter((m) => m.status === "pending").length;
    const failed = scheduled.filter((m) => m.status === "failed").length;
    await bot2.sendMessage(
      chatId,
      `\u{1F4CA} *\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u062C\u062F\u0648\u0644\u0629*\n\n\u2705 \u0645\u064F\u0631\u0633\u064E\u0644\u0629: ${sent}\n\u23F3 \u0641\u064A \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631: ${pending}\n\u274C \u0641\u0634\u0644\u062A: ${failed}\n\u{1F4CB} \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A: ${scheduled.length}`,
      { parse_mode: "Markdown", reply_markup: scheduleMenuKeyboard() }
    );
    return true;
  }
  if (data === "schedule_recurring") {
    setState(userId, "awaiting_recurring_recipient");
    await bot2.sendMessage(
      chatId,
      `\u{1F501} *\u0631\u0633\u0627\u0626\u0644 \u0645\u062A\u0643\u0631\u0631\u0629*\n\n\u064A\u0645\u0643\u0646\u0643 \u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u0643\u0644 \u064A\u0648\u0645 \u0623\u0648 \u0623\u0633\u0628\u0648\u0639 \u0623\u0648 \u0634\u0647\u0631.\n\n*\u0627\u0644\u062E\u0637\u0648\u0629 1/4:* \u0623\u062F\u062E\u0644 \u0631\u0642\u0645 \u0627\u0644\u0645\u0633\u062A\u0644\u0645:`,
      { parse_mode: "Markdown", reply_markup: cancelKeyboard() }
    );
    return true;
  }
  return false;
}
