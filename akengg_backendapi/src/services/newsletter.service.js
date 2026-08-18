const query = require("../utils/db");
const AppError = require("../utils/appError");
const emailService = require("./email.service");

const SELECT_COLUMNS = "id, email, status, created_at, updated_at";

const mapSubscriber = (subscriber) => {
  if (!subscriber) {
    return null;
  }
  return {
    id: subscriber.id,
    email: subscriber.email,
    status: subscriber.status,
    created_at: subscriber.created_at ?? null,
    updated_at: subscriber.updated_at ?? null,
  };
};

const getSubscriberByEmail = async (email) => {
  const rows = await query(
    `SELECT ${SELECT_COLUMNS} FROM newsletter_subscribers WHERE email = ?`,
    [email]
  );
  return rows[0] || null;
};

const getSubscribers = async () => {
  const rows = await query(
    `SELECT ${SELECT_COLUMNS} FROM newsletter_subscribers ORDER BY id DESC`
  );
  return rows.map(mapSubscriber);
};

// Welcome the subscriber over SMTP. Fire-and-forget: the row is already
// committed, so a mail failure must not turn a successful signup into an error
// response. sendNewsletterWelcome swallows transport errors; .catch() guards
// anything else.
const announceSubscription = (email) => {
  emailService
    .sendNewsletterWelcome(email)
    .catch((error) =>
      console.error("[newsletter] welcome email failed:", error.message)
    );
};

const subscribe = async (payload) => {
  const email = String(payload.email || "").trim().toLowerCase();

  const existing = await getSubscriberByEmail(email);

  if (existing) {
    // Re-subscribe a previously unsubscribed email; otherwise it's a no-op.
    if (existing.status !== "subscribed") {
      await query(
        `UPDATE newsletter_subscribers
         SET status = 'subscribed', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [existing.id]
      );
      // Genuine re-subscribe → welcome them back.
      announceSubscription(email);
    }
    // Already subscribed: stay silent so repeat form submits don't spam.
    return mapSubscriber(await getSubscriberByEmail(email));
  }

  await query(
    `INSERT INTO newsletter_subscribers (email, status) VALUES (?, 'subscribed')`,
    [email]
  );

  announceSubscription(email);

  return mapSubscriber(await getSubscriberByEmail(email));
};

const deleteSubscriber = async (id) => {
  const rows = await query(
    "SELECT id FROM newsletter_subscribers WHERE id = ?",
    [id]
  );
  if (!rows.length) {
    throw new AppError("Subscriber not found", 404);
  }
  await query("DELETE FROM newsletter_subscribers WHERE id = ?", [id]);
};

module.exports = {
  getSubscribers,
  subscribe,
  deleteSubscriber,
};
