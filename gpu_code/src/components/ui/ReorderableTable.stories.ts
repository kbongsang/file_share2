import type { Meta, StoryObj } from "@storybook/react";
// import { fn } from "@storybook/test";
import { ReorderableTable } from "./ReorderableTable";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Routing/ReorderableTable",
  component: ReorderableTable,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "fullscreen",
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    // backgroundColor: { control: "color" },
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: {
    onChange(data) {
      console.log(data);
    },
  },
} satisfies Meta<typeof ReorderableTable>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
  args: {
    data: [
      {
        "Pump Connector": "P1",
        "Equipment Connector": "C1",
        Diameter: 100,
        Spacing: 50,
      },
      {
        "Pump Connector": "P2",
        "Equipment Connector": "C2",
        Diameter: 100,
        Spacing: 50,
      },
      {
        "Pump Connector": "P3",
        "Equipment Connector": "C3",
        Diameter: 100,
        Spacing: 50,
      },
      {
        "Pump Connector": "P4",
        "Equipment Connector": "C4",
        Diameter: 100,
        Spacing: 50,
      },
    ],
    cellOptions: [
      {
        key: "Pump Connector",
        type: "Selectable",
        options: ["P1", "P2", "P3", "P4"],
      },
      {
        key: "Equipment Connector",
        type: "Selectable",
        options: ["C1", "C2", "C3", "C4"],
      },
      {
        key: "Diameter",
        type: "Editable",
        options: undefined,
      },
      // {
      //   key: "Spacing",
      //   type: "ReadOnly",
      //   options: undefined,
      // }
    ],
  },
};

// export const Secondary: Story = {
//   args: {
//     label: 'Button',
//   },
// };

// export const Large: Story = {
//   args: {
//     size: 'large',
//     label: 'Button',
//   },
// };

// export const Small: Story = {
//   args: {
//     size: 'small',
//     label: 'Button',
//   },
// };
