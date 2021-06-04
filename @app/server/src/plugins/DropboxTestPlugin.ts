import { Dropbox } from "dropbox";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { PoolClient } from "pg";

import { OurGraphQLContext } from "../middleware/installPostGraphile";

interface TokenDetails {
  accessToken: string;
  refreshToken: string;
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

const DropboxTestPlugin = makeExtendSchemaPlugin(() => ({
  typeDefs: gql`
    """
    whatever
    """
    type MakeDropboxFilePayload {
      """
      The exact same \`clientMutationId\` that was provided in the mutation input,
      unchanged and unused. May be used by a client to track mutations.
      """
      clientMutationId: String

      """
      Our root query field type. Allows us to run any query from our mutation payload.
      """
      query: Query

      success: Boolean
    }

    extend type Mutation {
      """
      Just for testing: make a file on Dropbox
      """
      makeDropboxFile: MakeDropboxFilePayload
    }
  `,
  resolvers: {
    Mutation: {
      async makeDropboxFile(
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

        const dbx = new Dropbox(tokenDetails);
        await dbx.filesUpload({ path: "/test.txt", contents: "whatever" });
        return {
          success: true,
        };
      },
    },
  },
}));

export default DropboxTestPlugin;
