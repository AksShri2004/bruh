// Load API key from Script Properties
const API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY');


// API endpoint for your Render service
const API_URL = "https://bruh-spam.onrender.com/predict";

// Robust extractor (unchanged)
function getMessageIdFromEvent(e) {
  if (!e) return null;
  if (e.messageId) return e.messageId;
  if (e.messageMetadata && e.messageMetadata.messageId) return e.messageMetadata.messageId;
  if (e.messageMetadata && e.messageMetadata.id) return e.messageMetadata.id;
  if (e.threadId) {
    try {
      const threads = GmailApp.getThreadsById ? GmailApp.getThreadsById(e.threadId) : GmailApp.search("rfc822msgid:" + e.threadId);
      if (threads && threads.length) {
        const msgs = threads[0].getMessages();
        if (msgs && msgs.length) return msgs[0].getId();
      }
    } catch (err) { /* ignore */ }
  }
  if (e.draftMessageId) return e.draftMessageId;
  if (e.triggerUid) return e.triggerUid;
  return null;
}

/**
 * Safely read subject/snippet/plain body from either a GmailMessage object
 * or a plain metadata object. Never call methods unless they exist.
 */
function safeReadMessageContent(messageObj) {
  let subject = "";
  let snippet = "";

  if (!messageObj) return { subject: "", snippet: "" };

  // If this is a real GmailMessage instance (has getSubject)
  if (typeof messageObj.getSubject === "function") {
    try {
      subject = messageObj.getSubject() || "";
    } catch (e) { subject = ""; }
  } else if (messageObj.subject) {
    subject = messageObj.subject;
  } else if (messageObj.payload && messageObj.payload.headers) {
    // sometimes raw metadata contains headers
    const hdrs = messageObj.payload.headers;
    for (let i = 0; i < hdrs.length; i++) {
      if (hdrs[i].name && hdrs[i].name.toLowerCase() === "subject") {
        subject = hdrs[i].value || "";
        break;
      }
    }
  }

  // Try snippet via method, property, or a short slice of plain body
  if (typeof messageObj.getSnippet === "function") {
    try { snippet = messageObj.getSnippet() || ""; } catch (e) { snippet = ""; }
  } else if (messageObj.snippet) {
    snippet = messageObj.snippet;
  } else if (typeof messageObj.getPlainBody === "function") {
    try { snippet = (messageObj.getPlainBody() || "").slice(0, 1000); } catch (e) { snippet = ""; }
  } else if (messageObj.plainBody) {
    snippet = messageObj.plainBody.slice(0, 1000);
  } else if (messageObj.body) {
    snippet = ("" + messageObj.body).slice(0, 1000);
  } else if (messageObj.preview) {
    snippet = messageObj.preview;
  } else {
    snippet = "";
  }

  return { subject: String(subject), snippet: String(snippet) };
}

/**
 * Entry point for message open - now robust against different payload shapes
 */
function onGmailMessageOpen(e) {
  try {
    const messageId = getMessageIdFromEvent(e);

    if (!messageId) {
      return createErrorCard_("No message ID available. Please open a single email (not a list) and try again.");
    }

    // Try to get a GmailMessage instance; if that fails, we'll still handle metadata
    let messageObj = null;
    try {
      messageObj = GmailApp.getMessageById(messageId);
    } catch (err) {
      // GmailApp may throw if id is not available that way — we'll fallback below
      messageObj = null;
    }

    // If we didn't get a GmailMessage instance, but event has metadata, use it
    if (!messageObj && e && e.messageMetadata) {
      messageObj = e.messageMetadata;
    } else if (!messageObj && e) {
      // Sometimes the event object contains the message directly
      if (e.message) messageObj = e.message;
      if (!messageObj && e.messagePayload) messageObj = e.messagePayload;
    }

    const content = safeReadMessageContent(messageObj);

    // Build the normal UI card
    const header = CardService.newCardHeader().setTitle("Spam Checker").setSubtitle(content.subject || "(no subject)");
    const section = CardService.newCardSection();
    section.addWidget(CardService.newKeyValue().setTopLabel("Subject").setContent(content.subject).setMultiline(true));
    section.addWidget(CardService.newKeyValue().setTopLabel("Snippet").setContent(content.snippet).setMultiline(true));

    // Pass messageId as parameter so callModel can fetch or reuse the metadata
    const action = CardService.newAction().setFunctionName("callModel").setParameters({ messageId: messageId });
    const checkButton = CardService.newTextButton().setText("Check with model").setOnClickAction(action);
    section.addWidget(CardService.newButtonSet().addButton(checkButton));

    const card = CardService.newCardBuilder().setHeader(header).addSection(section).build();
    return [card];

  } catch (err) {
    return createErrorCard_("onGmailMessageOpen error: " + err.toString());
  }
}


