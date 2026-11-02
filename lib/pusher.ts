import Pusher from "pusher";

let server: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) return null;

  if (!server) {
    server = new Pusher({
      appId: PUSHER_APP_ID,
      key: PUSHER_KEY,
      secret: PUSHER_SECRET,
      cluster: PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return server;
}

export function enquiryChannelName(enquiryId: string): string {
  return `enquiry-${enquiryId}`;
}

export function userChannelName(userId: string): string {
  return `user-${userId}`;
}
