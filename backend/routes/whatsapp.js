const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const cors = require("cors");

const router = express.Router();

const WABA_PHONE_NUMBER_ID = process.env.WABA_PHONE_NUMBER_ID;
const WABA_TOKEN = process.env.WABA_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const GRAPH = (v = "v21.0") => `https://graph.facebook.com/${v}`;

const ALLOWED_DIRS = [
  process.env.UPLOADS_DIR || path.resolve(__dirname, "../../uploads"),
];

function isPathAllowed(p) {
  const abs = path.resolve(p);
  const allowed = ALLOWED_DIRS.some((root) =>
    abs.startsWith(path.resolve(root))
  );
  console.log("[check] isPathAllowed?", { abs, allowed, ALLOWED_DIRS });
  return allowed;
}

async function uploadToWhatsapp(fileBuf, filename, mimeType) {
  console.log("[upload] start", { filename, mimeType, size: fileBuf.length });
  const fd = new FormData();
  fd.append("messaging_product", "whatsapp");
  fd.append("type", mimeType);
  fd.append("file", fileBuf, { filename, contentType: mimeType });

  const url = `${GRAPH()}/${WABA_PHONE_NUMBER_ID}/media`;
  console.log("[upload] POST", url);

  const { data } = await axios.post(url, fd, {
    headers: { Authorization: `Bearer ${WABA_TOKEN}`, ...fd.getHeaders() },
  });

  console.log("[upload] success", data);
  return data.id; // media id
}

  router.post("/send-image-by-path", async (req, res) => {
  try {
    console.log("[route] Incoming body:", req.body);

    const { wa_id, caption, imageUrl, imagePath } = req.body || {};

    if (!WABA_PHONE_NUMBER_ID || !WABA_TOKEN) {
      console.error("[error] Env vars missing");
      return res.status(500).json({ error: "WABA env vars missing" });
    }
    if (!wa_id) {
      console.error("[error] wa_id missing");
      return res.status(400).json({ error: "wa_id required" });
    }

    // ---- Branch A: Public link ----
    if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
      console.log("[branch] Using public link mode", imageUrl);
      const msgResp = await axios.post(
        `${GRAPH()}/${WABA_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: wa_id,
          type: "image",
          image: { link: imageUrl, caption },
        },
        { headers: { Authorization: `Bearer ${WABA_TOKEN}` } }
      );
      console.log("[branch] Link mode sent", msgResp.data);
      return res.json({
        ok: true,
        mode: "link",
        message_id: msgResp.data?.messages?.[0]?.id || null,
      });
    }

    // ---- Branch B: Local file -> media_id ----
    if (!imagePath) {
      console.error("[error] imagePath not provided");
      return res.status(400).json({ error: "imagePath or imageUrl required" });
    }

    console.log("[branch] Attempting media_id mode", imagePath);

    if (!isPathAllowed(imagePath)) {
      console.error("[error] Path not allowed", imagePath);
      return res.status(403).json({ error: "path not allowed" });
    }

    if (!fs.existsSync(imagePath)) {
      console.error("[error] File not found", imagePath);
      return res.status(404).json({ error: "file not found" });
    }

    const filename = path.basename(imagePath);
    const mimeType = (mime.lookup(filename) || "application/octet-stream").toString();
    const fileBuf = fs.readFileSync(imagePath);
    console.log("[branch] File loaded", { filename, mimeType, bytes: fileBuf.length });

    const mediaId = await uploadToWhatsapp(fileBuf, filename, mimeType);
    console.log("[branch] Upload complete. media_id:", mediaId);

    const msgResp = await axios.post(
      `${GRAPH()}/${WABA_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: wa_id,
        type: "image",
        image: { id: mediaId, caption },
      },
      { headers: { Authorization: `Bearer ${WABA_TOKEN}` } }
    );

    console.log("[branch] Message sent with media_id", msgResp.data);

    return res.json({
      ok: true,
      mode: "media_id",
      media_id: mediaId,
      message_id: msgResp.data?.messages?.[0]?.id || null,
    });
  } catch (err) {
    const payload = err?.response?.data || { message: err.message };
    console.error("[fatal] WhatsApp send error:", payload);
    return res
      .status(500)
      .json({ error: "Failed to send image", details: payload });
  }
});

module.exports = router;
