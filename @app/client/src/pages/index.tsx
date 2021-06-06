import { formItemLayout, tailFormItemLayout } from "@app/lib";
import { Button, Col, Form, Input, Row, Typography } from "antd";
import { useForm } from "antd/lib/form/Form";
import { Store } from "rc-field-form/lib/interface";
import * as React from "react";
import { useCallback } from "react";
import slugify from "slugify";
const { Title, Paragraph } = Typography;
import { ClientList, SharedLayout } from "@app/components";
import {
  SharedDocument,
  useCreateClientMutation,
  useSharedQuery,
} from "@app/graphql";
import { NextPage } from "next";

const Home: NextPage = () => {
  const query = useSharedQuery();
  const currentUser = query.data?.currentUser;
  const [form] = useForm();
  const [createClient] = useCreateClientMutation();

  const handleSubmit = useCallback(
    async (values: Store) => {
      await createClient({
        variables: {
          name: values.name,
          slug: slugify(values.name, { lower: true }),
        },
        refetchQueries: [{ query: SharedDocument }],
      });
      form.resetFields();
    },
    [createClient, form]
  );
  return (
    <SharedLayout title="" query={query}>
      <Row justify="space-between" gutter={32}>
        <Col xs={24} sm={16}>
          <Title data-cy="homepage-header">
            Welcome to the Ribbon/Dropbox PoC
          </Title>
          {currentUser ? (
            <React.Fragment>
              <Title level={2}>Current clients:</Title>
              <ClientList user={currentUser} />
              <Title level={2}>Create new client</Title>
              <Form {...formItemLayout} form={form} onFinish={handleSubmit}>
                <Form.Item
                  label="Name"
                  name="name"
                  rules={[
                    {
                      required: true,
                      message: "Please input the client's full name.",
                      whitespace: true,
                    },
                  ]}
                >
                  <Input />
                </Form.Item>
                <Form.Item {...tailFormItemLayout}>
                  <Button htmlType="submit">Create Client</Button>
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
