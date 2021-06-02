import { DropboxOutlined } from "@ant-design/icons";
import { Button } from "antd";
import React from "react";

export interface SocialLoginOptionsProps {
  next: string;
  buttonTextFromService?: (service: string) => string;
}

function defaultButtonTextFromService(service: string) {
  return `Sign in with ${service}`;
}

export function SocialLoginOptions({
  next,
  buttonTextFromService = defaultButtonTextFromService,
}: SocialLoginOptionsProps) {
  return (
    <Button
      block
      size="large"
      icon={<DropboxOutlined />}
      href={`/auth/dropbox?next=${encodeURIComponent(next)}`}
      type="primary"
    >
      {buttonTextFromService("Dropbox")}
    </Button>
  );
}
