const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

export function queueChatReply(conversation, from, text, now = Date.now()) {
  conversation.pending ||= [];
  conversation.replySequence = (Number(conversation.replySequence) || 0) + 1;
  const last = conversation.pending[conversation.pending.length - 1];
  const delay = clamp(String(text).length * 16, 900, 2400);
  const dueAt = Math.max(now, Number(last?.dueAt) || 0) + delay;
  const reply = {
    id: `${from}:${now}:${conversation.replySequence}`,
    from, text: String(text), dueAt
  };
  conversation.pending.push(reply);
  return reply;
}

export function deliverChatReplies(state, now = Date.now(), readContact = null) {
  let delivered = 0;
  state.unread ||= {};
  for (const [id, conversation] of Object.entries(state.contacts || {})) {
    if (!Array.isArray(conversation.pending) || !conversation.pending.length) continue;
    conversation.messages ||= [];
    const waiting = [];
    for (const reply of conversation.pending) {
      if ((Number(reply.dueAt) || 0) > now) {
        waiting.push(reply);
        continue;
      }
      if (conversation.messages.some(message => message.replyId === reply.id)) continue;
      conversation.messages.push({
        from: reply.from || id, text: String(reply.text || ''),
        at: Number(reply.dueAt) || now, replyId: reply.id
      });
      delivered++;
      state.unread[id] = id === readContact ? 0 : (Number(state.unread[id]) || 0) + 1;
    }
    conversation.pending = waiting;
  }
  return delivered;
}

export function chatScrollState() {
  return { offset: 0, target: 0, max: 0, follow: true, ready: false, count: 0, newCount: 0 };
}

export function updateChatScroll(view, max, count) {
  const wasReady = view.ready;
  if (wasReady && count > view.count && !view.follow) view.newCount += count - view.count;
  view.max = Math.max(0, Number(max) || 0);
  view.offset = clamp(view.offset, 0, view.max);
  view.target = view.follow ? view.max : clamp(view.target, 0, view.max);
  if (!wasReady) view.offset = view.target;
  if (view.follow) view.newCount = 0;
  view.ready = true;
  view.count = count;
  return view;
}

export function targetChatScroll(view, offset) {
  view.target = clamp(offset, 0, view.max);
  view.follow = view.max - view.target <= 2;
  if (view.follow) view.newCount = 0;
  return view.target;
}
