import { Dropbox } from "dropbox";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { Pool, PoolClient } from "pg";

import { OurGraphQLContext } from "../middleware/installPostGraphile";

const currentUserDropboxToken = async (
  pgClient: PoolClient,
  rootPgPool: Pool
): Promise<string> => {
  const {
    rows: [{ id: currentUserId }],
  } = await pgClient.query("select app_public.current_user_id() as id;");
  const results = await rootPgPool.query(
    `
      SELECT uas.details
      FROM app_private.user_authentication_secrets AS uas
      JOIN app_public.user_authentications AS ua
      ON uas.user_authentication_id = ua.id
      WHERE ua.user_id = $1;
      `,
    [currentUserId]
  );
  const userAuth = results.rows[0];
  if (!userAuth) {
    throw new Error("oopsie");
  }
  return userAuth.details.token;
};

const DropboxTestPlugin = makeExtendSchemaPlugin((build) => ({
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
        const { sessionId, pgClient, rootPgPool } = context;
        // if there's no sessionId, fail fast
        if (!sessionId) {
          throw new Error("You're not logged in");
        }
        const token = await currentUserDropboxToken(pgClient, rootPgPool);

        const dbx = new Dropbox({ accessToken: token });
        await dbx.filesUpload({ path: "/test.txt", contents: "whatever" });
        return {
          success: true,
        };
      },
    },
  },
}));

export default DropboxTestPlugin;