/**
 * callModel: safe call that uses messageId -> tries GmailApp.getMessageById
 * and falls back to event metadata if necessary. Sends subject+snippet to API.
 */
function callModel(e) {
  try {
    // get messageId param (passed from the card) or try to extract from event
    const params = e && e.parameters ? e.parameters : {};
    let messageId = params.messageId || getMessageIdFromEvent(e);

    if (!messageId) return createErrorCard_("Missing messageId — open the message and try again.");

    // Prefer a GmailMessage instance for full access
    let messageObj = null;
    try { messageObj = GmailApp.getMessageById(messageId); } catch (err) { messageObj = null; }

    // fallback to event metadata if present
    if (!messageObj && e && e.messageMetadata) messageObj = e.messageMetadata;
    if (!messageObj && e && e.message) messageObj = e.message;
    if (!messageObj && e && e.messagePayload) messageObj = e.messagePayload;

    // If still nothing usable, error
    if (!messageObj) return createErrorCard_("Unable to load message content.");

    const content = safeReadMessageContent(messageObj);
    const payloadText = (content.subject || "") + "\n\n" + (content.snippet || "");

    const payload = { email_text: payloadText };
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      headers: {
        "x-api-key": API_KEY
      }
    };
    if (API_KEY && API_KEY.length > 0) options.headers["x-api-key"] = API_KEY;

    const resp = UrlFetchApp.fetch(API_URL, options);
    const code = resp.getResponseCode();
    if (code < 200 || code >= 300) {
      return createErrorCard_("Model API returned HTTP " + code + ": " + resp.getContentText());
    }

    const result = JSON.parse(resp.getContentText());
    const pred = (result.prediction || "").toString().toLowerCase();

    // Build result card with label buttons
    const header = CardService.newCardHeader().setTitle("Model result").setSubtitle("Prediction: " + pred);
    const section = CardService.newCardSection();
    section.addWidget(CardService.newKeyValue().setTopLabel("Prediction").setContent(pred));

    const labelSpamAction = CardService.newAction().setFunctionName("labelMessage")
      .setParameters({ messageId: messageId, label: "Model-Spam", moveToTrash: "false" });
    const labelNotSpamAction = CardService.newAction().setFunctionName("labelMessage")
      .setParameters({ messageId: messageId, label: "Model-Not-Spam", moveToTrash: "false" });

    const spamButton = CardService.newTextButton().setText("Label Spam").setOnClickAction(labelSpamAction);
    const notSpamButton = CardService.newTextButton().setText("Label Not-Spam").setOnClickAction(labelNotSpamAction);

    section.addWidget(CardService.newButtonSet().addButton(spamButton).addButton(notSpamButton));
    const card = CardService.newCardBuilder().setHeader(header).addSection(section).build();

    return CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().updateCard(card)).build();

  } catch (err) {
    return createErrorCard_("callModel failed: " + err.toString());
  }
}

/** createErrorCard_ helper (reuse) */
function createErrorCard_(message) {
  const header = CardService.newCardHeader().setTitle("Spam Checker — Error");
  const section = CardService.newCardSection();
  section.addWidget(CardService.newTextParagraph().setText(message));
  const card = CardService.newCardBuilder().setHeader(header).addSection(section).build();
  return [card];
}
