import { formItemLayout, tailFormItemLayout } from "@app/lib";
import { Button, Col, Form, Input, Row, Typography } from "antd";
import { useForm } from "antd/lib/form/Form";
import { Store } from "rc-field-form/lib/interface";
import * as React from "react";
import { useCallback } from "react";
const { Title, Paragraph } = Typography;
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
  const currentUser = query.data?.currentUser;
  const [form] = useForm();

  const handleSubmit = useCallback(async (_values: Store) => {
    try {
      // await register({
      //   variables: {
      //     username: values.username,
      //     email: values.email,
      //     password: values.password,
      //     name: values.name,
      //   },
      // });
    } catch (e) {}
  }, []);
  return (
    <SharedLayout title="" query={query}>
      <Row justify="space-between" gutter={32}>
        <Col xs={24} sm={16}>
          <Title data-cy="homepage-header">
            Welcome to the Ribbon/Dropbox PoC
          </Title>
          {currentUser ? (
            <React.Fragment>
              <Paragraph>Here are your current offers:</Paragraph>
              <ul>
                <Li>One</Li>
              </ul>
              <Title level={2}>Create new offer</Title>
              <Form {...formItemLayout} form={form} onFinish={handleSubmit}>
                <Form.Item
                  label="Address"
                  name="address"
                  rules={[
                    {
                      required: true,
                      message: "Please input the property address.",
                      whitespace: true,
                    },
                  ]}
                >
                  <Input />
                </Form.Item>
                <Form.Item {...tailFormItemLayout}>
                  <Button htmlType="submit">Create Offer</Button>
                </Form.Item>
              </Form>
            </React.Fragment>
          ) : (
            <Paragraph>Please log in with Dropbox</Paragraph>
          )}
        </Col>
      </Row>
    </SharedLayout>
  );
};

export default Home;
