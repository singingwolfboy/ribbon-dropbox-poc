import { Dropbox } from "dropbox";
import { file_requests, files } from "dropbox/types";
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
  console.log(tokenDetails);
  const dbx = new Dropbox(tokenDetails);

  // make Dropbox folder for client
  await dbx
    .filesCreateFolderV2({
      path: `/${client.name}`,
    })
    .catch((err: files.CreateFolderError) => {
      console.log(err);
    });

  // request pre-approval document for client
  const fileRequestResponse = await dbx
    .fileRequestsCreate({
      title: `Preapproval for ${client.name}`,
      description: `Please submit a pre-approval document for ${client.name}`,
      destination: `/${client.name}/preapproval.pdf`,
    })
    .catch((err: file_requests.CreateFileRequestError) => {
      console.log(err);
    });

  // put file request ID in database
  if (fileRequestResponse) {
    await withPgClient((pgClient) =>
      pgClient.query(
        `
          update app_public.clients
          set dropbox_preapproval_file_request_id = $1
          where id = $2
        `,
        [fileRequestResponse.result.id, clientId]
      )
    );
  }
};

module.exports = task;
