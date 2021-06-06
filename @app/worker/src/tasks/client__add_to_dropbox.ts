import { Dropbox } from "dropbox";
import { Error as DropboxError, files } from "dropbox/types";
import { Task } from "graphile-worker";

interface ClientAddToDropboxPayload {
  /**
   * client id
   */
  id: string;
}

interface TokenDetails {
  accessToken: string;
  refreshToken: string;
}

const task: Task = async (inPayload, { withPgClient }) => {
  const payload: ClientAddToDropboxPayload = inPayload as any;
  const { id: clientId } = payload;
  const {
    rows: [client],
  } = await withPgClient((pgClient) =>
    pgClient.query(
      `
        select *
        from app_public.clients
        where id = $1
      `,
      [clientId]
    )
  );
  if (!client) {
    console.error("Client not found; aborting");
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
      [client.user_id]
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

  // make Dropbox folder for client
  const path = `/${client.slug}`;
  await dbx
    .filesCreateFolderV2({
      path,
    })
    .catch((err: DropboxError<files.CreateFolderError>) => {
      console.error(JSON.stringify(err.error));
      console.error(`path: ${path}`);
    });
};

module.exports = task;
