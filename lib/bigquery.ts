import { BigQuery } from "@google-cloud/bigquery";

// Credentials come from a GCP service account, passed via env vars rather
// than a credentials file (serverless functions don't have a persistent
// filesystem to store one). GOOGLE_PRIVATE_KEY often has its newlines
// escaped as literal "\n" when pasted into Vercel's env var UI, so we
// un-escape them here.
export function getBigQueryClient() {
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("GOOGLE_PROJECT_ID / GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY not set");
  }

  return new BigQuery({
    projectId,
    location: "us-west2",
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
  });
}
