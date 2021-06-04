import { Express } from "express";
import { get } from "lodash";
import passport from "passport";
import { Strategy as DropboxStrategy } from "passport-dropbox-oauth2";

import { getWebsocketMiddlewares } from "../app";
import installPassportStrategy from "./installPassportStrategy";

interface DbSession {
  session_id: string;
}

interface DropboxAuthorizationOptions {
  offline?: boolean;
}

declare global {
  namespace Express {
    interface User {
      session_id: string;
    }
  }
}

export default async (app: Express) => {
  passport.serializeUser((sessionObject: DbSession, done) => {
    done(null, sessionObject.session_id);
  });

  passport.deserializeUser((session_id: string, done) => {
    done(null, { session_id });
  });

  const passportInitializeMiddleware = passport.initialize();
  app.use(passportInitializeMiddleware);
  getWebsocketMiddlewares(app).push(passportInitializeMiddleware);

  const passportSessionMiddleware = passport.session();
  app.use(passportSessionMiddleware);
  getWebsocketMiddlewares(app).push(passportSessionMiddleware);

  app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
  });

  if (process.env.DROPBOX_KEY) {
    // hack for offline support
    DropboxStrategy.prototype.authorizationParams = (
      options: DropboxAuthorizationOptions
    ) => {
      if (options.offline) {
        return { token_access_type: "offline" };
      }
      return {};
    };

    await installPassportStrategy(
      app,
      "dropbox-oauth2",
      DropboxStrategy,
      {
        apiVersion: "2",
        clientID: process.env.DROPBOX_KEY,
        clientSecret: process.env.DROPBOX_SECRET,
        scope: [
          "account_info.read",
          "files.content.write",
          "files.content.read",
          "file_requests.write",
        ].join(" "),
      },
      { offline: true },
      async (profile, _accessToken, _refreshToken, _extra, _req) => {
        const email = get(profile, "emails[0].value");
        return {
          id: profile.id,
          displayName: profile.displayName || "",
          username: email.split("@")[0],
          avatarUrl: get(profile, "_json.profile_photo_url"),
          email: email,
        };
      },
      ["accessToken", "refreshToken"]
    );
  }
};
