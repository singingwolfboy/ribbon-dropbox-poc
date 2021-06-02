import { Button, Col, Divider, Row, Typography } from "antd";
import * as React from "react";
const { Text, Title, Paragraph } = Typography;
import { SharedLayout } from "@app/components";
import { useSharedQuery } from "@app/graphql";
import { NextPage } from "next";

// Convenience helper
const Li = ({ children, ...props }: any) => (
  <li {...props}>
    <Typography>{children}</Typography>
  </li>
);

const Home: NextPage = () => {
  const query = useSharedQuery();
  const isLoggedIn = query.data?.currentUser?.id !== null;
  return (
    <SharedLayout title="" query={query}>
      <Row justify="space-between" gutter={32}>
        <Col xs={24} sm={16}>
          <Title data-cy="homepage-header">
            Welcome to the Ribbon/Dropbox Proof of Concept
          </Title>
          {!isLoggedIn && <Paragraph>Please log in with Dropbox</Paragraph>}
          <button onClick={() => alert("hi")}>click me</button>
        </Col>
      </Row>
    </SharedLayout>
  );
};

export default Home;
