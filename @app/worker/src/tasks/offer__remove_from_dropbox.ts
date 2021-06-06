import { Dropbox } from "dropbox";
import { Task } from "graphile-worker";

interface OfferRemoveFromDropboxPayload {
  id: string;
  user_id: string;
  slug: string;
  client_slug: string;
}

interface TokenDetails {
  accessToken: string;
  refreshToken: string;
}

const task: Task = async (inPayload, { withPgClient }) => {
  const payload: OfferRemoveFromDropboxPayload = inPayload as any;
  if (!payload.user_id) {
    console.error("Missing user_id; aborting");
    return;
  }
  if (!payload.slug) {
    console.error("Missing slug; aborting");
    return;
  }
  if (!payload.client_slug) {
    console.error("Missing client_slug; aborting");
    return;
  }

  // get Dropbox credentials
  const {
    rows: [uas],
  } = await withPgClient((pgClient) =>
    pgClient.query(
      `
      SELECT uas.details
      FROM app_private.user_authentication_secrets AS uas
      JOIN app_public.user_authentications AS ua
      ON uas.user_authentication_id = ua.id
      WHERE ua.user_id = $1
      `,
      [payload.user_id]
    )
  );
  if (!uas) {
    console.error("User authentication secrets not found; aborting");
    return;
  }
  const tokenDetails = uas.details as TokenDetails;
  const dbx = new Dropbox({
    ...tokenDetails,
    clientId: process.env.DROPBOX_KEY,
    clientSecret: process.env.DROPBOX_SECRET,
  });

  // delete Dropbox folder for offer
  const path = `/${payload.client_slug}/${payload.slug}`;
  await dbx.filesDeleteV2({ path }).catch((err) => {
    console.error(JSON.stringify(err.error));
    console.error(`path: ${path}`);
  });
};

module.exports = task;
