import {
  ClientPage_ClientFragment,
  SharedDocument,
  useDeleteOfferMutation,
} from "@app/graphql";
import { Button } from "antd";
import React from "react";

interface Props {
  client: ClientPage_ClientFragment;
}

const currencyFormatter = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

export function OfferList(props: Props) {
  const [deleteOffer] = useDeleteOfferMutation();
  const offers = props.client.offers;
  if (offers.totalCount === 0 || offers.nodes.length === 0) {
    return <p>You have no offers.</p>;
  }
  return (
    <ul>
      {offers.nodes.map((offer) => (
        <li key={offer.id}>
          <div>
            {offer.address}
            <br />
            Amount: {currencyFormatter(offer.amount)}
          </div>
          <Button
            danger
            size="small"
            onClick={async () => {
              await deleteOffer({
                variables: {
                  id: offer.id,
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
