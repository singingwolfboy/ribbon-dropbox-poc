import { Dropbox } from "dropbox";
import { Error as DropboxError, files } from "dropbox/types";
import { Task } from "graphile-worker";
import { PoolClient } from "pg";

interface OfferAddToDropboxPayload {
  /**
   * offer id
   */
  id: string;
}

interface TokenDetails {
  accessToken: string;
  refreshToken: string;
}

interface Offer {
  id: number;
  user_id: number;
  slug: string;
  client_slug: string;
}

const getOfferById = async (
  offerId: number,
  pgClient: PoolClient
): Promise<Offer | undefined> => {
  const {
    rows: [row],
  } = await pgClient.query(
    `
      select
        o.id as id,
        c.user_id as user_id,
        o.slug as slug,
        c.slug as client_slug
      from app_public.offers as o
      join app_public.clients as c
      on o.client_id = c.id
      where o.id = $1
    `,
    [offerId]
  );
  return row;
};

const task: Task = async (inPayload, { withPgClient }) => {
  const payload: OfferAddToDropboxPayload = inPayload as any;
  const { id: offerId } = payload;
  const offer = await withPgClient((pgClient) =>
    getOfferById(parseInt(offerId), pgClient)
  );

  if (!offer) {
    console.error("Offer not found; aborting");
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
      [offer.user_id]
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

  // make Dropbox folder for offer
  const path = `/${offer.client_slug}/${offer.slug}`;
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
