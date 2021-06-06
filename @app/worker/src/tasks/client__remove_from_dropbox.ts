import { Dropbox } from "dropbox";
import { Task } from "graphile-worker";

interface ClientRemoveFromDropboxPayload {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  dropbox_preapproval_file_request_id: string | null;
}

interface TokenDetails {
  accessToken: string;
  refreshToken: string;
}

const task: Task = async (inPayload, { withPgClient }) => {
  const payload: ClientRemoveFromDropboxPayload = inPayload as any;
  if (!payload.user_id) {
    console.error("Missing user_id; aborting");
    return;
  }
  if (!payload.name) {
    console.error("Missing name; aborting");
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
  const dbx = new Dropbox(tokenDetails);

  // delete Dropbox folder for client
  await dbx.filesDeleteV2({ path: `/${payload.name}` }).catch((err) => {
    console.log(err);
  });

  // if we have an open file request for the preapproval file, close it
  const fileRequestId = payload.dropbox_preapproval_file_request_id;
  if (fileRequestId) {
    await dbx.fileRequestsDelete({ ids: [fileRequestId] }).catch((err) => {
      console.log(err);
    });
  }
};

module.exports = task;
