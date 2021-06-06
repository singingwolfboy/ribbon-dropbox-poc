import { QueryResult } from "@apollo/client";
import { ClientPage_QueryFragment } from "@app/graphql";
import { Col, Row } from "antd";
import { useRouter } from "next/router";
import React from "react";

import { ErrorAlert, FourOhFour } from "./";
import { SpinPadded } from "./SpinPadded";

export function useClientSlug() {
  const router = useRouter();
  const { slug: rawSlug } = router.query;
  return String(rawSlug);
}

export function useClientLoading(
  query: Pick<
    QueryResult<ClientPage_QueryFragment>,
    "data" | "loading" | "error" | "networkStatus" | "client" | "refetch"
  >
) {
  const { data, loading, error } = query;

  let child: JSX.Element | null = null;
  const client = data?.clientBySlug;
  if (client) {
    //child = <OrganizationPageInner organization={organization} />;
  } else if (loading) {
    child = <SpinPadded />;
  } else if (error) {
    child = <ErrorAlert error={error} />;
  } else {
    // TODO: 404
    child = <FourOhFour currentUser={data?.currentUser} />;
  }

  return child ? (
    <Row>
      <Col flex={1}>{child}</Col>
    </Row>
  ) : null;
}
