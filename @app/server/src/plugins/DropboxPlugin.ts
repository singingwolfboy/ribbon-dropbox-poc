import { Dropbox } from "dropbox";
import { file_requests } from "dropbox/types";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { PoolClient } from "pg";

import { OurGraphQLContext } from "../middleware/installPostGraphile";

interface TokenDetails {
  accessToken: string;
  refreshToken: string;
}

interface Client {
  id: number;
  name: string;
  slug: string;
  dropboxPreapprovalFileRequestId: string | null;
  dropboxPreapprovalFileRequestUrl: string | null;
  hasPreapproval: boolean;
}

const currentUserDropboxDetails = async (
  pgClient: PoolClient
): Promise<TokenDetails> => {
  const {
    rows: [row],
  } = await pgClient.query(
    "select app_hidden.current_user_dropbox_details() as details;"
  );
  if (!row) {
    throw new Error("You're not logged in");
  }
  return row.details;
};

const getClientById = async (
  clientId: number,
  pgClient: PoolClient
): Promise<Client | undefined> => {
  const {
    rows: [row],
  } = await pgClient.query(
    `
      select
        c.id as id,
        c.name as name,
        c.slug as slug,
        c.dropbox_preapproval_file_request_id as dropboxPreapprovalFileRequestId,
        c.dropbox_preapproval_file_request_url as dropboxPreapprovalFileRequestUrl,
        c.has_preapproval as hasPreapproval
      from app_public.clients as c
      where c.id = $1
    `,
    [clientId]
  );
  return row;
};

const DropboxPlugin = makeExtendSchemaPlugin(() => ({
  typeDefs: gql`
    input RequestPreapprovalViaDropboxInput {
      """
      An arbitrary string value with no semantic meaning. Will be included in the
      payload verbatim. May be used to track mutations by the client.
      """
      clientMutationId: String
      clientId: Int!
    }

    type RequestPreapprovalViaDropboxPayload {
      """
      The exact same \`clientMutationId\` that was provided in the mutation input,
      unchanged and unused. May be used by a client to track mutations.
      """
      clientMutationId: String

      """
      Ask the client to visit this URL to upload the preapproval.
      """
      fileRequestUrl: String

      success: Boolean!
    }

    extend type Mutation {
      """
      Request a preapproval file from the client, via Dropbox.
      Only works if the client has a Dropbox email set up.
      """
      requestPreapprovalViaDropbox(
        input: RequestPreapprovalViaDropboxInput!
      ): RequestPreapprovalViaDropboxPayload
    }
  `,
  resolvers: {
    Mutation: {
      async requestPreapprovalViaDropbox(
        _mutation,
        args,
        context: OurGraphQLContext,
        _resolveInfo
      ) {
        const { sessionId, pgClient } = context;
        // if there's no sessionId, fail fast
        if (!sessionId) {
          throw new Error("You're not logged in");
        }
        const tokenDetails = await currentUserDropboxDetails(pgClient);
        if (!tokenDetails || !tokenDetails.accessToken) {
          throw new Error("You are not authorized with Dropbox");
        }
        const { clientId, clientMutationId } = args.input;
        const client = await getClientById(clientId, pgClient);
        if (!client) {
          throw new Error("Could not find client");
        }

        const dbx = new Dropbox({
          ...tokenDetails,
          clientId: process.env.DROPBOX_KEY,
          clientSecret: process.env.DROPBOX_SECRET,
        });

        // request preapproval for client
        const fileRequestResponse = await dbx
          .fileRequestsCreate({
            title: `Preapproval for ${client.name}`,
            description: `Please submit a pre-approval document for ${client.name}`,
            destination: `/${client.slug}/Preapproval`,
          })
          .catch((err: file_requests.CreateFileRequestError) => {
            console.log(err);
          });

        // put file request ID in database
        if (fileRequestResponse) {
          const fileRequestId = fileRequestResponse.result.id;
          const fileRequestUrl = fileRequestResponse.result.url;
          await pgClient.query(
            `
              update app_public.clients
              set dropbox_preapproval_file_request_id = $1,
                  dropbox_preapproval_file_request_url = $2
              where id = $3
            `,
            [fileRequestId, fileRequestUrl, clientId]
          );
          return {
            success: true,
            fileRequestUrl,
            clientMutationId,
          };
        }
        return { success: false, clientMutationId };
      },
    },
  },
}));

export default DropboxPlugin;
