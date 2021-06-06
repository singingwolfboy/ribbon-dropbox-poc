import {
  ClientPage_ClientFragment,
  ClientPageDocument,
  useRequestPreapprovalViaDropboxMutation,
} from "@app/graphql";
import { Button } from "antd";
import React from "react";

interface Props {
  client: ClientPage_ClientFragment;
}

export function ClientPreapproval(props: Props) {
  const [requestPreapproval] = useRequestPreapprovalViaDropboxMutation();
  const {
    id: clientId,
    name,
    slug,
    hasPreapproval,
    dropboxPreapprovalFileRequestUrl,
  } = props.client;
  if (hasPreapproval) {
    return <p>Preapproval has been uploaded</p>;
  }
  if (dropboxPreapprovalFileRequestUrl) {
    return (
      <p>
        Awaiting preapproval from client. Ask {name} to visit{" "}
        <a href={dropboxPreapprovalFileRequestUrl}>
          <code>{dropboxPreapprovalFileRequestUrl}</code>
        </a>
      </p>
    );
  }
  return (
    <Button
      onClick={async () => {
        await requestPreapproval({
          variables: {
            clientId,
          },
          refetchQueries: [{ query: ClientPageDocument, variables: { slug } }],
        });
      }}
    >
      Request preapproval from client
    </Button>
  );
}
