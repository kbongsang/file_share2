import type { Meta, StoryObj } from "@storybook/react";
import Layer from "./Layer";
import "./Layer.css";

const meta = {
  title: "side/Layer",
  component: Layer,
  tags: ["autodocs"],
} satisfies Meta<typeof Layer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {},
};
