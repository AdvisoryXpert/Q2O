import axios from "axios";

export type WhatsAppResponse = {
  ok: boolean;
  message_id?: string | null;
}

export async function sendWhatsAppImage(
	wa_id: string,
	caption: string,
	imageUrl: string
): Promise<WhatsAppResponse> {
	try {
		const payload = { wa_id, caption, imageUrl };

		const res = await axios.post(
			"https://127.0.0.1:5000/api/whatsapp/send-image-by-path",
			payload,
			{ headers: { "Content-Type": "application/json" } }
		);

		if (res.data?.ok) {
			return { ok: true, message_id: res.data?.message_id || null };
		} else {
			return { ok: false };
		}
	} catch (err: any) {
		const errData = err?.response?.data;

		// Token expiry detection
		if (
			errData?.error?.message?.includes("OAuth") ||
      errData?.error_description?.includes("expired")
		) {
			throw new Error("WhatsApp token expired. Please refresh credentials.");
		}

		throw new Error(
			errData?.error || err.message || "Unexpected error while sending WhatsApp message"
		);
	}
}
