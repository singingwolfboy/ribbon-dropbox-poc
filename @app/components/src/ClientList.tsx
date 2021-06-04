import {
  ClientData_UserFragment,
  SharedDocument,
  useDeleteClientMutation,
} from "@app/graphql";
import { Button } from "antd";
import React from "react";

interface Props {
  user: ClientData_UserFragment;
}

export function ClientList(props: Props) {
  const [deleteClient] = useDeleteClientMutation();
  const clients = props.user.clients;
  if (clients.totalCount === 0 || clients.nodes.length === 0) {
    return <p>You have no clients.</p>;
  }
  return (
    <ul>
      {clients.nodes.map((client) => (
        <li key={client.id}>
          {client.name}{" "}
          <Button
            danger
            size="small"
            onClick={async () => {
              await deleteClient({
                variables: {
                  id: client.id,
                },
                refetchQueries: [{ query: SharedDocument }],
              });
            }}
          >
            delete
          </Button>
        </li>
      ))}
    </ul>
  );
}
