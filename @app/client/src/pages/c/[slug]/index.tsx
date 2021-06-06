import {
  ClientPreapproval,
  OfferList,
  SharedLayout,
  useClientLoading,
  useClientSlug,
} from "@app/components";
import {
  ClientPage_ClientFragment,
  ClientPageDocument,
  useClientPageQuery,
  useCreateOfferMutation,
} from "@app/graphql";
import { formItemLayout, tailFormItemLayout } from "@app/lib";
import { Button, Col, Form, Input, InputNumber, Row, Typography } from "antd";
import { useForm } from "antd/lib/form/Form";
import { Store } from "rc-field-form/lib/interface";
const { Title } = Typography;
import { NextPage } from "next";
import React, { FC, useCallback } from "react";
import slugify from "slugify";

const ClientPage: NextPage = () => {
  const slug = useClientSlug();
  const query = useClientPageQuery({ variables: { slug } });
  const clientLoadingElement = useClientLoading(query);
  const client = query?.data?.clientBySlug;

  return (
    <SharedLayout
      title={`${client?.name ?? slug}`}
      titleHref={`/o/[slug]`}
      titleHrefAs={`/o/${slug}`}
      query={query}
    >
      {clientLoadingElement || <ClientPageInner client={client!} slug={slug} />}
    </SharedLayout>
  );
};

interface ClientPageInnerProps {
  client: ClientPage_ClientFragment;
  slug: string;
}

const ClientPageInner: FC<ClientPageInnerProps> = (props) => {
  const { client, slug } = props;
  const [form] = useForm();
  const [createClient] = useCreateOfferMutation();

  const handleSubmit = useCallback(
    async (values: Store) => {
      await createClient({
        variables: {
          address: values.address,
          amount: parseFloat(values.amount),
          clientId: client.id,
          slug: slugify(values.address, { lower: true }),
        },
        refetchQueries: [{ query: ClientPageDocument, variables: { slug } }],
      });
      form.resetFields();
    },
    [createClient, form, client.id, slug]
  );

  return (
    <Row>
      <Col flex={1}>
        <ClientPreapproval client={client} />
        <Title level={2}>Current offers:</Title>
        <OfferList client={client} />
        <Title level={2}>Create new offer</Title>
        <Form {...formItemLayout} form={form} onFinish={handleSubmit}>
          <Form.Item
            label="Address"
            name="address"
            rules={[
              {
                required: true,
                message: "Please input the address of the property.",
                whitespace: true,
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Amount"
            name="amount"
            rules={[
              {
                required: true,
                type: "number",
                message: "Amount the client wishes to offer, in US Dollars",
                whitespace: true,
              },
            ]}
          >
            <InputNumber style={{ width: 200 }} />
          </Form.Item>
          <Form.Item {...tailFormItemLayout}>
            <Button htmlType="submit">Create Offer</Button>
          </Form.Item>
        </Form>
      </Col>
    </Row>
  );
};

export default ClientPage;
